// =====================================================================================
// Nova Launcher · main/actualizaciones.js
// Actualizaciones del launcher: canal beta, instalar, versiones anteriores
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { app, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { UPD, load, root, send } = R; // base
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const notify = (...a) => R.notify(...a); // sistema

ipcMain.handle('upd:get', () => upd);
ipcMain.handle('upd:check', async () => {
  if (!app.isPackaged || !S.updater) return { s: 'dev' };
  if (upd.s === 'downloading' || upd.s === 'ready') return upd;
  try { await checkUpd(); } catch (e) { if (upd.s === 'checking') setUpd({ s: 'error', msg: String(e && e.message || e).slice(0, 80) }); }
  return upd;
});
ipcMain.handle('upd:download', async () => {
  if (S.updater && upd.s === 'available') { setUpd({ s: 'downloading', v: upd.v, p: 0 }); S.updater.downloadUpdate().catch(e => setUpd({ s: 'error', msg: String(e && e.message || e).slice(0, 80) })); }
  return upd;
});
// Instalación silenciosa: sin pantalla del instalador; el launcher se cierra, se actualiza y vuelve a abrirse solo.
ipcMain.handle('upd:install', () => {
  if (!S.updater || upd.s !== 'ready') return false;
  let ok = true;
  try { S.updater.quitAndInstall(true, true); } catch { ok = false; }
  // Si tras unos segundos el launcher sigue vivo, quitAndInstall no cerró la app: se lanza el instalador descargado a mano y se sale.
  setTimeout(() => {
    try {
      const f = S.updater.downloadedUpdateHelper && S.updater.downloadedUpdateHelper.file;
      if (f && fs.existsSync(f)) require('child_process').spawn(f, ['/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
    } catch {}
    app.exit(0);
  }, ok ? 8000 : 500);
  return true;
});
// Desinstalar desde Ajustes: abre el desinstalador de la carpeta de instalación (pide admin solo si la instalación antigua era «para todos»).
// modo: 'programa' (conserva todos los datos), 'cuentas' (borra todo menos las cuentas premium y sus skins) o 'todo'.
const { borrar } = require('./restablecer');
const modoUnin = o => o && (o.mode === 'todo' || o.mode === 'cuentas' || o.mode === 'programa') ? o.mode : (o && o.data ? 'todo' : 'programa');
ipcMain.handle('app:uninstall', async (e, o) => {
  if (!app.isPackaged || process.platform !== 'win32') return { ok: false, why: 'dev' };
  const u = path.join(path.dirname(process.execPath), 'Uninstall Nova Launcher.exe');
  if (!fs.existsSync(u)) return { ok: false, why: 'nouninst' };
  const err = await shell.openPath(u);
  if (err) return { ok: false, why: err };
  const m = modoUnin(o);
  if (m !== 'programa') await borrar(root, m === 'cuentas');
  setTimeout(() => app.exit(0), 900);
  return { ok: true };
});
// Restablecer el launcher: borra todo (cuenta incluida) y se reinicia como la primera vez, con el asistente de bienvenida.
ipcMain.handle('app:reset', async () => {
  if (R.running && R.running.size) return { ok: false, why: 'running' };
  await borrar(root, false);
  app.relaunch(); setTimeout(() => app.exit(0), 300);
  return { ok: true };
});
// ===== Actualizaciones desde el launcher =====
let upd = { s: 'idle' };
S.lastChk = 0;
S.chkNow = () => {};
// Instalada «para todos los usuarios» (carpeta Archivos de programa): cada actualización pide administrador. Instalada «solo para mí» no lo pide nunca.
const perMachine = process.platform === 'win32' && app.isPackaged && /^[a-z]:\\program files/i.test(process.execPath);
const setUpd = o => { const was = upd.s; upd = perMachine ? { ...o, admin: true } : o; send('upd:state', upd); if (was !== o.s && o.s === 'ready') try { R.novaAviso('update', 'Actualización lista · ' + (o.v || '')); } catch {} if (was !== o.s && o.s === 'ready') notify('Actualización lista', 'Nova Launcher ' + (o.v || '') + ' está listo para instalarse'); if (was !== o.s && o.s === 'available') notify('Hay una actualización', 'Nova Launcher ' + (o.v || '') + ' está disponible'); };
function verParse(v) { const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(v)); return m ? { n: [+m[1], +m[2], +m[3]], pre: m[4] ? m[4].split('.') : null } : null; }
function verCmp(a, b) {
  a = verParse(a); b = verParse(b); if (!a || !b) return 0;
  for (let i = 0; i < 3; i++) if (a.n[i] !== b.n[i]) return a.n[i] - b.n[i];
  if (!a.pre && !b.pre) return 0; if (!a.pre) return 1; if (!b.pre) return -1;   // 0.2.15 es mayor que 0.2.15-beta.9
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i], y = b.pre[i]; if (x === undefined) return -1; if (y === undefined) return 1; if (x === y) continue;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y); if (nx && ny) return +x - +y; if (nx) return -1; if (ny) return 1; return x < y ? -1 : 1;
  }
  return 0;
}
// Canal Beta: recibe la versión MÁS NUEVA de todas (beta o estable). electron-updater por sí solo coge la última publicada en GitHub,
// así que si una estable sale antes (o después) que una beta de número mayor, se quedaba con la equivocada. Aquí se elige por número de versión.
async function pickNewestTag() {
  const r = await fetch('https://api.github.com/repos/' + UPD.owner + '/' + UPD.repo + '/releases?per_page=50', { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Nova-Launcher', Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error('GitHub ' + r.status);
  let best = null;
  for (const x of await r.json()) { if (x.draft || !verParse(x.tag_name) || !(x.assets || []).some(a => a.name === 'latest.yml')) continue; if (!best || verCmp(x.tag_name, best) > 0) best = x.tag_name; }
  return best;
}
async function applyFeed() {
  if (!S.updater) return;
  const beta = load().channel === 'beta'; S.updater.allowPrerelease = beta;
  try {
    if (beta) { const tag = await pickNewestTag(); if (tag) { S.updater.setFeedURL({ provider: 'generic', url: 'https://github.com/' + UPD.owner + '/' + UPD.repo + '/releases/download/' + tag }); return; } }
    S.updater.setFeedURL({ provider: 'github', owner: UPD.owner, repo: UPD.repo });   // estable (o sin red): el método normal
  } catch { try { S.updater.setFeedURL({ provider: 'github', owner: UPD.owner, repo: UPD.repo }); } catch {} }
}
const checkUpd = async () => { await applyFeed(); return S.updater.checkForUpdates(); };
function initUpdater() {
  try {
    const { autoUpdater } = require('electron-updater'); S.updater = autoUpdater;
    autoUpdater.autoDownload = true; autoUpdater.allowPrerelease = load().channel === 'beta';
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => { if (upd.s !== 'downloading' && upd.s !== 'ready') setUpd({ s: 'checking' }); });
    autoUpdater.on('update-available', i => setUpd(autoUpdater.autoDownload ? { s: 'downloading', v: i.version, p: 0 } : { s: 'available', v: i.version }));
    autoUpdater.on('update-not-available', () => { if (upd.s !== 'ready') setUpd({ s: 'none' }); });
    autoUpdater.on('download-progress', p => setUpd({ s: 'downloading', v: upd.v, p: p.percent, bps: p.bytesPerSecond }));
    autoUpdater.on('update-downloaded', i => setUpd({ s: 'ready', v: i.version }));
    autoUpdater.on('error', e => { if (upd.s !== 'ready') setUpd({ s: 'error', msg: String(e && e.message || e).slice(0, 80) }); });
    S.chkNow = () => { S.lastChk = Date.now(); if (upd.s !== 'downloading' && upd.s !== 'ready') checkUpd().catch(() => {}); };
    setTimeout(S.chkNow, 2500); setInterval(S.chkNow, 3600000);
  } catch {}
}
// Lo que usan otros módulos
Object.assign(R, { checkUpd, initUpdater, pickNewestTag, verCmp, verParse });
