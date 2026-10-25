// =====================================================================================
// Nova Launcher · main/mundos.js
// Mundos de cada instancia y último mundo jugado
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
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


// ---- Capturas con aviso: el mod escribe «[Nova] captura: <ruta>» y, al pulsar sus botones, [NOVA:SHOTCOPY:<ruta>] / [NOVA:SHOTOPEN:<ruta>]
// Solo se aceptan rutas dentro de la carpeta screenshots de esa instancia.
function shotMarkers(t, id) {
  const ok = f => { try { const d = path.join(iDir(id), 'screenshots') + path.sep, p = path.resolve(String(f).trim()); return p.startsWith(d) && /\.(png|jpe?g)$/i.test(p) && fs.existsSync(p) ? p : null; } catch { return null; } };
  if (/\[Nova\] captura: /.test(t)) { send('shot:new', id); }
  let m = t.match(/\[NOVA:SHOTCOPY:([^\]]+)\]/);
  if (m) { const p = ok(m[1]); if (p) { const im = nativeImage.createFromPath(p); if (!im.isEmpty()) clipboard.writeImage(im); } }
  m = t.match(/\[NOVA:SHOTVIEW:([^\]]+)\]/);
  if (m) { const p = ok(m[1]); if (p) shell.openPath(p); }
  m = t.match(/\[NOVA:SHOTOPEN:([^\]]+)\]/);
  if (m) { const p = ok(m[1]); if (p) shell.showItemInFolder(p); }
}

// Lo que usan otros módulos
Object.assign(R, { dirSize, importWorldZips, shotMarkers });
