// =====================================================================================
// Nova Launcher · main/juego.js
// Lanzar Minecraft: Java, versiones, ajustes de Java/GPU, cierre/errores y preparar antes de jugar
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { Auth } = require('msmc');
const { Authenticator, Client } = require('minecraft-launcher-core');
const { EventEmitter } = require('events');
const { app, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { LOWRAM, MAN, cfgFile, li, load, rd, rmAsync, root, running, send, wr } = R; // base
const { get, isOnline, run } = R; // red
const { dl } = R; // descargas
const { accOut, accState, saveAcc } = R; // cuentas
const { NOVA_MC, NOVA_REMOTE_ID, fondosDir, fondosScan, fondosWatch, novaBg, novaBgGet, novaDir, novaModResolve, novaNews, novaPickBg, novaServersWrite, novaAccountsWrite } = R; // mod-nova
const { novaSkinFor } = R; // skins
const { fabric, fabricBundled, forge } = R; // cargadores
const { modernQP, syncServers } = R; // servidores
const { ensureFabricApi, statsEnd, statsStart, upIns } = R; // instancias
const { shotAction } = R; // mundos
const marcas = require('./marcas');
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const discordSet = (...a) => R.discordSet(...a); // discord
const gameHide = (...a) => R.gameHide(...a); // sistema
const notify = (...a) => R.notify(...a); // sistema

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
// Si el servidor de Mojang no responde pero el alternativo sí (assets/mirrors.json), el juego se descarga de ahí:
// el JSON de la versión se reescribe con las direcciones alternativas y MCLC usa las del espejo para assets y librerías. Las huellas las sigue comprobando MCLC.
async function mirrorPrep(o, mc) {
  try {
    if (!(await R.isOnline(true)) || !R.mirrorMode) return false;
    const one = u => (R.mirrorsFor(u)[0] || '');
    const meta = one('https://launchermeta.mojang.com/').replace(/\/$/, ''), res = one('https://resources.download.minecraft.net/').replace(/\/$/, ''), mav = one('https://files.minecraftforge.net/maven/'), lib = one('https://libraries.minecraft.net/');
    if (!meta) return false;
    o.overrides.url = { meta, ...(res ? { resource: res } : {}), ...(mav ? { mavenForge: mav } : {}), ...(lib ? { defaultRepoForge: lib } : {}) };
    const vf = path.join(root, 'versions', mc, mc + '.json');
    if (!fs.existsSync(vf)) {
      const m = (await get(MAN)).versions.find(v => v.id === mc);
      if (m) { const t = R.rewriteWithMirror(await get(m.url, 'text')); JSON.parse(t); fs.mkdirSync(path.dirname(vf), { recursive: true }); fs.writeFileSync(vf, t); }
    }
    send('status', 'Usando un servidor alternativo para descargar Minecraft'); return true;
  } catch { return false; }
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
  const find = () => fs.existsSync(d) && fs.readdirSync(d).flatMap(x => [path.join(d, x, 'bin', 'java.exe'), path.join(d, x, 'bin', 'java')]).find(fs.existsSync);
  let j = find(); if (j) return j;
  send('status', `Descargando Java ${major}…`); fs.mkdirSync(d, { recursive: true });
  // Java de Adoptium según el sistema (Windows, Linux/Chromebook o Mac) y la arquitectura (x64 o ARM)
  const osn = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux', arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  const z = path.join(d, process.platform === 'win32' ? 'j.zip' : 'j.tar.gz');
  await dl(`https://api.adoptium.net/v3/binary/latest/${major}/ga/${osn}/${arch}/jre/hotspot/normal/eclipse`, z);
  await run('tar', ['-xf', z, '-C', d]); fs.unlinkSync(z);
  j = find(); if (!j) throw new Error('No se pudo instalar Java ' + major); return j;
}
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
  try { const cz = diagnose(tail); R.sendCrashReport({ mc: ins.mc, ld: ins.ld || 'Vanilla', loaderVersion: ins.loaderVersion, mod: require('../package.json').version, cause: cz.t + (cz.hint ? ' · ' + cz.hint : ''), code, tail, names: [load().username || '', ins.name || ''] }); } catch {}
  send('crash', { id: ins.id, name: ins.name, mc: ins.mc, ld: ins.ld || 'Vanilla', code, cause: diagnose(tail), tail: tail.slice(-40), file, report });
}
ipcMain.handle('log:open', (e, f) => { const p = path.resolve(String(f || '')); if (p.startsWith(root + path.sep) && fs.existsSync(p)) { shell.showItemInFolder(p); return true; } return false; });
ipcMain.handle('logs:folder', () => { const d = path.join(root, 'logs'); fs.mkdirSync(d, { recursive: true }); return shell.openPath(d); });
async function playGame(opts) {
  const { id, server, world, safe } = opts, extra = Array.isArray(opts.extraArgs) ? opts.extraArgs.filter(x => /^-Dnova\.[\w.]+=[\w.-]*$/.test(x)) : [];
  const cfg = load(), ins = li().find(i => i.id === id);
  try {
    if (!ins) throw new Error('Instancia no encontrada');
    if (running.has(id)) throw new Error('Esta instancia ya está en ejecución');
    const dir = path.join(root, 'instances', id); fs.mkdirSync(dir, { recursive: true });
    if (S.PREPP) { send('status', 'Terminando la preparación…'); try { await S.PREPP; } catch {} }
    let auth; const { act } = accState(cfg);
    if (act.type === 'microsoft') {
      try { const x = await new Auth('select_account').refresh(act.token); auth = (await x.getMinecraft()).mclc(); const st = accState(); saveAcc(st.a.map(z => z.id === act.id ? { ...z, token: x.save() } : z), act.id); }
      catch { if (await isOnline(true)) throw new Error('La sesión de Microsoft de «' + act.name + '» caducó. Vuelve a iniciarla desde la cuenta (barra superior).'); auth = Authenticator.getAuth(act.name); send('status', 'Sin conexión: se juega en modo offline como ' + act.name); }
    } else auth = Authenticator.getAuth(act.name);
    const ram = +ins.ram > 0 ? +ins.ram : cfg.ram, java = await javaFor(ins.mc, { javaPath: ins.javaPath || cfg.javaPath });
    const o = { authorization: auth, root, javaPath: java, version: { number: ins.mc, type: ins.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: dir }, memory: { max: ram + 'G', min: '1G' },
      window: { width: cfg.width, height: cfg.height, fullscreen: cfg.fullscreen }, customArgs: [...(JVM_PRESETS[ins.jvmPreset] || [])] };
    await mirrorPrep(o, ins.mc);
    const jm = jvmModern(cfg, ins, java, ram);
    if (cfg.optimize !== false && !ins.jvmPreset) o.customArgs.push(...(jm.zgc ? JVM_ZGC_BASE : JVM_OPT));
    o.customArgs.push(...jm.args);
    try { await applyGpu(java, ins.gpu === 'high'); } catch {}
    const noNova = !!(safe || ins.noNova);   // modo seguro: sin el menú de Nova (Shift al lanzar o ajuste de la instancia)
    const nj = (!noNova && (!ins.ld || ins.ld === 'Vanilla' || ins.ld === 'Fabric')) ? await novaModResolve(ins.mc) : null;
    let nova = false;
    if (ins.ld === 'Fabric') { try { if (await ensureFabricApi(ins)) send('log', 'Fabric API instalada automáticamente para Minecraft ' + ins.mc + '.\n'); } catch {} }
    if (ins.ld === 'Fabric') { o.version.custom = await fabric(ins.mc, ins.loaderVersion); nova = !!nj; }
    else if (noNova) { /* vanilla puro, sin Fabric */ }
    else if (nj) { try { o.version.custom = fabricBundled(ins.mc) || await fabric(ins.mc); nova = true; } catch { send('log', 'Nova: no se pudo preparar Fabric; se juega en vanilla normal.\n'); } }
    let novaMsg = noNova ? 'Nova: modo seguro, se juega sin el menú de Nova' + (ins.ld === 'Fabric' ? ' (Fabric normal).\n' : ' (Minecraft normal).\n')
      : nova ? 'Nova: menú de Nova activado (Fabric incluido en el launcher).\n'
      : (!ins.ld || ins.ld === 'Vanilla' || ins.ld === 'Fabric') ? (NOVA_MC.includes(ins.mc) ? 'Nova: el menú de Nova no se pudo activar; se juega con el menú normal.\n' : 'Nova: el menú de Nova solo está disponible en Minecraft ' + NOVA_MC[0] + ' a ' + NOVA_MC[NOVA_MC.length - 1] + '; esta versión usa el menú normal.\n')
      : 'Nova: el menú de Nova solo está disponible en Nova y Fabric; ' + ins.ld + ' usa el menú normal.\n';
    if (nova) { fondosScan().catch(() => {}); fondosWatch(); novaServersWrite(cfg.myServers); novaAccountsWrite(); }
    const mkey = marcas.newKey();
    if (nova) { try { R.novaAccSync(cfg); } catch {} }
    if (nova) o.customArgs.push('-Dnova.key=' + mkey, '-Dnova.dir=' + novaDir(), '-Dnova.skin=' + (await novaSkinFor(act)).file, '-Dnova.premium=' + (act.type === 'microsoft' ? '1' : '0'), '-Dnova.presence=' + (process.env.NOVA_PRESENCE || (() => { try { return require('../package.json').novaPresence || ''; } catch { return ''; } })()), '-Dnova.user=' + act.name, '-Dnova.bg=' + (novaBg() || ''), '-Dnova.bg2=' + (novaBg('nova-nebulosa.nvb') || ''), '-Dnova.bg3=' + (novaBg('nova-earth.nvb') || ''), '-Dnova.lowpower=' + (LOWRAM ? 'true' : 'false'), '-Dfabric.addMods=' + nj, '-Dnova.version=' + app.getVersion(), ...(novaNews() ? ['-Dnova.news=' + novaNews()] : []), '-Dnova.loader=' + (ins.ld === 'Fabric' ? 'Fabric' : 'Nova'));
    if (nova && extra.length) o.customArgs.push(...extra);
    if (ins.ld === 'Forge' || ins.ld === 'NeoForge') o.version.custom = await forge(ins.ld, ins.mc, java, ins.loaderVersion);
    if (server && server.host) o.quickPlay = { type: modernQP(ins.mc) ? 'multiplayer' : 'legacy', identifier: server.host + (server.port && +server.port !== 25565 ? ':' + server.port : '') };
    if (world && !server && modernQP(ins.mc)) o.quickPlay = { type: 'singleplayer', identifier: String(world) };
        try { syncServers(dir, (cfg.myServers || []).filter(z => z && z.host).map(z => ({ name: String(z.name || z.host), ip: String(z.host) + (z.port && +z.port !== 25565 ? ':' + z.port : '') }))); } catch {}
    let proc = null; const l = new Client(), tail = [], lg = openLog(ins, java, ram), since = Date.now(); let t0 = 0, sk = '';
    send('log', '── ' + ins.name + ' · Minecraft ' + ins.mc + ' · ' + (ins.ld || 'Vanilla') + ' · ' + (act.name) + ' ──\n'); send('log', novaMsg); if (jm.note) send('log', jm.note); if (jm.zgc || jm.compact) send('log', 'Java: ' + [jm.compact ? 'objetos compactos' : '', jm.zgc ? 'Generational ZGC' : ''].filter(Boolean).join(' + ') + '.\n');
    l.on('progress', p => send('progress', p));
    // Marcadores del mod: solo valen los que llevan el código secreto de esta partida (main/marcas.js); un mensaje de chat no puede pedir nada
    const mk = marcas.handler(nova ? mkey : '', {
      SHOTNEW: () => send('shot:new', id),
      SHOTCOPY: a => shotAction('copy', a, id), SHOTVIEW: a => shotAction('view', a, id), SHOTOPEN: a => shotAction('open', a, id),
      PICKBG: a => novaPickBg(a || undefined),
      GETBG: a => { if (a === 'nebula' || a === 'earth') novaBgGet(NOVA_REMOTE_ID[a]); },
      OPENDIR: () => shell.openPath(fondosDir()),
      OPENMODS: () => { const md = path.join(root, 'instances', String(id), 'mods'); fs.mkdirSync(md, { recursive: true }); shell.openPath(md); },
      SWITCH: a => {
        if (S.switching || !/^[\w-]{1,40}$/.test(a)) return;
        const st = accState(); if (!st.a.some(z => z.id === a) || a === st.act.id) return;
        saveAcc(st.a, a); S.switching = { id, safe }; send('acc:switched', accOut()); send('status', 'Cambiando de usuario…'); setTimeout(() => { try { proc && proc.kill(); } catch {} }, 250);
      },
      SETTINGS: () => { if (S.win) { if (S.win.isMinimized()) S.win.restore(); S.win.show(); S.win.focus(); send('nav', 'set'); } },
      BENCH: a => R.onBench(id, a),
      SHOW: () => { if (S.win) { if (S.win.isMinimized()) S.win.restore(); S.win.show(); S.win.focus(); } }
    });
    l.on('data', d => { const t = String(d); mk(t); try { lg.w.write(t.endsWith('\n') ? t : t + '\n'); } catch {} for (const ln of t.split(/\r?\n/)) if (ln) tail.push(ln); if (tail.length > 500) tail.splice(0, tail.length - 300); send('log', t); });
    l.on('close', code => {
      running.delete(id); try { lg.w.end(); } catch {} setTimeout(() => { try { R.bkSchedule(); } catch {} }, 4000); if (t0) { statsEnd(sk, Date.now() - t0); const cur = li().find(i => i.id === id) || {}; upIns(id, { playMs: (cur.playMs || 0) + (Date.now() - t0), lastPlayed: Date.now() }); } discordSet(null); send('running', running.size ? 1 : 0); send('progress', null);
      if (S.switching && S.switching.id === id) {   // cambio de usuario desde el mod: se vuelve a abrir la misma instancia con la otra cuenta
        const nx = S.switching; S.switching = null; send('status', 'Cambiando de usuario…');
        setTimeout(() => { playGame({ id: nx.id, safe: nx.safe }).catch(() => {}); }, 700);
        return;
      }
      // Si con las opciones modernas de Java se cierra con error en los primeros 30 s, se vuelve a G1 normal y se avisa
      if (!!code && tail.length > 0 && t0 && (jm.zgc || jm.compact) && Date.now() - t0 < 30000 && !(opts && opts.gcRetry)) {
        upIns(id, { gcOff: true }); send('status', 'Se cerró al arrancar con las opciones nuevas de Java: se vuelve a G1'); notify('Minecraft', 'Falló con ZGC / objetos compactos; se reintenta con el Java de siempre (G1).');
        setTimeout(() => { playGame({ id, server, world, safe, extraArgs: opts.extraArgs, gcRetry: true }).catch(() => {}); }, 700);
        return;
      }
      const crashed = !!code && tail.length > 0;
      send('status', crashed ? 'Minecraft se cerró con un error' : 'Minecraft cerrado');
      if (running.size === 0 || crashed) { if (S.win.isMinimized()) S.win.restore(); S.win.show(); S.win.focus(); }
      if (crashed) { reportCrash(ins, code, tail, lg.f, since - 5000); notify('Minecraft se cerró con un error', diagnose(tail).t); }
    });
    discordSet({ details: 'Preparando Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() });
    send('status', 'Descargando archivos del juego…');
    if (!(proc = await l.launch(o))) throw new Error('No se pudo iniciar Minecraft');
    running.add(id); t0 = Date.now(); try { sk = statsStart(ins, server); } catch {} upIns(id, { lastPlayed: t0 });
    send('running', 1); discordSet({ details: server && server.name ? 'En ' + server.name + ' · ' + ins.mc : 'Jugando a Minecraft ' + ins.mc, state: (ins.ld || 'Vanilla') + ' · Nova Launcher', startTimestamp: Date.now() }); send('status', 'Minecraft en ejecución'); if (cfg.closeOnLaunch) S.win.hide(); else if (cfg.gameMode !== false && cfg.conOpen === false) gameHide();
    return { ok: true };
  } catch (err) { send('status', 'Error: ' + err.message); send('progress', null); return { ok: false }; }
}
ipcMain.handle('play', (e, a) => playGame(a));
// Ajustes de Java «Optimizar el juego»: recolector G1 afinado para menos tirones y arranque más rápido
const JVM_OPT = ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled', '-XX:MaxGCPauseMillis=130', '-XX:+UnlockExperimentalVMOptions', '-XX:+DisableExplicitGC',
  '-XX:G1NewSizePercent=28', '-XX:G1MaxNewSizePercent=45', '-XX:G1HeapRegionSize=16M', '-XX:G1ReservePercent=20', '-XX:G1HeapWastePercent=5',
  '-XX:G1MixedGCCountTarget=4', '-XX:InitiatingHeapOccupancyPercent=15', '-XX:G1MixedGCLiveThresholdPercent=90', '-XX:G1RSetUpdatingPauseTimePercent=5',
  '-XX:SurvivorRatio=32', '-XX:MaxTenuringThreshold=1', '-XX:+PerfDisableSharedMem', '-XX:+UseStringDeduplication', '-Xshare:auto', '-Dsun.java2d.noddraw=true'];
const JVM_PRESETS = {
  rendimiento: ['-XX:+UseG1GC', '-XX:+UnlockExperimentalVMOptions', '-XX:+DisableExplicitGC', '-XX:+ParallelRefProcEnabled', '-XX:+UseStringDeduplication'],
  tirones: ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled', '-XX:MaxGCPauseMillis=200', '-XX:+UnlockExperimentalVMOptions', '-XX:+DisableExplicitGC', '-XX:G1NewSizePercent=30', '-XX:G1MaxNewSizePercent=40', '-XX:G1HeapRegionSize=8M', '-XX:G1ReservePercent=20', '-XX:G1HeapWastePercent=5', '-XX:G1MixedGCCountTarget=4', '-XX:InitiatingHeapOccupancyPercent=15', '-XX:G1MixedGCLiveThresholdPercent=90', '-XX:G1RSetUpdatingPauseTimePercent=5', '-XX:SurvivorRatio=32', '-XX:+PerfDisableSharedMem', '-XX:MaxTenuringThreshold=1']
};
// Versión principal de un Java (8, 17, 21, 25…): se lee de «java -version» y se recuerda por ruta
const JMAJ = {};
function javaMajor(j) {
  if (JMAJ[j] !== undefined) return JMAJ[j];
  let m = 0;
  try { const r = require('child_process').spawnSync(j, ['-version'], { encoding: 'utf8', timeout: 8000, windowsHide: true }), t = String(r.stderr || '') + String(r.stdout || ''), x = /version "(\d+)(?:\.(\d+))?/.exec(t); if (x) m = x[1] === '1' ? +x[2] : +x[1]; } catch {}
  return JMAJ[j] = m;
}
// Java moderno (punto 15): objetos más pequeños en Java 25+ y Generational ZGC (opcional, con 8 GB o más). Con ZGC no se mandan los argumentos de G1.
const JVM_ZGC_BASE = ['-XX:+DisableExplicitGC', '-XX:+PerfDisableSharedMem', '-Xshare:auto', '-Dsun.java2d.noddraw=true'];
function jvmModern(cfg, ins, java, ram) {
  const r = { args: [], zgc: false, compact: false, note: '' };
  if (ins.gcOff) return r;   // una vez que fallaron en esta instancia, se queda en G1 normal
  const major = javaMajor(java);
  if (major >= 25) { r.args.push('-XX:+UseCompactObjectHeaders'); r.compact = true; }
  if (cfg.gc === 'zgc') {
    if (ram < 8) r.note = 'Nova: Generational ZGC solo se usa con 8 GB o más de RAM asignada; se usa G1.\n';
    else if (major < 21) r.note = 'Nova: Generational ZGC necesita Java 21 o más; se usa G1.\n';
    else if (ins.jvmPreset) r.note = 'Nova: esta instancia tiene un ajuste de Java propio; no se cambia el recolector.\n';
    else { r.zgc = true; r.args.push('-XX:+UseZGC'); if (major < 23) r.args.push('-XX:+ZGenerational'); }
  }
  return r;
}
const GPU_KEY = 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences';
async function applyGpu(java, on) {
  if (process.platform !== 'win32' || !java) return;
  const exes = [java, java.replace(/java\.exe$/i, 'javaw.exe')].filter((v, i, a) => a.indexOf(v) === i), set = new Set(load().gpuSet || []);
  for (const x of exes) {
    if (on) { await run('reg', ['add', GPU_KEY, '/v', x, '/t', 'REG_SZ', '/d', 'GpuPreference=2;', '/f']); set.add(x); }
    else if (set.has(x)) { await run('reg', ['delete', GPU_KEY, '/v', x, '/f']).catch(() => {}); set.delete(x); }
  }
  wr(cfgFile, { ...load(), gpuSet: [...set] });
}
let PREPQ = null;
S.PREPP = null;
const PREPD = new Set();
S.PREPLAST = null;
const prepKey = r => [r.mc, r.ld || 'Vanilla', r.loaderVersion || ''].join('|');
async function prepRun(r) {
  const cfg = load(), key = prepKey(r), mc = String(r.mc || ''), ld = ['Fabric', 'Forge', 'NeoForge'].includes(r.ld) ? r.ld : 'Vanilla';
  const pr = (state, extra) => send('prep', { state, mc, ld, ...extra });
  if (!mc || !/^[\w.\-+ ]{1,40}$/.test(mc)) return pr('error', { msg: 'Versión no válida' });
  if (PREPD.has(key)) return pr('done', {});
  if (!(await isOnline())) return pr('offline', {});
  pr('start', { pct: 0 }); S.PREPLAST = mc;
  try {
    const java = await javaFor(mc, { javaPath: cfg.javaPath });
    const o = { authorization: Authenticator.getAuth('Nova'), root, javaPath: java, version: { number: mc, type: r.type === 'release' ? 'release' : 'snapshot' },
      overrides: { gameDirectory: path.join(root, 'instances', '.prep') }, memory: { max: '1G', min: '256M' } };
    await mirrorPrep(o, mc);
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
  r = r || {}; if (load().prefetchOn !== true || running.size) return { skipped: true };
  if (S.PREPP) { PREPQ = r; return { queued: true }; }
  const go = req => { S.PREPP = prepRun(req).finally(() => { S.PREPP = null; const n = PREPQ; PREPQ = null; if (n && prepKey(n) !== prepKey(req)) go(n); }); };
  go(r); return { started: true };
});


// Lo que usan otros módulos
Object.assign(R, { PREPD, diagnose, playGame });
