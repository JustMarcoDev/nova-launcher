const { app, BrowserWindow, ipcMain, shell, dialog, Notification, clipboard, nativeImage, safeStorage, screen, protocol } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'), net = require('net'), dns = require('dns').promises, { pathToFileURL } = require('url'), { execFile } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
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
const wr = (f, d) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const txt = JSON.stringify(d, null, 1), tmp = f + '.tmp';
  try { JSON.parse(fs.readFileSync(f)); fs.copyFileSync(f, f + '.bak'); } catch {}
  try { fs.writeFileSync(tmp, txt); fs.renameSync(tmp, f); }
  catch (e) { try { fs.rmSync(tmp, { force: true }); } catch {} fs.writeFileSync(f, txt); }
};
const load = () => ({ ...DEF, ...rd(cfgFile, {}) }), li = () => rd(insFile, []);
const addInst = o => { const L = li(); let id = Date.now().toString(36); while (L.some(x => x.id === id)) id += Math.random().toString(36).slice(2, 4); const i = { id, ...o }; wr(insFile, [...L, i]); return i; };
const FIRST = !fs.existsSync(cfgFile) && !fs.existsSync(insFile);
if (rd(cfgFile, {}).hwaccel === false) app.disableHardwareAcceleration();
const MAN = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
let win, updater = null;
if (process.platform === 'win32') app.setAppUserModelId('com.nova.launcher');
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
const send = (c, d) => win && win.webContents.send(c, d);
const UA = () => 'NovaLauncher/' + app.getVersion() + ' (github.com/JustMarcoDev/nova-launcher)';
// Los fallos de red de Node dicen solo «fetch failed»: se completa con el servidor al que no se pudo llegar
const rawFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  try { return await rawFetch(u, o); }
  catch (e) { if (e && e.message === 'fetch failed') { let h = ''; try { h = new URL(String(u && u.href || u)).host; } catch {} const c = e.cause && (e.cause.code || e.cause.message); e.message = 'No se pudo conectar con ' + (h || 'el servidor') + (c ? ' (' + c + ')' : ''); } throw e; }
};
const get = async (u, t = 'json', h = {}) => { const r = await fetch(u, { signal: AbortSignal.timeout(t === 'arrayBuffer' ? 600000 : 30000), headers: { 'User-Agent': UA(), ...h } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r[t](); };
const run = (cmd, args, opt = {}) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e8, ...opt }, e => e ? rej(e) : res()));

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
  if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
  try { const b = win.getNormalBounds(); wr(winFile, { x: b.x, y: b.y, width: b.width, height: b.height, max: win.isMaximized() }); } catch {}
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
app.whenReady().then(() => {
  if (!single) return;
  try { protocol.handle('nova-img', req => { try { return imgGet(new URL(req.url).searchParams.get('u') || ''); } catch { return new Response('', { status: 400 }); } }); } catch {}
  const wb = winLoad();
  win = new BrowserWindow({ width: wb.width || 1100, height: wb.height || 680, ...(wb.x !== undefined ? { x: wb.x, y: wb.y } : {}), minWidth: 900, minHeight: 560, frame: false, backgroundColor: '#0c0c10',
    show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false } });
  if (wb.max) win.maximize();
  const later = () => { clearTimeout(winSaveT); winSaveT = setTimeout(winSave, 600); };
  win.on('resize', later); win.on('move', later); win.on('maximize', later); win.on('unmaximize', later); win.on('close', winSave);
  setTimeout(imgPrune, 3000); setTimeout(encryptOldTokens, 500);
  win.once('ready-to-show', () => win.show());
  if (process.env.NOVA_SMOKE) return smokeTest();
  win.loadFile('index.html');
  if (app.isPackaged) initUpdater();
  discordInit(); ensureShortcut(); trayInit(); win.on('focus', () => { if (Date.now() - lastChk > 600000) chkNow(); });
});
// Prueba de arranque para la revisión automática (NOVA_SMOKE=1): abre la ventana, mira que la interfaz cargue sin errores y se cierra.
function smokeTest() {
  const errs = [], fail = m => { console.log('SMOKE FALLO: ' + m); errs.forEach(e => console.log('  · ' + e)); app.exit(1); };
  setTimeout(() => fail('tiempo agotado'), 60000);
  win.webContents.on('console-message', (...a) => { const lv = typeof a[0] === 'object' && a[0].level !== undefined ? a[0].level : a[1], msg = typeof a[0] === 'object' && a[0].message !== undefined ? a[0].message : a[2]; if ((lv === 3 || lv === 'error') && !/Failed to load resource|net::ERR/.test(String(msg))) errs.push(String(msg).slice(0, 300)); });
  win.webContents.on('render-process-gone', (e, d) => fail('el proceso gráfico se cerró: ' + d.reason));
  win.webContents.on('did-fail-load', (e, c, d) => fail('no cargó index.html: ' + d));
  win.webContents.on('preload-error', (e, p, er) => fail('error en preload: ' + (er && er.message)));
  win.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 6500));
    try {
      const r = await win.webContents.executeJavaScript(`(async()=>{const o=[];const need=['home','go','cont','mods','set','con','dqw'];for(const i of need)if(!document.getElementById(i))o.push('falta #'+i);for(const f of ['play','dqState','diag','dropInstall','worldLast','insts','cfg','versions'])if(typeof window.api[f]!=='function')o.push('falta api.'+f);try{const v=await window.api.ver();if(!v)o.push('sin versión')}catch(e){o.push('api.ver: '+e.message)}for(const p of ['mods','inst','set','srv','con','soc','vers','home']){show(p);await new Promise(r=>setTimeout(r,500));if(!document.getElementById(p).classList.contains('on'))o.push('la pestaña '+p+' no abre')}return o})()`);
      if (r.length) return fail(r.join('; '));
      if (errs.length) return fail('errores en la consola de la interfaz');
      console.log('SMOKE OK · versión ' + app.getVersion()); app.exit(0);
    } catch (e) { fail(e.message); }
  });
  win.loadFile('index.html');
}
app.on('window-all-closed', () => app.quit());

ipcMain.handle('cfg:get', () => { const c = load(), st = accState(c); return { ...c, ms: c.ms ? { name: c.ms.name } : null, accounts: st.a.map(({ token, ...r }) => r), activeAccount: st.act.id, _first: FIRST && !c.setupDone }; });
ipcMain.handle('sys', () => ({ total: Math.max(1, Math.round(os.totalmem() / 1073741824)) }));
ipcMain.handle('zoom', (e, f) => { win.webContents.setZoomFactor(Math.min(1.6, Math.max(0.7, +f || 1))); });
ipcMain.handle('cfg:set', (e, c) => { wr(cfgFile, { ...load(), ...c }); if (updater && 'autoDownload' in c) updater.autoDownload = c.autoDownload !== false; if ('discord' in c || 'discordId' in c) discordInit(); if ('tray' in c) trayInit(); if ('channel' in c && updater) { updater.allowPrerelease = c.channel === 'beta'; updater.checkForUpdates().catch(() => {}); } return true; });
ipcMain.handle('folder', () => { fs.mkdirSync(root, { recursive: true }); return shell.openPath(root); });
ipcMain.on('win', (e, a) => a === 'min' ? win.minimize() : a === 'max' ? (win.isMaximized() ? win.unmaximize() : win.maximize()) : win.close());
const vcache = path.join(root, 'versions_cache.json');
ipcMain.handle('versions', async () => {
  let err;
  for (let i = 0; i < 3; i++) {
    try { const v = (await get(MAN)).versions.map(x => ({ id: x.id, type: x.type })); wr(vcache, v); return { v, src: 'mojang' }; }
    catch (x) { err = x; await new Promise(r => setTimeout(r, 700)); }
  }
  const c = rd(vcache, null); if (c && c.length) return { v: c, src: 'cache' };
  throw err;
});
ipcMain.handle('ver', () => app.getVersion());
// Avisos de licencias de terceros: se copia a la carpeta de datos (no se puede abrir desde app.asar) y se abre
ipcMain.handle('notices', async () => {
  try { const dst = path.join(root, 'THIRD-PARTY-NOTICES.txt'); fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(path.join(__dirname, 'THIRD-PARTY-NOTICES.txt'))); return !(await shell.openPath(dst)); }
  catch { return false; }
});
ipcMain.handle('upd:get', () => upd);
ipcMain.handle('discord:get', () => dsc);
ipcMain.handle('cache:clear', async () => { try { await win.webContents.session.clearCache(); fs.rmSync(path.join(root, 'versions_cache.json'), { force: true }); await rmAsync(imgDir()); } catch {} return true; });
ipcMain.handle('disk:usage', async () => {
  let total = 0, n = 0; const walk = async d => { let es; try { es = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) { if (++n > 300000) return; const p = path.join(d, e.name); if (e.isDirectory()) await walk(p); else { try { total += (await fs.promises.stat(p)).size; } catch {} } } };
  await walk(root); return total;
});
ipcMain.handle('shortcut:create', () => ensureShortcut(true));
ipcMain.handle('upd:check', async () => {
  if (!app.isPackaged || !updater) return { s: 'dev' };
  if (upd.s === 'downloading' || upd.s === 'ready') return upd;
  try { await updater.checkForUpdates(); } catch (e) { if (upd.s === 'checking') setUpd({ s: 'error', msg: String(e && e.message || e).slice(0, 80) }); }
  return upd;
});
ipcMain.handle('upd:download', async () => {
  if (updater && upd.s === 'available') { setUpd({ s: 'downloading', v: upd.v, p: 0 }); updater.downloadUpdate().catch(e => setUpd({ s: 'error', msg: String(e && e.message || e).slice(0, 80) })); }
  return upd;
});
ipcMain.handle('upd:install', () => { if (updater && upd.s === 'ready') updater.quitAndInstall(true, true); });
ipcMain.handle('open', (e, u) => { if (/^https?:\/\//i.test(String(u))) shell.openExternal(String(u)); });
ipcMain.handle('http', (e, { url, headers }) => get(url, 'json', headers || {}));
ipcMain.handle('inst:list', () => li());
ipcMain.handle('inst:save', (e, o) => addInst(o));
ipcMain.handle('inst:del', async (e, id) => { id = String(id); if (running.has(id)) throw new Error('Cierra Minecraft antes de borrar la instancia'); wr(insFile, li().filter(i => i.id !== id)); await rmAsync(path.join(root, 'instances', id)); await rmAsync(path.join(root, 'backups', id)); });
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
ipcMain.handle('mod:install', async (e, { url, name, inst, dir, sha1, sha512 }) => {
  const sub = ['mods', 'shaderpacks', 'resourcepacks'].includes(dir) ? dir : 'mods';
  try {
    const d = path.join(root, inst ? path.join('instances', String(inst)) : '', sub); fs.mkdirSync(d, { recursive: true });
    await dl(url, path.join(d, path.basename(name)), { sha1, sha512 }); return true;
  } catch (x) { if (x && x.cancel) throw x; x.step = 'descargar el archivo'; throw withLog(x, logErr('mod', x, { 'Qué se intentaba': 'Instalar ' + name + ' en ' + sub, Dirección: url, Instancia: inst || '(carpeta general)' })); }
});
// Modpacks de Modrinth (.mrpack)
ipcMain.handle('pack:versions', async (e, pid) => (await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version`)).map(v => ({ id: v.id, name: v.name, num: v.version_number, mc: v.game_versions, ld: v.loaders, date: v.date_published, type: v.version_type })));
ipcMain.handle('pack', async (e, a) => {
  const { id: pid, vid } = typeof a === 'string' ? { id: a } : a;
  let step = 'buscar la versión del modpack', f = null, v = null;
  const tmp = path.join(root, 'tmp_pack');
  try {
    v = vid ? await get(`https://api.modrinth.com/v2/version/${encodeURIComponent(vid)}`) : (await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version`))[0];
    if (!v) throw new Error('Este modpack no tiene versiones');
    f = (v.files || []).find(x => x.primary) || (v.files || [])[0]; if (!f) throw new Error('La versión no tiene ningún archivo para descargar');
    step = 'preparar la carpeta temporal'; await rmAsync(tmp); await fsp.mkdir(tmp, { recursive: true });
    const z = path.join(tmp, 'p.zip'); send('status', 'Descargando modpack…'); step = 'descargar el modpack (' + f.filename + ')';
    await dl(f.url, z, { sha1: f.hashes && f.hashes.sha1, sha512: f.hashes && f.hashes.sha512 });
    step = 'descomprimir el modpack'; await unzipSafe(z, tmp); fs.rmSync(z, { force: true });
    step = 'instalar el modpack'; return await installMrpackDir(tmp);
  } catch (x) {
    if (x && x.cancel) throw x; x.step = x.step || step;
    throw withLog(x, logErr('modpack', x, { 'Qué se intentaba': 'Instalar el modpack ' + (v && (v.name || v.version_number) || pid), Proyecto: pid, Versión: vid || '(la más nueva)', Archivo: f && f.filename, Dirección: f && f.url }));
  } finally { await rmAsync(tmp).catch(() => {}); send('progress', null); }
});
async function installMrpackDir(tmp) {
  const ix = rd(path.join(tmp, 'modrinth.index.json'), null); if (!ix) throw new Error('Modpack no válido');
  const d = ix.dependencies || {};
  if (d['quilt-loader']) throw new Error('Los modpacks de Quilt no están soportados');
  const ld = d['fabric-loader'] ? 'Fabric' : d.neoforge ? 'NeoForge' : d.forge ? 'Forge' : 'Vanilla';
  const ins = addInst({ name: ix.name || 'Modpack', mc: d.minecraft, ld, loaderVersion: d['fabric-loader'] || d.neoforge || d.forge || undefined, type: 'release', custom: true });
  const dir = path.join(root, 'instances', ins.id), list = (ix.files || []).filter(fl => !(fl.env && fl.env.client === 'unsupported')), failed = [], why = [];
  fs.mkdirSync(dir, { recursive: true }); let n = 0;
  await pool(list, 8, async fl => {
    const dest = path.resolve(dir, fl.path);
    try { if (!dest.startsWith(dir + path.sep)) throw new Error('ruta'); await dl(fl.downloads, dest, { sha1: fl.hashes && fl.hashes.sha1, sha512: fl.hashes && fl.hashes.sha512, pooled: true }); }
    catch (x) { failed.push(path.basename(String(fl.path))); why.push(`${fl.path} ← ${[].concat(fl.downloads || []).join(' | ')} → ${x && x.message}`); }
    prog('Modpack', ++n, list.length);
  }, fl => fl.fileSize);
  if (why.length) logErr('modpack-archivos', new Error(why.length + ' archivos no se pudieron descargar'), { 'Qué se intentaba': 'Instalar el modpack ' + (ix.name || ''), 'Archivos que fallaron': why.slice(0, 60).join('\n  ') });
  for (const o of ['overrides', 'client-overrides']) { const ov = path.join(tmp, o); if (fs.existsSync(ov)) await fsp.cp(ov, dir, { recursive: true }); }
  send('status', failed.length ? 'Modpack instalado (faltan ' + failed.length + ' archivos)' : 'Modpack instalado: ' + (ix.name || '')); notify('Modpack instalado', String(ix.name || 'Modpack') + (failed.length ? ' (faltan ' + failed.length + ' archivos)' : ' ya está listo'));
  return { ins, failed };
}

// Java automático (Adoptium) según lo que pida cada versión de Minecraft
async function javaFor(mc, cfg) {
  if (cfg.javaPath) return cfg.javaPath;
  const jc = path.join(root, 'java-cache.json'), cache = rd(jc, {}); let major;
  try {
    const m = (await get(MAN)).versions.find(v => v.id === mc);
    major = m ? ((await get(m.url)).javaVersion || { majorVersion: 8 }).majorVersion : 17;
    if (cache[mc] !== major) { cache[mc] = major; try { wr(jc, cache); } catch {} }
  } catch (e) {
    // Sin conexión: usa la versión de Java recordada o, si no, cualquiera de las ya instaladas
    major = cache[mc];
    if (!major) { const jd = path.join(root, 'java'), have = fs.existsSync(jd) ? fs.readdirSync(jd).map(Number).filter(n => n > 0).sort((a, b) => b - a) : []; major = have.find(n => fs.existsSync(path.join(jd, String(n)))) ; if (!major) throw e; }
    send('status', 'Sin conexión: se usa el Java ya instalado (' + major + ')');
  }
  const d = path.join(root, 'java', String(major));
  const find = () => fs.existsSync(d) && fs.readdirSync(d).map(x => path.join(d, x, 'bin', 'java.exe')).find(fs.existsSync);
  let j = find(); if (j) return j;
  send('status', `Descargando Java ${major}…`); fs.mkdirSync(d, { recursive: true });
  const z = path.join(d, 'j.zip');
  await dl(`https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/x64/jre/hotspot/normal/eclipse`, z);
  await run('tar', ['-xf', z, '-C', d]); fs.unlinkSync(z);
  j = find(); if (!j) throw new Error('No se pudo instalar Java ' + major); return j;
}

const nfC = mc => { const p = mc.split('.'); return p[0] === '1' ? [`${p[1]}.${p[2] || 0}.`] : [`${p[0]}.${p[1]}.${p[2] || 0}.`, `${p[0]}.${p[1]}.`]; };
// Versiones disponibles de cada loader (la más nueva primero)
async function loaderList(ld, mc) {
  if (ld === 'Fabric') { const L = await get(`https://meta.fabricmc.net/v2/versions/loader/${mc}`); return L.map(x => ({ v: x.loader.version, stable: !!x.loader.stable })); }
  if (ld === 'Forge') { const x = await get('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml', 'text');
    return [...x.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]).filter(v => v.startsWith(mc + '-')).map(v => v.slice(mc.length + 1)).reverse().map(v => ({ v, stable: true })); }
  if (ld === 'NeoForge') { const all = (await get('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge')).versions.filter(x => nfC(mc).some(c => x.startsWith(c)));
    return all.reverse().map(v => ({ v, stable: !/alpha|beta/.test(v) })); }
  return [];
}
async function loaderPick(ld, mc, want) {
  if (want) return want;
  if (ld === 'Forge') { const p = (await get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json')).promos, v = p[mc + '-recommended'] || p[mc + '-latest']; if (!v) throw new Error('Forge no disponible para ' + mc); return v; }
  const L = await loaderList(ld, mc); if (!L.length) throw new Error(ld + ' no soporta ' + mc);
  return (L.find(x => x.stable) || L[0]).v;
}
// Fabric incluido en el instalador (assets/fabric): el menú de Nova arranca sin descargar nada de Fabric.
function fabricBundled(mc) {
  try {
    const pf = path.join(__dirname, 'assets', 'fabric', mc + '.json'); if (!fs.existsSync(pf)) return null;
    const prof = JSON.parse(fs.readFileSync(pf, 'utf8')), id = prof.id, vf = path.join(root, 'versions', id, id + '.json');
    for (const l of prof.libraries || []) {
      const [g, n, v] = String(l.name).split(':'), rel = g.replace(/\./g, '/') + '/' + n + '/' + v + '/' + n + '-' + v + '.jar';
      const src = path.join(__dirname, 'assets', 'fabric', 'libraries', rel), dst = path.join(root, 'libraries', rel);
      if (!fs.existsSync(src)) return null;
      const ok = fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(src).size;
      if (!ok) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(src)); }
    }
    if (!fs.existsSync(vf)) { fs.mkdirSync(path.dirname(vf), { recursive: true }); fs.writeFileSync(vf, JSON.stringify(prof)); }
    return id;
  } catch { return null; }
}
async function fabric(mc, want) {
  send('status', 'Preparando Fabric…');
  let lv; try { lv = await loaderPick('Fabric', mc, want); }
  catch (x) { const vd = path.join(root, 'versions'), have = fs.existsSync(vd) && fs.readdirSync(vd).find(d => d.startsWith('fabric-loader-') && d.endsWith('-' + mc)); if (have) return have; const b = fabricBundled(mc); if (b) return b; throw x; }
  const id = `fabric-loader-${lv}-${mc}`, f = path.join(root, 'versions', id, id + '.json');
  if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, await get(`https://meta.fabricmc.net/v2/versions/loader/${mc}/${lv}/profile/json`, 'text')); }
  return id;
}
async function forge(ld, mc, java, want) {
  const vdir = path.join(root, 'versions'), dirOf = v => ld === 'Forge' ? `${mc}-forge-${v}` : `neoforge-${v}`;
  const has = d => fs.existsSync(path.join(vdir, d, d + '.json'));
  const any = () => fs.existsSync(vdir) ? fs.readdirSync(vdir).find(d => ld === 'Forge' ? d.startsWith(mc + '-forge') : nfC(mc).some(c => d.startsWith('neoforge-' + c))) : null;
  if (want) { if (has(dirOf(want))) return dirOf(want); } else { const id0 = any(); if (id0) return id0; }
  const v = await loaderPick(ld, mc, want); if (has(dirOf(v))) return dirOf(v);
  send('status', `Descargando instalador de ${ld}…`);
  const url = ld === 'Forge' ? `https://maven.minecraftforge.net/net/minecraftforge/forge/${mc}-${v}/forge-${mc}-${v}-installer.jar` : `https://maven.neoforged.net/releases/net/neoforged/neoforge/${v}/neoforge-${v}-installer.jar`;
  const jar = path.join(root, 'installer.jar'); await dl(url, jar);
  const lp = path.join(root, 'launcher_profiles.json'); if (!fs.existsSync(lp)) fs.writeFileSync(lp, '{"profiles":{}}');
  send('status', `Instalando ${ld} (puede tardar un par de minutos)…`);
  await run(java, ['-jar', jar, '--installClient', root]);
  const id = has(dirOf(v)) ? dirOf(v) : any(); if (!id) throw new Error('No se pudo instalar ' + ld); return id;
}

