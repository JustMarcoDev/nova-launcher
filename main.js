const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'), { execFile } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const root = path.join(app.getPath('appData'), '.nova');
const cfgFile = path.join(root, 'config.json'), insFile = path.join(root, 'instances.json');
const DEF = { username: 'Jugador', ram: 4, javaPath: '', width: 1280, height: 720, fullscreen: false, jvmArgs: '', closeOnLaunch: false, cfKey: '', ms: null };
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f)); } catch { return d; } };
const wr = (f, d) => { fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1)); };
const load = () => ({ ...DEF, ...rd(cfgFile, {}) }), li = () => rd(insFile, []);
const addInst = o => { const i = { id: Date.now().toString(36), ...o }; wr(insFile, [...li(), i]); return i; };
if (rd(cfgFile, {}).hwaccel === false) app.disableHardwareAcceleration();
const MAN = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
let win, updater = null;
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
const send = (c, d) => win && win.webContents.send(c, d);
const UA = () => 'NovaLauncher/' + app.getVersion() + ' (github.com/JustMarcoDev/nova-launcher)';
const get = async (u, t = 'json', h = {}) => { const r = await fetch(u, { signal: AbortSignal.timeout(t === 'arrayBuffer' ? 600000 : 30000), headers: { 'User-Agent': UA(), ...h } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r[t](); };
const run = (cmd, args, opt = {}) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e8, ...opt }, e => e ? rej(e) : res()));

