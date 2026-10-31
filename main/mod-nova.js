// =====================================================================================
// Nova Launcher · main/mod-nova.js
// Menú de Nova dentro del juego: mod, fondos propios, vídeo de fondo y actualización del mod
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { app, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const APP = path.join(__dirname, '..'); // carpeta de la app (donde están assets/, preload.js…)
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { LOWRAM, UPD, load, mv, rd, root, running, send, wr } = R; // base
const { UA } = R; // red
const { dl, hashFile, rmQ } = R; // descargas
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const pickNewestTag = (...a) => R.pickNewestTag(...a); // actualizaciones
const verCmp = (...a) => R.verCmp(...a); // actualizaciones
const verParse = (...a) => R.verParse(...a); // actualizaciones

// Menú de Nova dentro del juego: mod de Fabric incluido de fábrica (carpeta assets/mods), siempre activo.
// Se carga con -Dfabric.addMods, así que no aparece en la carpeta mods de la instancia ni se puede borrar desde ahí.
// Vanilla se lanza a través de Fabric para poder cargarlo; si algo falla se juega en vanilla normal.
const NOVA_MC = ['1.20', '1.20.1', '1.20.2', '1.20.3', '1.20.4', '1.20.5', '1.20.6', '1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4', '1.21.5', '1.21.6', '1.21.7', '1.21.8', '1.21.9', '1.21.10', '1.21.11', '26.1', '26.1.1', '26.1.2', '26.2', '26.3'];
          // versiones de Minecraft con mod incluido (mismo orden que mod/versions.txt)
// Vídeo de fondo del menú de Nova (frames JPEG empaquetados): fuera del jar para que el mod pese poco
// ---- Menú de Nova dentro del juego: carpeta de datos, skin del jugador y fondo personalizado ----
function novaDir() { const d = path.join(root, 'nova'); try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; }

// ---- Avisos del launcher dentro del juego (nova/avisos.json): el mod los lee cada 2 s y los enseña de uno en uno (NovaToast) ----
// Solo mientras hay una partida abierta con el menú de Nova; el archivo se vacía al lanzar. Tipos: download, update, backup.
const AVISOS = () => path.join(novaDir(), 'avisos.json');
function novaAvisosReset() { try { fs.writeFileSync(AVISOS(), '[]'); } catch {} }
function novaAviso(tipo, texto) {
  try {
    if (!running.size || R.novaOff && R.novaOff('toasts')) return false;
    let a = []; try { a = JSON.parse(fs.readFileSync(AVISOS(), 'utf8')); if (!Array.isArray(a)) a = []; } catch {}
    a.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), texto: String(texto).slice(0, 120), tipo: String(tipo).slice(0, 20), hora: Date.now() });
    const f = AVISOS(), tmp = f + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(a.slice(-20))); fs.renameSync(tmp, f);   // se escribe entero y se renombra: el mod nunca lee un archivo a medias
    return true;
  } catch { return false; }
}
// Descarga la skin de un nombre (si hay internet, con tiempo límite) y la guarda aparte para cada nombre: así la skin de un usuario nunca se
// queda puesta en otro. Si falla se usa la última guardada de ese nombre; si no hay ninguna, va vacío (sin skin: el mod pone la de Steve).
const skinCache = name => path.join(novaDir(), 'skin-' + String(name).toLowerCase().replace(/[^\w-]/g, '_').slice(0, 40) + '.png');
async function novaSkin(name) {
  const dst = skinCache(name);
  try {
    const buf = await new Promise((ok, no) => {
      const rq = require('https').get('https://minotar.net/skin/' + encodeURIComponent(name) + '.png', { timeout: 4000 }, r => {
        if (r.statusCode !== 200) { r.resume(); return no(new Error('http ' + r.statusCode)); }
        const c = []; r.on('data', x => c.push(x)); r.on('end', () => ok(Buffer.concat(c))); r.on('error', no);
      });
      rq.on('timeout', () => rq.destroy(new Error('timeout'))); rq.on('error', no);
    });
    if (buf.length > 100 && buf.length < 200000 && buf.slice(1, 4).toString() === 'PNG') fs.writeFileSync(dst, buf);
  } catch {}
  return fs.existsSync(dst) ? dst : '';
}
// ---- Fondos propios del menú de Nova: todo lo que haya en la carpeta «fondos» se convierte y aparece en el menú del juego ----
const MEDIA = /\.(png|jpe?g|webp|bmp|gif|mp4|m4v|mov|webm|mkv)$/i, IMGEXT = /\.(png|jpe?g|webp|bmp|gif)$/i;
const fondosDir = () => { const d = path.join(novaDir(), 'fondos'); try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; };
const fondosCache = () => { const d = path.join(novaDir(), 'cache'); try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; };
const fondosJson = (n, o) => { const f = path.join(novaDir(), n); if (o === undefined) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } } try { fs.writeFileSync(f, JSON.stringify(o)); } catch {} };
let FQ = [], FCUR = '', FBUSY = false, FTIMER = null;
const FFAIL = new Map();
async function fondosRun() {
  if (FBUSY) return; FBUSY = true;
  try {
    while (FQ.length) {
      const f = FQ.shift(), src = path.join(fondosDir(), f); FCUR = f;
      let st; try { st = fs.statSync(src); } catch { continue; }
      const setS = o => { const m = fondosJson('fondos-estado.json'); if (o) m[f] = o; else delete m[f]; fondosJson('fondos-estado.json', m); };
      try {
        const img = IMGEXT.test(f);
        await require('../nvb').convert(src, path.join(fondosCache(), f + '.nvb'), { ...(img ? { q: 0.85 } : { onProgress: p => setS({ state: 'working', progress: p }) }), ...(LOWRAM ? { w: 1280, h: 720, single: true } : {}) });   // Modo bajo consumo: solo 720p
        setS(null);
      } catch (e) { FFAIL.set(f, st.mtimeMs); setS({ state: 'error', error: String(e && e.message || e).slice(0, 120) }); }
    }
  } finally { FCUR = ''; FBUSY = false; }
}
// Busca fotos y vídeos nuevos (o cambiados) y los pone en cola; quita las copias de lo que ya no existe
async function fondosScan() {
  const dir = fondosDir(), cache = fondosCache();
  let files = []; try { files = fs.readdirSync(dir).filter(f => MEDIA.test(f)); } catch {}
  try { for (const c of fs.readdirSync(cache)) if (c.endsWith('.nvb') && !files.includes(c.replace(/(\.720)?\.nvb$/, ''))) fs.unlinkSync(path.join(cache, c)); } catch {}
  const est = fondosJson('fondos-estado.json'); let dirty = false;
  for (const k of Object.keys(est)) if (!files.includes(k)) { delete est[k]; dirty = true; }
  for (const f of files) {
    let st; try { st = fs.statSync(path.join(dir, f)); } catch { continue; }
    if (!st.isFile() || !st.size || Date.now() - st.mtimeMs < 1500) continue;   // vacío o todavía copiándose
    let ok = false; try { const c = fs.statSync(path.join(cache, f + '.nvb')); ok = c.size > 32 && c.mtimeMs >= st.mtimeMs; } catch {}
    if (ok || FQ.includes(f) || FCUR === f || FFAIL.get(f) === st.mtimeMs) continue;
    FQ.push(f); est[f] = { state: 'working', progress: 0 }; dirty = true;
  }
  if (dirty) fondosJson('fondos-estado.json', est);
  fondosRun();
}
function fondosWatch() { if (!FTIMER) FTIMER = setInterval(() => { if (running.size > 0) fondosScan().catch(() => {}); }, 2500); }
let PICKING = false;
async function novaPickBg(target) {
  if (PICKING) return; PICKING = true;
  const wasMin = !!(S.win && S.win.isMinimized());
  try {
    if (S.win) { if (wasMin) S.win.restore(); S.win.show(); S.win.focus(); }
    const r = await dialog.showOpenDialog(S.win || undefined, { title: 'Fondo para el menú de Nova', properties: target ? ['openFile'] : ['openFile', 'multiSelections'], filters: [{ name: 'Imagen o vídeo', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'mp4', 'm4v', 'mov', 'webm', 'mkv'] }] });
    if (r.canceled || !r.filePaths.length) return;
    const dir = fondosDir(), names = fondosJson('nombres.json');
    for (const p of r.filePaths) {
      if (!MEDIA.test(p)) continue;
      const ext = path.extname(p);
      let dest;
      if (target) {   // «cambiar»: mismo nombre, otro archivo
        const old = path.basename(target), base = path.basename(old, path.extname(old));
        dest = base + ext;
        if (dest !== old) { try { fs.unlinkSync(path.join(dir, old)); } catch {} try { fs.unlinkSync(path.join(fondosCache(), old + '.nvb')); } catch {} try { fs.unlinkSync(path.join(fondosCache(), old + '.720.nvb')); } catch {} if (names[old] !== undefined) { names[dest] = names[old]; delete names[old]; } }
      } else {
        const base = path.basename(p, ext); dest = base + ext;
        for (let i = 2; fs.existsSync(path.join(dir, dest)); i++) dest = base + ' (' + i + ')' + ext;
      }
      fs.copyFileSync(p, path.join(dir, dest));
      FFAIL.delete(dest);
    }
    fondosJson('nombres.json', names);
    setTimeout(() => fondosScan().catch(() => {}), 1700);
  } catch {} finally { PICKING = false; if (wasMin && S.win) { try { S.win.minimize(); } catch {} } }
}
const LOW720 = new Set();
   // fondos que se están reescalando a 720p ahora mismo
