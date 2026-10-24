// =====================================================================================
// Nova Launcher · main/sistema.js
// Sistema: iconos, accesos directos, bandeja, avisos, portapapeles, capturas y diagnóstico
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { Notification, app, clipboard, dialog, ipcMain, nativeImage, shell } = require('electron');
const { pathToFileURL } = require('url');
const fs = require('fs');
const os = require('os');
const path = require('path');
const APP = path.join(__dirname, '..'); // carpeta de la app (donde están assets/, preload.js…)
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { cfgFile, li, load, root, wr } = R; // base
const { getIns, iDir, safeName } = R; // instancias
const { isOnline } = R; // red
const { accState } = R; // cuentas
const { diagnose } = R; // juego

ipcMain.handle('shortcut:create', () => ensureShortcut(true));
// ===== Icono de la app (ventana, barra de tareas y accesos directos) =====
// El .ico va dentro del paquete (asar): para los accesos directos de Windows hace falta una copia real en disco.
function appIcon() {
  try { const i = nativeImage.createFromPath(path.join(APP, 'assets', 'nova.ico')); if (i && !i.isEmpty()) return i; } catch {}
  return undefined;
}
// Fuerza el logo de Nova en la barra de tareas de Windows: icono de la ventana + detalles de la barra (icono propio, no el del .exe) + accesos directos anclados.
function taskbarIcon() {
  if (process.platform !== 'win32') return;
  try { const i = appIcon(); if (i && S.win) S.win.setIcon(i); } catch {}
  try {
    const ico = iconFile();
    if (S.win && app.isPackaged) S.win.setAppDetails({ appId: 'com.nova.launcher', appIconPath: ico, appIconIndex: 0, relaunchCommand: '"' + process.execPath + '"', relaunchDisplayName: 'Nova Launcher' });
  } catch {}
}
// Accesos directos de Nova Launcher anclados a la barra de tareas o al menú Inicio: se les pone el icono de Nova (el .exe lleva el icono genérico de Electron).
function fixPinnedIcons() {
  try {
    if (process.platform !== 'win32' || !app.isPackaged) return;
    const ico = iconFile(), ad = app.getPath('appData');
    for (const d of [path.join(ad, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar'), path.join(ad, 'Microsoft', 'Windows', 'Start Menu', 'Programs'), app.getPath('desktop')]) {
      let fl = []; try { fl = fs.readdirSync(d).filter(f => /\.lnk$/i.test(f)); } catch { continue; }
      for (const f of fl) {
        const p = path.join(d, f);
        try { const l = shell.readShortcutLink(p); if (l && l.target && path.resolve(l.target).toLowerCase() === path.resolve(process.execPath).toLowerCase() && l.icon !== ico) shell.writeShortcutLink(p, 'update', { icon: ico, iconIndex: 0 }); } catch {}
      }
    }
  } catch {}
}
function iconFile() {
  try { const dst = path.join(root, 'nova.ico'); fs.mkdirSync(root, { recursive: true }); fs.copyFileSync(path.join(APP, 'assets', 'nova.ico'), dst); return dst; } catch { return process.execPath; }
}
// ===== Acceso directo del escritorio =====
function ensureShortcut(force) {
  try {
    if (process.platform !== 'win32' || !app.isPackaged) return false;
    const lnk = path.join(app.getPath('desktop'), 'Nova Launcher.lnk');
    const c = load(), first = c.lastRun !== app.getVersion();
    if (!force && !first) return true;
    const ico = iconFile(), opt = { target: process.execPath, cwd: path.dirname(process.execPath), description: 'Nova Launcher', icon: ico, iconIndex: 0, appUserModelId: 'com.nova.launcher' };
    if (!fs.existsSync(lnk)) shell.writeShortcutLink(lnk, 'create', opt);
    else { try { shell.writeShortcutLink(lnk, 'update', { icon: ico, iconIndex: 0 }); } catch {} }
    // el acceso directo del menú Inicio (lo crea el instalador) también se actualiza con el icono
    try { const sm = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Nova Launcher.lnk'); if (fs.existsSync(sm)) shell.writeShortcutLink(sm, 'update', { icon: ico, iconIndex: 0 }); } catch {}
    wr(cfgFile, { ...c, lastRun: app.getVersion() });
    return fs.existsSync(lnk);
  } catch { return false; }
}
// ---- Bandeja de Windows y notificaciones ----
// Sin icono junto al reloj: el launcher se minimiza a la barra de tareas y nunca se esconde. trayInit se deja para las llamadas existentes.
let trayImg = null;
// Icono de la app para los avisos de Windows (tray.ico en Windows; tray.png como alternativa)
try {
  if (process.platform === 'win32') { const i = nativeImage.createFromPath(path.join(APP, 'assets', 'tray.ico')); if (i && !i.isEmpty()) trayImg = i; }
  if (!trayImg) trayImg = nativeImage.createFromPath(path.join(APP, 'assets', 'tray.png'));
} catch {}
function trayInit() { return false; }
function gameHide() { try { if (S.win) S.win.minimize(); } catch {} }
function notify(title, body) {
  try {
    if (load().notify === false || !Notification.isSupported()) return;
    if (S.win && S.win.isVisible() && S.win.isFocused()) return;
    const n = new Notification({ title, body: String(body || ''), icon: trayImg && !trayImg.isEmpty() ? trayImg : undefined });
    n.on('click', () => { if (S.win) { S.win.show(); S.win.focus(); } }); n.show();
  } catch {}
}
// ---- Texto, portapapeles ----
ipcMain.handle('clip:text', (e, t) => { clipboard.writeText(String(t || '').slice(0, 5e6)); return true; });
ipcMain.handle('text:save', async (e, { name, text }) => {
  const r = await dialog.showSaveDialog(S.win, { title: 'Guardar', defaultPath: path.join(app.getPath('documents'), safeName(name || 'registro.txt', 'registro.txt')), filters: [{ name: 'Texto', extensions: ['txt', 'log'] }] });
  if (r.canceled || !r.filePath) return { canceled: true }; fs.writeFileSync(r.filePath, String(text || '')); return { ok: true, file: r.filePath };
});
// ---- Capturas de pantalla ----
const shotsDir = id => path.join(iDir(id), 'screenshots');
const shotPath = (id, f) => { f = path.basename(String(f)); const p = path.join(shotsDir(getIns(id).id), f); if (!fs.existsSync(p)) throw new Error('Captura no encontrada'); return p; };
ipcMain.handle('shots:list', async (e, id) => {
  const ids = id === 'all' ? li().map(i => i.id) : [getIns(id).id], out = [];
  for (const i of ids) {
    let es = []; try { es = await fs.promises.readdir(shotsDir(i)); } catch { continue; }
    for (const f of es) { if (!/\.(png|jpe?g)$/i.test(f)) continue; const p = path.join(shotsDir(i), f); try { const st = await fs.promises.stat(p); out.push({ inst: i, file: f, date: st.mtimeMs, size: st.size, url: pathToFileURL(p).href }); } catch {} }
  }
  return out.sort((a, b) => b.date - a.date).slice(0, 600);
});
ipcMain.handle('shots:open', (e, { id, file }) => shell.openPath(shotPath(id, file)));
ipcMain.handle('shots:copy', (e, { id, file }) => { const im = nativeImage.createFromPath(shotPath(id, file)); if (im.isEmpty()) throw new Error('No se pudo leer la imagen'); clipboard.writeImage(im); return true; });
ipcMain.handle('shots:delete', async (e, { id, file }) => { const p = shotPath(id, file); try { await shell.trashItem(p); } catch { fs.rmSync(p, { force: true }); } return true; });
ipcMain.handle('shots:folder', (e, id) => { fs.mkdirSync(shotsDir(getIns(id).id), { recursive: true }); return shell.openPath(shotsDir(id)); });
// ---- Diagnóstico ----
ipcMain.handle('diag:run', async (e, id) => {
  const cfg = load(), ins = (id && li().find(i => i.id === String(id))) || li()[0] || null, checks = [], add = (level, t, d) => checks.push({ level, t, d });
  const online = await isOnline(true);
  add(online ? 'ok' : 'warn', online ? 'Conexión con Mojang' : 'Sin conexión', online ? 'Los servidores de Mojang responden.' : 'No se alcanzan los servidores de Mojang. Podrás jugar si ya descargaste esa versión; con una cuenta Microsoft se juega en modo offline.');
  const totGB = Math.round(os.totalmem() / 1073741824), freeGB = Math.round(os.freemem() / 1073741824 * 10) / 10, ram = ins ? (+ins.ram > 0 ? +ins.ram : cfg.ram) : cfg.ram;
  if (ram > totGB) add('bad', 'RAM asignada mayor que la de tu PC', `Tienes ${totGB} GB y el juego pide ${ram} GB. Bájala en Opciones de la instancia o Ajustes → Juego.`);
  else if (ram > totGB * .75) add('warn', 'RAM asignada muy alta', `Usas ${ram} de ${totGB} GB: el PC puede ir lento. Lo recomendado es la mitad.`);
  else if (ram < 2) add('warn', 'Poca RAM para Minecraft', `Con ${ram} GB puede ir muy justo. Prueba con 3–4 GB.`);
  else if (ram > freeGB + 1) add('warn', 'Poca memoria libre ahora mismo', `El juego pide ${ram} GB y ahora quedan ${freeGB} GB libres. Cierra otros programas.`);
  else add('ok', 'Memoria RAM', `${ram} GB para el juego, ${totGB} GB en total (${freeGB} GB libres).`);
  const jp = (ins && ins.javaPath) || cfg.javaPath;
  if (jp) add(fs.existsSync(jp) ? 'ok' : 'bad', fs.existsSync(jp) ? 'Java personalizado' : 'No existe el Java indicado', fs.existsSync(jp) ? jp : `La ruta «${jp}» no existe. Vacía el campo para usar el Java automático.`);
  else { const jd = path.join(root, 'java'); let have = []; try { have = fs.readdirSync(jd); } catch {} add('ok', 'Java automático', have.length ? 'Instalado: Java ' + have.sort((a, b) => a - b).join(', ') + '.' : 'Se descargará la primera vez que juegues.'); }
  try { const fsf = fs.statfsSync(root), gb = fsf.bavail * fsf.bsize / 1073741824; add(gb < 2 ? 'bad' : gb < 5 ? 'warn' : 'ok', gb < 2 ? 'Casi sin espacio en disco' : gb < 5 ? 'Poco espacio en disco' : 'Espacio en disco', `Quedan ${gb.toFixed(1)} GB libres donde se guarda el launcher.`); } catch {}
  const { act } = accState(cfg);
  add(act.type === 'microsoft' ? (act.token ? 'ok' : 'warn') : 'ok', 'Cuenta: ' + act.name, act.type === 'microsoft' ? 'Cuenta de Microsoft.' : 'Cuenta offline: no podrás entrar en servidores con verificación de cuenta (online-mode).');
  if (ins) {
    let jars = []; try { jars = fs.readdirSync(path.join(iDir(ins.id), 'mods')).filter(f => /\.jar$/i.test(f)); } catch {}
    const ld = ins.ld || 'Vanilla';
    if (ld === 'Vanilla' && jars.length) add('warn', 'Mods en una instancia Vanilla', `Hay ${jars.length} mods pero la instancia es Vanilla: no se cargarán. Cámbiala a Fabric, Forge o NeoForge.`);
    else if (ld === 'Fabric' && jars.length && !jars.some(f => /fabric-api/i.test(f))) add('warn', 'Falta Fabric API', 'Casi todos los mods de Fabric la necesitan. Instálala desde Mods.');
    else add('ok', 'Mods', jars.length ? `${jars.length} mods en «${ins.name}».` : `Sin mods en «${ins.name}».`);
    if (ins.gpu === 'high') add('ok', 'Tarjeta gráfica potente', process.platform === 'win32' ? 'Windows usará la tarjeta dedicada para Java en esta instancia.' : 'Solo se aplica en Windows.');
  }
  let log = null;
  try {
    const dir = path.join(root, 'logs'), fl = fs.readdirSync(dir).filter(x => x.endsWith('.log')).sort().reverse(), mine = ins ? fl.find(x => x.includes(String(ins.name).replace(/[^\w.-]+/g, '_').slice(0, 30))) : null, f = mine || fl[0];
    if (f) { const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).slice(-600), c = diagnose(lines); log = { file: path.join(dir, f), name: f }; if (c.id !== 'unknown') { add('bad', 'Última partida: ' + c.t, c.d); log.cause = c; } else add('ok', 'Última partida', 'No se ven errores conocidos en el registro.'); }
  } catch {}
  return { name: ins ? ins.name : '', checks, log, text: checks.map(c => `[${c.level.toUpperCase()}] ${c.t}: ${c.d}`).join('\n') };
});


// Lo que usan otros módulos
Object.assign(R, { appIcon, ensureShortcut, fixPinnedIcons, gameHide, notify, taskbarIcon, trayInit });
