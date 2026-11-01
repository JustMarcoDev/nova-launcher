// =====================================================================================
// Nova Launcher · main/nube.js
// Ajustes en la nube: menú de Nova (menu.json), apariencia del launcher y hasta 10 skins, guardados en el Worker de Nova (servidor/worker.js)
// con la cuenta de Microsoft verificada (main/cuentas.js). Nunca se sube ningún token ni contraseña. Apagado de fábrica.
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { ipcMain } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { R } = require('./compartido');
const { cfgFile, load, rd, root, send, wr } = R; // base

const UP_DELAY = 30000, TICK = 10000, MAX_SKINS = 10, MAX_PNG = 64 * 1024;
// De la configuración del launcher solo viaja el aspecto (nada de cuentas, rutas, claves ni tokens)
const LAUNCHER_KEYS = ['accent', 'theme', 'bh', 'font', 'fontCustom', 'tsize', 'bold', 'contrast', 'rmotion', 'quality', 'fps', 'radius', 'panelAlpha', 'glassBlur', 'density', 'navW', 'focusRing', 'lsp', 'lh', 'intro', 'stars', 'bhBloom', 'bhLens', 'bhOther', 'lang'];
const SECRETO = /(token|passw|secret|cookie|session|authoriz|api_?key|cfkey|refresh|credential)/i;
const sinSecretos = v => Array.isArray(v) ? v.map(sinSecretos) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !SECRETO.test(k)).map(([k, x]) => [k, sinSecretos(x)])) : v;

const menuFile = () => path.join(R.novaDir(), 'menu.json');
const enabled = () => load().cloud === true && !(R.novaOff && R.novaOff('cloud'));
let st = { busy: false, err: '', last: 0, ask: false };

function fingerprint() {
  const f = x => { try { const s = fs.statSync(x); return s.mtimeMs + ':' + s.size; } catch { return '-'; } };
  const c = load(), pick = Object.fromEntries(LAUNCHER_KEYS.filter(k => k in c).map(k => [k, c[k]]));
  return [f(menuFile()), f(path.join(R.skinsDir(), 'skins.json')), JSON.stringify(pick)].join('|');
}
/** Lo que se sube. */
function gather() {
  const menu = sinSecretos(rd(menuFile(), {})), c = load();
  const launcher = Object.fromEntries(LAUNCHER_KEYS.filter(k => k in c).map(k => [k, c[k]]));
  const skins = [];
  for (const x of R.skinsIdx()) {
    if (skins.length >= MAX_SKINS) break;
    try { const b = fs.readFileSync(R.skinFile(x.id)); if (b.length <= MAX_PNG && R.isPng(b)) skins.push({ name: String(x.name || 'Skin').slice(0, 30), model: x.model === 'slim' ? 'slim' : 'classic', png: b.toString('base64') }); } catch {}
  }
  const data = { menu: menu && typeof menu === 'object' && !Array.isArray(menu) ? menu : {}, launcher, skins };
  const text = JSON.stringify(data);
  return { data, text, hash: crypto.createHash('sha1').update(text).digest('hex') };
}
async function call(method, body) {
  const base = R.cloudBase(); if (!base) throw new Error('No hay servidor de la nube configurado');
  for (let intento = 0; intento < 2; intento++) {
    const t = await R.cloudToken(intento === 1);
    const r = await fetch(base + '/cloud', { method, headers: { authorization: 'Bearer ' + t.token, ...(body ? { 'content-type': 'application/json' } : {}) }, body, signal: AbortSignal.timeout(30000) });
    if (r.status === 401 && intento === 0) continue;
    return r;
  }
}
async function upload() {
  const g = gather();
  const r = await call('PUT', g.text);
  if (!r.ok) throw new Error(r.status === 413 ? 'Tus ajustes pasan de 1 MB' : r.status === 429 ? 'Demasiadas peticiones, se reintentará' : 'El servidor rechazó los ajustes (' + r.status + ')');
  const j = await r.json();
  wr(cfgFile, { ...load(), cloudHash: g.hash, cloudAt: j.updated || Date.now() });
  return g.hash;
}
/** Guarda lo de este PC antes de que lo sustituya la nube: <datos>/backups/nube/<fecha>/ */
function localBackup() {
  const t = new Date(), z = n => String(n).padStart(2, '0');
  const dir = path.join(root, 'backups', 'nube', `${t.getFullYear()}${z(t.getMonth() + 1)}${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}${z(t.getSeconds())}`);
  fs.mkdirSync(dir, { recursive: true });
  const g = gather();
  fs.writeFileSync(path.join(dir, 'ajustes.json'), JSON.stringify({ launcher: g.data.launcher }, null, 1));
  try { fs.copyFileSync(menuFile(), path.join(dir, 'menu.json')); } catch {}
  try { fs.cpSync(R.skinsDir(), path.join(dir, 'skins'), { recursive: true }); } catch {}
  return dir;
}
function apply(data) {
  const back = localBackup();
  if (data.menu && typeof data.menu === 'object') { const f = menuFile(), tmp = f + '.tmp'; fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(sinSecretos(data.menu))); fs.renameSync(tmp, f); }
  if (data.launcher && typeof data.launcher === 'object') {
    const pick = Object.fromEntries(LAUNCHER_KEYS.filter(k => k in data.launcher).map(k => [k, data.launcher[k]]));
    wr(cfgFile, { ...load(), ...pick });
  }
  if (Array.isArray(data.skins)) {
    const have = R.skinsIdx(), tengo = new Set(have.map(x => { try { return fs.readFileSync(R.skinFile(x.id)).toString('base64'); } catch { return ''; } }));
    const nuevas = [];
    for (const s of data.skins.slice(0, MAX_SKINS)) {
      if (!s || typeof s.png !== 'string' || tengo.has(s.png)) continue;
      const b = Buffer.from(s.png, 'base64'); if (b.length > MAX_PNG || !R.isPng(b)) continue;
      const id = 's' + crypto.randomBytes(5).toString('hex'); fs.writeFileSync(R.skinFile(id), b);
      nuevas.push({ id, name: String(s.name || 'Skin').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 30) || 'Skin', model: s.model === 'slim' ? 'slim' : 'classic' });
    }
    if (nuevas.length) R.skinsPut([...have, ...nuevas]);
  }
  return back;
}