// Fondos que NO vienen en el instalador: se descargan de la release «recursos» (fondos.json con URL y sha256) cuando el usuario los elige.
const NOVA_REMOTE_BG = { 'nova-nebulosa.nvb': 'Nebulosa', 'nova-earth.nvb': 'Earth' };
const NOVA_REMOTE_ID = { nebula: 'nova-nebulosa.nvb', earth: 'nova-earth.nvb' };
const FONDOS_BASE = 'https://github.com/' + UPD.owner + '/' + UPD.repo + '/releases/download/recursos/';

// ---- Archivos firmados con caché: nova-menu.json, fondos.json y nova-config.json (firma ed25519 comprobada en main/firma.js) ----
// Con caché vigente se usa sin pedir nada; si no, se baja el archivo + su .sig y solo vale si la firma es válida. Si falla (sin red, sin firma o firma mala)
// se usa la copia anterior (que se vuelve a comprobar al leerla) y, si no hay, null: quien llama usa entonces lo incluido en el launcher.
async function firmadoCache(name, url, ttl, retry, key = '') {   // url puede ser una función (async): solo se llama si hay que bajar
  const cf = path.join(novaDir(), 'cache-' + name + '.json'), c = rd(cf, null);
  const old = c && c.key === key && c.text ? R.leerFirmado(c.text, c.sig) : null;
  if (old && Date.now() - (c.t || 0) < ttl) return old;
  try {
    const r = await R.fetchFirmado(typeof url === 'function' ? await url() : url, 4000);
    wr(cf, { t: Date.now(), key, text: r.text, sig: r.sig }); return r.json;
  } catch (e) {
    if (c && c.key === key) wr(cf, { ...c, t: Date.now() - ttl + retry });   // se reintenta pronto, sin machacar lo anterior
    return old;
  }
}

