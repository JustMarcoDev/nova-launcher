// =====================================================================================
// Nova Launcher · main/errores.js
// Informes de errores: se guardan en la carpeta «errores» y viajan a la interfaz
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
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


// Lo que usan otros módulos
Object.assign(R, { logErr, withLog });
