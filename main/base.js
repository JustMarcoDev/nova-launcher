// =====================================================================================
// Nova Launcher · main/base.js
// Núcleo: rutas, archivos (guardado seguro), ajustes, instancia única y envío de mensajes a la ventana
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { S, R } = require('./compartido');

const root = path.join(app.getPath('appData'), '.nova');
const cfgFile = path.join(root, 'config.json'), insFile = path.join(root, 'instances.json');
const DEF = { username: 'Jugador', ram: 4, javaPath: '', width: 1280, height: 720, fullscreen: false, jvmArgs: '', optimize: true, closeOnLaunch: false, cfKey: '', ms: null };
const fsp = fs.promises, rmAsync = (p) => fsp.rm(p, { recursive: true, force: true });
// Guardado seguro: se escribe en .tmp y se renombra; antes se guarda una copia .bak del archivo bueno. Si el archivo se estropea, rd recupera la copia.
const rd = (f, d) => {
  let raw; try { raw = fs.readFileSync(f); } catch { return d; }
  try { return JSON.parse(raw); } catch {}
  try { const v = JSON.parse(fs.readFileSync(f + '.bak')); try { fs.writeFileSync(f, JSON.stringify(v, null, 1)); } catch {} return v; } catch { return d; }
};
// Mover/renombrar archivos en Windows: el antivirus o el indexador a veces bloquean un instante el archivo recién escrito (EPERM/EBUSY/EACCES).
// Se reintenta unas veces y, si sigue bloqueado, se copia y se borra el original.
const LOCKED = e => e && ['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(e.code);
const mvSync = (a, b) => {
  for (let i = 0; ; i++) {
    try { return fs.renameSync(a, b); }
    catch (e) {
      if (!LOCKED(e)) throw e;
      if (i >= 6) { fs.copyFileSync(a, b); try { fs.unlinkSync(a); } catch {} return; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80 * (i + 1));
    }
  }
};
const mv = async (a, b) => {
  for (let i = 0; ; i++) {
    try { return await fs.promises.rename(a, b); }
    catch (e) {
      if (!LOCKED(e)) throw e;
      if (i >= 8) { await fs.promises.copyFile(a, b); try { await fs.promises.unlink(a); } catch {} return; }
      await new Promise(r => setTimeout(r, 120 * (i + 1)));
    }
  }
};
const wr = (f, d) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const txt = JSON.stringify(d, null, 1), tmp = f + '.tmp';
  try { JSON.parse(fs.readFileSync(f)); fs.copyFileSync(f, f + '.bak'); } catch {}
  try { fs.writeFileSync(tmp, txt); mvSync(tmp, f); }
  catch (e) { try { fs.rmSync(tmp, { force: true }); } catch {} fs.writeFileSync(f, txt); }
};
const load = () => ({ ...DEF, ...rd(cfgFile, {}) }), li = () => rd(insFile, []);
const addInst = o => { const L = li(); let id = Date.now().toString(36); while (L.some(x => x.id === id)) id += Math.random().toString(36).slice(2, 4); const i = { id, ...o }; wr(insFile, [...L, i]); return i; };
const FIRST = !fs.existsSync(cfgFile) && !fs.existsSync(insFile);
if (rd(cfgFile, {}).hwaccel === false) app.disableHardwareAcceleration();
// Modo bajo consumo (objetivo: el launcher por debajo de 1 GB de RAM). Por defecto se activa solo en PCs con 8 GB o menos.
const LOWRAM = (() => { const v = rd(cfgFile, {}).lowRam; return v === undefined || v === null ? os.totalmem() <= 8 * 1073741824 : !!v; })();
try {
  const sw = app.commandLine;
  // Sin aislamiento de sitios (la app solo abre contenido propio): menos procesos de Chromium = menos RAM
  sw.appendSwitch('disable-site-isolation-trials');
  sw.appendSwitch('disable-features', 'MediaSessionService,HardwareMediaKeyHandling,OptimizationHints,Translate,AutofillServerCommunication');
  sw.appendSwitch('disable-background-networking'); sw.appendSwitch('no-pings');
  // expose-gc deja liberar memoria a mano al minimizar; el tope del montón de JS evita que la interfaz crezca sin límite
  sw.appendSwitch('js-flags', '--expose-gc --max-old-space-size=' + (LOWRAM ? 192 : 384) + (LOWRAM ? ' --optimize-for-size' : ''));
  if (LOWRAM) { sw.appendSwitch('enable-low-end-device-mode'); sw.appendSwitch('disable-gpu-shader-disk-cache'); }
  require('v8').setFlagsFromString('--expose-gc'); global.gc = require('vm').runInNewContext('gc');
} catch {}
const MAN = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
S.updater = null;
if (process.platform === 'win32') app.setAppUserModelId('com.nova.launcher');
// En Linux/Chromebook el AppImage no puede usar el sandbox de Chromium (necesita permisos de root); la app solo abre contenido propio
if (process.platform === 'linux' && app.commandLine) app.commandLine.appendSwitch('no-sandbox');
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else app.on('second-instance', () => { if (S.win) { if (S.win.isMinimized()) S.win.restore(); S.win.show(); S.win.focus(); } });
const send = (c, d) => S.win && S.win.webContents.send(c, d);
const running = new Set();
// Repositorio de GitHub del que salen las actualizaciones, las versiones anteriores y las notas
const UPD = { owner: 'JustMarcoDev', repo: 'nova-launcher' };


// Lo que usan otros módulos
Object.assign(R, { FIRST, LOWRAM, MAN, UPD, addInst, cfgFile, fsp, insFile, li, load, mv, mvSync, rd, rmAsync, root, running, send, single, wr });