// ===== Interruptores a distancia (nova-config.json, firmado) =====
// {"off": ["presence","cape","bench","modUpdate","toasts","reports"], "minMod": "0.2.16", "minLauncher": "0.2.16",
//  "aviso": {"id": "...", "texto": "...", "nivel": "info|aviso|error", "hasta": "2026-12-31"}}
// Se lee al abrir con caché de 1 h. Sin conexión se usa la última copia (comprobando la firma otra vez) y, si no hay ninguna, todo queda encendido.
const CFG_URL = 'https://github.com/' + UPD.owner + '/' + UPD.repo + '/releases/download/recursos/nova-config.json';
let remoteCfg = null;
function cfgNorm(j) {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const off = (Array.isArray(j.off) ? j.off : []).map(String).filter(x => /^[\w-]{1,24}$/.test(x)).slice(0, 40);
  const ver = v => (typeof v === 'string' && verParse(v)) ? v : '';
  let aviso = null;
  const a = j.aviso;
  if (a && typeof a === 'object' && typeof a.id === 'string' && a.id && typeof a.texto === 'string' && a.texto.trim()) {
    const hasta = a.hasta ? Date.parse(a.hasta) || +a.hasta || 0 : 0;
    aviso = { id: a.id.slice(0, 40), texto: a.texto.slice(0, 300), nivel: ['info', 'aviso', 'error'].includes(a.nivel) ? a.nivel : 'info', hasta };
  }
  return { off, minMod: ver(j.minMod), minLauncher: ver(j.minLauncher), aviso };
}
const off = n => !!(remoteCfg && remoteCfg.off.includes(String(n)));
const novaOffList = () => (remoteCfg ? remoteCfg.off : []);
function cfgOut() {
  const c = remoteCfg; if (!c) return { off: [], aviso: null, launcherViejo: false };
  const ok = c.aviso && (!c.aviso.hasta || c.aviso.hasta > Date.now());
  return { off: c.off, aviso: ok ? c.aviso : null, minMod: c.minMod, launcherViejo: !!(c.minLauncher && verCmp(app.getVersion(), c.minLauncher) < 0) };
}
async function novaConfigLoad() {
  try { remoteCfg = cfgNorm(await firmadoCache('nova-config', CFG_URL, 3600e3, 10 * 60e3)); } catch { remoteCfg = null; }
  send('cfg:remote', cfgOut());
  return remoteCfg;
}
ipcMain.handle('cfg:remote', async () => { if (!remoteCfg) await novaConfigLoad(); return cfgOut(); });
setTimeout(() => { novaConfigLoad(); setInterval(novaConfigLoad, 3600e3).unref(); }, 1500);
let fondosMan = null, fondosManT = 0;
const BGDL = new Map();
async function fondosManifest() {
  if (fondosMan && Date.now() - fondosManT < 6 * 3600e3) return fondosMan;
  const j = await firmadoCache('fondos', FONDOS_BASE + 'fondos.json', 6 * 3600e3, 10 * 60e3);
  if (!j) throw new Error('No se pudo comprobar la lista de fondos (sin conexión o firma no válida)');
  fondosMan = j; fondosManT = Date.now(); return fondosMan;
}
const nbvEntryOk = e => !!e && typeof e.url === 'string' && e.url.startsWith(FONDOS_BASE) && /^[0-9a-f]{64}$/.test(String(e.sha256 || '')) && +e.size > 0;
const nbvPath = f => path.join(root, 'nova', f);
const nbvHave = f => { try { return fs.statSync(nbvPath(f)).size > 32; } catch { return false; } };
function nbvState(f, o) {   // el mod lee este estado (fondos-estado.json) para enseñar el progreso dentro del juego
  const m = fondosJson('fondos-estado.json'); if (o) m[f] = o; else delete m[f]; fondosJson('fondos-estado.json', m);
  send('nvbg:state', { file: f, have: nbvHave(f), ...(o || { state: 'ok' }) });
}
// Descarga un fondo (con progreso y comprobando el sha256). Sin conexión o si falla, no pasa nada grave: se sigue con el agujero negro.
function novaBgGet(f) {
  if (!NOVA_REMOTE_BG[f]) return Promise.resolve(false);
  if (nbvHave(f)) return Promise.resolve(true);
  if (BGDL.has(f)) return BGDL.get(f);
  const p = (async () => {
    let timer = null; const dst = nbvPath(f), tmp = dst + '.dl';
    try {
      nbvState(f, { state: 'working', progress: 0 });
      const m = await fondosManifest(), e = m && m.files && m.files[f];
      if (!nbvEntryOk(e)) throw new Error('El fondo no está en la lista de recursos');
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      timer = setInterval(() => { try { nbvState(f, { state: 'working', progress: Math.min(0.99, fs.statSync(tmp + '.part').size / e.size) }); } catch {} }, 700);
      await dl([e.url], tmp, {});
      clearInterval(timer); timer = null;
      if (await hashFile(tmp, 'sha256') !== e.sha256) { await rmQ(tmp); throw new Error('Archivo corrupto: la huella no coincide'); }
      await mv(tmp, dst);
      nbvState(f, null); send('status', 'Fondo «' + NOVA_REMOTE_BG[f] + '» descargado');
      return true;
    } catch (e) {
      if (timer) clearInterval(timer);
      nbvState(f, { state: 'error', msg: String(e && e.message || e).slice(0, 80) });
      return false;
    } finally { BGDL.delete(f); }
  })();
  BGDL.set(f, p); return p;
}
function novaBg(file = 'nova-bg.nvb') {
  const bundled = path.join(APP, 'assets', file), dst = path.join(root, 'nova', file);
  if (!fs.existsSync(bundled)) {
    // Fondo descargable: se devuelve la ruta donde estará; el mod lo muestra como «por descargar» hasta que el archivo exista
    return NOVA_REMOTE_BG[file] ? dst : null;
  }
  const src = bundled;
  try {
    const a = fs.statSync(src), b = fs.existsSync(dst) ? fs.statSync(dst) : null;
    if (!b || b.size !== a.size) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(src)); }
  } catch { return null; }
  try { const low = require('../nvb').lowPath(dst); if (!LOW720.has(dst) && (!fs.existsSync(low) || fs.statSync(low).mtimeMs < fs.statSync(dst).mtimeMs)) { LOW720.add(dst); require('../nvb').make720(dst).catch(() => {}).finally(() => LOW720.delete(dst)); } } catch {}
  return dst;
}
ipcMain.handle('nvbg:list', async () => {
  let man = null; try { man = await fondosManifest(); } catch {}
  const st = fondosJson('fondos-estado.json');
  return Object.keys(NOVA_REMOTE_BG).map(f => { const e = man && man.files && man.files[f], s = st[f] || null; return { file: f, name: NOVA_REMOTE_BG[f], have: nbvHave(f), size: e && +e.size || 0, state: BGDL.has(f) ? 'working' : (s && s.state === 'error' ? 'error' : 'idle'), progress: s && s.progress || 0, online: !!man }; });
});
ipcMain.handle('nvbg:get', async (e, f) => { await novaBgGet(String(f)); return true; });
ipcMain.handle('nvbg:del', (e, f) => { f = String(f); if (!NOVA_REMOTE_BG[f] || BGDL.has(f)) return false; try { fs.unlinkSync(nbvPath(f)); } catch {} try { const l = require('../nvb').lowPath(nbvPath(f)); fs.unlinkSync(l); } catch {} nbvState(f, null); return true; });
// ===== Menú de Nova: actualizar el mod sin sacar una versión nueva del launcher =====
// Cada release sube los nova-menu-<mc>.jar y un nova-menu.json (versión, URL y sha256 por versión de Minecraft). Antes de lanzar se mira ese JSON
// (con caché de 6 h y sin esperar si no hay conexión). Si hay un jar más nuevo se descarga, se comprueba su sha256 y se usa; si algo falla se usa el jar
// que viene en el launcher (assets/mods). Nunca se lanza un jar sin verificar.
const MODUP = { base: 'https://github.com/' + UPD.owner + '/' + UPD.repo + '/releases/', ttl: 6 * 3600e3, retry: 10 * 60e3 };
async function modManifest() {
  if (off('modUpdate')) return null;
  const beta = load().channel === 'beta';
  return firmadoCache('nova-menu', async () => {
    if (beta) { const tag = await pickNewestTag().catch(() => null); if (tag) return MODUP.base + 'download/' + tag + '/nova-menu.json'; }
    return MODUP.base + 'latest/download/nova-menu.json';
  }, MODUP.ttl, MODUP.retry, beta ? 'beta' : 'estable');
}
const modEntryOk = (e, mc) => !!e && !!verParse(e.version) && /^[0-9a-f]{64}$/.test(String(e.sha256 || '')) && typeof e.url === 'string' && e.url.startsWith(MODUP.base + 'download/') && e.url.endsWith('/nova-menu-' + mc + '.jar');
// Notas de la versión del jar instalado: se guardan en nova/news.txt (primera línea «ver:<versión>») y el mod las enseña una vez con -Dnova.news
let newsFile = '';
const novaNews = () => newsFile;
function newsWrite(version, notas) {
  newsFile = '';
  try {
    const t = String(notas || '').trim().slice(0, 900); if (!t) return;
    const f = path.join(novaDir(), 'news.txt'); fs.writeFileSync(f, 'ver:' + version + '\n' + t + '\n'); newsFile = f;
  } catch {}
}
async function novaModResolve(mc) {
  newsFile = '';
  if (!NOVA_MC.includes(mc)) return null;
  const bundled = novaModJar(mc);   // null si esta versión no va dentro del instalador (assets/incluidas.json): se descarga la primera vez
  let best = null;
  try {
    const mine = app.getVersion(), sf = path.join(novaDir(), 'mod-updates.json'), st = rd(sf, {}), m = await modManifest(), e = m && m.jars && m.jars[mc];
    const drop = f => { try { fs.rmSync(f, { force: true }); } catch {} };
    best = st[mc] && st[mc].file && fs.existsSync(st[mc].file) ? st[mc] : null;
    if (best && bundled && verCmp(best.version, mine) <= 0) { drop(best.file); best = null; }   // el launcher ya trae un jar igual o más nuevo
    if (modEntryOk(e, mc) && verCmp(e.version, mine) >= (bundled ? 1 : 0) && (!e.minLauncher || verCmp(mine, e.minLauncher) >= 0) && (!best || verCmp(e.version, best.version) > 0)) {
      const file = path.join(novaDir(), 'nova-menu-' + mc + '-' + e.version + '.jar'), tmp = file + '.dl';
      try {
        send('status', 'Descargando el menú de Nova para ' + mc + '…');
        try { await dl(e.url, tmp, { onProgress: (c, t) => send('progress', { task: c, total: t }) }); } finally { send('progress', null); }
        if (await hashFile(tmp, 'sha256') !== e.sha256.toLowerCase()) throw new Error('sha256 distinto');
        await mv(tmp, file); if (best && best.file !== file) drop(best.file);
        best = { version: e.version, sha256: e.sha256.toLowerCase(), file, notas: String(m.notas || '').slice(0, 900) }; st[mc] = best; wr(sf, st);
        send('log', 'Nova: menú de Nova actualizado a ' + e.version + ' (descargado y verificado).\n');
      } catch (er) { drop(tmp); send('log', 'Nova: no se pudo actualizar el menú (' + String(er && er.message || er).slice(0, 60) + '); se usa el incluido.\n'); }
    }
    if (best && await hashFile(best.file, 'sha256').catch(() => '') === best.sha256) { newsWrite(best.version, best.notas); return best.file; }   // se vuelve a comprobar antes de usarlo
    if (best) { drop(best.file); delete st[mc]; wr(sf, st); best = null; }
  } catch {}
  if (!bundled) { send('log', 'Nova: el menú de Nova para ' + mc + ' no viene en el instalador y no se pudo descargar (sin conexión o sin copia en el disco); se juega sin el menú de Nova.\n'); send('status', 'Sin conexión: se juega sin el menú de Nova'); }
  return bundled;
}
function novaModJar(mc) {
  if (!NOVA_MC.includes(mc)) return null;
  const src = path.join(APP, 'assets', 'mods', 'nova-menu-' + mc + '.jar');
  if (!fs.existsSync(src)) return null;
  // Java no lee dentro de app.asar: se copia a la carpeta de datos
  const dst = path.join(root, 'nova', 'nova-menu-' + mc + '.jar');
  try {
    const a = fs.statSync(src), b = fs.existsSync(dst) ? fs.statSync(dst) : null;
    if (!b || b.size !== a.size) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, fs.readFileSync(src)); }
  } catch { return null; }
  return dst;
}

