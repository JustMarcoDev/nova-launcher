const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), { execFile } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const root = path.join(app.getPath('appData'), '.nova');
const cfgFile = path.join(root, 'config.json'), insFile = path.join(root, 'instances.json');
const DEF = { username: 'Jugador', ram: 4, javaPath: '', width: 1280, height: 720, fullscreen: false, jvmArgs: '', closeOnLaunch: false, cfKey: '', ms: null };
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f)); } catch { return d; } };
const wr = (f, d) => { fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1)); };
const load = () => ({ ...DEF, ...rd(cfgFile, {}) }), li = () => rd(insFile, []);
const addInst = o => { const i = { id: Date.now().toString(36), ...o }; wr(insFile, [...li(), i]); return i; };
const MAN = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
let win, updater = null;
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
const send = (c, d) => win && win.webContents.send(c, d);
const get = async (u, t = 'json', h = {}) => { const r = await fetch(u, { headers: h }); if (!r.ok) throw new Error('HTTP ' + r.status); return r[t](); };
const run = (cmd, args, opt = {}) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e8, ...opt }, e => e ? rej(e) : res()));

app.whenReady().then(() => {
  if (!single) return;
  win = new BrowserWindow({ width: 1100, height: 680, minWidth: 900, minHeight: 560, frame: false, backgroundColor: '#0c0c10',
    show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false } });
  win.once('ready-to-show', () => win.show());
  win.loadFile('index.html');
  if (app.isPackaged) initUpdater();
  discordInit();
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
ipcMain.handle('inst:del', (e, id) => { wr(insFile, li().filter(i => i.id !== id)); fs.rmSync(path.join(root, 'instances', id), { recursive: true, force: true }); });
ipcMain.handle('mod:install', async (e, { url, name, inst }) => {
  const d = path.join(root, inst ? path.join('instances', inst) : '', 'mods'); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, path.basename(name)), Buffer.from(await get(url, 'arrayBuffer'))); return true;
});
ipcMain.handle('login', async () => {
  try { const x = await new Auth('select_account').launch('electron'); const t = await x.getMinecraft();
    wr(cfgFile, { ...load(), ms: { name: t.profile.name, token: x.save() } }); return true; } catch { return false; }
});

// Modpacks de Modrinth (.mrpack)
ipcMain.handle('pack', async (e, pid) => {
  const vs = await get(`https://api.modrinth.com/v2/project/${pid}/version`), f = vs[0].files.find(x => x.primary) || vs[0].files[0];
  const tmp = path.join(root, 'tmp_pack'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const z = path.join(tmp, 'p.zip'); fs.writeFileSync(z, Buffer.from(await get(f.url, 'arrayBuffer')));
  await run('tar', ['-xf', z, '-C', tmp]);
  const ix = rd(path.join(tmp, 'modrinth.index.json'), null); if (!ix) throw new Error('Modpack no válido');
  const d = ix.dependencies, ld = d['fabric-loader'] ? 'Fabric' : d.neoforge ? 'NeoForge' : d.forge ? 'Forge' : 'Vanilla';
  const ins = addInst({ name: ix.name, mc: d.minecraft, ld, type: 'release' }), dir = path.join(root, 'instances', ins.id);
  for (const fl of ix.files) {
    const dest = path.resolve(dir, fl.path); if (!dest.startsWith(dir)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, Buffer.from(await get(fl.downloads[0], 'arrayBuffer')));
  }
  const ov = path.join(tmp, 'overrides'); if (fs.existsSync(ov)) fs.cpSync(ov, dir, { recursive: true });
  fs.rmSync(tmp, { recursive: true, force: true }); return ins;
});

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

async function fabric(mc) {
  send('status', 'Preparando Fabric…');
  const L = await get(`https://meta.fabricmc.net/v2/versions/loader/${mc}`); if (!L.length) throw new Error('Fabric no soporta ' + mc);
  const lv = (L.find(x => x.loader.stable) || L[0]).loader.version, id = `fabric-loader-${lv}-${mc}`, f = path.join(root, 'versions', id, id + '.json');
  if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, await get(`https://meta.fabricmc.net/v2/versions/loader/${mc}/${lv}/profile/json`, 'text')); }
  return id;
}
const nfC = mc => { const p = mc.split('.'); return p[0] === '1' ? [`${p[1]}.${p[2] || 0}.`] : [`${p[0]}.${p[1]}.${p[2] || 0}.`, `${p[0]}.${p[1]}.`]; };
async function forge(ld, mc, java) {
  const vdir = path.join(root, 'versions');
  const find = () => fs.existsSync(vdir) ? fs.readdirSync(vdir).find(d => ld === 'Forge' ? d.startsWith(mc + '-forge') : nfC(mc).some(c => d.startsWith('neoforge-' + c))) : null;
  let id = find(); if (id) return id;
  send('status', `Descargando instalador de ${ld}…`); let url;
  if (ld === 'Forge') {
    const p = (await get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json')).promos, v = p[mc + '-recommended'] || p[mc + '-latest'];
    if (!v) throw new Error('Forge no disponible para ' + mc);
    url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mc}-${v}/forge-${mc}-${v}-installer.jar`;
  } else {
    const all = (await get('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge')).versions.filter(x => nfC(mc).some(c => x.startsWith(c)));
    if (!all.length) throw new Error('NeoForge no disponible para ' + mc);
    const v = all.filter(x => !/beta/.test(x)).pop() || all.pop();
    url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${v}/neoforge-${v}-installer.jar`;
  }
  const jar = path.join(root, 'installer.jar'); fs.writeFileSync(jar, Buffer.from(await get(url, 'arrayBuffer')));
  const lp = path.join(root, 'launcher_profiles.json'); if (!fs.existsSync(lp)) fs.writeFileSync(lp, '{"profiles":{}}');
  send('status', `Instalando ${ld} (puede tardar un par de minutos)…`);
  await run(java, ['-jar', jar, '--installClient', root]);
  id = find(); if (!id) throw new Error('No se pudo instalar ' + ld); return id;
}

