// =====================================================================================
// Nova Launcher · main/mod-nova.js
// Menú de Nova dentro del juego: mod, fondos propios, vídeo de fondo y actualización del mod
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
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
let fondosMan = null, fondosManT = 0;
const BGDL = new Map();
async function fondosManifest() {
  if (fondosMan && Date.now() - fondosManT < 6 * 3600e3) return fondosMan;
  const r = await fetch(FONDOS_BASE + 'fondos.json', { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA() } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  fondosMan = await r.json(); fondosManT = Date.now(); return fondosMan;
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
  const cf = path.join(novaDir(), 'nova-menu-cache.json'), beta = load().channel === 'beta', c = rd(cf, null);
  if (c && c.beta === beta && Date.now() - (c.t || 0) < MODUP.ttl) return c.json || null;
  try {
    let url = MODUP.base + 'latest/download/nova-menu.json';
    if (beta) { const tag = await pickNewestTag(); if (tag) url = MODUP.base + 'download/' + tag + '/nova-menu.json'; }
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': UA() } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json(); wr(cf, { t: Date.now(), beta, json }); return json;
  } catch {
    wr(cf, { t: Date.now() - MODUP.ttl + MODUP.retry, beta, json: c && c.json || null });   // sin red: se usa lo último que se supo y se reintenta en 10 min
    return c && c.json || null;
  }
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
  const bundled = novaModJar(mc); if (!bundled) return null;
  try {
    const mine = app.getVersion(), sf = path.join(novaDir(), 'mod-updates.json'), st = rd(sf, {}), m = await modManifest(), e = m && m.jars && m.jars[mc];
    const drop = f => { try { fs.rmSync(f, { force: true }); } catch {} };
    let best = st[mc] && st[mc].file && fs.existsSync(st[mc].file) ? st[mc] : null;
    if (best && verCmp(best.version, mine) <= 0) { drop(best.file); best = null; }   // el launcher ya trae un jar igual o más nuevo
    if (modEntryOk(e, mc) && verCmp(e.version, mine) > 0 && (!e.minLauncher || verCmp(mine, e.minLauncher) >= 0) && (!best || verCmp(e.version, best.version) > 0)) {
      const file = path.join(novaDir(), 'nova-menu-' + mc + '-' + e.version + '.jar'), tmp = file + '.dl';
      try {
        await dl(e.url, tmp);
        if (await hashFile(tmp, 'sha256') !== e.sha256.toLowerCase()) throw new Error('sha256 distinto');
        await mv(tmp, file); if (best && best.file !== file) drop(best.file);
        best = { version: e.version, sha256: e.sha256.toLowerCase(), file, notas: String(m.notas || '').slice(0, 900) }; st[mc] = best; wr(sf, st);
        send('log', 'Nova: menú de Nova actualizado a ' + e.version + ' (descargado y verificado).\n');
      } catch (er) { drop(tmp); send('log', 'Nova: no se pudo actualizar el menú (' + String(er && er.message || er).slice(0, 60) + '); se usa el incluido.\n'); }
    }
    if (best && await hashFile(best.file, 'sha256').catch(() => '') === best.sha256) { newsWrite(best.version, best.notas); return best.file; }   // se vuelve a comprobar antes de usarlo
    if (best) { drop(best.file); delete st[mc]; wr(sf, st); }
  } catch {}
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

// Lo que usan otros módulos
Object.assign(R, { NOVA_MC, NOVA_REMOTE_ID, fondosDir, fondosScan, fondosWatch, modManifest, novaBg, novaBgGet, novaDir, novaModResolve, novaNews, novaPickBg, novaServersWrite, novaAccountsWrite, novaSkin });