// Servidores favoritos del launcher -> nova/servers.json (el mod los enseña en su panel «Servidores»)
// Cuentas del launcher para el mod («Cambiar de usuario»): id, nombre, tipo y la skin de cada una (solo la ruta; nunca los tokens).
// Skin de una cuenta: la que eligió en el launcher; si es Microsoft y no eligió, la suya de Mojang (guardada aparte); si no hay, vacío (Steve).
const SKPEND = new Set();
function novaAccountsWrite() {
  try {
    const st = R.accState();
    const accounts = st.a.map(x => {
      let skin = R.accSkinFile ? R.accSkinFile(x.id) : '';
      if (!skin && x.type === 'microsoft') {
        const c = skinCache(x.name);
        if (fs.existsSync(c)) skin = c;
        else if (!SKPEND.has(x.id)) { SKPEND.add(x.id); novaSkin(x.name).then(f => { SKPEND.delete(x.id); if (f) novaAccountsWrite(); }, () => SKPEND.delete(x.id)); }
      }
      return { id: x.id, name: String(x.name || ''), type: x.type === 'microsoft' ? 'microsoft' : 'offline', skin };
    });
    fs.writeFileSync(path.join(novaDir(), 'accounts.json'), JSON.stringify({ active: st.act.id, accounts }));
  } catch {}
}
function novaServersWrite(list) {
  try {
    const fav = (list || []).filter(z => z && z.host).map(z => ({ name: String(z.name || z.host), host: String(z.host), port: +z.port > 0 ? +z.port : 25565 }));
    fs.writeFileSync(path.join(novaDir(), 'servers.json'), JSON.stringify({ fav }));
  } catch {}
}