ipcMain.handle('play', async (e, { id }) => {
  const cfg = load(), ins = li().find(i => i.id === id);
  try {
    if (!ins) throw new Error('Instancia no encontrada');
    const dir = path.join(root, 'instances', id); fs.mkdirSync(dir, { recursive: true });
    let auth;
    if (cfg.ms) {
      try { const x = await new Auth('select_account').refresh(cfg.ms.token); auth = (await x.getMinecraft()).mclc(); wr(cfgFile, { ...cfg, ms: { ...cfg.ms, token: x.save() } }); }
      catch { throw new Error('La sesión de Microsoft caducó. Vuelve a iniciarla en Ajustes.'); }
    } else auth = Authenticator.getAuth(cfg.username);
    const java = await javaFor(ins.mc, cfg);
    const o = { authorization: auth, root, javaPath: java, version: { number: ins.mc, type: ins.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: dir }, memory: { max: cfg.ram + 'G', min: '1G' },
      window: { width: cfg.width, height: cfg.height, fullscreen: cfg.fullscreen }, customArgs: cfg.jvmArgs.split(' ').filter(Boolean) };
    if (ins.ld === 'Fabric') o.version.custom = await fabric(ins.mc);
    if (ins.ld === 'Forge' || ins.ld === 'NeoForge') o.version.custom = await forge(ins.ld, ins.mc, java);
    const l = new Client();
    l.on('progress', p => send('progress', p)); l.on('data', d => send('log', String(d)));
    l.on('close', () => { discordSet(null); send('running', 0); send('status', 'Minecraft cerrado'); send('progress', null); if (cfg.reopen !== false) win.show(); });
    send('status', 'Descargando archivos del juego…');
    if (!(await l.launch(o))) throw new Error('No se pudo iniciar Minecraft');
    send('running', 1); discordSet({ details: 'Jugando a Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() }); send('status', 'Minecraft en ejecución'); if (cfg.closeOnLaunch) win.hide();
    return { ok: true };
  } catch (err) { send('status', 'Error: ' + err.message); send('progress', null); return { ok: false }; }
});

// ===== Actualizaciones desde el launcher =====
let upd = { s: 'idle' };
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
    const chk = () => { if (load().autoUpdate !== false && upd.s !== 'downloading' && upd.s !== 'ready') autoUpdater.checkForUpdates().catch(() => {}); };
    setTimeout(chk, 4000); setInterval(chk, 3600000);
  } catch {}
}

// ===== Discord Rich Presence =====
// Para que lo vean todos los usuarios, pon aquí tu «Application ID» de Discord (ver README). También se puede poner desde Ajustes.
const DISCORD_CLIENT_ID = '';
let rpc = null, rpcOk = false, rpcAct = null, dsc = { s: 'off' };
const tStart = Date.now();
const setDsc = o => { dsc = o; send('discord:state', dsc); };
function discordStop() { const c = rpc; rpc = null; rpcOk = false; if (c) { try { c.clearActivity().catch(() => {}); c.destroy().catch(() => {}); } catch {} } }
function discordSet(a) {
  if (a !== undefined) rpcAct = a;
  if (!rpc || !rpcOk) return;
  const x = rpcAct || { details: 'En el launcher', state: 'Eligiendo versión', startTimestamp: tStart };
  rpc.setActivity({ ...x, largeImageKey: 'logo', largeImageText: 'Nova Launcher', instance: false }).catch(() => {});
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
  const retry = msg => { if (rpc !== cl) return; rpcOk = false; setDsc({ s: 'error', msg }); setTimeout(() => { if (rpc === cl) discordInit(); }, 30000); };
  cl.on('ready', () => { rpcOk = true; setDsc({ s: 'on', user: cl.user && cl.user.username }); discordSet(); });
  cl.on('disconnected', () => retry('Discord se cerró'));
  cl.login({ clientId: id }).catch(() => retry('Abre Discord en el PC'));
}
app.on('before-quit', discordStop);
