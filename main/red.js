// =====================================================================================
// Nova Launcher · main/red.js
// Red: fetch con avisos claros, get/post, ejecutar comandos y comprobar si hay conexión
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { app, ipcMain } = require('electron');
const { execFile } = require('child_process');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { MAN } = R; // base

// =====================================================================================
// NOVA LAUNCHER · proceso principal (Electron)
// -------------------------------------------------------------------------------------
// Aquí vive todo lo que toca el sistema: archivos, descargas, Java, lanzar Minecraft,
// cuentas, actualizaciones... La interfaz (index.html + js/) le pide cosas por IPC
// (ver preload.js) y este archivo las hace.
// Orden aproximado de lo que contiene (se pueden buscar los títulos «// =====» y «// ----»):
//   · Utilidades de archivos (guardado seguro, reintentos si el antivirus bloquea)
//   · Java, descargas y versiones de Minecraft · Lanzar el juego
//   · Actualizaciones, Discord, acceso directo, servidores
//   · Instancias, mods, copias de seguridad, importar/exportar
//   · Cuentas, bandeja, capturas, mundos, shaders
//   · Menú de Nova dentro del juego (skin, fondos propios, ajustes)
//   · Cola de descargas, diagnóstico, arrastrar y soltar
// =====================================================================================
let electronNet = null;
try { electronNet = require('electron').net; } catch {}
const UA = () => 'NovaLauncher/' + app.getVersion() + ' (github.com/JustMarcoDev/nova-launcher)';
// Los fallos de red de Node dicen solo «fetch failed»: se completa con el servidor al que no se pudo llegar
const rawFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  try { return await rawFetch(u, o); }
  catch (e) { if (e && e.message === 'fetch failed') { let h = ''; try { h = new URL(String(u && u.href || u)).host; } catch {} const c = e.cause && (e.cause.code || e.cause.message); e.message = 'No se pudo conectar con ' + (h || 'el servidor') + (c ? ' (' + c + ')' : ''); } throw e; }
};
// ---- Alternativas de conexión (punto 10): Node → red de Chromium → servidores alternativos (assets/mirrors.json) → copia en disco ----
const fsx = require('fs'), pathx = require('path'), cryptox = require('crypto');
let MIR = null, MIRT = 0;
function mirrors() {
  if (MIR && Date.now() - MIRT < 30000) return MIR;
  let m = { rules: [], cacheMaxMB: 30 };
  for (const f of [pathx.join(R.root || '', 'mirrors.json'), pathx.join(__dirname, '..', 'assets', 'mirrors.json')]) {
    try { if (f && fsx.existsSync(f)) { const j = JSON.parse(fsx.readFileSync(f, 'utf8')); if (j && Array.isArray(j.rules)) { m = j; break; } } } catch {}
  }
  MIRT = Date.now(); return MIR = m;
}
// Direcciones alternativas de una dirección original (en orden); vacío si no hay regla
function mirrorsFor(u) {
  u = String(u); const out = [];
  for (const r of mirrors().rules) for (const m of r.match || []) if (u.startsWith(m)) { for (const x of r.mirrors || []) out.push(x + u.slice(m.length)); break; }
  return [...new Set(out)];
}
const ruleOf = u => mirrors().rules.find(r => (r.match || []).some(m => String(u).startsWith(m)));
// Cambia en un texto (por ejemplo el JSON de una versión) las direcciones de Mojang por las del servidor alternativo
function rewriteWithMirror(txt) {
  let t = String(txt);
  for (const r of mirrors().rules) { const mir = (r.mirrors || [])[0]; if (!mir) continue; for (const m of r.match || []) t = t.split(m).join(mir); }
  return t;
}
let mirNote = 0;
function mirrorNotice(u) {
  let h = ''; try { h = new URL(u).host; } catch {}
  R.mirrorLast = { host: h, t: Date.now() };
  if (Date.now() - mirNote > 60000) { mirNote = Date.now(); try { R.send && R.send('status', 'Usando un servidor alternativo (' + h + ')'); } catch {} }
}
const netCache = u => pathx.join(R.root || '', 'cache', 'net', cryptox.createHash('sha1').update(String(u)).digest('hex') + '.bin');
const hashBuf = (b, a) => cryptox.createHash(a).update(b).digest('hex');
const hashOk = (b, o) => { const w = String((o && (o.sha512 || o.sha1)) || '').toLowerCase(); return !w || hashBuf(b, o.sha512 ? 'sha512' : 'sha1') === w; };
async function fetchBuf(u, h, how, timeout) {
  const o = { signal: AbortSignal.timeout(timeout), headers: { 'User-Agent': UA(), ...h } };
  const r = how === 'node' ? await fetch(u, o) : await electronNet.fetch(u, o);
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { http: r.status });
  return Buffer.from(await r.arrayBuffer());
}
const conv = (b, t) => t === 'json' ? JSON.parse(b.toString('utf8')) : t === 'text' ? b.toString('utf8') : t === 'arrayBuffer' ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b;
async function getWithFallback(u, t = 'json', h = {}, o = {}) {
  const timeout = t === 'arrayBuffer' ? 600000 : 30000, tryU = [{ u, how: 'node' }];
  if (electronNet && electronNet.fetch) tryU.push({ u, how: 'chromium' });
  const rule = ruleOf(u), secret = Object.keys(h || {}).some(k => /^(authorization|x-api-key|cookie)$/i.test(k)), cache = !secret && (!rule || rule.cache !== false && mirrors().cache !== false);
  for (const m of mirrorsFor(u)) { tryU.push({ u: m, how: 'node', mirror: true }); if (electronNet && electronNet.fetch) tryU.push({ u: m, how: 'chromium', mirror: true }); }
  let first = null;
  for (const a of tryU) {
    try {
      const b = await fetchBuf(a.u, h, a.how, timeout);
      if (!hashOk(b, o)) throw new Error('huella distinta');
      if (a.mirror) mirrorNotice(a.u);
      try { const max = (mirrors().cacheMaxMB || 30) * 1048576; if (cache && b.length <= max && R.root) { const f = netCache(u); fsx.mkdirSync(pathx.dirname(f), { recursive: true }); fsx.writeFileSync(f, b); } } catch {}
      return conv(b, t);
    } catch (e) { if (!first) first = e; if (e && e.http === 404 && !a.mirror) break; }   // 404 del original: no existe, no se insiste con los espejos
  }
  // Último recurso: la copia de la última vez que funcionó (solo si se sabe que es la misma: con huella se vuelve a comprobar)
  try { const f = netCache(u); if (fsx.existsSync(f)) { const b = fsx.readFileSync(f); if (hashOk(b, o)) { try { R.send && R.send('status', 'Sin conexión con el servidor: se usa la copia guardada'); } catch {} return conv(b, t); } } } catch {}
  throw first || new Error('Sin conexión');
}
const get = (u, t = 'json', h = {}, o = {}) => getWithFallback(u, t, h, o);
const run = (cmd, args, opt = {}) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e8, ...opt }, e => e ? rej(e) : res()));
ipcMain.handle('http', (e, { url, headers }) => get(url, 'json', headers || {}));
const post = async (u, body) => { const r = await fetch(u, { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': UA(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
// ===== 0.2.13: sin conexión, diagnóstico, cola de descargas, arrastrar y soltar, GPU, ajustes de Java, último mundo =====
let onl = { t: 0, v: true };
async function isOnline(force) {
  if (!force && Date.now() - onl.t < 15000) return onl.v;
  let v = true; try { const r = await fetch(MAN, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); v = !!r && r.ok !== false; } catch { v = false; }
  R.mirrorMode = false;
  if (!v) for (const m of mirrorsFor(MAN)) { try { const r = await fetch(m, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); if (r && r.ok !== false) { v = true; R.mirrorMode = true; mirrorNotice(m); break; } } catch {} }
  onl = { t: Date.now(), v }; return v;
}


// Lo que usan otros módulos

// ---- Archivos firmados: se baja el archivo y su .sig; solo se acepta si la firma es válida (main/firma.js) ----
// Devuelve { text, json } o lanza un error (red, HTTP o firma). Quien lo llama decide qué usar si falla: lo incluido o la copia anterior.
async function fetchFirmado(url, timeout = 5000) {
  const { verificar } = require('./firma');
  const h = { 'User-Agent': UA() };
  const [a, b] = await Promise.all([fetch(url, { signal: AbortSignal.timeout(timeout), headers: h }), fetch(url + '.sig', { signal: AbortSignal.timeout(timeout), headers: h })]);
  if (!a.ok) throw new Error('HTTP ' + a.status);
  if (!b.ok) throw new Error('sin firma (HTTP ' + b.status + ')');
  const buf = Buffer.from(await a.arrayBuffer()), sig = await b.text();
  if (!verificar(buf, sig)) throw new Error('firma no válida');
  const text = buf.toString('utf8');
  return { text, sig, json: JSON.parse(text) };
}
// Lo mismo para algo que ya se guardó en disco (copia anterior): se vuelve a comprobar la firma al leerla
function leerFirmado(text, sig) {
  const { verificar } = require('./firma');
  if (typeof text !== 'string' || !verificar(text, sig)) return null;
  try { return JSON.parse(text); } catch { return null; }
}
Object.assign(R, { fetchFirmado, leerFirmado, UA, get, getWithFallback, isOnline, mirrorsFor, rewriteWithMirror, mirrorNotice, post, run });
