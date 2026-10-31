// =====================================================================================
// Nova Launcher · main/limpieza.js
// Limpieza de espacio en disco
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { fsp, li, rmAsync, root, running } = R; // base
const { NOVA_MC } = R; // mod-nova
const { nfC } = R; // cargadores
const { dirSize } = R; // mundos
const { bkList, iDir } = R; // instancias
const { imgDir } = R; // ventana
const { PREPD } = R; // juego

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
  if (S.PREPLAST) used.add(S.PREPLAST);
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
  const ld = path.join(root, 'libraries'), keepVers = have.filter(d => used.has(d)), { dirs } = await usedLibDirs(keepVers);
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
  if (S.PREPP) { try { await S.PREPP; } catch {} }
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