// ---- Configurar el menú de Nova desde el launcher: lee y escribe nova/menu.json (el mismo archivo que usa el mod, NovaSettings) ----
// El mod relee el archivo al volver al menú si su fecha (lastModified) cambió. Solo se tocan los campos conocidos y el resto
// (teclas, copia de las opciones de vídeo, «orig» del sprint fijo…) se conserva tal cual.
const NMENU_ACCENTS = [0xFF8B6CFF, 0xFF4D8BFF, 0xFF2FD3E0, 0xFF3DDC84, 0xFFFF5FA8, 0xFFFF9A3D, 0xFFFF4D5E, 0xFFDADAF0].map(n => n | 0);
const NMENU_EL = ['fps', 'cps', 'xyz', 'keys', 'state', 'armor', 'pots', 'clock', 'compass'];
const nmName = v => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f"\\]/g, '').trim().slice(0, 24) : '');
const nmElems = h => { const r = {}; if (!h || typeof h !== 'object') return r; for (const k of NMENU_EL) { const e = h[k]; if (!e || typeof e !== 'object') continue; const q = {}; if (nmBool(e.on) !== undefined) q.on = e.on; const x = nmNum(e.x, 0, 1), y = nmNum(e.y, 0, 1), sc = nmNum(e.s, 0.5, 3); if (x !== undefined) q.x = x; if (y !== undefined) q.y = y; if (sc !== undefined) q.s = Math.round(sc * 100) / 100; r[k] = q; } return r; };
const nmenuFile = () => path.join(novaDir(), 'menu.json');
const nmBool = v => (typeof v === 'boolean' ? v : undefined);
const nmNum = (v, a, b) => (typeof v === 'number' && isFinite(v) ? Math.min(b, Math.max(a, v)) : undefined);
function nmenuClean(i) {
  const o = {}; if (!i || typeof i !== 'object') return o;
  if (typeof i.bg === 'string' && /^(hole|nebula|earth|f:[^\\/:*?"<>|]{1,120})$/.test(i.bg)) o.bg = i.bg;
  if (typeof i.accent === 'number' && NMENU_ACCENTS.includes(i.accent | 0)) o.accent = i.accent | 0;
  for (const k of ['showNova', 'showCape', 'toasts']) if (nmBool(i[k]) !== undefined) o[k] = i[k];
  if (i.chat && typeof i.chat === 'object') { o.chat = {}; for (const k of ['time', 'copy', 'search', 'mention']) if (nmBool(i.chat[k]) !== undefined) o.chat[k] = i.chat[k]; }
  if (i.move && typeof i.move === 'object') { o.move = {}; for (const k of ['freelook', 'sprint', 'crouch']) if (i.move[k] && nmBool(i.move[k].on) !== undefined) o.move[k] = { on: i.move[k].on }; }
  if (i.hud && typeof i.hud === 'object') {
    o.hud = {};
    for (const k of NMENU_EL) { const e = i.hud[k]; if (!e || typeof e !== 'object') continue; const r = {}; if (nmBool(e.on) !== undefined) r.on = e.on; const x = nmNum(e.x, 0, 1), y = nmNum(e.y, 0, 1), sc = nmNum(e.s, 0.5, 3); if (x !== undefined) r.x = x; if (y !== undefined) r.y = y; if (sc !== undefined) r.s = Math.round(sc * 100) / 100; o.hud[k] = r; }
    if (i.hud.zoom && nmBool(i.hud.zoom.on) !== undefined) o.hud.zoom = { on: i.hud.zoom.on };
  }
  // perfiles del HUD: «hudProfiles» (nombre → distribución) se mezcla con lo que hay; para borrar o renombrar se manda el conjunto entero en «_set»
  if (i.hudProfiles && typeof i.hudProfiles === 'object') { o.hudProfiles = {}; for (const n of Object.keys(i.hudProfiles).slice(0, 40)) { const nn = nmName(n); if (nn) o.hudProfiles[nn] = nmElems(i.hudProfiles[n]); } }
  if (typeof i.hudProfile === 'string') o.hudProfile = nmName(i.hudProfile) || 'default';
  if (i._set && typeof i._set === 'object') {
    o._set = {};
    if (i._set.hudProfiles && typeof i._set.hudProfiles === 'object') { o._set.hudProfiles = {}; for (const n of Object.keys(i._set.hudProfiles).slice(0, 40)) { const nn = nmName(n); if (nn) o._set.hudProfiles[nn] = nmElems(i._set.hudProfiles[n]); } }
    if (i._set.hudRules && typeof i._set.hudRules === 'object') { o._set.hudRules = {}; for (const n of Object.keys(i._set.hudRules).slice(0, 80)) { const k = String(n).replace(/[\u0000-\u001f\u007f]/g, '').trim().toLowerCase().slice(0, 120), v = nmName(i._set.hudRules[n]); if (k && v) o._set.hudRules[k] = v; } }
  }
  if (i.fps && typeof i.fps === 'object' && [30, 60, 90, 120, 144].includes(i.fps.goal)) o.fps = { goal: i.fps.goal };
  if (i.acc && typeof i.acc === 'object') {
    o.acc = {}; if (nmBool(i.acc.launcher) !== undefined) o.acc.launcher = i.acc.launcher; if (nmBool(i.acc.contrast) !== undefined) o.acc.contrast = i.acc.contrast; if (nmBool(i.acc.motion) !== undefined) o.acc.motion = i.acc.motion;
    const t = nmNum(i.acc.text, 80, 150); if (t !== undefined) o.acc.text = Math.round(t);
  }
  return o;
}
function nmenuMerge(a, b) { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) { a[k] = nmenuMerge(a[k] && typeof a[k] === 'object' ? a[k] : {}, b[k]); } else a[k] = b[k]; } return a; }
function nmenuBgs() {
  const L = [{ id: 'hole', name: 'Agujero negro' }, { id: 'nebula', name: 'Nebulosa' }, { id: 'earth', name: 'Earth' }];
  try { const d = fondosDir(), names = fondosJson('nombres.json'); for (const f of fs.readdirSync(d).sort((a, b) => a.localeCompare(b))) if (/\.(png|jpe?g|webp|gif|mp4|webm|mov|mkv|avi)$/i.test(f)) L.push({ id: 'f:' + f, name: names[f] || f.replace(/\.[^.]+$/, '') }); } catch {}
  return L;
}
ipcMain.handle('nmenu:get', () => {
  let cfg = {}, mtime = 0; try { cfg = JSON.parse(fs.readFileSync(nmenuFile(), 'utf8')) || {}; mtime = fs.statSync(nmenuFile()).mtimeMs; } catch {}
  return { cfg, mtime, bgs: nmenuBgs(), accents: NMENU_ACCENTS.map(n => '#' + (n >>> 0).toString(16).slice(2).padStart(6, '0')), accentVals: NMENU_ACCENTS };
});
ipcMain.handle('nmenu:set', (e, patch) => {
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(nmenuFile(), 'utf8')) || {}; } catch {}
  const cl = nmenuClean(patch), st = cl._set; delete cl._set;
  const next = nmenuMerge(cur, cl), f = nmenuFile(), tmp = f + '.tmp';
  if (st) for (const k of Object.keys(st)) next[k] = st[k];
  // el HUD de arriba es siempre el del perfil «default» (el mod vuelve a él al salir de una partida)
  if (next.hudProfiles && next.hudProfiles.default && Object.keys(next.hudProfiles.default).length) { next.hud = Object.assign({}, next.hud || {}, next.hudProfiles.default); next.hudProfile = 'default'; }
  try { fs.writeFileSync(tmp, JSON.stringify(next)); fs.renameSync(tmp, f); } catch (er) { try { fs.unlinkSync(tmp); } catch {} return { ok: false, why: String(er && er.message || er) }; }
  return { ok: true, mtime: fs.statSync(f).mtimeMs };
});
// Captura de fondo para el editor del HUD: la última captura de pantalla de tus instancias (reducida a 960 px) o, si no hay, null
ipcMain.handle('nmenu:shot', () => {
  try {
    const { nativeImage } = require('electron'); let best = null;
    const ids = (R.getIns ? (rd(path.join(root, 'instances.json'), []) || []) : []).map(i => i.id);
    for (const id of ids) { const d = path.join(R.iDir(id), 'screenshots'); let L = []; try { L = fs.readdirSync(d); } catch { continue; } for (const f of L) if (/\.png$/i.test(f)) { const p = path.join(d, f), m = fs.statSync(p).mtimeMs; if (!best || m > best.m) best = { p, m }; } }
    if (!best) return null;
    const im = nativeImage.createFromPath(best.p); if (im.isEmpty()) return null;
    return im.resize({ width: 960, quality: 'good' }).toDataURL();
  } catch { return null; }
});
ipcMain.handle('nmenu:export', async (e, text) => {
  const r = await dialog.showSaveDialog(S.win || undefined, { title: 'Exportar mi HUD', defaultPath: path.join(app.getPath('downloads'), 'mi-hud.novahud'), filters: [{ name: 'HUD de Nova', extensions: ['novahud'] }] });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  try { fs.writeFileSync(r.filePath, String(text)); return { ok: true, file: r.filePath }; } catch (er) { return { ok: false, why: String(er && er.message || er) }; }
});
ipcMain.handle('nmenu:import', async () => {
  const r = await dialog.showOpenDialog(S.win || undefined, { title: 'Importar un HUD', properties: ['openFile'], filters: [{ name: 'HUD de Nova', extensions: ['novahud', 'txt'] }] });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try { const st = fs.statSync(r.filePaths[0]); if (st.size > 65536) return { ok: false, why: 'big' }; return { ok: true, text: fs.readFileSync(r.filePaths[0], 'utf8') }; } catch (er) { return { ok: false, why: String(er && er.message || er) }; }
});

