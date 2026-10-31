// =====================================================================================
// Nova Launcher · main/errores.js
// Informes de errores: se guardan en la carpeta «errores» y viajan a la interfaz
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { app, ipcMain, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { fsp, root } = R; // base

// ---- Informes de errores de descarga (mods, modpacks): se guardan en la carpeta «errores» ----
const errDir = () => path.join(root, 'errores');
const p2 = n => String(n).padStart(2, '0');
function logErr(kind, err, info = {}) {
  try {
    fs.mkdirSync(errDir(), { recursive: true });
    const d = new Date(), stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}`;
    const f = path.join(errDir(), `${stamp}_${String(kind).replace(/[^\w-]/g, '')}.txt`);
    const m = err && err.message || String(err), c = err && err.cause;
    const L = ['Nova Launcher · informe de error', '='.repeat(40), 'Fecha: ' + d.toISOString(), 'Versión del launcher: ' + app.getVersion(), `Sistema: ${process.platform} ${os.release()} ${process.arch}`, 'Tipo: ' + kind, ''];
    if (err && err.step) L.push('Paso en el que falló: ' + err.step);
    for (const [k, v] of Object.entries(info)) if (v !== undefined && v !== null && v !== '') L.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v)));
    L.push('', 'Causa: ' + m);
    if (err && err.code) L.push('Código: ' + err.code);
    if (c) L.push('Causa interna: ' + (c.message || c) + (c.code ? ' (' + c.code + ')' : ''));
    if (err && err.stack) L.push('', 'Detalle técnico:', String(err.stack).split('\n').slice(0, 12).join('\n'));
    L.push('', 'Si pides ayuda, envía este archivo tal cual.');
    fs.writeFileSync(f, L.join('\n'));
    try { const all = fs.readdirSync(errDir()).filter(x => x.endsWith('.txt')).sort(); for (const x of all.slice(0, Math.max(0, all.length - 40))) fs.rmSync(path.join(errDir(), x), { force: true }); } catch {}
    return f;
  } catch { return ''; }
}
// El error viaja al interfaz con la ruta del informe al final: «mensaje ‹informe: ruta›»
const withLog = (e, f) => { const m = (e && e.message || String(e)) + (f ? ' ‹informe: ' + f + '›' : ''); const x = new Error(m); x.cancel = e && e.cancel; return x; };
ipcMain.handle('err:log', (e, o = {}) => logErr(String(o.kind || 'descarga').slice(0, 30), Object.assign(new Error(String(o.message || 'Error').slice(0, 600)), { step: String(o.step || '').slice(0, 80), stack: String(o.stack || '').slice(0, 2000) }), { 'Qué se intentaba': String(o.what || '').slice(0, 200), Dirección: String(o.url || '').slice(0, 300) }));
ipcMain.handle('err:text', async (e, f) => { const p = path.resolve(String(f || '')); if (!p.startsWith(path.resolve(errDir()) + path.sep)) throw new Error('Archivo no válido'); return (await fsp.readFile(p, 'utf8')).slice(0, 6000); });
ipcMain.handle('err:folder', () => { fs.mkdirSync(errDir(), { recursive: true }); return shell.openPath(errDir()); });

// ---- Informes de error anónimos (opcionales, apagados de fábrica) ----
// Solo se envían si el jugador activa «Enviar informes de error anónimos». Antes de salir se borran nombres de usuario,
// rutas de usuario, IPs y tokens. El id es aleatorio por instalación (nunca el nombre de la cuenta).
const crypto = require('crypto');
function installId() {
  const f = path.join(root, 'report-id.txt');
  try { const t = fs.readFileSync(f, 'utf8').trim(); if (/^[0-9a-f]{32}$/.test(t)) return t; } catch {}
  const id = crypto.randomBytes(16).toString('hex');
  try { fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(f, id); } catch {}
  return id;
}
function scrub(text, names = []) {
  let t = String(text == null ? '' : text);
  t = t.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]{8,}/gi, '$1 [token]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]*)?/g, '[token]')
    .replace(/\b(access[_-]?token|accessToken|refresh[_-]?token|session|token|password|passwd|secret|api[_-]?key|key|uuid|auth)(["']?\s*[:=]\s*["']?)[^\s"',;&)]{6,}/gi, '$1$2[borrado]')
    .replace(/(--(?:accessToken|uuid|xuid|clientId|username|session)\s+)\S+/gi, '$1[borrado]')
    .replace(/(sessionId\w*[:=]\s*)\S+/gi, '$1[borrado]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uuid]')
    .replace(/\b[0-9a-f]{32}\b/gi, '[uuid]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[token]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g, '[ip]')
    .replace(/\b(?:[0-9a-f]{1,4}:){4,7}[0-9a-f]{1,4}\b/gi, '[ip]')
    .replace(/([A-Za-z]:[\\/]+Users[\\/]+)[^\\/\s"'<>|:]+/gi, '$1[usuario]')
    .replace(/(\/(?:home|Users)\/)[^\/\s"'<>|:]+/g, '$1[usuario]');
  const us = new Set([...names, os.userInfo().username].map(x => String(x || '').trim()).filter(x => x.length >= 3));
  for (const n of us) t = t.split(n).join('[usuario]');
  return t;
}
const lastReport = { t: 0 };
async function sendCrashReport(info) {
  if (R.novaOff && R.novaOff('reports')) return;
  try {
    const cfg = R.load(); if (cfg.errReports !== true) return false;
    let url = ''; try { url = String(process.env.NOVA_PRESENCE || require('../package.json').novaPresence || '').replace(/\/+$/, ''); } catch {}
    if (!/^https:\/\//.test(url) || Date.now() - lastReport.t < 20000) return false;
    lastReport.t = Date.now();
    const names = info.names || [];
    const body = {
      id: installId(), launcher: app.getVersion(), mc: String(info.mc || '').slice(0, 30), loader: String(info.ld || '').slice(0, 20), loaderVersion: String(info.loaderVersion || '').slice(0, 30),
      mod: String(info.mod || '').slice(0, 30), cause: scrub(info.cause, names).slice(0, 200), code: Number.isFinite(+info.code) ? +info.code : 0,
      log: (info.tail || []).slice(-30).map(l => scrub(l, names).slice(0, 400))
    };
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
    try { const r = await fetch(url + '/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }); return r.ok; } finally { clearTimeout(tm); }
  } catch { return false; }
}

// Lo que usan otros módulos
Object.assign(R, { logErr, withLog, sendCrashReport, scrubReport: scrub });
