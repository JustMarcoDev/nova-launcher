// Servidor de presencia de Nova (Cloudflare Worker + Durable Object + KV).
// Permite que el menú de Nova muestre el logo junto al nombre de los jugadores que usan Nova.
//
// Endpoints (todos devuelven JSON; son los mismos de siempre, el mod no cambia):
//   GET  /challenge                         → { serverId }                       (id aleatorio de un solo uso, caduca en 2 min)
//   POST /verify    { name, uuid, serverId } → { token }                         (comprueba con Mojang que el jugador hizo joinServer con ese serverId)
//   POST /heartbeat { token }                → { ok:true }                       (marca el UUID como activo durante 2 min; el mod lo envía cada 30 s)
//   POST /query     { uuids:[…] }            → { nova:[uuids que usan Nova] }    (máx. 100 por consulta)
//   GET    /cloud   (Authorization: Bearer <token de /verify>) → { data, updated }  ajustes del jugador en la nube (404 si no hay)
//   PUT    /cloud   (ídem, cuerpo JSON ≤ 1 MB)                 → { ok, updated }    guarda: menu.json, apariencia del launcher y hasta 10 skins (png ≤ 64 KB)
//   DELETE /cloud   (ídem)                                      → { ok }             borra todo lo del jugador
//   La nube vive en el Durable Object «Cloud» (uno por UUID, con SQLite). Nunca guarda tokens ni contraseñas: si el JSON trae algo con ese aspecto se rechaza.
//
// Dónde vive cada cosa:
//   · Durable Object «Presence» (uno global, en memoria): mapa uuid → última vez visto, tokens activos y límites de peticiones.
//     /heartbeat y /query NO tocan KV.
//   · KV (binding NOVA): solo /challenge (serverId, 2 min) y los tokens de /verify (24 h), ambos con expirationTtl.
//     Los tokens también se guardan en el Durable Object; KV solo se consulta si el Durable Object se reinició y no conoce un token.
//
// Límites (dentro del Durable Object): 10 peticiones por minuto por IP y por token, y como mucho 100 UUIDs por consulta.
// Sin cuentas premium no hay verificación: el mod solo usa esto si se lanzó con -Dnova.premium=1.
// Despliegue: ver servidor/README.md.
import { DurableObject } from 'cloudflare:workers';

const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...h } });
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const UUID = /^[0-9a-f]{32}$/;
const norm = u => String(u || '').replace(/-/g, '').toLowerCase();
const ACTIVE_MS = 120000, TOKEN_MS = 86400000, WINDOW_MS = 60000;
const MAX_UUIDS = 100, REPORTS_PER_DAY = 10, MAX_REPORTS = 2000;
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

// ---- Ajustes en la nube: qué se acepta ----
const CLOUD_MAX = 1000000, CLOUD_SKINS = 10, CLOUD_PNG = 64 * 1024;
const SECRETO = /(token|passw|secret|cookie|session|authoriz|api_?key|cfkey|refresh|credential)/i;
const plano = o => o && typeof o === 'object' && !Array.isArray(o);
function tieneSecretos(v, depth = 0) {
  if (depth > 12) return true;
  if (Array.isArray(v)) return v.some(x => tieneSecretos(x, depth + 1));
  if (plano(v)) return Object.keys(v).some(k => SECRETO.test(k) || tieneSecretos(v[k], depth + 1));
  return false;
}
/** Comprueba el cuerpo de un PUT /cloud. Devuelve { ok:true, text } (JSON normalizado) o { ok:false, error }. */
function cloudClean(raw) {
  if (typeof raw !== 'string' || raw.length > CLOUD_MAX) return { ok: false, error: 'grande' };
  let b; try { b = JSON.parse(raw); } catch { return { ok: false, error: 'json' }; }
  if (!plano(b)) return { ok: false, error: 'datos' };
  const out = {};
  for (const k of ['menu', 'launcher']) { if (b[k] === undefined) continue; if (!plano(b[k])) return { ok: false, error: 'datos' }; out[k] = b[k]; }
  if (tieneSecretos(out)) return { ok: false, error: 'secretos' };
  if (b.skins !== undefined) {
    if (!Array.isArray(b.skins) || b.skins.length > CLOUD_SKINS) return { ok: false, error: 'skins' };
    out.skins = [];
    for (const z of b.skins) {
      if (!plano(z) || typeof z.png !== 'string' || z.png.length > Math.ceil(CLOUD_PNG / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(z.png)) return { ok: false, error: 'skins' };
      const head = atob(z.png.slice(0, 12));
      if (head.charCodeAt(0) !== 0x89 || head.slice(1, 4) !== 'PNG') return { ok: false, error: 'skins' };
      if (Math.floor(z.png.length * 3 / 4) > CLOUD_PNG) return { ok: false, error: 'skins' };
      out.skins.push({ name: clip(z.name, 30), model: z.model === 'slim' ? 'slim' : 'classic', png: z.png });
    }
  }
  const text = JSON.stringify(out);
  if (text.length > CLOUD_MAX) return { ok: false, error: 'grande' };
  return { ok: true, text };
}
export class Cloud extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS c (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated INTEGER NOT NULL)');
  }
  put(text) {
    const now = Date.now();
    this.sql.exec('INSERT INTO c (id, data, updated) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated = excluded.updated', text, now);
    return now;
  }
  get() { const r = this.sql.exec('SELECT data, updated FROM c WHERE id = 1').toArray()[0]; return r ? { data: r.data, updated: r.updated } : null; }
  wipe() { this.sql.exec('DELETE FROM c'); return true; }
}