// «Usar la accesibilidad del launcher»: si el jugador lo marcó en el mod (menu.json → acc.launcher), al lanzar el juego se copian aquí
// el tamaño del texto, el alto contraste y reducir animaciones del launcher.
function novaAccSync(cfg) {
  try {
    const f = nmenuFile(); let o = {}; try { o = JSON.parse(fs.readFileSync(f, 'utf8')) || {}; } catch { return false; }
    if (!o.acc || o.acc.launcher !== true) return false;
    const want = { launcher: true, text: Math.max(80, Math.min(150, Math.round(+cfg.tsize || 100))), contrast: !!cfg.contrast, motion: !!cfg.rmotion };
    if (o.acc.text === want.text && o.acc.contrast === want.contrast && o.acc.motion === want.motion) return false;
    o.acc = want; const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, f); return true;
  } catch { return false; }
}

// Lo que usan otros módulos
Object.assign(R, { novaOff: off, novaOffList, novaConfigLoad, novaAviso, novaAvisosReset, novaAccSync, NOVA_MC, NOVA_REMOTE_ID, fondosDir, fondosScan, fondosWatch, modManifest, novaBg, novaBgGet, novaDir, novaModResolve, novaNews, novaPickBg, novaServersWrite, novaAccountsWrite, novaSkin });