app.whenReady().then(() => {
  if (!single) return;
  win = new BrowserWindow({ width: 1100, height: 680, minWidth: 900, minHeight: 560, frame: false, backgroundColor: '#0c0c10',
    show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false } });
  win.once('ready-to-show', () => win.show());
  win.loadFile('index.html');
  if (app.isPackaged) initUpdater();
  discordInit(); ensureShortcut(); win.on('focus', () => { if (Date.now() - lastChk > 600000) chkNow(); });
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('cfg:get', () => load());
ipcMain.handle('sys', () => ({ total: Math.max(1, Math.round(os.totalmem() / 1073741824)) }));
ipcMain.handle('zoom', (e, f) => { win.webContents.setZoomFactor(Math.min(1.6, Math.max(0.7, +f || 1))); });
ipcMain.handle('cfg:set', (e, c) => { wr(cfgFile, { ...load(), ...c }); if (updater && 'autoDownload' in c) updater.autoDownload = c.autoDownload !== false; if ('discord' in c || 'discordId' in c) discordInit(); return load(); });
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
ipcMain.handle('upd:get', () => upd);
ipcMain.handle('discord:get', () => dsc);
ipcMain.handle('cache:clear', async () => { try { await win.webContents.session.clearCache(); fs.rmSync(path.join(root, 'versions_cache.json'), { force: true }); } catch {} return true; });
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
ipcMain.handle('inst:del', (e, id) => { id = String(id); if (running.has(id)) throw new Error('Cierra Minecraft antes de borrar la instancia'); wr(insFile, li().filter(i => i.id !== id)); fs.rmSync(path.join(root, 'instances', id), { recursive: true, force: true }); fs.rmSync(path.join(root, 'backups', id), { recursive: true, force: true }); });
ipcMain.handle('mod:install', async (e, { url, name, inst, dir, sha1, sha512 }) => {
  const sub = ['mods', 'shaderpacks', 'resourcepacks'].includes(dir) ? dir : 'mods';
  const d = path.join(root, inst ? path.join('instances', String(inst)) : '', sub); fs.mkdirSync(d, { recursive: true });
  await dl(url, path.join(d, path.basename(name)), { sha1, sha512 }); return true;
});
ipcMain.handle('login', async () => {
  try { const x = await new Auth('select_account').launch('electron'); const t = await x.getMinecraft();
    wr(cfgFile, { ...load(), ms: { name: t.profile.name, token: x.save() } }); return true; } catch { return false; }
});

// Modpacks de Modrinth (.mrpack)
ipcMain.handle('pack:versions', async (e, pid) => (await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version`)).map(v => ({ id: v.id, name: v.name, num: v.version_number, mc: v.game_versions, ld: v.loaders, date: v.date_published, type: v.version_type })));
ipcMain.handle('pack', async (e, a) => {
  const { id: pid, vid } = typeof a === 'string' ? { id: a } : a;
  const v = vid ? await get(`https://api.modrinth.com/v2/version/${encodeURIComponent(vid)}`) : (await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version`))[0];
  if (!v) throw new Error('Sin versiones');
  const f = v.files.find(x => x.primary) || v.files[0];
  const tmp = path.join(root, 'tmp_pack'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  try {
    const z = path.join(tmp, 'p.zip'); send('status', 'Descargando modpack…');
    await dl(f.url, z, { sha1: f.hashes && f.hashes.sha1, sha512: f.hashes && f.hashes.sha512 });
    await unzip(z, tmp); fs.rmSync(z, { force: true });
    return await installMrpackDir(tmp);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); send('progress', null); }
});
async function installMrpackDir(tmp) {
  const ix = rd(path.join(tmp, 'modrinth.index.json'), null); if (!ix) throw new Error('Modpack no válido');
  const d = ix.dependencies || {};
  if (d['quilt-loader']) throw new Error('Los modpacks de Quilt no están soportados');
  const ld = d['fabric-loader'] ? 'Fabric' : d.neoforge ? 'NeoForge' : d.forge ? 'Forge' : 'Vanilla';
  const ins = addInst({ name: ix.name || 'Modpack', mc: d.minecraft, ld, loaderVersion: d['fabric-loader'] || d.neoforge || d.forge || undefined, type: 'release', custom: true });
  const dir = path.join(root, 'instances', ins.id), list = (ix.files || []).filter(fl => !(fl.env && fl.env.client === 'unsupported')), failed = [];
  fs.mkdirSync(dir, { recursive: true }); let n = 0;
  await pool(list, 8, async fl => {
    const dest = path.resolve(dir, fl.path);
    try { if (!dest.startsWith(dir + path.sep)) throw new Error('ruta'); await dl(fl.downloads, dest, { sha1: fl.hashes && fl.hashes.sha1, sha512: fl.hashes && fl.hashes.sha512 }); }
    catch { failed.push(path.basename(String(fl.path))); }
    prog('Modpack', ++n, list.length);
  });
  for (const o of ['overrides', 'client-overrides']) { const ov = path.join(tmp, o); if (fs.existsSync(ov)) fs.cpSync(ov, dir, { recursive: true }); }
  send('status', failed.length ? 'Modpack instalado (faltan ' + failed.length + ' archivos)' : 'Modpack instalado: ' + (ix.name || ''));
  return { ins, failed };
}

// Java automático (Adoptium) según lo que pida cada versión de Minecraft
async function javaFor(mc, cfg) {
  if (cfg.javaPath) return cfg.javaPath;
  const m = (await get(MAN)).versions.find(v => v.id === mc);
  const major = m ? ((await get(m.url)).javaVersion || { majorVersion: 8 }).majorVersion : 17;
  const d = path.join(root, 'java', String(major));
  const find = () => fs.existsSync(d) && fs.readdirSync(d).map(x => path.join(d, x, 'bin', 'java.exe')).find(fs.existsSync);
  let j = find(); if (j) return j;
  send('status', `Descargando Java ${major}…`); fs.mkdirSync(d, { recursive: true });
  const z = path.join(d, 'j.zip');
  fs.writeFileSync(z, Buffer.from(await get(`https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/x64/jre/hotspot/normal/eclipse`, 'arrayBuffer')));
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
async function fabric(mc, want) {
  send('status', 'Preparando Fabric…');
  let lv; try { lv = await loaderPick('Fabric', mc, want); }
  catch (x) { const vd = path.join(root, 'versions'), have = fs.existsSync(vd) && fs.readdirSync(vd).find(d => d.startsWith('fabric-loader-') && d.endsWith('-' + mc)); if (have) return have; throw x; }
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

ipcMain.handle('play', async (e, { id, server }) => {
  const cfg = load(), ins = li().find(i => i.id === id);
  try {
    if (!ins) throw new Error('Instancia no encontrada');
    if (running.has(id)) throw new Error('Esta instancia ya está en ejecución');
    const dir = path.join(root, 'instances', id); fs.mkdirSync(dir, { recursive: true });
    let auth;
    if (cfg.ms) {
      try { const x = await new Auth('select_account').refresh(cfg.ms.token); auth = (await x.getMinecraft()).mclc(); wr(cfgFile, { ...cfg, ms: { ...cfg.ms, token: x.save() } }); }
      catch { throw new Error('La sesión de Microsoft caducó. Vuelve a iniciarla en Ajustes.'); }
    } else auth = Authenticator.getAuth(cfg.username);
    const ram = +ins.ram > 0 ? +ins.ram : cfg.ram, java = await javaFor(ins.mc, { javaPath: ins.javaPath || cfg.javaPath });
    const o = { authorization: auth, root, javaPath: java, version: { number: ins.mc, type: ins.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: dir }, memory: { max: ram + 'G', min: '1G' },
      window: { width: cfg.width, height: cfg.height, fullscreen: cfg.fullscreen }, customArgs: cfg.jvmArgs.split(' ').filter(Boolean) };
    if (ins.ld === 'Fabric') o.version.custom = await fabric(ins.mc, ins.loaderVersion);
    if (ins.ld === 'Forge' || ins.ld === 'NeoForge') o.version.custom = await forge(ins.ld, ins.mc, java, ins.loaderVersion);
    if (server && server.host) o.quickPlay = { type: modernQP(ins.mc) ? 'multiplayer' : 'legacy', identifier: server.host + (server.port && +server.port !== 25565 ? ':' + server.port : '') };
    const l = new Client(), tail = [], lg = openLog(ins, java, ram), since = Date.now();
    l.on('progress', p => send('progress', p));
    l.on('data', d => { const t = String(d); try { lg.w.write(t.endsWith('\n') ? t : t + '\n'); } catch {} for (const ln of t.split(/\r?\n/)) if (ln) tail.push(ln); if (tail.length > 500) tail.splice(0, tail.length - 300); send('log', t); });
    l.on('close', code => {
      running.delete(id); try { lg.w.end(); } catch {} discordSet(null); send('running', 0); send('progress', null);
      const crashed = !!code && tail.length > 0;
      send('status', crashed ? 'Minecraft se cerró con un error' : 'Minecraft cerrado');
      if (cfg.reopen !== false || crashed) { win.show(); }
      if (crashed) reportCrash(ins, code, tail, lg.f, since - 5000);
    });
    discordSet({ details: 'Preparando Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() });
    send('status', 'Descargando archivos del juego…');
    if (!(await l.launch(o))) throw new Error('No se pudo iniciar Minecraft');
    running.add(id);
    send('running', 1); discordSet({ details: server && server.name ? 'En ' + server.name + ' · ' + ins.mc : 'Jugando a Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() }); send('status', 'Minecraft en ejecución'); if (cfg.closeOnLaunch) win.hide();
    return { ok: true };
  } catch (err) { send('status', 'Error: ' + err.message); send('progress', null); return { ok: false }; }
});

// ===== Actualizaciones desde el launcher =====
let upd = { s: 'idle' }, lastChk = 0, chkNow = () => {};
const setUpd = o => { upd = o; send('upd:state', upd); };
function initUpdater() {
  try {
    const { autoUpdater } = require('electron-updater'); updater = autoUpdater;
    autoUpdater.autoDownload = load().autoDownload !== false;
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
  const id = String(c.discordId || DISCORD_CLIENT_ID || '').trim();
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
ipcMain.handle('srv:status', async (e, hosts) => {
  const out = {};
  await Promise.allSettled([...new Set(hosts)].map(async h => {
    const c = stCache[h]; if (c && Date.now() - c.t < 60000) { out[h] = c.v; return; }
    try { const r = await get('https://api.mcsrvstat.us/3/' + encodeURIComponent(h)); const v = { online: !!r.online, players: r.players ? r.players.online : 0, icon: r.icon || '' }; stCache[h] = { t: Date.now(), v }; out[h] = v; }
    catch { out[h] = { online: false, players: 0, icon: '' }; }
  }));
  return out;
});
const PACK_URL = 'https://raw.githubusercontent.com/JustMarcoDev/nova-launcher/main/novapack/pack.json';
const packLocal = () => rd(path.join(__dirname, 'novapack', 'pack.json'), null);
const novaManifest = async () => { try { const m = await get(PACK_URL); if (m && m.mc && Array.isArray(m.mods)) return m; } catch {} return packLocal(); };
const nbtStr = s => { const b = Buffer.from(String(s), 'utf8'), l = Buffer.alloc(2); l.writeUInt16BE(b.length); return Buffer.concat([l, b]); };
const serversDat = list => { const n = Buffer.alloc(4); n.writeInt32BE(list.length);
  const parts = [Buffer.from([10]), nbtStr(''), Buffer.from([9]), nbtStr('servers'), Buffer.from([10]), n];
  for (const s of list) parts.push(Buffer.from([8]), nbtStr('ip'), nbtStr(s.ip), Buffer.from([8]), nbtStr('name'), nbtStr(s.name), Buffer.from([0]));
  parts.push(Buffer.from([0])); return Buffer.concat(parts); };
ipcMain.handle('nova:info', async () => {
  const m = await novaManifest(); if (!m) throw new Error('Sin manifiesto');
  const ins = li().find(i => i.novaPack), st = ins ? rd(path.join(root, 'instances', ins.id, '.nova-pack.json'), {}) : {};
  return { name: m.name || 'Nova Pack', version: String(m.version || '0'), mc: m.mc, loader: m.loader || 'Fabric', mods: (m.mods || []).length, server: m.server || { name: 'Nova Network', host: '' }, installed: st.version || '' };
});
ipcMain.handle('nova:pack', async () => {
  const m = await novaManifest(); if (!m) throw new Error('Sin manifiesto');
  const ld = m.loader || 'Fabric';
  let ins = li().find(i => i.novaPack);
  if (!ins) ins = addInst({ name: m.name || 'Nova Pack', mc: m.mc, ld, type: 'release', novaPack: true, custom: true });
  else if (ins.mc !== m.mc || ins.ld !== ld) { wr(insFile, li().map(i => i.id === ins.id ? { ...i, mc: m.mc, ld, name: m.name || i.name, loaderVersion: undefined } : i)); ins = { ...ins, mc: m.mc, ld }; }
  const dir = path.join(root, 'instances', ins.id), mods = path.join(dir, 'mods'); fs.mkdirSync(mods, { recursive: true });
  const stF = path.join(dir, '.nova-pack.json'), prev = rd(stF, { files: [] });
  if (prev.version) { send('status', 'Copia de seguridad de tus mundos…'); await autoBackup(ins.id, 'antes de actualizar el Nova Pack').catch(() => {}); }
  for (const f of prev.files || []) { fs.rmSync(path.join(mods, path.basename(f)), { force: true }); fs.rmSync(path.join(mods, path.basename(f) + '.disabled'), { force: true }); }
  const files = [], failed = [], list = m.mods || [], q = x => encodeURIComponent(JSON.stringify(x));
  let n = 0;
  try {
    await pool(list, 6, async mod => {
      try {
        let url, name, hs = {};
        if (mod.url) { url = mod.url; name = path.basename(mod.file || new URL(mod.url).pathname); hs = { sha1: mod.sha1, sha512: mod.sha512 }; }
        else {
          const vs = await get(`https://api.modrinth.com/v2/project/${mod.slug}/version?game_versions=${q([m.mc])}&loaders=${q([ld.toLowerCase()])}`);
          if (!vs.length) throw new Error('sin versión');
          const f = vs[0].files.find(x => x.primary) || vs[0].files[0]; url = f.url; name = f.filename; hs = f.hashes || {};
        }
        await dl(url, path.join(mods, path.basename(name)), { sha1: hs.sha1, sha512: hs.sha512 }); files.push(path.basename(name));
      } catch { failed.push(mod.slug || mod.file || mod.url); }
      prog('Nova Pack', ++n, list.length);
    });
  } finally { send('progress', null); }
  const ov = path.join(__dirname, 'novapack', 'overrides');
  if (fs.existsSync(ov)) fs.cpSync(ov, dir, { recursive: true, force: false, errorOnExist: false });
  const sd = path.join(dir, 'servers.dat');
  if (m.server && m.server.host && !fs.existsSync(sd)) fs.writeFileSync(sd, serversDat([{ name: m.server.name || 'Nova Network', ip: m.server.host + (m.server.port && +m.server.port !== 25565 ? ':' + m.server.port : '') }]));
  wr(stF, { version: String(m.version || '0'), files, date: Date.now() });
  send('status', failed.length ? 'Nova Pack listo (no se pudieron instalar: ' + failed.join(', ') + ')' : 'Nova Pack ' + m.version + ' instalado');
  return { ins, failed, version: String(m.version || '0') };
});

// ===== Estabilidad, instancias, mods y copias (0.2.11) =====
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hashOf = (b, a) => crypto.createHash(a).update(b).digest('hex');
// Descarga con comprobación de huella y 3 reintentos (prueba también los enlaces alternativos)
async function dl(urls, dest, o = {}) {
  urls = [].concat(urls || []).filter(Boolean); if (!urls.length) throw new Error('Sin enlace de descarga');
  let err;
  for (let i = 0; i < 3; i++) {
    for (const u of urls) {
      try {
        const buf = Buffer.from(await get(u, 'arrayBuffer'));
        const bad = o.sha512 ? hashOf(buf, 'sha512') !== String(o.sha512).toLowerCase() : o.sha1 && hashOf(buf, 'sha1') !== String(o.sha1).toLowerCase();
        if (bad) throw new Error('hash');
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const t = dest + '.part'; fs.writeFileSync(t, buf); fs.renameSync(t, dest); return buf.length;
      } catch (e) { err = e; }
    }
    await sleep(400 * (i + 1));
  }
  throw new Error(err && err.message === 'hash' ? 'Archivo corrupto: la huella no coincide' : 'Descarga fallida: ' + (err && err.message));
}
async function pool(items, n, fn) {
  let k = 0; const out = new Array(items.length);
  const w = async () => { while (k < items.length) { const i = k++; out[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, w)); return out;
}
const prog = (t, n, tot) => { send('status', `${t}: ${n} de ${tot}`); send('progress', { task: n, total: tot }); };
const win32 = process.platform === 'win32';
const unzip = (z, d) => win32 ? run('tar', ['-xf', z, '-C', d]) : run('unzip', ['-oq', z, '-d', d]);
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
  wr(insFile, li().map(i => i.id === String(id) ? { ...i, ...p } : i)); return getIns(id);
});
ipcMain.handle('inst:dup', async (e, id) => {
  const src = getIns(id), nid = Date.now().toString(36), { novaPack, ...rest } = src;
  send('status', 'Duplicando instancia…');
  try { if (fs.existsSync(iDir(id))) await fs.promises.cp(iDir(id), iDir(nid), { recursive: true, filter: f => path.basename(f) !== '.nova-pack.json' }); else fs.mkdirSync(iDir(nid), { recursive: true }); }
  finally { send('status', ''); }
  const ins = { ...rest, id: nid, name: (src.name + ' (copia)').slice(0, 40), custom: true }; wr(insFile, [...li(), ins]); return ins;
});
ipcMain.handle('inst:open', (e, { id, sub }) => { getIns(id); const d = path.join(iDir(id), ['mods', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots'].includes(sub) ? sub : ''); fs.mkdirSync(d, { recursive: true }); return shell.openPath(d); });
ipcMain.handle('loader:versions', async (e, { ld, mc }) => (await loaderList(String(ld), String(mc))).slice(0, 80));

// ---- Gestor de mods de cada instancia ----
const modsDir = id => path.join(iDir(getIns(id).id), 'mods');
const modFile = (id, f) => { f = path.basename(String(f)); if (!/\.jar(\.disabled)?$/i.test(f)) throw new Error('Archivo no válido'); return path.join(modsDir(id), f); };
const hcache = new Map();
ipcMain.handle('mods:list', async (e, id) => {
  const d = modsDir(id); let es = []; try { es = await fs.promises.readdir(d); } catch { return []; }
  const out = [];
  for (const f of es) {
    const m = /\.jar(\.disabled)?$/i.exec(f); if (!m) continue;
    const p = path.join(d, f); let st; try { st = await fs.promises.stat(p); } catch { continue; } if (!st.isFile()) continue;
    const k = p + '|' + st.size + '|' + st.mtimeMs; let h = hcache.get(k);
    if (!h) { h = hashOf(await fs.promises.readFile(p), 'sha1'); hcache.set(k, h); }
    out.push({ file: f, enabled: !m[1], size: st.size, sha1: h });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
});
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
const bkList = id => {
  let es = []; try { es = fs.readdirSync(bkRoot(id)).filter(x => x.endsWith('.zip')); } catch {}
  return es.map(f => { const st = fs.statSync(path.join(bkRoot(id), f)), m = /^\d{8}-\d{6}__(.*)\.zip$/.exec(f); return { file: f, date: st.mtimeMs, size: st.size, reason: m ? m[1].replace(/-/g, ' ') : f }; }).sort((a, b) => b.date - a.date);
};
async function autoBackup(id, reason, force) {
  if (!force && load().autoBackup === false) return null;
  const idir = iDir(id); let has = false; try { has = fs.readdirSync(path.join(idir, 'saves')).length > 0; } catch {}
  if (!has) return null;
  const l = bkList(id); if (!force && l.length && Date.now() - l[0].date < 600000) return null;
  const t = new Date(), z = n => String(n).padStart(2, '0'), st = `${t.getFullYear()}${z(t.getMonth() + 1)}${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}${z(t.getSeconds())}`;
  const slug = String(reason || 'manual').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'manual';
  const f = `${st}__${slug}.zip`; await zipItems(path.join(bkRoot(id), f), idir, ['saves']);
  const keep = Math.max(1, +load().backupKeep || 8); for (const o of bkList(id).slice(keep)) fs.rmSync(path.join(bkRoot(id), o.file), { force: true });
  return f;
}
const bkFile = (id, f) => { f = path.basename(String(f)); const p = path.join(bkRoot(getIns(id).id), f); if (!f.endsWith('.zip') || !fs.existsSync(p)) throw new Error('Copia no encontrada'); return p; };
ipcMain.handle('bk:list', (e, id) => { getIns(id); return bkList(id); });
ipcMain.handle('bk:create', async (e, id) => { getIns(id); send('status', 'Copiando mundos…'); try { return await autoBackup(id, 'manual', true); } finally { send('status', ''); } });
ipcMain.handle('bk:restore', async (e, { id, file }) => {
  const z = bkFile(id, file); if (running.has(String(id))) throw new Error('Cierra Minecraft antes de restaurar');
  send('status', 'Restaurando mundos…');
  try { await autoBackup(id, 'antes de restaurar', true); fs.rmSync(path.join(iDir(id), 'saves'), { recursive: true, force: true }); fs.mkdirSync(iDir(id), { recursive: true }); await unzip(z, iDir(id)); }
  finally { send('status', ''); }
  return true;
});
ipcMain.handle('bk:del', (e, { id, file }) => { fs.rmSync(bkFile(id, file), { force: true }); return true; });
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
    const stage = path.join(root, 'tmp_export'); fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(path.join(stage, 'overrides'), { recursive: true });
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
    } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  } finally { send('status', ''); }
});
ipcMain.handle('inst:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Importar instancia o modpack', properties: ['openFile'], filters: [{ name: 'Instancia o modpack', extensions: ['zip', 'mrpack'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  const tmp = path.join(root, 'tmp_import'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  try {
    send('status', 'Importando…'); await unzip(r.filePaths[0], tmp);
    let base = tmp; const es = fs.readdirSync(tmp); if (es.length === 1 && fs.statSync(path.join(tmp, es[0])).isDirectory()) base = path.join(tmp, es[0]);
    if (fs.existsSync(path.join(base, 'modrinth.index.json'))) return await installMrpackDir(base);
    const mf = path.join(base, 'nova-instance.json'), m = rd(mf, null);
    if (!m || !/^[\w.+\- ]{1,40}$/.test(String(m.mc || ''))) throw new Error('Formato no reconocido: usa un .mrpack o un .zip exportado desde Nova Launcher');
    const ins = addInst({ name: String(m.name || 'Importada').slice(0, 40), mc: String(m.mc), ld: ['Fabric', 'Forge', 'NeoForge'].includes(m.ld) ? m.ld : 'Vanilla', loaderVersion: m.loaderVersion || undefined, type: m.type === 'snapshot' ? 'snapshot' : 'release', icon: m.icon || undefined, color: m.color || undefined, ram: +m.ram || undefined, custom: true });
    fs.rmSync(mf, { force: true }); await fs.promises.cp(base, iDir(ins.id), { recursive: true });
    send('status', 'Instancia importada: ' + ins.name); return { ins, failed: [] };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); send('progress', null); }
});