let lastFp = '', changedAt = 0, timer = null;
async function tick() {
  if (!enabled() || st.busy || st.ask) return;
  try {
    const fp = fingerprint(); if (fp !== lastFp) { lastFp = fp; changedAt = Date.now(); return; }
    if (!changedAt || Date.now() - changedAt < UP_DELAY) return;
    changedAt = 0;
    if (gather().hash === load().cloudHash) return;
    st.busy = true; st.err = '';
    try { await upload(); st.last = Date.now(); } finally { st.busy = false; }
  } catch (e) { st.err = String(e && e.message || e); st.busy = false; }
}
/** Al encender el interruptor (o al abrir con él encendido): en un PC nuevo pregunta si se recuperan los ajustes de la nube. */
async function start() {
  clearInterval(timer); timer = null; st.ask = false;
  if (!enabled()) return status();
  try {
    if (!load().cloudHash) {
      const r = await call('GET');
      if (r.ok) { const j = await r.json(); st.ask = true; st.cloudAt = j.updated; send('cloud:ask', { updated: j.updated }); }
      else if (r.status === 404) { st.busy = true; try { await upload(); st.last = Date.now(); } finally { st.busy = false; } }
      else throw new Error('El servidor respondió ' + r.status);
    }
    lastFp = fingerprint();
  } catch (e) { st.err = String(e && e.message || e); }
  timer = setInterval(() => { tick().catch(() => {}); }, TICK); if (timer.unref) timer.unref();
  return status();
}
function status() {
  const c = load(), acc = R.accState ? R.accState().act : null;
  return { on: c.cloud === true, remoteOff: !!(R.novaOff && R.novaOff('cloud')), configured: !!R.cloudBase(), microsoft: !!(acc && acc.type === 'microsoft'), busy: st.busy, ask: st.ask, err: st.err, last: st.last || c.cloudAt || 0 };
}
ipcMain.handle('cloud:status', () => status());
ipcMain.handle('cloud:sync', () => start());
ipcMain.handle('cloud:now', async () => {
  if (!enabled()) throw new Error('La nube está apagada');
  st.busy = true; st.err = '';
  try { await upload(); st.last = Date.now(); } catch (e) { st.err = String(e && e.message || e); throw e; } finally { st.busy = false; }
  return status();
});
ipcMain.handle('cloud:restore', async () => {
  if (!enabled()) throw new Error('La nube está apagada');
  st.busy = true; st.err = '';
  try {
    const r = await call('GET'); if (r.status === 404) throw new Error('Aún no hay nada guardado en la nube'); if (!r.ok) throw new Error('El servidor respondió ' + r.status);
    const j = await r.json(), back = apply(j.data || {}), g = gather();
    wr(cfgFile, { ...load(), cloudHash: g.hash, cloudAt: j.updated || Date.now() });
    st.ask = false; st.last = Date.now(); lastFp = fingerprint(); changedAt = 0;
    return { ...status(), backup: back };
  } catch (e) { st.err = String(e && e.message || e); throw e; } finally { st.busy = false; }
});
// «No»: se queda lo de este PC y lo de la nube se sustituye por ello
ipcMain.handle('cloud:keep', async () => {
  st.ask = false; st.busy = true;
  try { await upload(); st.last = Date.now(); lastFp = fingerprint(); } catch (e) { st.err = String(e && e.message || e); } finally { st.busy = false; }
  return status();
});
ipcMain.handle('cloud:wipe', async () => {
  const r = await call('DELETE'); if (!r.ok) throw new Error('El servidor respondió ' + r.status);
  wr(cfgFile, { ...load(), cloudHash: '', cloudAt: 0 }); st.last = 0;
  return status();
});
setTimeout(() => { if (enabled()) start().catch(() => {}); }, 8000);

Object.assign(R, { cloudStart: start });
module.exports = { gather, apply, sinSecretos, LAUNCHER_KEYS };
