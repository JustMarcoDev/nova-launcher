// =====================================================================================
// Nova Launcher · main/red.js
// Red: fetch con avisos claros, get/post, ejecutar comandos y comprobar si hay conexión
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
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
const get = async (u, t = 'json', h = {}) => {
  const o = () => ({ signal: AbortSignal.timeout(t === 'arrayBuffer' ? 600000 : 30000), headers: { 'User-Agent': UA(), ...h } });
  let r;
  try { r = await fetch(u, o()); }
  catch (e) { // fallo de red de Node (proxy del sistema, antivirus, DNS…): se reintenta con la red de Chromium, que sí usa la configuración del sistema
    const nf = electronNet && electronNet.fetch; if (!nf) throw e;
    try { r = await nf.call(electronNet, u, o()); } catch { throw e; }
  }
  if (!r.ok) throw new Error('HTTP ' + r.status); return r[t](); };
const run = (cmd, args, opt = {}) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e8, ...opt }, e => e ? rej(e) : res()));
ipcMain.handle('http', (e, { url, headers }) => get(url, 'json', headers || {}));
const post = async (u, body) => { const r = await fetch(u, { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': UA(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
// ===== 0.2.13: sin conexión, diagnóstico, cola de descargas, arrastrar y soltar, GPU, ajustes de Java, último mundo =====
let onl = { t: 0, v: true };
async function isOnline(force) {
  if (!force && Date.now() - onl.t < 15000) return onl.v;
  let v = true; try { const r = await fetch(MAN, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); v = !!r && r.ok !== false; } catch { v = false; }
  onl = { t: Date.now(), v }; return v;
}


// Lo que usan otros módulos
Object.assign(R, { UA, get, isOnline, post, run });
