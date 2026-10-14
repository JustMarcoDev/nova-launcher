const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, Notification, clipboard, nativeImage } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'), net = require('net'), dns = require('dns').promises, { pathToFileURL } = require('url'), { execFile } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const root = path.join(app.getPath('appData'), '.nova');
const cfgFile = path.join(root, 'config.json'), insFile = path.join(root, 'instances.json');
const DEF = { username: 'Jugador', ram: 4, javaPath: '', width: 1280, height: 720, fullscreen: false, jvmArgs: '', closeOnLaunch: false, cfKey: '', ms: null };
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f)); } catch { return d; } };
const wr = (f, d) => { fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1)); };
const load = () => ({ ...DEF, ...rd(cfgFile, {}) }), li = () => rd(insFile, []);
const addInst = o => { const i = { id: Date.now().toString(36), ...o }; wr(insFile, [...li(), i]); return i; };
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
const get = async (u, t = 'json', h = {}) => { const r = await fetch(u, { signal: AbortSignal.timeout(t === 'arrayBuffer' ? 600000 : 30000), headers: { 'User-Agent': UA(), ...h } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r[t](); };
const run = (cmd, args, opt = {}) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e8, ...opt }, e => e ? rej(e) : res()));

app.whenReady().then(() => {
  if (!single) return;
  win = new BrowserWindow({ width: 1100, height: 680, minWidth: 900, minHeight: 560, frame: false, backgroundColor: '#0c0c10',
    show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false } });
  win.once('ready-to-show', () => win.show());
  win.loadFile('index.html');
  if (app.isPackaged) initUpdater();
  discordInit(); ensureShortcut(); trayInit(); win.on('focus', () => { if (Date.now() - lastChk > 600000) chkNow(); });
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('cfg:get', () => { const c = load(), st = accState(c); return { ...c, ms: c.ms ? { name: c.ms.name } : null, accounts: st.a.map(({ token, ...r }) => r), activeAccount: st.act.id, _first: FIRST && !c.setupDone }; });
ipcMain.handle('sys', () => ({ total: Math.max(1, Math.round(os.totalmem() / 1073741824)) }));
ipcMain.handle('zoom', (e, f) => { win.webContents.setZoomFactor(Math.min(1.6, Math.max(0.7, +f || 1))); });
ipcMain.handle('cfg:set', (e, c) => { wr(cfgFile, { ...load(), ...c }); if (updater && 'autoDownload' in c) updater.autoDownload = c.autoDownload !== false; if ('discord' in c || 'discordId' in c) discordInit(); if ('tray' in c) trayInit(); if ('channel' in c && updater) { updater.allowPrerelease = c.channel === 'beta'; updater.checkForUpdates().catch(() => {}); } return true; });
ipcMain.handle('folder', () => { fs.mkdirSync(root, { recursive: true }); return shell.openPath(root); });
ipcMain.on('win', (e, a) => a === 'min' ? (tray || (load().tray !== false && trayInit()) ? win.hide() : win.minimize()) : a === 'max' ? (win.isMaximized() ? win.unmaximize() : win.maximize()) : win.close());
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
  send('status', failed.length ? 'Modpack instalado (faltan ' + failed.length + ' archivos)' : 'Modpack instalado: ' + (ix.name || '')); notify('Modpack instalado', String(ix.name || 'Modpack') + (failed.length ? ' (faltan ' + failed.length + ' archivos)' : ' ya está listo'));
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
    let auth; const { act } = accState(cfg);
    if (act.type === 'microsoft') {
      try { const x = await new Auth('select_account').refresh(act.token); auth = (await x.getMinecraft()).mclc(); const st = accState(); saveAcc(st.a.map(z => z.id === act.id ? { ...z, token: x.save() } : z), act.id); }
      catch { throw new Error('La sesión de Microsoft de «' + act.name + '» caducó. Vuelve a iniciarla desde la cuenta (barra superior).'); }
    } else auth = Authenticator.getAuth(act.name);
    const ram = +ins.ram > 0 ? +ins.ram : cfg.ram, java = await javaFor(ins.mc, { javaPath: ins.javaPath || cfg.javaPath });
    const o = { authorization: auth, root, javaPath: java, version: { number: ins.mc, type: ins.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: dir }, memory: { max: ram + 'G', min: '1G' },
      window: { width: cfg.width, height: cfg.height, fullscreen: cfg.fullscreen }, customArgs: cfg.jvmArgs.split(' ').filter(Boolean) };
    if (ins.ld === 'Fabric') o.version.custom = await fabric(ins.mc, ins.loaderVersion);
    if (ins.ld === 'Forge' || ins.ld === 'NeoForge') o.version.custom = await forge(ins.ld, ins.mc, java, ins.loaderVersion);
    if (server && server.host) o.quickPlay = { type: modernQP(ins.mc) ? 'multiplayer' : 'legacy', identifier: server.host + (server.port && +server.port !== 25565 ? ':' + server.port : '') };
    try { syncServers(dir, (cfg.myServers || []).filter(z => z && z.host).map(z => ({ name: String(z.name || z.host), ip: String(z.host) + (z.port && +z.port !== 25565 ? ':' + z.port : '') }))); } catch {}
    const l = new Client(), tail = [], lg = openLog(ins, java, ram), since = Date.now(); let t0 = 0;
    send('log', '── ' + ins.name + ' · Minecraft ' + ins.mc + ' · ' + (ins.ld || 'Vanilla') + ' · ' + (act.name) + ' ──\n');
    l.on('progress', p => send('progress', p));
    l.on('data', d => { const t = String(d); try { lg.w.write(t.endsWith('\n') ? t : t + '\n'); } catch {} for (const ln of t.split(/\r?\n/)) if (ln) tail.push(ln); if (tail.length > 500) tail.splice(0, tail.length - 300); send('log', t); });
    l.on('close', code => {
      running.delete(id); try { lg.w.end(); } catch {} if (t0) { const cur = li().find(i => i.id === id) || {}; upIns(id, { playMs: (cur.playMs || 0) + (Date.now() - t0), lastPlayed: Date.now() }); } discordSet(null); send('running', 0); send('progress', null);
      const crashed = !!code && tail.length > 0;
      send('status', crashed ? 'Minecraft se cerró con un error' : 'Minecraft cerrado');
      if (cfg.reopen !== false || crashed) { win.show(); }
      if (crashed) { reportCrash(ins, code, tail, lg.f, since - 5000); notify('Minecraft se cerró con un error', diagnose(tail).t); }
    });
    discordSet({ details: 'Preparando Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() });
    send('status', 'Descargando archivos del juego…');
    if (!(await l.launch(o))) throw new Error('No se pudo iniciar Minecraft');
    running.add(id); t0 = Date.now(); upIns(id, { lastPlayed: t0 });
    send('running', 1); discordSet({ details: server && server.name ? 'En ' + server.name + ' · ' + ins.mc : 'Jugando a Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() }); send('status', 'Minecraft en ejecución'); if (cfg.closeOnLaunch) win.hide();
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
  const ins = { ...rest, id: nid, name: (src.name + ' (copia)').slice(0, 40), custom: true, playMs: 0, lastPlayed: 0 }; wr(insFile, [...li(), ins]); return ins;
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

// ===== Cuentas, estadísticas, bandeja y más (0.2.12) =====
const upIns = (id, p) => wr(insFile, li().map(i => i.id === id ? { ...i, ...p } : i));

// ---- Varias cuentas (Microsoft y offline) ----
function accState(c = load()) {
  let a = Array.isArray(c.accounts) ? c.accounts.filter(x => x && x.id) : null;
  if (!a || !a.length) { a = []; if (c.ms && c.ms.token) a.push({ id: 'ms1', type: 'microsoft', name: c.ms.name || 'Microsoft', token: c.ms.token }); a.push({ id: 'off1', type: 'offline', name: c.username || 'Jugador' }); }
  let act = a.find(x => x.id === c.activeAccount);
  if (!act) act = (c.ms && c.ms.token ? a.find(x => x.type === 'microsoft') : null) || a.find(x => x.type === 'offline') || a[0];
  return { a, act };
}
function saveAcc(a, actId) { const act = a.find(x => x.id === actId) || a[0]; wr(cfgFile, { ...load(), accounts: a, activeAccount: act.id, username: act.name, ms: act.type === 'microsoft' ? { name: act.name, token: act.token } : null }); }
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
let tray = null, trayImg = null;
const trayIcon = () => { if (!trayImg) { try { trayImg = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')); } catch {} } return trayImg && !trayImg.isEmpty() ? trayImg.resize({ width: 16, height: 16 }) : null; };
function trayInit() {
  if (load().tray === false) { if (tray) { try { tray.destroy(); } catch {} tray = null; } return false; }
  if (tray) return true;
  const ic = trayIcon(); if (!ic) return false;
  try {
    tray = new Tray(ic); tray.setToolTip('Nova Launcher');
    const show = () => { if (!win) return; win.show(); if (win.isMinimized()) win.restore(); win.focus(); };
    tray.on('click', show);
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir Nova Launcher', click: show }, { type: 'separator' }, { label: 'Salir', click: () => app.quit() }]));
    return true;
  } catch { tray = null; return false; }
}
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
ipcMain.handle('worlds:import', async (e, id) => {
  getIns(id); const r = await dialog.showOpenDialog(win, { title: 'Importar mapas', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Mapa (.zip)', extensions: ['zip'] }] });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  const names = [], sv = path.join(iDir(id), 'saves'); fs.mkdirSync(sv, { recursive: true });
  for (const zf of r.filePaths) {
    const tmp = path.join(root, 'tmp_world'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    try {
      send('status', 'Importando mapa…'); await unzip(zf, tmp);
      for (const w of findWorlds(tmp)) { const base = w === tmp ? path.basename(zf).replace(/\.zip$/i, '') : path.basename(w), nn = uniq(sv, safeName(base, 'Mapa')); await fs.promises.cp(w, path.join(sv, nn), { recursive: true }); names.push(nn); }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); send('status', ''); }
  }
  if (!names.length) throw new Error('No se encontró ningún mundo dentro del .zip (debe contener level.dat)');
  return { names };
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
