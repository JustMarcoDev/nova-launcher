// Servidor de presencia de Nova (Cloudflare Worker + Durable Object + KV).
// Permite que el menú de Nova muestre el logo junto al nombre de los jugadores que usan Nova.
//
// Endpoints (todos devuelven JSON; son los mismos de siempre, el mod no cambia):
//   GET  /challenge                         → { serverId }                       (id aleatorio de un solo uso, caduca en 2 min)
//   POST /verify    { name, uuid, serverId } → { token }                         (comprueba con Mojang que el jugador hizo joinServer con ese serverId)
//   POST /heartbeat { token }                → { ok:true }                       (marca el UUID como activo durante 2 min; el mod lo envía cada 30 s)
//   POST /query     { uuids:[…] }            → { nova:[uuids que usan Nova] }    (máx. 100 por consulta)
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
const MAX_UUIDS = 100;

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
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' } });
    try {
      const room = env.PRESENCE.get(env.PRESENCE.idFromName('global'));
      const ip = req.headers.get('cf-connecting-ip') || '';
      if (p === '/challenge' && req.method === 'GET') {
        if (!await room.hit(ip, '')) return J({ error: 'limite' }, 429, { 'retry-after': '60' });
        const serverId = hex(20);
        await env.NOVA.put('c:' + serverId, '1', { expirationTtl: 120 });
        return J({ serverId });
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

      if (p === '/query') {
        const list = (Array.isArray(b.uuids) ? b.uuids : []).slice(0, MAX_UUIDS).map(norm).filter(u => UUID.test(u));
        return J({ nova: await room.query(list) });
      }
      return J({ error: 'nope' }, 404);
    } catch (e) { return J({ error: 'interno' }, 500); }
  }
};