const running = new Set();
const CAUSES = [
  [/OutOfMemoryError|Could not reserve enough space|There is insufficient memory|GC overhead limit/i, 'ram', 'Falta de memoria RAM', 'Minecraft se quedó sin memoria. Sube la RAM en las opciones de la instancia o en Ajustes → Juego. Con muchos mods suelen hacer falta 6–8 GB (sin pasarte de la RAM libre de tu PC).'],
  [/UnsupportedClassVersionError|class file version|compiled by a more recent version of the Java|Unrecognized (VM )?option|Could not create the Java Virtual Machine|Invalid maximum heap size|Unable to access jarfile|Error: Could not find or load main class|requires Java \d+/i, 'java', 'Java equivocado o argumentos JVM no válidos', 'La versión de Java no sirve para esta versión de Minecraft o algún argumento JVM está mal. Deja la ruta de Java vacía (Java automático) y revisa los argumentos JVM en Ajustes → Juego.'],
  [/Mixin apply failed|MixinApplyError|InvalidMixinException|MixinTransformerError|ModResolutionException|Incompatible mod set|Missing or unsupported mandatory dependencies|requires (any version of )?(mod )?['"\w .-]+|depends on|Duplicate mods? found|duplicate mod|ModLoadingException|NoSuchMethodError|NoSuchFieldError|NoClassDefFoundError|ClassNotFoundException|Mod .+ was not loaded|FormattedException/i, 'mods', 'Mod incompatible o que falta', 'Algún mod no es compatible con esta versión, falta otro mod que necesita (por ejemplo Fabric API) o hay mods repetidos. Prueba a desactivar los últimos mods que añadiste desde el gestor de mods de la instancia.'],
  [/Invalid session|Failed to verify username|Authentication servers|Bad login|401 Unauthorized/i, 'auth', 'Problema con la cuenta', 'La sesión de Microsoft ha caducado o los servidores de Mojang no responden. Vuelve a iniciar sesión en Ajustes → Cuenta.'],
  [/GLFW error|Pixel format not accepted|OpenGL|WGL|GLX|Failed to create window|EXCEPTION_ACCESS_VIOLATION|opengl32/i, 'gpu', 'Problema gráfico', 'Falló la tarjeta gráfica o el modo de ventana. Actualiza los drivers de tu GPU y desactiva mods de rendimiento o shaders para comprobar.']
];
function diagnose(lines) {
  const txt = lines.join('\n');
  for (const [re, id, t, d] of CAUSES) if (re.test(txt)) { const l = lines.find(x => re.test(x)); return { id, t, d, hint: l ? l.trim().slice(0, 220) : '' }; }
  return { id: 'unknown', t: 'Causa desconocida', d: 'Minecraft se cerró de forma inesperada. Mira las últimas líneas del registro; si usas mods, prueba sin ellos para descartar un conflicto.', hint: '' };
}
function openLog(ins, java, ram) {
  const dir = path.join(root, 'logs'); fs.mkdirSync(dir, { recursive: true });
  const st = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19), f = path.join(dir, `${st}_${String(ins.name).replace(/[^\w.-]+/g, '_').slice(0, 30)}.log`);
  const w = fs.createWriteStream(f, { flags: 'a' }); w.on('error', () => {});
  w.write(`# Nova Launcher ${app.getVersion()} · ${ins.name} · Minecraft ${ins.mc} · ${ins.ld || 'Vanilla'}${ins.loaderVersion ? ' ' + ins.loaderVersion : ''} · RAM ${ram}G · Java ${java}\n`);
  try { const old = fs.readdirSync(dir).filter(x => x.endsWith('.log')).sort().reverse().slice(20); for (const o of old) fs.rmSync(path.join(dir, o), { force: true }); } catch {}
  return { w, f };
}
function reportCrash(ins, code, tail, file, since) {
  let report = '';
  try { const cr = path.join(root, 'instances', ins.id, 'crash-reports'), fl = fs.readdirSync(cr).filter(x => /^crash-.*\.txt$/.test(x)).map(x => ({ x, t: fs.statSync(path.join(cr, x)).mtimeMs })).filter(o => o.t >= since).sort((a, b) => b.t - a.t)[0]; if (fl) report = path.join(cr, fl.x); } catch {}
  send('crash', { id: ins.id, name: ins.name, mc: ins.mc, ld: ins.ld || 'Vanilla', code, cause: diagnose(tail), tail: tail.slice(-40), file, report });
}
ipcMain.handle('log:open', (e, f) => { const p = path.resolve(String(f || '')); if (p.startsWith(root + path.sep) && fs.existsSync(p)) { shell.showItemInFolder(p); return true; } return false; });
ipcMain.handle('logs:folder', () => { const d = path.join(root, 'logs'); fs.mkdirSync(d, { recursive: true }); return shell.openPath(d); });

ipcMain.handle('play', async (e, { id, server, world, safe }) => {
  const cfg = load(), ins = li().find(i => i.id === id);
  try {
    if (!ins) throw new Error('Instancia no encontrada');
    if (running.has(id)) throw new Error('Esta instancia ya está en ejecución');
    const dir = path.join(root, 'instances', id); fs.mkdirSync(dir, { recursive: true });
    if (PREPP) { send('status', 'Terminando la preparación…'); try { await PREPP; } catch {} }
    let auth; const { act } = accState(cfg);
    if (act.type === 'microsoft') {
      try { const x = await new Auth('select_account').refresh(act.token); auth = (await x.getMinecraft()).mclc(); const st = accState(); saveAcc(st.a.map(z => z.id === act.id ? { ...z, token: x.save() } : z), act.id); }
      catch { if (await isOnline(true)) throw new Error('La sesión de Microsoft de «' + act.name + '» caducó. Vuelve a iniciarla desde la cuenta (barra superior).'); auth = Authenticator.getAuth(act.name); send('status', 'Sin conexión: se juega en modo offline como ' + act.name); }
    } else auth = Authenticator.getAuth(act.name);
    const ram = +ins.ram > 0 ? +ins.ram : cfg.ram, java = await javaFor(ins.mc, { javaPath: ins.javaPath || cfg.javaPath });
    const o = { authorization: auth, root, javaPath: java, version: { number: ins.mc, type: ins.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: dir }, memory: { max: ram + 'G', min: '1G' },
      window: { width: cfg.width, height: cfg.height, fullscreen: cfg.fullscreen }, customArgs: [...(JVM_PRESETS[ins.jvmPreset] || [])] };
    if (cfg.optimize !== false && !ins.jvmPreset) o.customArgs.push(...JVM_OPT);
    try { await applyGpu(java, ins.gpu === 'high'); } catch {}
    const noNova = !!(safe || ins.noNova);   // modo seguro: sin el menú de Nova (Shift al lanzar o ajuste de la instancia)
    const nj = (!noNova && (!ins.ld || ins.ld === 'Vanilla' || ins.ld === 'Fabric')) ? novaModJar(ins.mc) : null;
    let nova = false;
    if (ins.ld === 'Fabric') { o.version.custom = await fabric(ins.mc, ins.loaderVersion); nova = !!nj; }
    else if (noNova) { /* vanilla puro, sin Fabric */ }
    else if (nj) { try { o.version.custom = fabricBundled(ins.mc) || await fabric(ins.mc); nova = true; } catch { send('log', 'Nova: no se pudo preparar Fabric; se juega en vanilla normal.\n'); } }
    let novaMsg = noNova ? 'Nova: modo seguro, se juega sin el menú de Nova' + (ins.ld === 'Fabric' ? ' (Fabric normal).\n' : ' (Minecraft normal).\n')
      : nova ? 'Nova: menú de Nova activado (Fabric incluido en el launcher).\n'
      : (!ins.ld || ins.ld === 'Vanilla' || ins.ld === 'Fabric') ? (NOVA_MC.includes(ins.mc) ? 'Nova: el menú de Nova no se pudo activar; se juega con el menú normal.\n' : 'Nova: el menú de Nova solo está disponible en Minecraft ' + NOVA_MC.join(' y ') + '; esta versión usa el menú normal.\n')
      : 'Nova: el menú de Nova solo está disponible en Nova y Fabric; ' + ins.ld + ' usa el menú normal.\n';
    if (nova) o.customArgs.push('-Dnova.bg=' + (novaBg() || ''), '-Dfabric.addMods=' + nj, '-Dnova.version=' + app.getVersion(), '-Dnova.loader=' + (ins.ld === 'Fabric' ? 'Fabric' : 'Nova'));
    if (ins.ld === 'Forge' || ins.ld === 'NeoForge') o.version.custom = await forge(ins.ld, ins.mc, java, ins.loaderVersion);
    if (server && server.host) o.quickPlay = { type: modernQP(ins.mc) ? 'multiplayer' : 'legacy', identifier: server.host + (server.port && +server.port !== 25565 ? ':' + server.port : '') };
    if (world && !server && modernQP(ins.mc)) o.quickPlay = { type: 'singleplayer', identifier: String(world) };
        try { syncServers(dir, (cfg.myServers || []).filter(z => z && z.host).map(z => ({ name: String(z.name || z.host), ip: String(z.host) + (z.port && +z.port !== 25565 ? ':' + z.port : '') }))); } catch {}
    const l = new Client(), tail = [], lg = openLog(ins, java, ram), since = Date.now(); let t0 = 0;
    send('log', '── ' + ins.name + ' · Minecraft ' + ins.mc + ' · ' + (ins.ld || 'Vanilla') + ' · ' + (act.name) + ' ──\n'); send('log', novaMsg);
    l.on('progress', p => send('progress', p));
    l.on('data', d => { const t = String(d); if (t.includes('[NOVA:SETTINGS]')) { try { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); send('nav', 'set'); } } catch {} } try { lg.w.write(t.endsWith('\n') ? t : t + '\n'); } catch {} for (const ln of t.split(/\r?\n/)) if (ln) tail.push(ln); if (tail.length > 500) tail.splice(0, tail.length - 300); send('log', t); });
    l.on('close', code => {
      running.delete(id); try { lg.w.end(); } catch {} if (t0) { const cur = li().find(i => i.id === id) || {}; upIns(id, { playMs: (cur.playMs || 0) + (Date.now() - t0), lastPlayed: Date.now() }); } discordSet(null); send('running', running.size ? 1 : 0); send('progress', null);
      const crashed = !!code && tail.length > 0;
      send('status', crashed ? 'Minecraft se cerró con un error' : 'Minecraft cerrado');
      if (running.size === 0 || crashed) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
      if (crashed) { reportCrash(ins, code, tail, lg.f, since - 5000); notify('Minecraft se cerró con un error', diagnose(tail).t); }
    });
    discordSet({ details: 'Preparando Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() });
    send('status', 'Descargando archivos del juego…');
    if (!(await l.launch(o))) throw new Error('No se pudo iniciar Minecraft');
    running.add(id); t0 = Date.now(); upIns(id, { lastPlayed: t0 });
    send('running', 1); discordSet({ details: server && server.name ? 'En ' + server.name + ' · ' + ins.mc : 'Jugando a Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() }); send('status', 'Minecraft en ejecución'); if (cfg.closeOnLaunch) win.hide(); else if (cfg.gameMode !== false && cfg.conOpen === false) gameHide();
    return { ok: true };
  } catch (err) { send('status', 'Error: ' + err.message); send('progress', null); return { ok: false }; }
});

// ===== Actualizaciones desde el launcher =====
let upd = { s: 'idle' }, lastChk = 0, chkNow = () => {};
const setUpd = o => { const was = upd.s; upd = o; send('upd:state', upd); if (was !== o.s && o.s === 'ready') notify('Actualización lista', 'Nova Launcher ' + (o.v || '') + ' está listo para instalarse'); if (was !== o.s && o.s === 'available') notify('Hay una actualización', 'Nova Launcher ' + (o.v || '') + ' está disponible'); };
function initUpdater() {
  try {
    const { autoUpdater } = require('electron-updater'); updater = autoUpdater;
    autoUpdater.autoDownload = load().autoDownload !== false; autoUpdater.allowPrerelease = load().channel === 'beta';
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => { if (upd.s !== 'downloading' && upd.s !== 'ready') setUpd({ s: 'checking' }); });
    autoUpdater.on('update-available', i => setUpd(autoUpdater.autoDownload ? { s: 'downloading', v: i.version, p: 0 } : { s: 'available', v: i.version }));
    autoUpdater.on('update-not-available', () => { if (upd.s !== 'ready') setUpd({ s: 'none' }); });
    autoUpdater.on('download-progress', p => setUpd({ s: 'downloading', v: upd.v, p: p.percent, bps: p.bytesPerSecond }));
    autoUpdater.on('update-downloaded', i => setUpd({ s: 'ready', v: i.version }));
    autoUpdater.on('error', e => { if (upd.s !== 'ready') setUpd({ s: 'error', msg: String(e && e.message || e).slice(0, 80) }); });
    chkNow = () => { lastChk = Date.now(); if (load().autoUpdate !== false && upd.s !== 'downloading' && upd.s !== 'ready') autoUpdater.checkForUpdates().catch(() => {}); };
    setTimeout(chkNow, 2500); setInterval(chkNow, 3600000);
  } catch {}
}

// ===== Discord Rich Presence =====
// Application ID de Discord de Nova Launcher (ver README). Con él, TODOS los usuarios muestran la actividad sin configurar nada.
const DISCORD_CLIENT_ID = '1559289890636824597';
const REPO_URL = 'https://github.com/JustMarcoDev/nova-launcher/releases/latest';
let rpc = null, rpcOk = false, rpcAct = null, dsc = { s: 'off' };
const tStart = Date.now();
const setDsc = o => { dsc = o; send('discord:state', dsc); };
function discordStop() { const c = rpc; rpc = null; rpcOk = false; if (c) { try { c.clearActivity().catch(() => {}); c.destroy().catch(() => {}); } catch {} } }
function discordSet(a) {
  if (a !== undefined) rpcAct = a;
  if (!rpc || !rpcOk) return;
  const v = app.getVersion();
  const x = rpcAct || { details: 'En el launcher', state: 'Nova Launcher v' + v, startTimestamp: tStart };
  rpc.setActivity({ ...x, largeImageKey: 'logo', largeImageText: 'Nova Launcher v' + v, instance: false,
    buttons: [{ label: 'Descargar Nova Launcher', url: REPO_URL }] }).catch(() => rpc && rpc.setActivity({ ...x, largeImageKey: 'logo', largeImageText: 'Nova Launcher v' + v, instance: false }).catch(() => {}));
}
function discordInit() {
  discordStop();
  const c = load();
  if (c.discord === false) return setDsc({ s: 'off' });
  const id = DISCORD_CLIENT_ID;   // fijo: ya no hace falta crear una aplicación de Discord
  if (!/^\d{15,25}$/.test(id)) return setDsc({ s: 'noid' });
  let RPC; try { RPC = require('discord-rpc'); } catch { return setDsc({ s: 'error', msg: 'Módulo de Discord no disponible' }); }
  setDsc({ s: 'connecting' });
  const cl = new RPC.Client({ transport: 'ipc' }); rpc = cl;
  const retry = msg => { if (rpc !== cl) return; rpcOk = false; setDsc({ s: 'error', msg }); try { cl.destroy().catch(() => {}); } catch {} setTimeout(() => { if (rpc === cl) discordInit(); }, 15000); };
  cl.on('ready', () => { rpcOk = true; setDsc({ s: 'on', user: cl.user && cl.user.username }); discordSet(); });
  cl.on('disconnected', () => retry('Discord se cerró'));
  cl.login({ clientId: id }).catch(() => retry('Abre Discord en el PC'));
}
app.on('before-quit', discordStop);

// ===== Acceso directo del escritorio =====
function ensureShortcut(force) {
  try {
    if (process.platform !== 'win32' || !app.isPackaged) return false;
    const lnk = path.join(app.getPath('desktop'), 'Nova Launcher.lnk');
    const c = load(), first = c.lastRun !== app.getVersion();
    if (!force && !first) return true;
    if (!fs.existsSync(lnk)) shell.writeShortcutLink(lnk, 'create', { target: process.execPath, cwd: path.dirname(process.execPath), description: 'Nova Launcher', icon: process.execPath, iconIndex: 0 });
    wr(cfgFile, { ...c, lastRun: app.getVersion() });
    return fs.existsSync(lnk);
  } catch { return false; }
}

// ===== Servidores y Nova Pack (0.2.10) =====
const modernQP = mc => { let m = /^(\d+)\.(\d+)/.exec(mc); if (m) return +m[1] > 1 || +m[2] >= 20; m = /^(\d\d)w/.exec(mc); return !!m && +m[1] >= 23; };
const stCache = {};
const vi = n => { const b = []; do { let x = n & 0x7f; n >>>= 7; if (n) x |= 0x80; b.push(x); } while (n); return Buffer.from(b); };
const pstr = t => { const b = Buffer.from(t, 'utf8'); return Buffer.concat([vi(b.length), b]); };
const pkt = b => Buffer.concat([vi(b.length), b]);
const rvi = (b, o) => { let n = 0, sh = 0, x; do { if (o >= b.length) return null; x = b[o++]; n |= (x & 0x7f) << sh; sh += 7; } while (x & 0x80); return [n, o]; };
const flat = d => typeof d === 'string' ? d : d ? (d.text || '') + (d.extra || []).map(flat).join('') : '';
// Ping oficial del juego (Server List Ping): jugadores, versión y latencia
async function slp(host, port, timeout = 4000) {
  try { const r = await Promise.race([dns.resolveSrv('_minecraft._tcp.' + host), sleep(1500).then(() => [])]); if (r && r[0]) { host = r[0].name; port = r[0].port; } } catch {}
  return new Promise((res, rej) => {
    const s = net.connect({ host, port }); let buf = Buffer.alloc(0), done = false, p0 = 0, st = null;
    const fin = (e, v) => { if (done) return; done = true; s.destroy(); e ? rej(e) : res(v); };
    s.setTimeout(timeout, () => fin(new Error('timeout'))); s.on('error', fin);
    s.on('connect', () => { s.write(Buffer.concat([pkt(Buffer.concat([vi(0), vi(765), pstr(host), Buffer.from([port >> 8, port & 255]), vi(1)])), pkt(vi(0))])); });
    s.on('data', d => { buf = Buffer.concat([buf, d]);
      for (;;) { const L = rvi(buf, 0); if (!L || buf.length < L[1] + L[0]) return; const body = buf.subarray(L[1], L[1] + L[0]); buf = buf.subarray(L[1] + L[0]);
        const id = rvi(body, 0); if (!id) return;
        if (id[0] === 0 && !st) { const sl = rvi(body, id[1]); try { st = JSON.parse(body.toString('utf8', sl[1], sl[1] + sl[0])); } catch { return fin(new Error('json')); } p0 = Date.now(); s.write(pkt(Buffer.concat([vi(1), Buffer.alloc(8)]))); }
        else if (id[0] === 1 && st) return fin(null, { online: true, players: st.players ? st.players.online : 0, max: st.players ? st.players.max : 0, version: st.version ? st.version.name : '', motd: flat(st.description).replace(/§./g, '').trim().slice(0, 120), ping: Date.now() - p0, icon: st.favicon || '' }); } });
  });
}
ipcMain.handle('srv:status', async (e, hosts) => {
  const out = {};
  await Promise.allSettled([...new Set(hosts)].map(async key => {
    const c = stCache[key]; if (c && Date.now() - c.t < 60000) { out[key] = c.v; return; }
    const m = /^([A-Za-z0-9._-]{1,255})(?::(\d{1,5}))?$/.exec(String(key)); if (!m) { out[key] = { online: false, players: 0, icon: '' }; return; }
    let v; try { v = await slp(m[1], +m[2] || 25565); }
    catch { try { const r = await get('https://api.mcsrvstat.us/3/' + encodeURIComponent(m[1] + (m[2] ? ':' + m[2] : ''))); v = { online: !!r.online, players: r.players ? r.players.online : 0, max: r.players ? r.players.max : 0, version: r.version || '', motd: '', ping: 0, icon: r.icon || '' }; } catch { v = { online: false, players: 0, icon: '' }; } }
    stCache[key] = { t: Date.now(), v }; out[key] = v;
  }));
  return out;
});
const nbtStr = s => { const b = Buffer.from(String(s), 'utf8'), l = Buffer.alloc(2); l.writeUInt16BE(b.length); return Buffer.concat([l, b]); };
const serversDat = list => { const n = Buffer.alloc(4); n.writeInt32BE(list.length);
  const parts = [Buffer.from([10]), nbtStr(''), Buffer.from([9]), nbtStr('servers'), Buffer.from([10]), n];
  for (const s of list) parts.push(Buffer.from([8]), nbtStr('ip'), nbtStr(s.ip), Buffer.from([8]), nbtStr('name'), nbtStr(s.name), Buffer.from([0]));
  parts.push(Buffer.from([0])); return Buffer.concat(parts); };

// ===== Estabilidad, instancias, mods y copias (0.2.11) =====
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hashOf = (b, a) => crypto.createHash(a).update(b).digest('hex');
// ---- Cola de descargas: pausar, cancelar y limitar la velocidad ----
const DQ = { paused: false, cancel: false, limit: +rd(cfgFile, {}).dlLimit || 0, active: 0, pools: 0, bytes: 0, t: Date.now(), speed: 0, next: 0, total: 0, done: 0 };
let dqT = null;
const cancelErr = () => Object.assign(new Error('Descarga cancelada'), { cancel: true });
const dqLeft = () => DQ.total > DQ.done ? DQ.total - DQ.done : 0;
const dqEta = () => { const l = dqLeft(); return l > 0 && DQ.speed > 1024 ? Math.round(l / DQ.speed) : 0; };
const dqSend = () => send('dq', { active: DQ.active + DQ.pools, paused: DQ.paused, limit: DQ.limit, speed: DQ.speed, left: dqLeft(), eta: dqEta() });
const dqTick = () => { if (dqT) return; DQ.t = Date.now(); DQ.bytes = 0; dqT = setInterval(() => { const n = Date.now(), dt = (n - DQ.t) / 1000; DQ.speed = dt > 0 ? DQ.bytes / dt : 0; DQ.bytes = 0; DQ.t = n; if (!DQ.active && !DQ.pools) { clearInterval(dqT); dqT = null; DQ.speed = 0; DQ.paused = false; DQ.total = 0; DQ.done = 0; } dqSend(); }, 700); if (dqT.unref) dqT.unref(); };
const dqIdle = () => { if (!DQ.active && !DQ.pools) DQ.cancel = false; };
async function dqChunk(n) {
  while (DQ.paused && !DQ.cancel) await sleep(150);
  if (DQ.cancel) throw cancelErr();
  DQ.bytes += n; DQ.done += n;
  if (DQ.limit > 0) { const now = Date.now(); DQ.next = Math.max(DQ.next, now) + n / (DQ.limit * 1048576) * 1000; const w = DQ.next - now - 300; if (w > 0) await sleep(Math.min(w, 5000)); }
}
// Las descargas van a «archivo.part» por trozos. Si se cortan se reanudan desde donde se quedaron (cabecera Range)
// y solo al terminar y comprobar la huella se renombran al nombre final. Junto al .part se guarda «.part.meta» con
// la dirección y el identificador del archivo (ETag / fecha) para no mezclar trozos de dos versiones distintas.
const DL_WAITS = process.env.NOVA_DL_WAITS ? JSON.parse(process.env.NOVA_DL_WAITS) : [1000, 3000, 8000];
const rmQ = p => fs.promises.rm(p, { force: true }).catch(() => {});
const metaOf = p => p + '.meta';
const hashFile = (p, a) => new Promise((ok, no) => { const h = crypto.createHash(a), s = fs.createReadStream(p); s.on('data', d => h.update(d)); s.on('end', () => ok(h.digest('hex'))); s.on('error', no); });
async function sleepC(ms) { const end = Date.now() + ms; while (Date.now() < end) { if (DQ.cancel) throw cancelErr(); await sleep(Math.max(1, Math.min(200, end - Date.now()))); } }
async function fetchPart(u, part, o, depth = 0) {
  let size = 0; try { size = (await fs.promises.stat(part)).size; } catch {}
  let meta = null; if (size) { try { meta = JSON.parse(await fs.promises.readFile(metaOf(part), 'utf8')); } catch {} }
  if (size && (!meta || meta.u !== u)) { await rmQ(part); await rmQ(metaOf(part)); size = 0; meta = null; } // un .part de otra dirección o sin datos no sirve
  const headers = { 'User-Agent': UA() };
  if (size) { headers.Range = 'bytes=' + size + '-'; const iv = meta.e || meta.m; if (iv) headers['If-Range'] = iv; }
  const r = await fetch(u, { signal: AbortSignal.timeout(600000), headers });
  const hd = k => (r.headers && r.headers.get ? r.headers.get(k) : null);
  const again = async () => { try { r.body && r.body.cancel && await r.body.cancel(); } catch {} await rmQ(part); await rmQ(metaOf(part)); if (depth) throw new Error('No se pudo reanudar la descarga'); return fetchPart(u, part, o, depth + 1); };
  if (r.status === 416 && size) return again(); // el .part ya estaba completo o no vale: se empieza de cero
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { http: r.status });
  let base = 0;
  if (size && r.status === 206) {
    const cr = /^bytes (\d+)-/.exec(hd('content-range') || ''); if (cr && +cr[1] !== size) return again();
    base = size; if (o.pooled) { const credit = size - o.st.cnt; if (credit > 0) DQ.done += credit; o.st.cnt = size; } // en los modpacks el total ya cuenta el archivo entero (se suma lo de otros intentos)
  } // con 200 (el servidor no admite Range o el archivo cambió) se empieza de cero
  const len = +hd('content-length') || 0; if (!o.pooled) DQ.total += len;
  let got = 0; if (!base) o.st.cnt = 0;
  try {
    await fs.promises.mkdir(path.dirname(part), { recursive: true });
    if (!base) await fs.promises.writeFile(metaOf(part), JSON.stringify({ u, e: hd('etag') || '', m: hd('last-modified') || '' })).catch(() => {});
    const fh = await fs.promises.open(part, base ? 'a' : 'w');
    try {
      if (r.body && typeof r.body.getReader === 'function') {
        const rd2 = r.body.getReader();
        try { for (;;) { const { done, value } = await rd2.read(); if (done) break; await dqChunk(value.length); await fh.write(value); got += value.length; o.st.cnt += value.length; } }
        catch (e) { try { rd2.cancel(); } catch {} throw e; }
      } else { const b = Buffer.from(await r.arrayBuffer()); await dqChunk(b.length); await fh.write(b); got = b.length; o.st.cnt += b.length; }
    } finally { await fh.close(); }
    if (len && got !== len) throw new Error('Descarga incompleta');
  } catch (e) { if (!o.pooled && len > got) DQ.total -= len - got; throw e; }
  return base + got;
}
// Descarga con comprobación de huella, reanudación y 3 reintentos (1 s, 3 s y 8 s; prueba también los enlaces alternativos)
async function dl(urls, dest, o = {}) {
  urls = [].concat(urls || []).filter(Boolean); if (!urls.length) throw new Error('Sin enlace de descarga');
  DQ.active++; dqTick();
  o = { ...o, st: { cnt: 0 } }; // st.cnt: bytes de este .part que ya cuentan en la cola
  const part = dest + '.part', bad = new Set(), clean = async () => { await rmQ(part); await rmQ(metaOf(part)); };
  try {
    let err;
    for (let round = 0; round <= DL_WAITS.length; round++) {
      for (const u of urls) {
        if (bad.has(u)) continue;
        for (let z = 0; z < 2; z++) {
          try {
            if (DQ.cancel) throw cancelErr();
            const n = await fetchPart(u, part, o);
            const want = String(o.sha512 || o.sha1 || '').toLowerCase();
            if (want && await hashFile(part, o.sha512 ? 'sha512' : 'sha1') !== want) { await clean(); err = new Error('hash'); if (z === 0) continue; bad.add(u); break; } // huella distinta: una vez más desde cero
            await rmQ(metaOf(part)); await fs.promises.rename(part, dest); return n;
          } catch (e) { if (e.cancel) throw e; err = e; if (e.http >= 400 && e.http < 500 && e.http !== 408 && e.http !== 429) bad.add(u); break; }
        }
      }
      if (round === DL_WAITS.length || urls.every(u => bad.has(u))) break;
      if (!o.pooled) send('status', `Se cortó la descarga: reintentando (${round + 1} de ${DL_WAITS.length})…`);
      await sleepC(DL_WAITS[round]);
    }
    if (urls.every(u => bad.has(u))) await clean();
    throw new Error(err && err.message === 'hash' ? 'Archivo corrupto: la huella no coincide' : 'Descarga fallida: ' + (err && err.message));
  } catch (e) { if (e.cancel) await clean(); throw e; }
  finally { DQ.active--; dqIdle(); dqSend(); }
}
async function pool(items, n, fn, sizeOf) {
  DQ.pools++; dqTick(); if (sizeOf) for (const it of items) DQ.total += +sizeOf(it) || 0; let k = 0; const out = new Array(items.length);
  const w = async () => { while (k < items.length && !DQ.cancel) { const i = k++; out[i] = await fn(items[i], i); } };
  try { await Promise.all(Array.from({ length: Math.min(n, items.length) }, w)); if (DQ.cancel) throw cancelErr(); return out; }
  finally { DQ.pools--; dqIdle(); dqSend(); }
}
const prog = (t, n, tot) => { send('status', `${t}: ${n} de ${tot}`); send('progress', { task: n, total: tot }); };
const win32 = process.platform === 'win32';
const unzip = (z, d) => win32 ? run('tar', ['-xf', z, '-C', d]) : run('unzip', ['-oq', z, '-d', d]);
// Si «tar» falla (por ejemplo, otro tar que no sabe leer .zip), en Windows se usa PowerShell
const unzipSafe = async (z, d) => {
  try { await unzip(z, d); } catch (e1) {
    if (!win32) throw e1;
    try { await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath '${z.replace(/'/g, "''")}' -DestinationPath '${d.replace(/'/g, "''")}' -Force`]); }
    catch (e2) { throw Object.assign(new Error('No se pudo descomprimir: ' + (e1.message || e1)), { cause: e2 }); }
  }
};
const zipItems = async (zip, cwd, items) => {
  if (!items.length) throw new Error('No hay nada que comprimir'); fs.rmSync(zip, { force: true }); fs.mkdirSync(path.dirname(zip), { recursive: true });
  return win32 ? run('tar', ['-a', '-c', '-f', zip, '-C', cwd, ...items]) : run('zip', ['-qr', zip, ...items], { cwd });
};
const post = async (u, body) => { const r = await fetch(u, { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': UA(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const iDir = id => path.join(root, 'instances', String(id));
const getIns = id => { const i = li().find(x => x.id === String(id)); if (!i) throw new Error('Instancia no encontrada'); return i; };
const safeName = (n, d = 'instancia') => String(n || d).replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 60) || d;

// ---- Opciones de cada instancia ----
ipcMain.handle('inst:update', (e, { id, patch }) => {
  getIns(id); const p = {}, q = patch || {};
  if ('name' in q) { const n = String(q.name).trim().slice(0, 40); if (n) p.name = n; }
  if ('icon' in q) p.icon = String(q.icon || '').replace(/[^\w-]/g, '').slice(0, 20);
  if ('color' in q) p.color = /^#[0-9a-f]{6}$/i.test(q.color) ? q.color : '';
  if ('ram' in q) { const r = +q.ram; p.ram = r > 0 ? Math.min(64, Math.round(r)) : 0; }
  if ('javaPath' in q) p.javaPath = String(q.javaPath || '').trim();
  if ('loaderVersion' in q) p.loaderVersion = String(q.loaderVersion || '').trim();
  if ('gpu' in q) p.gpu = q.gpu === 'high' ? 'high' : '';
  if ('jvmPreset' in q) p.jvmPreset = ['rendimiento', 'tirones'].includes(q.jvmPreset) ? q.jvmPreset : '';
  if ('noNova' in q) p.noNova = !!q.noNova;
  if ('fav' in q) p.fav = !!q.fav;
  if ('note' in q) p.note = String(q.note || '').slice(0, 600);
  if ('tags' in q) p.tags = [...new Set((Array.isArray(q.tags) ? q.tags : String(q.tags || '').split(',')).map(t => String(t).trim().replace(/\s+/g, ' ').slice(0, 24)).filter(Boolean))].slice(0, 8);
  wr(insFile, li().map(i => i.id === String(id) ? { ...i, ...p } : i)); return getIns(id);
});
ipcMain.handle('inst:dup', async (e, id) => {
  const src = getIns(id), nid = Date.now().toString(36), { ...rest } = src;
  send('status', 'Duplicando instancia…');
  try { if (fs.existsSync(iDir(id))) await fs.promises.cp(iDir(id), iDir(nid), { recursive: true, filter: f => path.basename(f) !== '.nova-pack.json' }); else fs.mkdirSync(iDir(nid), { recursive: true }); }
  finally { send('status', ''); }
  const ins = { ...rest, id: nid, name: (src.name + ' (copia)').slice(0, 40), custom: true, playMs: 0, lastPlayed: 0 }; wr(insFile, [...li(), ins]); return ins;
});
ipcMain.handle('inst:open', (e, { id, sub }) => { getIns(id); const d = path.join(iDir(id), ['mods', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots'].includes(sub) ? sub : ''); fs.mkdirSync(d, { recursive: true }); return shell.openPath(d); });
ipcMain.handle('loader:versions', async (e, { ld, mc }) => (await loaderList(String(ld), String(mc))).slice(0, 80));

// ---- Gestor de mods de cada instancia ----
const modsDir = id => path.join(iDir(getIns(id).id), 'mods');
const modFile = (id, f) => { f = path.basename(String(f)); if (!/\.jar(\.disabled)?$/i.test(f)) throw new Error('Archivo no válido'); return path.join(modsDir(id), f); };
const hcache = new Map();
async function listMods(id) {
  const d = modsDir(id); let es = []; try { es = await fs.promises.readdir(d); } catch { return []; }
  const out = [];
  for (const f of es) {
    const m = /\.jar(\.disabled)?$/i.exec(f); if (!m) continue;
    const p = path.join(d, f); let st; try { st = await fs.promises.stat(p); } catch { continue; } if (!st.isFile()) continue;
    const k = p + '|' + st.size + '|' + st.mtimeMs; let h = hcache.get(k);
    if (!h) { h = hashOf(await fs.promises.readFile(p), 'sha1'); hcache.set(k, h); }
    out.push({ file: f, enabled: !m[1], size: st.size, sha1: h, mt: st.mtimeMs });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}
ipcMain.handle('mods:list', async (e, id) => (await listMods(id)).map(({ mt, ...m }) => m));
// Busca en Modrinth el nombre de cada mod y si hay una versión más nueva para esta instancia
ipcMain.handle('mods:check', async (e, { id, hashes }) => {
  const ins = getIns(id); hashes = [...new Set(hashes || [])].slice(0, 1000); if (!hashes.length) return {};
  const cur = await post('https://api.modrinth.com/v2/version_files', { hashes, algorithm: 'sha1' });
  let up = {}; try { up = await post('https://api.modrinth.com/v2/version_files/update', { hashes, algorithm: 'sha1', loaders: ins.ld && ins.ld !== 'Vanilla' ? [ins.ld.toLowerCase()] : ['fabric', 'forge', 'neoforge', 'quilt'], game_versions: [ins.mc] }); } catch {}
  const pids = [...new Set(Object.values(cur).map(v => v.project_id))], proj = {};
  for (let i = 0; i < pids.length; i += 80) { try { for (const p of await get('https://api.modrinth.com/v2/projects?ids=' + encodeURIComponent(JSON.stringify(pids.slice(i, i + 80))))) proj[p.id] = p; } catch {} }
  const out = {};
  for (const h of hashes) {
    const v = cur[h]; if (!v) continue; const nv = up[h], pr = proj[v.project_id] || {}, f = nv && (nv.files.find(x => x.primary) || nv.files[0]);
    out[h] = { title: pr.title || '', icon: pr.icon_url || '', ver: v.version_number, update: nv && nv.id !== v.id && f ? { ver: nv.version_number, url: f.url, filename: f.filename, sha1: f.hashes && f.hashes.sha1, sha512: f.hashes && f.hashes.sha512 } : null };
  }
  return out;
});
ipcMain.handle('mods:toggle', (e, { id, file }) => {
  const p = modFile(id, file), n = /\.disabled$/i.test(p) ? p.replace(/\.disabled$/i, '') : p + '.disabled';
  if (fs.existsSync(n)) throw new Error('Ya existe un archivo con ese nombre'); fs.renameSync(p, n); return path.basename(n);
});
ipcMain.handle('mods:remove', (e, { id, file }) => { fs.rmSync(modFile(id, file), { force: true }); return true; });
ipcMain.handle('mods:update', async (e, { id, file, url, filename, sha1, sha512 }) => {
  if (!/^https:\/\//i.test(String(url))) throw new Error('Enlace no válido');
  const old = modFile(id, file), dis = /\.disabled$/i.test(old);
  await autoBackup(id, 'antes de actualizar mods').catch(() => {});
  const nn = path.basename(String(filename)) + (dis ? '.disabled' : '');
  await dl(url, path.join(modsDir(id), nn), { sha1, sha512 });
  if (path.basename(old) !== nn) fs.rmSync(old, { force: true });
  return nn;
});
ipcMain.handle('mods:add', async (e, id) => {
  const d = modsDir(id); const r = await dialog.showOpenDialog(win, { title: 'Añadir mods', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Mods (.jar)', extensions: ['jar'] }] });
  if (r.canceled) return 0; fs.mkdirSync(d, { recursive: true }); for (const f of r.filePaths) fs.copyFileSync(f, path.join(d, path.basename(f))); return r.filePaths.length;
});

// ---- Copias de seguridad de los mundos ----
const bkRoot = id => path.join(root, 'backups', String(id));
const bkList = async id => {
  let es = []; try { es = (await fsp.readdir(bkRoot(id))).filter(x => x.endsWith('.zip')); } catch {}
  const out = []; for (const f of es) { try { const st = await fsp.stat(path.join(bkRoot(id), f)), m = /^\d{8}-\d{6}__(.*)\.zip$/.exec(f); out.push({ file: f, date: st.mtimeMs, size: st.size, reason: m ? m[1].replace(/-/g, ' ') : f }); } catch {} }
  return out.sort((a, b) => b.date - a.date);
};
async function autoBackup(id, reason, force) {
  if (!force && load().autoBackup === false) return null;
  const idir = iDir(id); let has = false; try { has = (await fsp.readdir(path.join(idir, 'saves'))).length > 0; } catch {}
  if (!has) return null;
  const l = await bkList(id); if (!force && l.length && Date.now() - l[0].date < 600000) return null;
  const t = new Date(), z = n => String(n).padStart(2, '0'), st = `${t.getFullYear()}${z(t.getMonth() + 1)}${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}${z(t.getSeconds())}`;
  const slug = String(reason || 'manual').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'manual';
  const f = `${st}__${slug}.zip`; await zipItems(path.join(bkRoot(id), f), idir, ['saves']);
  const keep = Math.max(1, +load().backupKeep || 8); for (const o of (await bkList(id)).slice(keep)) await fsp.rm(path.join(bkRoot(id), o.file), { force: true });
  return f;
}
const bkFile = (id, f) => { f = path.basename(String(f)); const p = path.join(bkRoot(getIns(id).id), f); if (!f.endsWith('.zip') || !fs.existsSync(p)) throw new Error('Copia no encontrada'); return p; };
ipcMain.handle('bk:list', async (e, id) => { getIns(id); return await bkList(id); });
ipcMain.handle('bk:create', async (e, id) => { getIns(id); send('status', 'Copiando mundos…'); try { return await autoBackup(id, 'manual', true); } finally { send('status', ''); } });
ipcMain.handle('bk:restore', async (e, { id, file }) => {
  const z = bkFile(id, file); if (running.has(String(id))) throw new Error('Cierra Minecraft antes de restaurar');
  send('status', 'Restaurando mundos…');
  try { await autoBackup(id, 'antes de restaurar', true); await rmAsync(path.join(iDir(id), 'saves')); await fsp.mkdir(iDir(id), { recursive: true }); await unzip(z, iDir(id)); }
  finally { send('status', ''); }
  return true;
});
ipcMain.handle('bk:del', async (e, { id, file }) => { await fsp.rm(bkFile(id, file), { force: true }); return true; });
ipcMain.handle('bk:open', (e, id) => { getIns(id); fs.mkdirSync(bkRoot(id), { recursive: true }); return shell.openPath(bkRoot(id)); });

// ---- Exportar e importar instancias ----
const EXC = ['logs', 'crash-reports', 'screenshots', '.fabric', '.mixin.out', '.nova-pack.json', 'nova-instance.json', 'command_history.txt'];
ipcMain.handle('inst:export', async (e, { id, kind, worlds }) => {
  const ins = getIns(id), dir = iDir(id); kind = kind === 'mrpack' ? 'mrpack' : 'zip';
  const r = await dialog.showSaveDialog(win, { title: 'Exportar instancia', defaultPath: path.join(app.getPath('downloads'), safeName(ins.name) + '.' + kind), filters: [{ name: kind === 'mrpack' ? 'Modpack de Modrinth' : 'Instancia de Nova Launcher (ZIP)', extensions: [kind] }] });
  if (r.canceled || !r.filePath) return { canceled: true };
  const dest = r.filePath; fs.mkdirSync(dir, { recursive: true }); send('status', 'Exportando instancia…');
  try {
    if (kind === 'zip') {
      const meta = path.join(dir, 'nova-instance.json');
      fs.writeFileSync(meta, JSON.stringify({ format: 1, app: app.getVersion(), name: ins.name, mc: ins.mc, ld: ins.ld || 'Vanilla', loaderVersion: ins.loaderVersion || '', type: ins.type || 'release', icon: ins.icon || '', color: ins.color || '', ram: ins.ram || 0 }, null, 1));
      try { await zipItems(dest, dir, fs.readdirSync(dir).filter(x => !EXC.includes(x) || x === 'nova-instance.json').filter(x => worlds || x !== 'saves')); }
      finally { fs.rmSync(meta, { force: true }); }
      return { ok: true, file: dest };
    }
    const stage = path.join(root, 'tmp_export'); await rmAsync(stage); await fsp.mkdir(path.join(stage, 'overrides'), { recursive: true });
    try {
      const md = path.join(dir, 'mods'); let jars = []; try { jars = fs.readdirSync(md).filter(f => /\.jar$/i.test(f)); } catch {}
      const info = jars.map(f => { const b = fs.readFileSync(path.join(md, f)); return { f, sha1: hashOf(b, 'sha1'), sha512: hashOf(b, 'sha512'), size: b.length }; });
      let found = {}; if (info.length) { try { found = await post('https://api.modrinth.com/v2/version_files', { hashes: info.map(x => x.sha1), algorithm: 'sha1' }); } catch {} }
      const files = []; let own = 0;
      for (const x of info) {
        const v = found[x.sha1], fl = v && v.files.find(y => y.hashes && y.hashes.sha1 === x.sha1);
        if (fl) files.push({ path: 'mods/' + x.f, hashes: { sha1: x.sha1, sha512: x.sha512 }, env: { client: 'required', server: 'required' }, downloads: [fl.url], fileSize: x.size });
        else { own++; fs.mkdirSync(path.join(stage, 'overrides', 'mods'), { recursive: true }); fs.copyFileSync(path.join(md, x.f), path.join(stage, 'overrides', 'mods', x.f)); }
      }
      for (const n of fs.readdirSync(dir)) { if (EXC.includes(n) || n === 'mods' || (n === 'saves' && !worlds) || (n.startsWith('.') && n !== '.minecraft')) continue; await fs.promises.cp(path.join(dir, n), path.join(stage, 'overrides', n), { recursive: true }); }
      const dep = { minecraft: ins.mc };
      if (ins.ld && ins.ld !== 'Vanilla') dep[{ Fabric: 'fabric-loader', Forge: 'forge', NeoForge: 'neoforge' }[ins.ld]] = await loaderPick(ins.ld, ins.mc, ins.loaderVersion);
      fs.writeFileSync(path.join(stage, 'modrinth.index.json'), JSON.stringify({ formatVersion: 1, game: 'minecraft', versionId: '1.0.0', name: ins.name, summary: 'Exportado desde Nova Launcher ' + app.getVersion(), files, dependencies: dep }, null, 1));
      await zipItems(dest, stage, ['modrinth.index.json', 'overrides']);
      return { ok: true, file: dest, linked: files.length, own };
    } finally { await rmAsync(stage).catch(() => {}); }
  } finally { send('status', ''); }
});
async function importInstanceFile(file) {
  const tmp = path.join(root, 'tmp_import'); await rmAsync(tmp); await fsp.mkdir(tmp, { recursive: true });
  try {
    send('status', 'Importando…'); await unzipSafe(file, tmp);
    let base = tmp; const es = fs.readdirSync(tmp); if (es.length === 1 && fs.statSync(path.join(tmp, es[0])).isDirectory()) base = path.join(tmp, es[0]);
    if (fs.existsSync(path.join(base, 'modrinth.index.json'))) return await installMrpackDir(base);
    const mf = path.join(base, 'nova-instance.json'), m = rd(mf, null);
    if (!m || !/^[\w.+\- ]{1,40}$/.test(String(m.mc || ''))) throw new Error('Formato no reconocido: usa un .mrpack o un .zip exportado desde Nova Launcher');
    const ins = addInst({ name: String(m.name || 'Importada').slice(0, 40), mc: String(m.mc), ld: ['Fabric', 'Forge', 'NeoForge'].includes(m.ld) ? m.ld : 'Vanilla', loaderVersion: m.loaderVersion || undefined, type: m.type === 'snapshot' ? 'snapshot' : 'release', icon: m.icon || undefined, color: m.color || undefined, ram: +m.ram || undefined, custom: true });
    fs.rmSync(mf, { force: true }); await fs.promises.cp(base, iDir(ins.id), { recursive: true });
    send('status', 'Instancia importada: ' + ins.name); return { ins, failed: [] };
  } finally { await rmAsync(tmp).catch(() => {}); send('progress', null); }
}
ipcMain.handle('inst:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Importar instancia o modpack', properties: ['openFile'], filters: [{ name: 'Instancia o modpack', extensions: ['zip', 'mrpack'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  return importInstanceFile(r.filePaths[0]);
});

// ===== Cuentas, estadísticas, bandeja y más (0.2.12) =====
const upIns = (id, p) => wr(insFile, li().map(i => i.id === id ? { ...i, ...p } : i));

// ---- Varias cuentas (Microsoft y offline) ----
// Las sesiones de Microsoft se guardan cifradas con el almacén seguro del sistema (en Windows, DPAPI: solo tu usuario de Windows puede leerlas)
const tokOk = () => { try { return safeStorage.isEncryptionAvailable(); } catch { return false; } };
const encTok = t => { if (typeof t !== 'string' || !t || t.startsWith('enc:') || !tokOk()) return t; try { return 'enc:' + safeStorage.encryptString(t).toString('base64'); } catch { return t; } };
const decTok = t => { if (typeof t !== 'string' || !t.startsWith('enc:')) return t; try { return safeStorage.decryptString(Buffer.from(t.slice(4), 'base64')); } catch { return null; } };
function accState(c = load()) {
  let a = Array.isArray(c.accounts) ? c.accounts.filter(x => x && x.id).map(x => x.token ? { ...x, token: decTok(x.token) } : x) : null;
  const msTok = c.ms && c.ms.token ? decTok(c.ms.token) : null;
  if (!a || !a.length) { a = []; if (c.ms && c.ms.token) a.push({ id: 'ms1', type: 'microsoft', name: c.ms.name || 'Microsoft', token: msTok }); a.push({ id: 'off1', type: 'offline', name: c.username || 'Jugador' }); }
  let act = a.find(x => x.id === c.activeAccount);
  if (!act) act = (c.ms && c.ms.token ? a.find(x => x.type === 'microsoft') : null) || a.find(x => x.type === 'offline') || a[0];
  return { a, act };
}
function saveAcc(a, actId) { const act = a.find(x => x.id === actId) || a[0]; wr(cfgFile, { ...load(), accounts: a.map(x => x.token ? { ...x, token: encTok(x.token) } : x), activeAccount: act.id, username: act.name, ms: act.type === 'microsoft' ? { name: act.name, token: encTok(act.token) } : null }); }
// Al arrancar: las sesiones guardadas sin cifrar de versiones anteriores se cifran una sola vez
function encryptOldTokens() {
  try {
    if (!tokOk()) return; const c = load(), raw = JSON.stringify([c.accounts, c.ms]);
    if (!/"token":"(?!enc:)[^"]+"/.test(raw)) return;
    const st = accState(c); saveAcc(st.a, st.act.id);
  } catch {}
}
const accOut = () => { const st = accState(); return { accounts: st.a.map(({ token, pid, ...r }) => r), active: st.act.id }; };
ipcMain.handle('acc:list', () => accOut());
ipcMain.handle('acc:addOffline', (e, name) => {
  name = String(name || '').trim(); if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('El nombre debe tener de 3 a 16 letras, números o _');
  const st = accState(); if (st.a.some(x => x.type === 'offline' && x.name.toLowerCase() === name.toLowerCase())) throw new Error('Ya tienes una cuenta offline con ese nombre');
  const id = 'o' + Date.now().toString(36); saveAcc([...st.a, { id, type: 'offline', name }], id); return accOut();
});
ipcMain.handle('acc:login', async () => {
  try {
    const x = await new Auth('select_account').launch('electron'), t = await x.getMinecraft(), st = accState(), name = t.profile.name, pid = t.profile.id;
    const ex = st.a.find(z => z.type === 'microsoft' && (z.pid === pid || z.name === name)); let id, a;
    if (ex) { id = ex.id; a = st.a.map(z => z.id === id ? { ...z, name, pid, token: x.save() } : z); } else { id = 'm' + Date.now().toString(36); a = [...st.a, { id, type: 'microsoft', name, pid, token: x.save() }]; }
    saveAcc(a, id); return accOut();
  } catch { return { error: 'No se pudo iniciar sesión con Microsoft' }; }
});
ipcMain.handle('acc:switch', (e, id) => { const st = accState(); if (!st.a.some(x => x.id === id)) throw new Error('Cuenta no encontrada'); saveAcc(st.a, id); return accOut(); });
ipcMain.handle('acc:remove', (e, id) => { const st = accState(); if (st.a.length <= 1) throw new Error('Debe quedar al menos una cuenta'); const a = st.a.filter(x => x.id !== id); saveAcc(a, st.act.id === id ? a[0].id : st.act.id); return accOut(); });

// ---- Bandeja de Windows y notificaciones ----
// Sin icono junto al reloj: el launcher se minimiza a la barra de tareas y nunca se esconde. trayInit se deja para las llamadas existentes.
const tray = null;
let trayImg = null;
// Icono de la app para los avisos de Windows (tray.ico en Windows; tray.png como alternativa)
try {
  if (process.platform === 'win32') { const i = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.ico')); if (i && !i.isEmpty()) trayImg = i; }
  if (!trayImg) trayImg = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
} catch {}
function trayInit() { return false; }
function gameHide() { try { if (win) win.minimize(); } catch {} }
function notify(title, body) {
  try {
    if (load().notify === false || !Notification.isSupported()) return;
    if (win && win.isVisible() && win.isFocused()) return;
    const n = new Notification({ title, body: String(body || ''), icon: trayImg && !trayImg.isEmpty() ? trayImg : undefined });
    n.on('click', () => { if (win) { win.show(); win.focus(); } }); n.show();
  } catch {}
}

// ---- Texto, portapapeles ----
ipcMain.handle('clip:text', (e, t) => { clipboard.writeText(String(t || '').slice(0, 5e6)); return true; });
ipcMain.handle('text:save', async (e, { name, text }) => {
  const r = await dialog.showSaveDialog(win, { title: 'Guardar', defaultPath: path.join(app.getPath('documents'), safeName(name || 'registro.txt', 'registro.txt')), filters: [{ name: 'Texto', extensions: ['txt', 'log'] }] });
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

// ---- NBT (para servers.dat) ----
function nbtRead(buf) {
  let o = 0; const rs = () => { const l = buf.readUInt16BE(o); o += 2; const t = buf.toString('utf8', o, o + l); o += l; return t; };
  const rd = t => { switch (t) {
    case 1: return { t, v: buf.readInt8(o++) };
    case 2: { const v = buf.readInt16BE(o); o += 2; return { t, v }; }
    case 3: { const v = buf.readInt32BE(o); o += 4; return { t, v }; }
    case 4: { const v = buf.readBigInt64BE(o); o += 8; return { t, v }; }
    case 5: { const v = buf.readFloatBE(o); o += 4; return { t, v }; }
    case 6: { const v = buf.readDoubleBE(o); o += 8; return { t, v }; }
    case 7: { const n = buf.readInt32BE(o); o += 4; const v = Buffer.from(buf.subarray(o, o + n)); o += n; return { t, v }; }
    case 8: return { t, v: rs() };
    case 9: { const et = buf[o++], n = buf.readInt32BE(o); o += 4; const v = []; for (let i = 0; i < n; i++) v.push(rd(et)); return { t, et, v }; }
    case 10: { const v = []; for (;;) { const tt = buf[o++]; if (tt === 0) break; const k = rs(); v.push([k, rd(tt)]); } return { t, v }; }
    case 11: { const n = buf.readInt32BE(o); o += 4; const v = []; for (let i = 0; i < n; i++) { v.push(buf.readInt32BE(o)); o += 4; } return { t, v }; }
    case 12: { const n = buf.readInt32BE(o); o += 4; const v = []; for (let i = 0; i < n; i++) { v.push(buf.readBigInt64BE(o)); o += 8; } return { t, v }; }
    default: throw new Error('NBT no válido'); } };
  const t = buf[o++]; const name = rs(); return { name, tag: rd(t) };
}
function nbtPay(tag) {
  const { t, v } = tag, B = n => Buffer.alloc(n);
  switch (t) {
    case 1: return Buffer.from([v & 255]);
    case 2: { const b = B(2); b.writeInt16BE(v); return b; }
    case 3: { const b = B(4); b.writeInt32BE(v); return b; }
    case 4: { const b = B(8); b.writeBigInt64BE(BigInt(v)); return b; }
    case 5: { const b = B(4); b.writeFloatBE(v); return b; }
    case 6: { const b = B(8); b.writeDoubleBE(v); return b; }
    case 7: { const l = B(4); l.writeInt32BE(v.length); return Buffer.concat([l, Buffer.from(v)]); }
    case 8: return nbtStr(v);
    case 9: { const l = B(5); l[0] = v.length ? tag.et : (tag.et || 0); l.writeInt32BE(v.length, 1); return Buffer.concat([l, ...v.map(nbtPay)]); }
    case 10: return Buffer.concat([...v.map(([k, x]) => Buffer.concat([Buffer.from([x.t]), nbtStr(k), nbtPay(x)])), Buffer.from([0])]);
    case 11: { const b = B(4 + v.length * 4); b.writeInt32BE(v.length); v.forEach((x, i) => b.writeInt32BE(x, 4 + i * 4)); return b; }
    case 12: { const b = B(4 + v.length * 8); b.writeInt32BE(v.length); v.forEach((x, i) => b.writeBigInt64BE(BigInt(x), 4 + i * 8)); return b; }
  }
}
const nbtWrite = r => Buffer.concat([Buffer.from([r.tag.t]), nbtStr(r.name), nbtPay(r.tag)]);
// Añade servidores a servers.dat sin tocar los que ya hay
function syncServers(dir, list) {
  if (!list.length) return false;
  const f = path.join(dir, 'servers.dat'); let root = null;
  try { root = nbtRead(fs.readFileSync(f)); } catch {}
  if (!root || root.tag.t !== 10) root = { name: '', tag: { t: 10, v: [] } };
  let sv = root.tag.v.find(([k, x]) => k === 'servers' && x.t === 9);
  if (!sv) { sv = ['servers', { t: 9, et: 10, v: [] }]; root.tag.v = root.tag.v.filter(([k]) => k !== 'servers'); root.tag.v.push(sv); }
  if (!sv[1].v.length) sv[1].et = 10;
  let ch = false;
  for (const s of list) {
    if (sv[1].v.some(c => c.t === 10 && c.v.some(([k, x]) => k === 'ip' && String(x.v).toLowerCase() === s.ip.toLowerCase()))) continue;
    sv[1].v.push({ t: 10, v: [['ip', { t: 8, v: s.ip }], ['name', { t: 8, v: s.name }]] }); ch = true;
  }
  if (ch) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, nbtWrite(root)); }
  return ch;
}
ipcMain.handle('srv:sync', (e, id) => { const c = load(); syncServers(iDir(getIns(id).id), (c.myServers || []).filter(z => z && z.host).map(z => ({ name: String(z.name || z.host), ip: String(z.host) + (z.port && +z.port !== 25565 ? ':' + z.port : '') }))); return true; });

// ---- Mundos de cada instancia ----
async function dirSize(d, lim = { n: 0 }) {
  let t = 0, es; try { es = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return 0; }
  for (const e of es) { if (++lim.n > 60000) return t; const p = path.join(d, e.name); if (e.isDirectory()) t += await dirSize(p, lim); else { try { t += (await fs.promises.stat(p)).size; } catch {} } }
  return t;
}
const uniq = (dir, name) => { let n = name, i = 2; while (fs.existsSync(path.join(dir, n))) n = name + ' (' + i++ + ')'; return n; };
ipcMain.handle('worlds:list', async (e, id) => {
  const sv = path.join(iDir(getIns(id).id), 'saves'); let es = []; try { es = await fs.promises.readdir(sv, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const d of es) {
    if (!d.isDirectory()) continue; let st; try { st = await fs.promises.stat(path.join(sv, d.name, 'level.dat')); } catch { continue; }
    let icon = ''; try { const b = await fs.promises.readFile(path.join(sv, d.name, 'icon.png')); if (b.length < 300000) icon = 'data:image/png;base64,' + b.toString('base64'); } catch {}
    out.push({ name: d.name, date: st.mtimeMs, size: await dirSize(path.join(sv, d.name)), icon });
  }
  return out.sort((a, b) => b.date - a.date);
});
ipcMain.handle('worlds:copy', async (e, { from, world, to }) => {
  getIns(from); getIns(to); const name = path.basename(String(world)), src = path.join(iDir(from), 'saves', name);
  if (!fs.existsSync(path.join(src, 'level.dat'))) throw new Error('Mundo no encontrado');
  if (running.has(String(from))) throw new Error('Cierra Minecraft antes de copiar un mundo');
  const dst = path.join(iDir(to), 'saves'); fs.mkdirSync(dst, { recursive: true }); const nn = uniq(dst, name);
  send('status', 'Copiando mundo…'); try { await fs.promises.cp(src, path.join(dst, nn), { recursive: true }); } finally { send('status', ''); }
  return nn;
});
function findWorlds(d, depth = 0) {
  if (fs.existsSync(path.join(d, 'level.dat'))) return [d]; const out = []; if (depth >= 3) return out;
  let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch {}
  for (const e of es) if (e.isDirectory() && e.name !== '__MACOSX') out.push(...findWorlds(path.join(d, e.name), depth + 1));
  return out;
}
async function importWorldZips(files, id) {
  const names = [], sv = path.join(iDir(id), 'saves'); fs.mkdirSync(sv, { recursive: true });
  for (const zf of files) {
    const tmp = path.join(root, 'tmp_world'); await rmAsync(tmp); await fsp.mkdir(tmp, { recursive: true });
    try {
      send('status', 'Importando mapa…'); await unzipSafe(zf, tmp);
      for (const w of findWorlds(tmp)) { const base = w === tmp ? path.basename(zf).replace(/\.zip$/i, '') : path.basename(w), nn = uniq(sv, safeName(base, 'Mapa')); await fs.promises.cp(w, path.join(sv, nn), { recursive: true }); names.push(nn); }
    } finally { await rmAsync(tmp).catch(() => {}); send('status', ''); }
  }
  if (!names.length) throw new Error('No se encontró ningún mundo dentro del .zip (debe contener level.dat)');
  return { names };
}
ipcMain.handle('worlds:import', async (e, id) => {
  getIns(id); const r = await dialog.showOpenDialog(win, { title: 'Importar mapas', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Mapa (.zip)', extensions: ['zip'] }] });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return importWorldZips(r.filePaths, getIns(id).id);
});

// ---- Shaders: Iris + Sodium ----
ipcMain.handle('mods:has', (e, { id, names }) => {
  let fl = []; try { fl = fs.readdirSync(path.join(iDir(getIns(id).id), 'mods')).filter(f => /\.jar(\.disabled)?$/i.test(f) && !/\.disabled$/i.test(f)).map(f => f.toLowerCase()); } catch {}
  const out = {}; for (const n of names || []) out[n] = fl.some(f => f.includes(String(n).toLowerCase())); return out;
});
ipcMain.handle('mods:bundle', async (e, { id, slugs }) => {
  const ins = getIns(id), md = path.join(iDir(ins.id), 'mods'), ld = String(ins.ld || '').toLowerCase(), failed = [], done = new Set(), q = x => encodeURIComponent(JSON.stringify(x));
  if (!['fabric', 'forge', 'neoforge'].includes(ld)) throw new Error('Elige Fabric, Forge o NeoForge');
  fs.mkdirSync(md, { recursive: true });
  const one = async (pid, lvl) => {
    if (done.has(pid)) return; done.add(pid);
    const vs = await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version?game_versions=${q([ins.mc])}&loaders=${q([ld])}`); if (!vs.length) throw new Error('sin versión');
    const v = vs[0], f = v.files.find(x => x.primary) || v.files[0]; await dl(f.url, path.join(md, path.basename(f.filename)), { sha1: f.hashes && f.hashes.sha1, sha512: f.hashes && f.hashes.sha512 });
    if (lvl < 1) for (const d of v.dependencies || []) if (d.dependency_type === 'required' && d.project_id) await one(d.project_id, lvl + 1).catch(() => {});
  };
  let n = 0; await pool(slugs || [], 3, async s => { try { await one(String(s), 0); } catch { failed.push(s); } prog('Instalando', ++n, (slugs || []).length); });
  send('progress', null); return { failed };
});

