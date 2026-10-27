// =====================================================================================
// Nova Launcher · main/ventana.js
// Ventana, caché de imágenes, arranque de la app, ajustes y avisos de licencias
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { BrowserWindow, app, dialog, ipcMain, protocol, screen, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const APP = path.join(__dirname, '..'); // carpeta de la app (donde están assets/, preload.js…)
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { FIRST, LOWRAM, cfgFile, fsp, load, rd, rmAsync, root, single, wr } = R; // base
const { UA } = R; // red
const { appIcon, ensureShortcut, fixPinnedIcons, taskbarIcon, trayInit } = R; // sistema
const { accState, encryptOldTokens } = R; // cuentas
const { checkUpd, initUpdater } = R; // actualizaciones
const { discordInit } = R; // discord
const { modManifest, novaServersWrite } = R; // mod-nova

protocol.registerSchemesAsPrivileged([{ scheme: 'nova-img', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }]);
// Tamaño y posición de la ventana (y si estaba maximizada) entre aperturas
const winFile = path.join(root, 'window.json');
function winLoad() {
  const b = rd(winFile, null); if (!b || !(b.width >= 900 && b.height >= 560)) return {};
  const ok = Number.isFinite(b.x) && Number.isFinite(b.y) && screen.getAllDisplays().some(d => { const a = d.workArea; return b.x + 120 > a.x && b.x < a.x + a.width - 120 && b.y >= a.y - 8 && b.y < a.y + a.height - 80; });
  return { ...(ok ? { x: b.x, y: b.y } : {}), width: b.width, height: b.height, max: !!b.max };
}
let winSaveT = null;
function winSave() {
  if (!S.win || S.win.isDestroyed() || S.win.isMinimized() || S.win.isFullScreen()) return;
  try { const b = S.win.getNormalBounds(); wr(winFile, { x: b.x, y: b.y, width: b.width, height: b.height, max: S.win.isMaximized() }); } catch {}
}
// Imágenes de Modrinth/CurseForge: se guardan en el PC para que carguen al instante y se vean sin conexión
const IMG_HOSTS = /^(cdn(-raw)?\.modrinth\.com|media\.forgecdn\.net|edge\.forgecdn\.net|raw\.githubusercontent\.com)$/;
const imgDir = () => path.join(root, 'cache', 'img');
async function imgGet(u) {
  const url = new URL(u); const extra = process.env.NOVA_TEST_IMG_HOST;
  if (!(url.protocol === 'https:' && IMG_HOSTS.test(url.hostname)) && !(extra && url.host === extra)) return new Response('no permitido', { status: 403 });
  const key = crypto.createHash('sha1').update(url.href).digest('hex'), f = path.join(imgDir(), key), hdr = t => ({ 'content-type': t, 'cache-control': 'max-age=31536000' });
  try { const [b, m] = await Promise.all([fsp.readFile(f), fsp.readFile(f + '.t', 'utf8')]); const now = new Date(); fsp.utimes(f, now, now).catch(() => {}); return new Response(b, { headers: hdr(m) }); } catch {}
  try {
    const r = await fetch(url.href, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': UA() } }), t = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\//.test(t)) return new Response('', { status: 502 });
    const b = Buffer.from(await r.arrayBuffer()); if (b.length > 5e6) return new Response('', { status: 502 });
    try { await fsp.mkdir(imgDir(), { recursive: true }); await fsp.writeFile(f, b); await fsp.writeFile(f + '.t', t); } catch {}
    return new Response(b, { headers: hdr(t) });
  } catch { return new Response('', { status: 504 }); }
}
// Caché de imágenes: se borra lo que lleva más de 30 días sin usarse y, si pasa de 100 MB, lo más antiguo hasta bajar de 80 MB
async function imgPrune() {
  try {
    const dir = imgDir(), es = await fsp.readdir(dir), L = [], now = Date.now(); let tot = 0;
    const del = async n => { await fsp.rm(path.join(dir, n), { force: true }); await fsp.rm(path.join(dir, n + '.t'), { force: true }); };
    for (const n of es) {
      if (n.endsWith('.t')) { if (!es.includes(n.slice(0, -2))) await fsp.rm(path.join(dir, n), { force: true }); continue; }
      try { const st = await fsp.stat(path.join(dir, n)); if (now - st.mtimeMs > 30 * 864e5) { await del(n); continue; } L.push({ n, t: st.mtimeMs, s: st.size }); tot += st.size; } catch {}
    }
    if (tot <= 100e6) return;
    L.sort((a, b) => a.t - b.t); for (const x of L) { if (tot < 80e6) break; await del(x.n); tot -= x.s; }
  } catch {}
}
async function trimMem() {
  try { if (!S.win || S.win.isDestroyed() || S.win.isFocused()) return; await S.win.webContents.executeJavaScript('window.gc&&window.gc()').catch(() => {}); await S.win.webContents.session.clearCache(); } catch {}
  try { if (global.gc) global.gc(); } catch {}
}
app.whenReady().then(() => {
  if (!single) return;
  try { protocol.handle('nova-img', req => { try { return imgGet(new URL(req.url).searchParams.get('u') || ''); } catch { return new Response('', { status: 400 }); } }); } catch {}
  const wb = winLoad();
  S.win = new BrowserWindow({ width: wb.width || 1100, height: wb.height || 680, ...(wb.x !== undefined ? { x: wb.x, y: wb.y } : {}), minWidth: 900, minHeight: 560, frame: false, backgroundColor: '#0c0c10', icon: appIcon(),
    show: false, webPreferences: { preload: path.join(APP, 'preload.js'), spellcheck: false } });
  if (wb.max) S.win.maximize();
  const later = () => { clearTimeout(winSaveT); winSaveT = setTimeout(winSave, 600); };
  S.win.on('resize', later); S.win.on('move', later); S.win.on('maximize', later); S.win.on('unmaximize', later); S.win.on('close', winSave);
  setTimeout(() => modManifest().catch(() => {}), 9000); setTimeout(imgPrune, 3000); setTimeout(encryptOldTokens, 500);
  S.win.once('ready-to-show', () => { S.win.show(); taskbarIcon(); });
  S.win.on('show', () => taskbarIcon());
  // Al minimizar u ocultar la ventana (o pasar un rato sin foco) se libera memoria de la interfaz y del proceso principal
  let trimT = null;
  const trimSoon = ms => { clearTimeout(trimT); trimT = setTimeout(trimMem, ms); };
  S.win.on('minimize', () => trimSoon(2500)); S.win.on('hide', () => trimSoon(2500)); S.win.on('blur', () => trimSoon(60000));
  S.win.on('focus', () => clearTimeout(trimT)); S.win.on('restore', () => clearTimeout(trimT));
  if (process.env.NOVA_SMOKE) return smokeTest();
  S.win.loadFile('index.html');
  if (app.isPackaged) initUpdater();
  // Lo que no hace falta para pintar la ventana se hace después, con la interfaz ya en pantalla (leer los accesos directos de Windows uno a uno es lento)
  setTimeout(discordInit, 1500); setTimeout(ensureShortcut, 2500); setTimeout(fixPinnedIcons, 8000); trayInit(); S.win.on('focus', () => { if (Date.now() - S.lastChk > 600000) S.chkNow(); });
});
// Prueba de arranque para la revisión automática (NOVA_SMOKE=1): abre la ventana, mira que la interfaz cargue sin errores y se cierra.
function smokeTest() {
  const errs = [], fail = m => { console.log('SMOKE FALLO: ' + m); errs.forEach(e => console.log('  · ' + e)); app.exit(1); };
  setTimeout(() => fail('tiempo agotado'), 60000);
  S.win.webContents.on('console-message', (...a) => { const lv = typeof a[0] === 'object' && a[0].level !== undefined ? a[0].level : a[1], msg = typeof a[0] === 'object' && a[0].message !== undefined ? a[0].message : a[2]; if ((lv === 3 || lv === 'error') && !/Failed to load resource|net::ERR/.test(String(msg))) errs.push(String(msg).slice(0, 300)); });
  S.win.webContents.on('render-process-gone', (e, d) => fail('el proceso gráfico se cerró: ' + d.reason));
  S.win.webContents.on('did-fail-load', (e, c, d) => fail('no cargó index.html: ' + d));
  S.win.webContents.on('preload-error', (e, p, er) => fail('error en preload: ' + (er && er.message)));
  S.win.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 6500));
    try {
      const r = await S.win.webContents.executeJavaScript(`(async()=>{const o=[];const need=['home','go','cont','mods','set','con','dqw'];for(const i of need)if(!document.getElementById(i))o.push('falta #'+i);for(const f of ['play','dqState','diag','dropInstall','worldLast','insts','cfg','versions'])if(typeof window.api[f]!=='function')o.push('falta api.'+f);try{const v=await window.api.ver();if(!v)o.push('sin versión')}catch(e){o.push('api.ver: '+e.message)}for(const p of ['mods','inst','set','srv','con','soc','vers','home']){show(p);await new Promise(r=>setTimeout(r,500));if(!document.getElementById(p).classList.contains('on'))o.push('la pestaña '+p+' no abre')}return o})()`);
      if (r.length) return fail(r.join('; '));
      if (errs.length) return fail('errores en la consola de la interfaz');
      console.log('SMOKE OK · versión ' + app.getVersion()); app.exit(0);
    } catch (e) { fail(e.message); }
  });
  S.win.loadFile('index.html');
}
app.on('window-all-closed', () => app.quit());
ipcMain.handle('cfg:get', () => { const c = load(), st = accState(c); return { ...c, lowRam: LOWRAM, ms: c.ms ? { name: c.ms.name } : null, accounts: R.accOut().accounts, activeAccount: st.act.id, _first: FIRST && !c.setupDone }; });
ipcMain.handle('sys', () => ({ total: Math.max(1, Math.round(os.totalmem() / 1073741824)) }));
ipcMain.handle('zoom', (e, f) => { S.win.webContents.setZoomFactor(Math.min(1.6, Math.max(0.7, +f || 1))); });
ipcMain.handle('cfg:set', (e, c) => { wr(cfgFile, { ...load(), ...c }); if ('myServers' in c) novaServersWrite(c.myServers); if (S.updater && 'autoDownload' in c) S.updater.autoDownload = c.autoDownload !== false; if ('discord' in c || 'discordId' in c) discordInit(); if ('tray' in c) trayInit(); if ('channel' in c && S.updater) { checkUpd().catch(() => {}); } return true; });
ipcMain.handle('folder', () => { fs.mkdirSync(root, { recursive: true }); return shell.openPath(root); });
ipcMain.on('win', (e, a) => a === 'min' ? S.win.minimize() : a === 'max' ? (S.win.isMaximized() ? S.win.unmaximize() : S.win.maximize()) : S.win.close());
ipcMain.handle('ver', () => app.getVersion());
// Avisos de licencias de terceros: se copia a la carpeta de datos (no se puede abrir desde app.asar) y se abre
ipcMain.handle('notices', async () => {
  try { const dst = path.join(root, 'THIRD-PARTY-NOTICES.txt'); fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(path.join(APP, 'THIRD-PARTY-NOTICES.txt'))); return !(await shell.openPath(dst)); }
  catch { return false; }
});
ipcMain.handle('cache:clear', async () => { try { await S.win.webContents.session.clearCache(); fs.rmSync(path.join(root, 'versions_cache.json'), { force: true }); await rmAsync(imgDir()); } catch {} return true; });
ipcMain.handle('disk:usage', async () => {
  let total = 0, n = 0; const walk = async d => { let es; try { es = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) { if (++n > 300000) return; const p = path.join(d, e.name); if (e.isDirectory()) await walk(p); else { try { total += (await fs.promises.stat(p)).size; } catch {} } } };
  await walk(root); return total;
});
ipcMain.handle('open', (e, u) => { if (/^https?:\/\//i.test(String(u))) shell.openExternal(String(u)); });
// ---- Guardar y cargar los ajustes ----
ipcMain.handle('settings:export', async (e, obj) => {
  const r = await dialog.showSaveDialog(S.win, { title: 'Guardar mis ajustes', defaultPath: path.join(app.getPath('documents'), 'nova-ajustes.json'), filters: [{ name: 'Ajustes de Nova Launcher', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { canceled: true };
  fs.writeFileSync(r.filePath, JSON.stringify({ app: 'nova-launcher', version: app.getVersion(), settings: obj || {} }, null, 1)); return { ok: true, file: r.filePath };
});
ipcMain.handle('settings:import', async () => {
  const r = await dialog.showOpenDialog(S.win, { title: 'Cargar mis ajustes', properties: ['openFile'], filters: [{ name: 'Ajustes de Nova Launcher', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  let j; try { j = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); } catch { throw new Error('El archivo no es válido'); }
  if (!j || j.app !== 'nova-launcher' || !j.settings || typeof j.settings !== 'object') throw new Error('Este archivo no es de Nova Launcher');
  return { settings: j.settings };
});


// Lo que usan otros módulos
Object.assign(R, { imgDir });
