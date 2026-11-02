// =====================================================================================
// Nova Launcher · main/mundos.js
// Mundos de cada instancia y último mundo jugado
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { clipboard, dialog, ipcMain, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { getIns, iDir, safeName } = R; // instancias
const { fsp, li, rmAsync, root, running, send } = R; // base
const { unzipSafe } = R; // descargas
const { modernQP } = R; // servidores

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
  getIns(id); const r = await dialog.showOpenDialog(S.win, { title: 'Importar mapas', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Mapa (.zip)', extensions: ['zip'] }] });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return importWorldZips(r.filePaths, getIns(id).id);
});
// ---- Continuar: último mundo jugado ----
ipcMain.handle('world:last', () => {
  let best = null;
  for (const i of li()) {
    if (!modernQP(i.mc)) continue; const sv = path.join(iDir(i.id), 'saves'); let es = []; try { es = fs.readdirSync(sv, { withFileTypes: true }); } catch { continue; }
    for (const d of es) { if (!d.isDirectory()) continue; try { const st = fs.statSync(path.join(sv, d.name, 'level.dat')); if (!best || st.mtimeMs > best.date) best = { inst: i.id, name: d.name, date: st.mtimeMs, instName: i.name, mc: i.mc, ld: i.ld || 'Vanilla' }; } catch {} }
  }
  return best;
});


// ---- Capturas con aviso: el mod escribe el marcador SHOTNEW al guardar una captura y SHOTCOPY / SHOTVIEW / SHOTOPEN al pulsar sus botones (main/marcas.js).
// Solo se aceptan rutas dentro de la carpeta screenshots de esa instancia.
function shotAction(kind, f, id) {
  // Solo cuenta el nombre del archivo (y se busca en la carpeta screenshots de esa instancia): la ruta que escribe el juego puede venir con otra
  // forma (mayúsculas, «\.\», acentos mal codificados en la salida de Java) y entonces no coincidía con la nuestra y no pasaba nada.
  let p = null;
  try {
    const name = String(f).trim().split(/[\\/]/).pop(), d = path.join(iDir(id), 'screenshots');
    if (/^[^\\/:*?"<>|]+\.(png|jpe?g)$/i.test(name) && fs.existsSync(path.join(d, name))) p = path.join(d, name);
  } catch {}
  if (!p) return;
  if (kind === 'copy') copyImageFile(p);
  else if (kind === 'view') openFileOrFolder(p).catch(() => {});
  else if (kind === 'open') shell.showItemInFolder(p);
}

// Copia una imagen al portapapeles: primero con nativeImage.createFromPath y, si no la lee, desde los bytes del archivo
function copyImageFile(p) {
  let im = nativeImage.createFromPath(p);
  if (im.isEmpty()) { try { im = nativeImage.createFromBuffer(fs.readFileSync(p)); } catch {} }
  if (im.isEmpty()) throw new Error('No se pudo leer la imagen');
  clipboard.writeImage(im);
  return true;
}

// Abre el archivo con el programa de imágenes de Windows; si no hay ninguno (openPath devuelve un texto de error), enseña el archivo en su carpeta
async function openFileOrFolder(p) {
  let e = ''; try { e = await shell.openPath(p); } catch (x) { e = String(x && x.message || x); }
  if (e) { shell.showItemInFolder(p); return false; }
  return true;
}

// ---- Todos tus mundos (pestaña Mundos): los mundos de todas las instancias en una sola lista ----
// El escaneo es asíncrono y en paralelo (por tandas) para no frenar la interfaz; level.dat se lee con main/nbt.js.
// Resultado en caché (en memoria y en worlds-cache.json): un mundo solo se vuelve a leer si cambió su level.dat.
const { levelInfo } = require('./nbt');
const WCACHE = () => path.join(root, 'worlds-cache.json');
let wc = null, wcDirty = false;
function wcLoad() { if (wc) return wc; try { wc = JSON.parse(fs.readFileSync(WCACHE(), 'utf8')); if (!wc || typeof wc !== 'object' || Array.isArray(wc)) wc = {}; } catch { wc = {}; } return wc; }
function wcSave() { if (!wcDirty) return; wcDirty = false; try { const f = WCACHE(), t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(wc)); fs.renameSync(t, f); } catch {} }
async function pooled(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

async function readWorld(inst, folder, c) {
  const dir = path.join(iDir(inst.id), 'saves', folder), lv = path.join(dir, 'level.dat');
  let st; try { st = await fs.promises.stat(lv); } catch { return null; }
  const key = inst.id + '/' + folder, hit = c[key];
  let w = hit && hit.m === st.mtimeMs ? hit : null;
  if (!w) {
    let inf = { name: '', mode: 'survival', ver: '', last: 0 };
    try { inf = levelInfo(await fs.promises.readFile(lv)); } catch {}
    let icon = ''; try { const b = await fs.promises.readFile(path.join(dir, 'icon.png')); if (b.length < 200000) icon = 'data:image/png;base64,' + b.toString('base64'); } catch {}
    w = { m: st.mtimeMs, name: inf.name || folder, mode: inf.mode, ver: inf.ver, last: inf.last || st.mtimeMs, icon };
    c[key] = w; wcDirty = true;
  }
  return { inst: inst.id, instName: inst.name, mc: inst.mc, qp: !!modernQP(inst.mc), folder, name: w.name, mode: w.mode, ver: w.ver, last: w.last, icon: w.icon };
}

/** Todos los mundos de todas las instancias. */
async function worldsAll() {
  const c = wcLoad(), jobs = [];
  await pooled(li(), 4, async inst => {
    let es = []; try { es = await fs.promises.readdir(path.join(iDir(inst.id), 'saves'), { withFileTypes: true }); } catch { return; }
    for (const d of es) if (d.isDirectory()) jobs.push([inst, d.name]);
  });
  const res = (await pooled(jobs, 12, ([inst, f]) => readWorld(inst, f, c).catch(() => null))).filter(Boolean);
  const live = new Set(jobs.map(([i, f]) => i.id + '/' + f));
  for (const k of Object.keys(c)) if (!live.has(k)) { delete c[k]; wcDirty = true; }
  wcSave();
  return res.sort((a, b) => b.last - a.last);
}
const worldDir = (inst, folder) => {
  const ins = getIns(inst), f = path.basename(String(folder)), d = path.join(iDir(ins.id), 'saves', f);
  if (f !== String(folder) || !fs.existsSync(path.join(d, 'level.dat'))) throw new Error('Mundo no encontrado');
  return { ins, d, f };
};
ipcMain.handle('worlds:all', () => worldsAll());
ipcMain.handle('worlds:open', async (e, { inst, folder }) => { const { d } = worldDir(inst, folder); const r = await shell.openPath(d); if (r) throw new Error(r); return true; });
ipcMain.handle('worlds:backup', async (e, { inst, folder }) => {
  const { ins, f } = worldDir(inst, folder), t = new Date(), z = n => String(n).padStart(2, '0');
  const stamp = `${t.getFullYear()}${z(t.getMonth() + 1)}${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}${z(t.getSeconds())}`;
  const out = path.join(root, 'backups', 'mundos', ins.id, stamp + '__' + safeName(f, 'mundo') + '.zip');
  send('status', 'Haciendo copia del mundo…');
  try { await R.zipItems(out, path.join(iDir(ins.id), 'saves'), [f]); } finally { send('status', ''); }
  return out;
});
ipcMain.handle('worlds:trash', async (e, { inst, folder }) => {
  const { ins, d, f } = worldDir(inst, folder);
  if (running.has(ins.id)) throw new Error('Cierra Minecraft antes de borrar un mundo');
  await shell.trashItem(d);
  const c = wcLoad(); delete c[ins.id + '/' + f]; wcDirty = true; wcSave();
  return true;
});

Object.assign(R, { worldsAll });

// Lo que usan otros módulos
Object.assign(R, { dirSize, importWorldZips, shotAction, copyImageFile, openFileOrFolder });