// ---- Revisión de mods antes de jugar ----
// Consulta Modrinth por la huella de cada mod activo y avisa de: mod de otro cargador, de otra versión de Minecraft,
// mods incompatibles entre sí y dependencias obligatorias que faltan. Los resultados se guardan por huella.
const MCK_TTL = 7 * 864e5, MCK_NEG = 864e5, MCK_LD = ['fabric', 'forge', 'neoforge', 'quilt'];
let mck = null, mckT = 0;
const mckFile = () => path.join(root, 'cache', 'modcheck.json');
async function mckLoad() {
  if (mck) return mck;
  mck = rd(mckFile(), null);
  if (!mck || mck.v !== 1 || !mck.h || !mck.p) mck = { v: 1, h: {}, p: {} };
  return mck;
}
function mckSave() {
  clearTimeout(mckT);
  mckT = setTimeout(async () => {
    try {
      const now = Date.now();
      for (const k of Object.keys(mck.h)) if (now - mck.h[k].t > 30 * 864e5) delete mck.h[k];
      for (const k of Object.keys(mck.p)) if (now - mck.p[k].t > 30 * 864e5) delete mck.p[k];
      wr(mckFile(), mck);
    } catch {}
  }, 400);
}
const mckJson = async (u, body) => {
  const r = await fetch(u, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(9000), headers: { 'User-Agent': UA(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
};
const mckMc = g => { const r = g.filter(x => /^\d+\.\d+(\.\d+)?$/.test(x)), L = r.length ? r : g; return L[L.length - 1]; };
const mckLd = n => ({ fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }[n] || n);
ipcMain.handle('mods:precheck', async (e, { id }) => {
  const none = (why, extra) => ({ skipped: why, problems: [], missing: [], ...extra });
  if (load().modCheck === false) return none('off');
  const ins = getIns(id), ld = String(ins.ld || '').toLowerCase();
  if (!['fabric', 'forge', 'neoforge'].includes(ld)) return none('vanilla');
  const files = (await listMods(ins.id)).filter(m => m.enabled);
  if (!files.length) return none('nomods');
  send('status', 'Revisando los mods…');
  const C = await mckLoad(), now = Date.now(), fresh = en => en && now - en.t < (en.d ? MCK_TTL : MCK_NEG);
  const need = [...new Set(files.map(f => f.sha1))].filter(h => !fresh(C.h[h]));
  let offline = false;
  if (need.length) {
    try {
      const r = await mckJson('https://api.modrinth.com/v2/version_files', { hashes: need, algorithm: 'sha1' });
      for (const h of need) { const v = r && r[h]; C.h[h] = { t: now, d: v ? { p: v.project_id, g: v.game_versions || [], l: v.loaders || [], dp: (v.dependencies || []).filter(x => x && x.project_id && (x.dependency_type === 'required' || x.dependency_type === 'incompatible')).map(x => [x.project_id, x.dependency_type]) } : null }; }
      mckSave();
    } catch { offline = true; }
  }
  const known = [];
  for (const f of files) { const en = C.h[f.sha1]; if (en && en.d) known.push({ ...f, e: en.d }); }
  if (!known.length) return none(offline ? 'offline' : 'unknown', { offline, checked: 0, unknown: files.length });
  // Nombres de los proyectos (también los de las dependencias que faltan)
  const byP = new Map(); for (const f of known) if (!byP.has(f.e.p)) byP.set(f.e.p, f);
  const pids = new Set(byP.keys()); for (const f of known) for (const [p] of f.e.dp) pids.add(p);
  const needP = [...pids].filter(p => !C.p[p] || now - C.p[p].t > MCK_TTL);
  if (needP.length && !offline) {
    for (let i = 0; i < needP.length; i += 80) {
      try { for (const p of await mckJson('https://api.modrinth.com/v2/projects?ids=' + encodeURIComponent(JSON.stringify(needP.slice(i, i + 80))))) C.p[p.id] = { t: now, n: p.title || '', s: p.slug || '' }; mckSave(); } catch { offline = true; break; }
    }
  }
  const title = p => (C.p[p] && C.p[p].n) || '', nm = f => title(f.e.p) || f.file.replace(/\.jar$/i, '');
  const problems = [], bad = new Set(), pairs = new Set();
  for (const f of known) {
    const mods = f.e.l.filter(x => MCK_LD.includes(x));
    if (mods.length && !mods.includes(ld)) { problems.push({ t: 'loader', file: f.file, name: nm(f), has: mods.map(mckLd).join(' / '), ld: mckLd(ld) }); bad.add(f.file); continue; }
    if (f.e.g.length && !f.e.g.includes(ins.mc)) { problems.push({ t: 'mc', file: f.file, name: nm(f), mc: mckMc(f.e.g), now: ins.mc }); bad.add(f.file); continue; }
  }
  for (const f of known) for (const [p, ty] of f.e.dp) {
    if (ty !== 'incompatible' || !byP.has(p)) continue;
    const o = byP.get(p); if (o.file === f.file || bad.has(f.file) || bad.has(o.file)) continue;
    const key = [f.file, o.file].sort().join('|'); if (pairs.has(key)) continue; pairs.add(key);
    const [off, keep] = f.mt >= o.mt ? [f, o] : [o, f]; // se apaga el último que se añadió
    problems.push({ t: 'inc', file: off.file, name: nm(off), other: nm(keep) }); bad.add(off.file);
  }
  const unk = files.filter(f => !C.h[f.sha1] || !C.h[f.sha1].d).map(f => f.file.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const miss = new Map();
  for (const f of known) {
    if (bad.has(f.file)) continue;
    for (const [p, ty] of f.e.dp) {
      if (ty !== 'required' || byP.has(p)) continue;
      const slug = ((C.p[p] && C.p[p].s) || '').replace(/[^a-z0-9]/g, ''); if (slug && unk.some(u => u.includes(slug))) continue; // lo trae un jar que Modrinth no conoce
      if (!miss.has(p)) miss.set(p, { pid: p, name: title(p) || '', by: [] }); const m = miss.get(p); if (!m.by.includes(nm(f))) m.by.push(nm(f));
    }
  }
  return { problems, missing: [...miss.values()], offline, checked: known.length, unknown: files.length - known.length };
});

// ---- Volver a una versión anterior ----
const GH = 'JustMarcoDev/nova-launcher';
ipcMain.handle('app:releases', async () => {
  const r = await get(`https://api.github.com/repos/${GH}/releases?per_page=30`, 'json', { Accept: 'application/vnd.github+json' });
  return r.filter(x => !x.draft).map(x => { const a = (x.assets || []).find(z => /\.exe$/i.test(z.name) && !/blockmap/i.test(z.name)); return { tag: x.tag_name, version: String(x.tag_name).replace(/^v/, ''), name: x.name || x.tag_name, date: x.published_at, pre: !!x.prerelease, url: a ? a.browser_download_url : '', size: a ? a.size : 0 }; }).filter(x => x.url);
});
ipcMain.handle('app:rollback', async (e, { url, version }) => {
  if (!app.isPackaged) throw new Error('Solo funciona en la app instalada');
  if (!String(url).startsWith(`https://github.com/${GH}/releases/download/`)) throw new Error('Enlace no válido');
  send('status', 'Descargando Nova Launcher ' + version + '…');
  const f = path.join(os.tmpdir(), 'NovaLauncher-' + String(version).replace(/[^\w.-]/g, '') + '-Setup.exe');
  fs.writeFileSync(f, Buffer.from(await get(url, 'arrayBuffer')));
  wr(cfgFile, { ...load(), autoUpdate: false });
  require('child_process').spawn(f, [], { detached: true, stdio: 'ignore' }).unref(); setTimeout(() => app.quit(), 600); return true;
});

// ---- Importar desde otros launchers ----
const IMP_ITEMS = ['saves', 'mods', 'config', 'resourcepacks', 'shaderpacks', 'screenshots', 'options.txt', 'optionsof.txt', 'servers.dat', 'defaultconfigs', 'kubejs', 'scripts', 'schematics'];
const cnt = d => { try { return fs.readdirSync(d).length; } catch { return 0; } };
const subdirs = d => { try { return fs.readdirSync(d, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name); } catch { return []; } };
const neoMc = v => { const p = String(v).split('.'); return '1.' + p[0] + (+p[1] ? '.' + p[1] : ''); };
function scanOther() {
  const out = [], ap = app.getPath('appData'), home = os.homedir();
  const mc = path.join(ap, '.minecraft');
  if (fs.existsSync(path.join(mc, 'saves')) || fs.existsSync(path.join(mc, 'launcher_profiles.json'))) {
    let mcv = '', ld = 'Vanilla', lv = ''; const lp = rd(path.join(mc, 'launcher_profiles.json'), null);
    if (lp && lp.profiles) {
      const ps = Object.values(lp.profiles).filter(x => x && x.lastVersionId && !/^latest-/.test(x.lastVersionId)).sort((a, b) => String(b.lastUsed || '').localeCompare(String(a.lastUsed || '')));
      if (ps[0]) { const id = String(ps[0].lastVersionId); let m;
        if ((m = /^fabric-loader-([\d.]+)-(.+)$/.exec(id))) { ld = 'Fabric'; lv = m[1]; mcv = m[2]; }
        else if ((m = /^(.+)-forge-?([\d.]+)$/i.exec(id))) { ld = 'Forge'; lv = m[2]; mcv = m[1]; }
        else if ((m = /^neoforge-([\d.]+)/.exec(id))) { ld = 'NeoForge'; lv = m[1]; mcv = neoMc(lv); }
        else mcv = id; }
    }
    out.push({ src: 'official', label: 'Launcher oficial', name: 'Minecraft oficial', dir: mc, mc: mcv, ld, loaderVersion: lv, worlds: cnt(path.join(mc, 'saves')), mods: cnt(path.join(mc, 'mods')) });
  }
  for (const base of [path.join(home, 'curseforge', 'minecraft', 'Instances'), path.join(home, 'Documents', 'curseforge', 'minecraft', 'Instances')]) {
    for (const d of subdirs(base)) {
      const j = rd(path.join(base, d, 'minecraftinstance.json'), null); if (!j) continue;
      const bn = String((j.baseModLoader && j.baseModLoader.name) || '').toLowerCase(); let ld = 'Vanilla', lv = '', un = '', m;
      if ((m = /^fabric-([\d.]+)/.exec(bn))) { ld = 'Fabric'; lv = m[1]; } else if ((m = /^neoforge-([\d.]+)/.exec(bn))) { ld = 'NeoForge'; lv = m[1]; } else if ((m = /^forge-([\d.]+)/.exec(bn))) { ld = 'Forge'; lv = m[1]; } else if (/^quilt/.test(bn)) un = 'Quilt no está soportado';
      out.push({ src: 'curseforge', label: 'CurseForge', name: String(j.name || d), dir: path.join(base, d), mc: String(j.gameVersion || (j.baseModLoader && j.baseModLoader.minecraftVersion) || ''), ld, loaderVersion: lv, worlds: cnt(path.join(base, d, 'saves')), mods: cnt(path.join(base, d, 'mods')), unsupported: un });
    }
  }
  for (const [lab, base] of [['Prism', path.join(ap, 'PrismLauncher', 'instances')], ['MultiMC', path.join(ap, 'MultiMC', 'instances')]]) {
    for (const d of subdirs(base)) {
      const pk = rd(path.join(base, d, 'mmc-pack.json'), null); if (!pk || !pk.components) continue;
      const v = u => { const c = pk.components.find(x => x.uid === u); return c ? String(c.version || '') : ''; };
      let nm = d; try { const m = /^name=(.*)$/m.exec(fs.readFileSync(path.join(base, d, 'instance.cfg'), 'utf8')); if (m) nm = m[1].trim(); } catch {}
      let ld = 'Vanilla', lv = '', un = '';
      if (v('net.fabricmc.fabric-loader')) { ld = 'Fabric'; lv = v('net.fabricmc.fabric-loader'); } else if (v('net.neoforged')) { ld = 'NeoForge'; lv = v('net.neoforged'); } else if (v('net.minecraftforge')) { ld = 'Forge'; lv = v('net.minecraftforge'); } else if (v('org.quiltmc.quilt-loader')) un = 'Quilt no está soportado';
      const gd = [path.join(base, d, '.minecraft'), path.join(base, d, 'minecraft')].find(fs.existsSync) || path.join(base, d);
      out.push({ src: lab.toLowerCase(), label: lab, name: nm, dir: gd, mc: v('net.minecraft'), ld, loaderVersion: lv, worlds: cnt(path.join(gd, 'saves')), mods: cnt(path.join(gd, 'mods')), unsupported: un });
    }
  }
  return out;
}
ipcMain.handle('import:scan', () => scanOther());
ipcMain.handle('import:run', async (e, dir) => {
  const x = scanOther().find(z => z.dir === String(dir)); if (!x) throw new Error('No se encontró esa instancia');
  if (x.unsupported) throw new Error(x.unsupported);
  const mcv = x.mc || (await get(MAN)).latest.release;
  const ins = addInst({ name: String(x.name).slice(0, 40), mc: mcv, ld: x.ld, loaderVersion: x.loaderVersion || undefined, type: /^\d+\.\d+(\.\d+)?$/.test(mcv) ? 'release' : 'snapshot', custom: true });
  const dst = iDir(ins.id); fs.mkdirSync(dst, { recursive: true });
  try { for (const it of IMP_ITEMS) { const sp = path.join(x.dir, it); if (!fs.existsSync(sp)) continue; send('status', 'Importando: ' + it + '…'); await fs.promises.cp(sp, path.join(dst, it), { recursive: true }); } }
  finally { send('status', ''); }
  notify('Instancia importada', ins.name); return { ins };
});

// ---- Guardar y cargar los ajustes ----
ipcMain.handle('settings:export', async (e, obj) => {
  const r = await dialog.showSaveDialog(win, { title: 'Guardar mis ajustes', defaultPath: path.join(app.getPath('documents'), 'nova-ajustes.json'), filters: [{ name: 'Ajustes de Nova Launcher', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { canceled: true };
  fs.writeFileSync(r.filePath, JSON.stringify({ app: 'nova-launcher', version: app.getVersion(), settings: obj || {} }, null, 1)); return { ok: true, file: r.filePath };
});
ipcMain.handle('settings:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Cargar mis ajustes', properties: ['openFile'], filters: [{ name: 'Ajustes de Nova Launcher', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  let j; try { j = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); } catch { throw new Error('El archivo no es válido'); }
  if (!j || j.app !== 'nova-launcher' || !j.settings || typeof j.settings !== 'object') throw new Error('Este archivo no es de Nova Launcher');
  return { settings: j.settings };
});


// ===== 0.2.13: sin conexión, diagnóstico, cola de descargas, arrastrar y soltar, GPU, ajustes de Java, último mundo =====
let onl = { t: 0, v: true };
async function isOnline(force) {
  if (!force && Date.now() - onl.t < 15000) return onl.v;
  let v = true; try { const r = await fetch(MAN, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); v = !!r && r.ok !== false; } catch { v = false; }
  onl = { t: Date.now(), v }; return v;
}
// Ajustes de Java «Optimizar el juego»: recolector G1 afinado para menos tirones y arranque más rápido
const JVM_OPT = ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled', '-XX:MaxGCPauseMillis=130', '-XX:+UnlockExperimentalVMOptions', '-XX:+DisableExplicitGC',
  '-XX:G1NewSizePercent=28', '-XX:G1MaxNewSizePercent=45', '-XX:G1HeapRegionSize=16M', '-XX:G1ReservePercent=20', '-XX:G1HeapWastePercent=5',
  '-XX:G1MixedGCCountTarget=4', '-XX:InitiatingHeapOccupancyPercent=15', '-XX:G1MixedGCLiveThresholdPercent=90', '-XX:G1RSetUpdatingPauseTimePercent=5',
  '-XX:SurvivorRatio=32', '-XX:MaxTenuringThreshold=1', '-XX:+PerfDisableSharedMem', '-XX:+UseStringDeduplication', '-Xshare:auto', '-Dsun.java2d.noddraw=true'];
const JVM_PRESETS = {
  rendimiento: ['-XX:+UseG1GC', '-XX:+UnlockExperimentalVMOptions', '-XX:+DisableExplicitGC', '-XX:+ParallelRefProcEnabled', '-XX:+UseStringDeduplication'],
  tirones: ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled', '-XX:MaxGCPauseMillis=200', '-XX:+UnlockExperimentalVMOptions', '-XX:+DisableExplicitGC', '-XX:G1NewSizePercent=30', '-XX:G1MaxNewSizePercent=40', '-XX:G1HeapRegionSize=8M', '-XX:G1ReservePercent=20', '-XX:G1HeapWastePercent=5', '-XX:G1MixedGCCountTarget=4', '-XX:InitiatingHeapOccupancyPercent=15', '-XX:G1MixedGCLiveThresholdPercent=90', '-XX:G1RSetUpdatingPauseTimePercent=5', '-XX:SurvivorRatio=32', '-XX:+PerfDisableSharedMem', '-XX:MaxTenuringThreshold=1']
};
const GPU_KEY = 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences';
// Menú de Nova dentro del juego: mod de Fabric incluido de fábrica (carpeta assets/mods), siempre activo.
// Se carga con -Dfabric.addMods, así que no aparece en la carpeta mods de la instancia ni se puede borrar desde ahí.
// Vanilla se lanza a través de Fabric para poder cargarlo; si algo falla se juega en vanilla normal.
const NOVA_MC = ['1.21.1', '1.20.1'];          // versiones de Minecraft con mod incluido
// Vídeo de fondo del menú de Nova (frames JPEG empaquetados): fuera del jar para que el mod pese poco
function novaBg() {
  const src = path.join(__dirname, 'assets', 'nova-bg.nvb');
  if (!fs.existsSync(src)) return null;
  const dst = path.join(root, 'nova', 'nova-bg.nvb');
  try {
    const a = fs.statSync(src), b = fs.existsSync(dst) ? fs.statSync(dst) : null;
    if (!b || b.size !== a.size) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(src)); }
  } catch { return null; }
  return dst;
}
function novaModJar(mc) {
  if (!NOVA_MC.includes(mc)) return null;
  const src = path.join(__dirname, 'assets', 'mods', 'nova-menu-' + mc + '.jar');
  if (!fs.existsSync(src)) return null;
  // Java no lee dentro de app.asar: se copia a la carpeta de datos
  const dst = path.join(root, 'nova', 'nova-menu-' + mc + '.jar');
  try {
    const a = fs.statSync(src), b = fs.existsSync(dst) ? fs.statSync(dst) : null;
    if (!b || b.size !== a.size) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(src)); }
  } catch { return null; }
  return dst;
}
async function applyGpu(java, on) {
  if (process.platform !== 'win32' || !java) return;
  const exes = [java, java.replace(/java\.exe$/i, 'javaw.exe')].filter((v, i, a) => a.indexOf(v) === i), set = new Set(load().gpuSet || []);
  for (const x of exes) {
    if (on) { await run('reg', ['add', GPU_KEY, '/v', x, '/t', 'REG_SZ', '/d', 'GpuPreference=2;', '/f']); set.add(x); }
    else if (set.has(x)) { await run('reg', ['delete', GPU_KEY, '/v', x, '/f']).catch(() => {}); set.delete(x); }
  }
  wr(cfgFile, { ...load(), gpuSet: [...set] });
}
// ---- Cola de descargas (controles) ----
ipcMain.handle('dq:state', () => ({ active: DQ.active + DQ.pools, paused: DQ.paused, limit: DQ.limit, speed: DQ.speed, left: dqLeft(), eta: dqEta() }));
ipcMain.handle('dq:pause', (e, on) => { DQ.paused = on === undefined ? !DQ.paused : !!on; dqSend(); return DQ.paused; });
ipcMain.handle('dq:cancel', () => { if (DQ.active || DQ.pools) { DQ.cancel = true; DQ.paused = false; } dqSend(); return true; });
ipcMain.handle('dq:limit', (e, mb) => { const v = Math.max(0, Math.min(100, +mb || 0)); DQ.limit = v; wr(cfgFile, { ...load(), dlLimit: v }); dqSend(); return v; });
// ---- Continuar: último mundo jugado ----
ipcMain.handle('world:last', () => {
  let best = null;
  for (const i of li()) {
    if (!modernQP(i.mc)) continue; const sv = path.join(iDir(i.id), 'saves'); let es = []; try { es = fs.readdirSync(sv, { withFileTypes: true }); } catch { continue; }
    for (const d of es) { if (!d.isDirectory()) continue; try { const st = fs.statSync(path.join(sv, d.name, 'level.dat')); if (!best || st.mtimeMs > best.date) best = { inst: i.id, name: d.name, date: st.mtimeMs, instName: i.name, mc: i.mc, ld: i.ld || 'Vanilla' }; } catch {} }
  }
  return best;
});
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
// ---- Arrastrar y soltar ----
const zipList = z => new Promise((res, rej) => execFile(win32 ? 'tar' : 'unzip', win32 ? ['-tf', z] : ['-Z1', z], { maxBuffer: 1e8 }, (er, out) => er ? rej(er) : res(String(out).split(/\r?\n/).filter(Boolean))));
async function dropKind(f) {
  const ext = path.extname(f).toLowerCase();
  if (ext === '.jar') return 'mod';
  if (ext === '.mrpack') return 'modpack';
  if (ext !== '.zip') return 'unknown';
  let L = []; try { L = (await zipList(f)).map(x => x.replace(/\\/g, '/')); } catch { return 'unknown'; }
  const has = re => L.some(x => re.test(x));
  if (has(/^([^/]+\/)?modrinth\.index\.json$/)) return 'modpack';
  if (has(/^([^/]+\/)?nova-instance\.json$/)) return 'instance';
  if (has(/^([^/]+\/){0,2}level\.dat$/)) return 'world';
  if (has(/^([^/]+\/)?pack\.mcmeta$/)) return 'resource';
  if (has(/^([^/]+\/)?shaders\//)) return 'shader';
  if (has(/^([^/]+\/)?assets\//)) return 'resource';
  return 'unknown';
}
ipcMain.handle('drop:inspect', async (e, paths) => {
  const out = [];
  for (const f of (Array.isArray(paths) ? paths : []).slice(0, 20)) { try { const st = fs.statSync(String(f)); if (st.isFile()) out.push({ path: String(f), name: path.basename(String(f)), size: st.size, kind: await dropKind(String(f)) }); } catch {} }
  return out;
});
ipcMain.handle('drop:install', async (e, { path: f, kind, inst }) => {
  f = String(f || ''); if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw new Error('Archivo no encontrado');
  const ext = path.extname(f).toLowerCase(), place = { mod: ['mods', '.jar'], shader: ['shaderpacks', '.zip'], resource: ['resourcepacks', '.zip'] }[kind];
  if (place) {
    if (ext !== place[1]) throw new Error('Este tipo necesita un archivo ' + place[1]);
    const ins = getIns(inst), d = path.join(iDir(ins.id), place[0]); fs.mkdirSync(d, { recursive: true });
    if (kind === 'mod') { try { await autoBackup(ins.id, 'antes de añadir un mod'); } catch {} }
    const base = safeName(path.basename(f), 'archivo'); let nn = base, k = 2; while (fs.existsSync(path.join(d, nn))) nn = base.replace(/(\.[^.]*)?$/, ' (' + k++ + ')$1');
    await fs.promises.copyFile(f, path.join(d, nn)); return { kind, name: nn, inst: ins.name };
  }
  if (kind === 'world') { const ins = getIns(inst), r = await importWorldZips([f], ins.id); return { kind, name: r.names.join(', '), inst: ins.name }; }
  if (kind === 'modpack' || kind === 'instance') { const r = await importInstanceFile(f); return { kind, name: r.ins.name, failed: r.failed || [] }; }
  throw new Error('Tipo no reconocido');
});

// ===== 0.2.14: preparar antes de jugar, limpieza de espacio =====
const { EventEmitter } = require('events');
let PREPP = null, PREPQ = null; const PREPD = new Set(); let PREPLAST = null;
const prepKey = r => [r.mc, r.ld || 'Vanilla', r.loaderVersion || ''].join('|');
async function prepRun(r) {
  const cfg = load(), key = prepKey(r), mc = String(r.mc || ''), ld = ['Fabric', 'Forge', 'NeoForge'].includes(r.ld) ? r.ld : 'Vanilla';
  const pr = (state, extra) => send('prep', { state, mc, ld, ...extra });
  if (!mc || !/^[\w.\-+ ]{1,40}$/.test(mc)) return pr('error', { msg: 'Versión no válida' });
  if (PREPD.has(key)) return pr('done', {});
  if (!(await isOnline())) return pr('offline', {});
  pr('start', { pct: 0 }); PREPLAST = mc;
  try {
    const java = await javaFor(mc, { javaPath: cfg.javaPath });
    const o = { authorization: Authenticator.getAuth('Nova'), root, javaPath: java, version: { number: mc, type: r.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: path.join(root, 'instances', '.prep') }, memory: { max: '1G', min: '256M' } };
    if (ld === 'Fabric') o.version.custom = await fabric(mc, r.loaderVersion);
    if (ld === 'Forge' || ld === 'NeoForge') o.version.custom = await forge(ld, mc, java, r.loaderVersion);
    const l = new Client();
    l.startMinecraft = () => { const f = new EventEmitter(); f.stdout = new EventEmitter(); f.stderr = new EventEmitter(); f.pid = 0; f.kill = () => {}; return f; };
    l.on('progress', p => { if (p && p.total) pr('progress', { pct: Math.min(99, Math.round(p.task / p.total * 100)) }); });
    const res = await l.launch(o);
    if (!res) throw new Error('No se pudo preparar');
    try { await rmAsync(path.join(root, 'instances', '.prep')); } catch {}
    PREPD.add(key); pr('done', {});
  } catch (e) { pr('error', { msg: String(e && e.message || e) }); }
}
ipcMain.handle('prep:run', (e, r) => {
  r = r || {}; if (load().prefetch === false || running.size) return { skipped: true };
  if (PREPP) { PREPQ = r; return { queued: true }; }
  const go = req => { PREPP = prepRun(req).finally(() => { PREPP = null; const n = PREPQ; PREPQ = null; if (n && prepKey(n) !== prepKey(req)) go(n); }); };
  go(r); return { started: true };
});
ipcMain.handle('prep:state', () => ({ busy: !!PREPP, last: PREPLAST }));

const D = { day: 864e5 };
async function walkFiles(dir, out = [], rel = '') {
  let es; try { es = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const r = rel ? rel + '/' + e.name : e.name, p = path.join(dir, e.name); if (e.isDirectory()) await walkFiles(p, out, r); else { try { const st = await fs.promises.stat(p); out.push({ rel: r, p, size: st.size, mtime: st.mtimeMs }); } catch {} } }
  return out;
}
const mavenDir = n => { const [g, a, v] = String(n).split(':'); return g && a && v ? g.replace(/\./g, '/') + '/' + a + '/' + v.split('@')[0] : null; };
async function usedVersionDirs() {
  const vd = path.join(root, 'versions'); let have = []; try { have = (await fsp.readdir(vd, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name); } catch {}
  const used = new Set();
  for (const i of li()) {
    used.add(i.mc);
    for (const d of have) {
      if ((i.ld === 'Fabric' || ((!i.ld || i.ld === 'Vanilla') && NOVA_MC.includes(i.mc))) && d.startsWith('fabric-loader-') && d.endsWith('-' + i.mc)) used.add(d);
      if (i.ld === 'Forge' && d.startsWith(i.mc + '-forge')) used.add(d);
      if (i.ld === 'NeoForge' && nfC(i.mc).some(c => d.startsWith('neoforge-' + c))) used.add(d);
    }
  }
  if (PREPLAST) used.add(PREPLAST);
  for (const d of have) { try { if (Date.now() - (await fsp.stat(path.join(vd, d))).mtimeMs < 2 * D.day) used.add(d); } catch {} }
  return { have, used };
}
async function usedLibDirs(usedVers) {
  const dirs = new Set(), arts = new Set(), seen = new Set();
  const add = async v => {
    if (seen.has(v)) return; seen.add(v);
    let j; try { j = JSON.parse(await fsp.readFile(path.join(root, 'versions', v, v + '.json'), 'utf8')); } catch { return; }
    for (const lib of j.libraries || []) {
      const dn = mavenDir(lib.name); if (dn) { dirs.add(dn); arts.add(dn.split('/').slice(0, -1).join('/')); }
      const d = lib.downloads || {}; if (d.artifact && d.artifact.path) dirs.add(path.posix.dirname(d.artifact.path));
      for (const c of Object.values(d.classifiers || {})) if (c && c.path) dirs.add(path.posix.dirname(c.path));
    }
    if (j.inheritsFrom) await add(j.inheritsFrom);
  };
  for (const v of usedVers) await add(v);
  return { dirs, arts };
}
const PROT = ['net/minecraftforge/', 'net/neoforged/', 'net/minecraft/', 'de/oceanlabs/', 'cpw/'];
async function cleanScan() {
  const cats = [], now = Date.now();
  // 1) versiones sin uso
  const { have, used } = await usedVersionDirs(), vd = path.join(root, 'versions'), unusedV = have.filter(d => !used.has(d));
  const vItems = []; for (const d of unusedV) vItems.push({ p: path.join(vd, d), name: d, size: await dirSize(path.join(vd, d)) });
  cats.push({ id: 'versions', title: 'Versiones de Minecraft sin uso', desc: 'Versiones y cargadores que ninguna instancia usa. Se descargan otra vez si los necesitas.', items: vItems });
  // 2) librerías sin uso
  const ld = path.join(root, 'libraries'), keepVers = have.filter(d => used.has(d)), { dirs, arts } = await usedLibDirs(keepVers);
  const protectLoader = li().some(i => i.ld === 'Forge' || i.ld === 'NeoForge') || keepVers.some(d => /forge/i.test(d));
  const libFiles = await walkFiles(ld), byDir = new Map();
  for (const f of libFiles) {
    const dn = path.posix.dirname(f.rel); if (dirs.has(dn)) continue;
    if (protectLoader && PROT.some(x => f.rel.startsWith(x))) continue;
    if (now - f.mtime < 2 * D.day) continue;
    const e = byDir.get(dn) || { p: path.join(ld, ...dn.split('/')), name: dn, size: 0 }; e.size += f.size; byDir.set(dn, e);
  }
  cats.push({ id: 'libs', title: 'Librerías sin uso', desc: 'Archivos de versiones antiguas de librerías que ya no necesita ninguna versión instalada.', items: [...byDir.values()] });
  // 3) copias de seguridad antiguas
  const bItems = [], br = path.join(root, 'backups'); let bd = []; try { bd = (await fsp.readdir(br, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name); } catch {}
  const ids = new Set(li().map(i => i.id));
  for (const id of bd) {
    const fl = await bkList(id);
    fl.forEach((f, k) => { if (!ids.has(id) || (k >= 2 && now - f.date > 30 * D.day)) bItems.push({ p: path.join(br, id, f.file), name: (ids.has(id) ? '' : '(instancia borrada) ') + f.file, size: f.size }); });
  }
  cats.push({ id: 'backups', title: 'Copias de seguridad antiguas', desc: 'Copias de más de 30 días (se conservan las 2 últimas de cada instancia) y las de instancias ya borradas.', items: bItems });
  // 4) registros e informes viejos
  const lItems = [], lg = path.join(root, 'logs'); let lf = []; try { for (const x of (await fsp.readdir(lg)).filter(x => x.endsWith('.log'))) { try { lf.push({ x, st: await fsp.stat(path.join(lg, x)) }); } catch {} } lf.sort((a, b) => b.st.mtimeMs - a.st.mtimeMs); } catch {}
  lf.forEach((f, k) => { if (k >= 5 && now - f.st.mtimeMs > 14 * D.day) lItems.push({ p: path.join(lg, f.x), name: f.x, size: f.st.size }); });
  for (const i of li()) for (const sub of ['crash-reports', 'logs']) {
    const cd = path.join(iDir(i.id), sub); let es = []; try { es = await fsp.readdir(cd); } catch {}
    for (const x of es) { if (x === 'latest.log') continue; try { const st = await fsp.stat(path.join(cd, x)); if (st.isFile() && now - st.mtimeMs > 30 * D.day) lItems.push({ p: path.join(cd, x), name: i.name + ' · ' + x, size: st.size }); } catch {} }
  }
  cats.push({ id: 'logs', title: 'Registros e informes de fallos viejos', desc: 'Registros del launcher de más de 14 días (se conservan los 5 últimos) e informes de fallos de más de 30 días.', items: lItems });
  // 5) temporales
  const tItems = []; for (const t of [path.join(root, 'installer.jar'), path.join(root, 'instances', '.prep')]) { try { const st = await fsp.stat(t); tItems.push({ p: t, name: path.basename(t), size: st.isDirectory() ? await dirSize(t) : st.size }); } catch {} }
  // descargas a medias (.part) de más de 2 días: ya no se van a reanudar
  const SKIPD = ['saves', 'screenshots', 'logs', 'crash-reports', 'backups', 'libraries', 'assets', 'versions', 'instances', 'cache'];
  const findParts = async (dir, depth, skip) => {
    let es; try { es = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const x of es) {
      const p = path.join(dir, x.name);
      if (x.isDirectory()) { if (depth > 0 && !(skip && SKIPD.includes(x.name)) && !['saves', 'screenshots', 'logs', 'crash-reports'].includes(x.name)) await findParts(p, depth - 1, skip); }
      else if (/\.part(\.meta)?$/i.test(x.name)) { try { const st = await fsp.stat(p); if (now - st.mtimeMs > 2 * D.day) tItems.push({ p, name: path.relative(root, p), size: st.size }); } catch {} }
    }
  };
  await findParts(root, 2, true); for (const i of li()) await findParts(iDir(i.id), 4, false);
  // 6) caché de imágenes
  const imItems = []; try { const sz = await dirSize(imgDir()); if (sz > 0) imItems.push({ p: imgDir(), name: 'Caché de imágenes', size: sz }); } catch {}
  cats.push({ id: 'imgs', title: 'Caché de imágenes', desc: 'Imágenes de mods y modpacks guardadas para verse al instante. Se vuelven a descargar al abrir el buscador.', items: imItems });
  cats.push({ id: 'temp', title: 'Archivos temporales', desc: 'Restos de instalaciones, de la preparación en segundo plano y descargas a medias de más de 2 días.', items: tItems });
  return cats;
}
ipcMain.handle('clean:scan', async () => {
  const cats = await cleanScan();
  return { running: running.size > 0, cats: cats.map(c => ({ id: c.id, title: c.title, desc: c.desc, count: c.items.length, size: c.items.reduce((a, b) => a + b.size, 0), sample: c.items.slice(0, 4).map(x => x.name) })) };
});
ipcMain.handle('clean:run', async (e, ids) => {
  if (running.size) throw new Error('Cierra Minecraft antes de limpiar');
  if (PREPP) { try { await PREPP; } catch {} }
  const want = new Set(Array.isArray(ids) ? ids.map(String) : []); let freed = 0, n = 0;
  const cats = await cleanScan(), base = path.resolve(root);
  for (const c of cats) {
    if (!want.has(c.id)) continue;
    for (const it of c.items) {
      const t = path.resolve(it.p); if (!t.startsWith(base + path.sep)) continue;
      try { await rmAsync(t); freed += it.size; n++; } catch {}
    }
    if (c.id === 'libs') { const prune = async d => { let es; try { es = await fsp.readdir(d, { withFileTypes: true }); } catch { return; } for (const x of es) if (x.isDirectory()) await prune(path.join(d, x.name)); try { if (!(await fsp.readdir(d)).length && path.resolve(d) !== path.join(base, 'libraries')) await fsp.rmdir(d); } catch {} }; await prune(path.join(root, 'libraries')); }
    if (c.id === 'versions') PREPD.clear();
  }
  return { freed, count: n };
});