const MAX_COMBOS = 300, MAX_USAGE_IDS = 5000, USAGE_DAYS = 90;   // límites del recuento anónimo
export class Presence extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.seen = new Map();     // uuid → última vez visto (ms)
    this.tokens = new Map();   // token → { uuid, exp }
    this.hits = new Map();     // «ip:1.2.3.4» o «tk:token» → { t: inicio de la ventana, n: peticiones }
    this.limit = Math.max(1, +env.RATE_LIMIT || 10);
  }
  // Cuenta una petición para la IP y (si hay) el token. Devuelve false si se pasó de las 10 por minuto.
  hit(ip, token) {
    const now = Date.now(); let ok = true;
    for (const k of [ip && 'ip:' + ip, token && 'tk:' + token]) {
      if (!k) continue;
      let h = this.hits.get(k);
      if (!h || now - h.t >= WINDOW_MS) h = { t: now, n: 0 };
      h.n++; this.hits.set(k, h);
      if (h.n > this.limit) ok = false;
    }
    this.sweepLater();
    return ok;
  }
  addToken(token, uuid) { this.tokens.set(token, { uuid, exp: Date.now() + TOKEN_MS }); this.beat(uuid); this.sweepLater(); }
  uuidOf(token) { const t = this.tokens.get(token); return t && t.exp > Date.now() ? t.uuid : null; }
  beat(uuid) { this.seen.set(uuid, Date.now()); this.sweepLater(); }
  query(list) {
    const now = Date.now();
    return list.slice(0, MAX_UUIDS).filter(u => { const t = this.seen.get(u); return t && now - t < ACTIVE_MS; });
  }
  // Informes de error anónimos: como mucho 10 al día por id, guardados en el almacenamiento del Durable Object
  async report(id, data) {
    const day = new Date().toISOString().slice(0, 10), dk = 'd:' + id + ':' + day;
    const n = (await this.ctx.storage.get(dk)) || 0;
    if (n >= REPORTS_PER_DAY) return false;
    await this.ctx.storage.put(dk, n + 1);
    await this.ctx.storage.put('r:' + Date.now().toString().padStart(15, '0') + ':' + hex(3), { ...data, id, t: Date.now() });
    const old = await this.ctx.storage.list({ prefix: 'r:' });
    if (old.size > MAX_REPORTS) { let k = old.size - MAX_REPORTS; for (const key of old.keys()) { if (k-- <= 0) break; await this.ctx.storage.delete(key); } }
    for (const key of (await this.ctx.storage.list({ prefix: 'd:' })).keys()) if (!key.endsWith(':' + day)) await this.ctx.storage.delete(key);
    return true;
  }
  // Recuento anónimo de lanzamientos: por día, cuántos lanzamientos hubo de cada combinación launcher·Minecraft·cargador y cuántas instalaciones distintas
  async usage(id, key) {
    const day = new Date().toISOString().slice(0, 10), dk = 'u:' + day;
    const u = (await this.ctx.storage.get(dk)) || { n: 0, combos: {}, ids: [] };
    if (!(key in u.combos) && Object.keys(u.combos).length >= MAX_COMBOS) key = 'otros';
    u.n++; u.combos[key] = (u.combos[key] || 0) + 1;
    if (u.ids.length < MAX_USAGE_IDS && !u.ids.includes(id)) u.ids.push(id);
    await this.ctx.storage.put(dk, u);
    const old = [...(await this.ctx.storage.list({ prefix: 'u:' })).keys()];
    for (const k of old.slice(0, Math.max(0, old.length - USAGE_DAYS))) await this.ctx.storage.delete(k);
    return true;
  }
  async usageSummary(days) {
    const l = await this.ctx.storage.list({ prefix: 'u:', reverse: true, limit: days });
    return [...l.entries()].map(([k, v]) => ({ day: k.slice(2), launches: v.n, installs: v.ids.length, combos: v.combos })).reverse();
  }
  async reports(limit) {
    const l = await this.ctx.storage.list({ prefix: 'r:', reverse: true, limit });
    return [...l.values()];
  }
  sweepLater() { this.ctx.storage.getAlarm().then(a => { if (!a) return this.ctx.storage.setAlarm(Date.now() + WINDOW_MS); }).catch(() => {}); }
  async alarm() {
    const now = Date.now();
    for (const [u, t] of this.seen) if (now - t >= ACTIVE_MS) this.seen.delete(u);
    for (const [k, t] of this.tokens) if (t.exp <= now) this.tokens.delete(k);
    for (const [k, h] of this.hits) if (now - h.t >= WINDOW_MS) this.hits.delete(k);
    if (this.seen.size || this.tokens.size || this.hits.size) await this.ctx.storage.setAlarm(now + WINDOW_MS);
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,PUT,DELETE' } });
    try {
      const room = env.PRESENCE.get(env.PRESENCE.idFromName('global'));
      const ip = req.headers.get('cf-connecting-ip') || '';
      if (p === '/challenge' && req.method === 'GET') {
        if (!await room.hit(ip, '')) return J({ error: 'limite' }, 429, { 'retry-after': '60' });
        const serverId = hex(20);
        await env.NOVA.put('c:' + serverId, '1', { expirationTtl: 120 });
        return J({ serverId });
      }
      if (p === '/reports' && req.method === 'GET') {      // solo para quien tenga el secreto (wrangler secret put REPORTS_SECRET)
        const auth = req.headers.get('authorization') || '';
        if (!env.REPORTS_SECRET || auth !== 'Bearer ' + env.REPORTS_SECRET) return J({ error: 'no autorizado' }, 401);
        if (!await room.hit(ip, '')) return J({ error: 'limite' }, 429, { 'retry-after': '60' });
        return J({ reports: await room.reports(Math.min(500, +url.searchParams.get('limit') || 100)) });
      }
      if (p === '/usage-summary' && req.method === 'GET') {  // solo para quien tenga el secreto (wrangler secret put USAGE_SECRET)
        const auth = req.headers.get('authorization') || '';
        if (!env.USAGE_SECRET || auth !== 'Bearer ' + env.USAGE_SECRET) return J({ error: 'no autorizado' }, 401);
        if (!await room.hit(ip, '')) return J({ error: 'limite' }, 429, { 'retry-after': '60' });
        return J({ days: await room.usageSummary(Math.min(USAGE_DAYS, +url.searchParams.get('days') || 30)) });
      }
      if (p === '/cloud' && ['GET', 'PUT', 'DELETE'].includes(req.method)) {
        const tk = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
        if (!/^[0-9a-f]{48}$/.test(tk)) return J({ error: 'token' }, 401);
        if (!await room.hit(ip, tk)) return J({ error: 'limite' }, 429, { 'retry-after': '60' });
        let uuid = await room.uuidOf(tk);
        if (!uuid) { uuid = await env.NOVA.get('t:' + tk); if (!uuid) return J({ error: 'token' }, 401); await room.addToken(tk, uuid); }
        const box = env.CLOUD.get(env.CLOUD.idFromName('u:' + uuid));
        if (req.method === 'GET') { const r = await box.get(); return r ? J({ data: JSON.parse(r.data), updated: r.updated }) : J({ error: 'vacio' }, 404); }
        if (req.method === 'DELETE') { await box.wipe(); return J({ ok: true }); }
        const len = +req.headers.get('content-length') || 0;
        if (len > CLOUD_MAX) return J({ error: 'grande' }, 413);
        const c = cloudClean(await req.text());
        if (!c.ok) return J({ error: c.error }, c.error === 'grande' ? 413 : 400);
        return J({ ok: true, updated: await box.put(c.text) });
      }
      if (req.method !== 'POST') return J({ error: 'nope' }, 404);
      const b = await req.json().catch(() => ({}));
      const token = String(b.token || '');
      if (!await room.hit(ip, /^[0-9a-f]{48}$/.test(token) ? token : '')) return J({ error: 'limite' }, 429, { 'retry-after': '60' });

      if (p === '/verify') {
        const name = String(b.name || ''), uuid = norm(b.uuid), serverId = String(b.serverId || '');
        if (!/^\w{1,16}$/.test(name) || !UUID.test(uuid) || !/^[0-9a-f]{40}$/.test(serverId)) return J({ error: 'datos' }, 400);
        if (!await env.NOVA.get('c:' + serverId)) return J({ error: 'caducado' }, 403);
        await env.NOVA.delete('c:' + serverId);                                   // un solo uso
        const r = await fetch('https://sessionserver.mojang.com/session/minecraft/hasJoined?username=' + encodeURIComponent(name) + '&serverId=' + serverId);
        if (r.status !== 200) return J({ error: 'mojang' }, 403);
        const j = await r.json();
        if (norm(j.id) !== uuid) return J({ error: 'uuid' }, 403);
        const t = hex(24);
        await env.NOVA.put('t:' + t, uuid, { expirationTtl: 86400 });
        await room.addToken(t, uuid);
        return J({ token: t });
      }

      if (p === '/heartbeat') {
        if (!/^[0-9a-f]{48}$/.test(token)) return J({ error: 'token' }, 401);
        let uuid = await room.uuidOf(token);
        if (!uuid) {                                                              // el Durable Object se reinició: se recupera el token desde KV una vez
          uuid = await env.NOVA.get('t:' + token);
          if (!uuid) return J({ error: 'token' }, 401);
          await room.addToken(token, uuid);
        } else await room.beat(uuid);
        return J({ ok: true });
      }

      if (p === '/report') {
        const id = String(b.id || '');
        if (!UUID.test(id) || !Array.isArray(b.log)) return J({ error: 'datos' }, 400);
        const ok = await room.report(id, { launcher: clip(b.launcher, 30), mc: clip(b.mc, 30), loader: clip(b.loader, 20), loaderVersion: clip(b.loaderVersion, 30), mod: clip(b.mod, 30), cause: clip(b.cause, 200), code: +b.code || 0, log: b.log.slice(-30).map(l => clip(l, 400)) });
        return ok ? J({ ok: true }) : J({ error: 'limite diario' }, 429);
      }
      if (p === '/usage') {   // {id: 32 hex aleatorios, launcher, mc, loader}: nada más (ni nombres, ni cuentas; la IP solo sirve para el límite de peticiones y no se guarda)
        const id = String(b.id || '');
        if (!/^[0-9a-f]{32}$/.test(id)) return J({ error: 'datos' }, 400);
        const launcher = /^[\w.-]{1,30}$/.test(String(b.launcher || '')) ? String(b.launcher) : '?', mc = /^[\w.-]{1,30}$/.test(String(b.mc || '')) ? String(b.mc) : '?';
        const loader = ['Vanilla', 'Fabric', 'Forge', 'NeoForge'].includes(b.loader) ? b.loader : 'otro';
        await room.usage(id, launcher + '|' + mc + '|' + loader);
        return J({ ok: true });
      }
      if (p === '/query') {
        const list = (Array.isArray(b.uuids) ? b.uuids : []).slice(0, MAX_UUIDS).map(norm).filter(u => UUID.test(u));
        return J({ nova: await room.query(list) });
      }
      return J({ error: 'nope' }, 404);
    } catch (e) { return J({ error: 'interno' }, 500); }
  }
};
