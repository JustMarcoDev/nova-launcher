// =====================================================================================
// Nova Launcher · main/cargadores.js
// Cargadores (Fabric, Forge, NeoForge): listas de versiones y preparación
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const fs = require('fs');
const path = require('path');
const APP = path.join(__dirname, '..'); // carpeta de la app (donde están assets/, preload.js…)
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { get, run } = R; // red
const { logErr } = R; // errores
const { rd, root, send, wr } = R; // base
const { dl } = R; // descargas
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const novaDir = (...a) => R.novaDir(...a); // mod-nova

const nfC = mc => { const p = mc.split('.'); return p[0] === '1' ? [`${p[1]}.${p[2] || 0}.`] : [`${p[0]}.${p[1]}.${p[2] || 0}.`, `${p[0]}.${p[1]}.`]; };
// Versiones disponibles de cada loader (la más nueva primero)
// Lista de versiones del cargador de una versión de Minecraft. Si la red falla se prueba una segunda fuente (Fabric), después la última lista guardada
// y por último la versión de Fabric que va dentro del instalador; si no hay nada, se lanza el error (la pantalla lo enseña con «Reintentar»).
const loaderCacheFile = () => path.join(novaDir(), 'loader-cache.json');
async function getRetry(u, t) { try { return await get(u, t); } catch (e) { await new Promise(r => setTimeout(r, 700)); return get(u, t); } }
async function loaderListNet(ld, mc) {
  if (ld === 'Fabric') {
    try { const L = await getRetry(`https://meta.fabricmc.net/v2/versions/loader/${mc}`); if (Array.isArray(L) && L.length) return L.map(x => ({ v: x.loader.version, stable: !!x.loader.stable })); }
    catch (e) { logErr('loader', e, { 'Qué se intentaba': 'Lista de versiones de Fabric para ' + mc, Dirección: 'meta.fabricmc.net' }); }
    try { const L = await get(`https://bmclapi2.bangbang93.com/fabric-meta/v2/versions/loader/${mc}`); if (Array.isArray(L) && L.length) return L.map(x => ({ v: x.loader.version, stable: !!x.loader.stable })); } catch {}
    // segunda fuente: todas las versiones del cargador (sin filtrar por Minecraft; Fabric funciona con casi todas)
    const x = await get('https://maven.fabricmc.net/net/fabricmc/fabric-loader/maven-metadata.xml', 'text');
    const vs = [...x.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]).reverse();
    return vs.map(v => ({ v, stable: !/-(beta|alpha|rc|pre)/i.test(v) }));
  }
  if (ld === 'Forge') { const x = await getRetry('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml', 'text');
    return [...x.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]).filter(v => v.startsWith(mc + '-')).map(v => v.slice(mc.length + 1)).reverse().map(v => ({ v, stable: true })); }
  if (ld === 'NeoForge') { const all = (await getRetry('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge')).versions.filter(x => nfC(mc).some(c => x.startsWith(c)));
    return all.reverse().map(v => ({ v, stable: !/alpha|beta/.test(v) })); }
  return [];
}
async function loaderList(ld, mc) {
  const key = ld + '|' + mc;
  try {
    const L = await loaderListNet(ld, mc);
    if (L.length) { try { const c = rd(loaderCacheFile(), {}); c[key] = L.slice(0, 120); wr(loaderCacheFile(), c); } catch {} }
    return L;
  } catch (e) {
    const c = rd(loaderCacheFile(), {}); if (c && Array.isArray(c[key]) && c[key].length) return c[key];
    if (ld === 'Fabric') { try { const E = JSON.parse(fs.readFileSync(path.join(APP, 'assets', 'fabric-loaders.json'), 'utf8')); if (E.length) return E.map(x => ({ ...x, off: true })); } catch {} }
    if (ld === 'Fabric') { try { const prof = JSON.parse(fs.readFileSync(path.join(APP, 'assets', 'fabric', mc + '.json'), 'utf8')), m = /^fabric-loader-(.+)-[^-]+$/.exec(prof.id); if (m) return [{ v: m[1], stable: true, off: true }]; } catch {} }
    throw new Error('No se pudo cargar la lista de versiones de ' + ld + ' (' + String(e && e.message || e).slice(0, 80) + '). Comprueba tu conexión.');
  }
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
    const pf = path.join(APP, 'assets', 'fabric', mc + '.json'); if (!fs.existsSync(pf)) return null;
    const prof = JSON.parse(fs.readFileSync(pf, 'utf8')), id = prof.id, vf = path.join(root, 'versions', id, id + '.json');
    for (const l of prof.libraries || []) {
      const [g, n, v] = String(l.name).split(':'), rel = g.replace(/\./g, '/') + '/' + n + '/' + v + '/' + n + '-' + v + '.jar';
      const src = path.join(APP, 'assets', 'fabric', 'libraries', rel), dst = path.join(root, 'libraries', rel);
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
  if (!fs.existsSync(f)) {
    try { let t; try { t = await get(`https://meta.fabricmc.net/v2/versions/loader/${mc}/${lv}/profile/json`, 'text'); } catch { t = await get(`https://bmclapi2.bangbang93.com/fabric-meta/v2/versions/loader/${mc}/${lv}/profile/json`, 'text'); } fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); }
    catch (x) { if (!want) { const b = fabricBundled(mc); if (b) return b; } throw x; }
  }
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


// Lo que usan otros módulos
Object.assign(R, { fabric, fabricBundled, forge, loaderList, loaderPick, nfC });
