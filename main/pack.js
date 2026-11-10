// =====================================================================================
// Nova Launcher · main/pack.js
// Compartir modpacks con un enlace (nova://pack?d=… o https://…/pack#…) y botón «Añadir modpack».
// La lógica pura (codificar, validar, vista previa) está en pack-core.js; aquí van el protocolo nova://, las consultas a
// Modrinth y la instalación. De un enlace solo se usan ids y huellas: las direcciones y los nombres de archivo salen de Modrinth.
// =====================================================================================
const { app, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { S, R } = require('./compartido');
const C = require('./pack-core');
// De módulos anteriores (ya cargados):
const { addInst, fsp, li, rd, rmAsync, root, running, send, wr, insFile } = R; // base
const { dl, hashOf, pool, prog, unzipSafe } = R; // descargas
const { logErr, withLog } = R; // errores
const { get, post } = R; // red
const { autoBackup, getIns, iDir } = R; // instancias
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const loaderPick = (...a) => R.loaderPick(...a); // cargadores
const notify = (...a) => R.notify(...a); // sistema

const WEB = 'https://justmarcodev.github.io/nova-launcher-web';   // web de Nova: allí vive la página /pack
const CDN = /^https:\/\/cdn\.modrinth\.com\//;                    // única procedencia aceptada para los archivos de un enlace
const API = 'https://api.modrinth.com/v2';

// ---- 1. Recibir enlaces nova:// (con el launcher cerrado o abierto) ----
let pending = null;   // enlace recibido antes de que la interfaz esté lista
const linkIn = argv => (argv || []).find(a => /^nova:\/\//i.test(String(a))) || null;
function packOpen(argv) {
  const l = linkIn(argv); if (!l) return false;
  if (S.win && !S.win.isDestroyed() && !S.win.webContents.isLoading()) { send('pack:link', l); if (S.win.isMinimized()) S.win.restore(); S.win.show(); S.win.focus(); }
  else pending = l;
  return true;
}
try {
  if (process.defaultApp && process.argv[1]) app.setAsDefaultProtocolClient('nova', process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient('nova');
} catch {}
app.on('open-url', (e, url) => { e.preventDefault(); packOpen([url]); });   // macOS
pending = linkIn(process.argv);                                           // Windows/Linux: el enlace llega como argumento
ipcMain.handle('pack:pending', () => { const l = pending; pending = null; return l; });

// ---- 2. Generar el enlace ----
const SUB = { m: 'mods', r: 'resourcepacks', s: 'shaderpacks' };
const OK_EXT = { m: /\.jar$/i, r: /\.zip$/i, s: /\.zip$/i };
ipcMain.handle('share:make', async (e, id) => {
  const ins = getIns(id), dir = iDir(ins.id), items = [];
  for (const t of Object.keys(SUB)) {
    let es = []; try { es = await fsp.readdir(path.join(dir, SUB[t]), { withFileTypes: true }); } catch {}
    for (const x of es) if (x.isFile() && OK_EXT[t].test(x.name)) items.push({ t, file: x.name, sha1: hashOf(await fsp.readFile(path.join(dir, SUB[t], x.name)), 'sha1'), found: null });
  }
  let found = {};
  if (items.length) { try { found = await post(API + '/version_files', { hashes: [...new Set(items.map(x => x.sha1))], algorithm: 'sha1' }); } catch (x) { throw new Error('No se pudo consultar Modrinth: ' + (x && x.message || x)); } }
  for (const it of items) it.found = found[it.sha1] || null;
  let lv = ins.loaderVersion || ''; if (ins.ld && ins.ld !== 'Vanilla' && !lv) { try { lv = await loaderPick(ins.ld, ins.mc); } catch {} }
  const { man, left } = C.build({ name: ins.name, mc: ins.mc, ld: ins.ld, loaderVersion: lv, ram: ins.ram, icon: ins.icon, color: ins.color }, items);
  const l = C.links(man, WEB);
  return { app: l.app, web: l.web, length: l.length, shared: man.f.length, left };
});

// ---- 3. Vista previa e instalación ----
const sameName = n => li().find(i => String(i.name).trim().toLowerCase() === String(n).trim().toLowerCase()) || null;
async function versionsOf(ids) {
  const out = [];
  for (let k = 0; k < ids.length; k += 100) { const part = ids.slice(k, k + 100); out.push(...await get(API + '/versions?ids=' + encodeURIComponent(JSON.stringify(part)))); }
  return out;
}
async function resolve(text) {
  const man = C.fromLink(text);
  const pv = C.preview(man, await versionsOf([...new Set(man.f.map(f => f[2]))]));
  for (const x of pv.list) if (!CDN.test(x.url)) throw new Error('El enlace apunta a una descarga que no es de Modrinth');
  return { man, pv };
}
const brief = (pv, extra) => ({ name: pv.name, mc: pv.mc, ld: pv.ld, lv: pv.lv, ram: pv.ram, mods: pv.mods, resourcepacks: pv.resourcepacks, shaders: pv.shaders, size: pv.size, missing: pv.missing.length, exists: (e => e && { id: e.id, name: e.name })(sameName(pv.name)), ...extra });

// Vista previa de un archivo (.mrpack o .zip de Nova): se lee solo su índice; mods y tamaño salen de él.
async function previewFile(file) {
  const tmp = path.join(root, 'tmp_pack_prev'); await rmAsync(tmp); await fsp.mkdir(tmp, { recursive: true });
  try {
    await unzipSafe(file, tmp);
    let base = tmp; const es = fs.readdirSync(tmp); if (es.length === 1 && fs.statSync(path.join(tmp, es[0])).isDirectory()) base = path.join(tmp, es[0]);
    const ix = rd(path.join(base, 'modrinth.index.json'), null);
    if (ix) {
      const d = ix.dependencies || {}, ld = d['fabric-loader'] ? 'Fabric' : d.neoforge ? 'NeoForge' : d.forge ? 'Forge' : d['quilt-loader'] ? 'Quilt' : 'Vanilla';
      const fl = (ix.files || []).filter(f => !(f.env && f.env.client === 'unsupported')), mods = fl.filter(f => /^mods\//.test(String(f.path))).length;
      const ov = ['overrides', 'client-overrides'].reduce((n, o) => { try { return n + fs.readdirSync(path.join(base, o, 'mods')).length; } catch { return n; } }, 0);
      return { name: String(ix.name || 'Modpack').slice(0, 40), mc: String(d.minecraft || ''), ld, lv: d['fabric-loader'] || d.neoforge || d.forge || '', ram: 0, mods: mods + ov, resourcepacks: 0, shaders: 0, size: fl.reduce((n, f) => n + (+f.fileSize || 0), 0), missing: 0, unsupported: ld === 'Quilt' ? 'Los modpacks de Quilt no están soportados' : '' };
    }
    const m = rd(path.join(base, 'nova-instance.json'), null);
    if (!m || !m.mc) throw new Error('Formato no reconocido: usa un .mrpack o un .zip exportado desde Nova Launcher');
    let mods = 0; try { mods = fs.readdirSync(path.join(base, 'mods')).filter(f => /\.jar$/i.test(f)).length; } catch {}
    return { name: String(m.name || 'Importada').slice(0, 40), mc: String(m.mc), ld: ['Fabric', 'Forge', 'NeoForge'].includes(m.ld) ? m.ld : 'Vanilla', lv: m.loaderVersion || '', ram: +m.ram || 0, mods, resourcepacks: 0, shaders: 0, size: fs.statSync(file).size, missing: 0 };
  } finally { await rmAsync(tmp).catch(() => {}); }
}
ipcMain.handle('pack:pick', async () => {
  const r = await dialog.showOpenDialog(S.win, { title: 'Elegir modpack', properties: ['openFile'], filters: [{ name: 'Modpack (.mrpack) o instancia de Nova (.zip)', extensions: ['mrpack', 'zip'] }] });
  return r.canceled || !r.filePaths[0] ? { canceled: true } : { file: r.filePaths[0] };
});
ipcMain.handle('pack:preview', async (e, a) => {
  try {
    if (a && a.file) { const f = String(a.file); if (!/\.(mrpack|zip)$/i.test(f)) throw new Error('Elige un .mrpack o un .zip'); const p = await previewFile(f); return { ...p, exists: (x => x && { id: x.id, name: x.name })(sameName(p.name)) }; }
    const { pv } = await resolve(a && a.text); return brief(pv);
  } catch (x) { x.step = 'leer el modpack'; throw x; }
});

// Instalar desde un enlace: ids de Modrinth → descargas con la cola de siempre (reintentos, mirrors, sha1/sha512).
ipcMain.handle('pack:install', async (e, { text, file, mode }) => {
  if (file) {   // .mrpack / .zip de Nova: el mismo importador de siempre, con la opción de reemplazar o copiar
    const f = String(file); if (!/\.(mrpack|zip)$/i.test(f)) throw new Error('Elige un .mrpack o un .zip');
    const r = await R.importInstanceFile(f), dup = li().find(i => i.id !== r.ins.id && String(i.name).trim().toLowerCase() === String(r.ins.name).trim().toLowerCase());
    if (dup && mode === 'copy') { let k = 2; while (sameName(`${r.ins.name} (${k})`)) k++; r.ins = { ...r.ins, name: `${r.ins.name} (${k})`.slice(0, 48) }; wr(insFile, li().map(i => i.id === r.ins.id ? { ...i, name: r.ins.name } : i)); }
    else if (dup && mode === 'replace') {
      if (running.has(dup.id)) throw new Error('Cierra Minecraft antes de reemplazar la instancia');
      try { await autoBackup(dup.id, 'antes de reemplazar el modpack', true); } catch {}
      wr(insFile, li().filter(i => i.id !== dup.id)); await rmAsync(iDir(dup.id)); await rmAsync(path.join(root, 'backups', dup.id)).catch(() => {});
    }
    return r;
  }
  let step = 'leer el enlace', man = null, pv = null, ins = null, old = null;
  try {
    ({ man, pv } = await resolve(text));
    old = sameName(man.n);
    if (old && mode !== 'replace' && mode !== 'copy') throw new Error('Ya existe una instancia con ese nombre');
    if (old && mode === 'replace' && running.has(old.id)) throw new Error('Cierra Minecraft antes de reemplazar la instancia');
    let name = man.n; if (old && mode === 'copy') { let k = 2; while (sameName(`${man.n} (${k})`)) k++; name = `${man.n} (${k})`.slice(0, 48); }
    step = 'preparar el cargador';
    let lv = man.lv; if (man.ld !== 'Vanilla') lv = await loaderPick(man.ld, man.mc, man.lv);
    ins = addInst({ name, mc: man.mc, ld: man.ld, loaderVersion: man.ld === 'Vanilla' ? undefined : lv, type: 'release', custom: true, ...(man.ram ? { ram: man.ram } : {}), ...(man.ic ? { icon: man.ic } : {}), ...(man.co ? { color: man.co } : {}) });
    const dir = iDir(ins.id), failed = []; let n = 0;
    step = 'descargar los archivos'; send('status', 'Descargando modpack…');
    await pool(pv.list, 8, async x => {
      const sub = SUB[x.t], safe = path.basename(x.file), dest = path.join(dir, sub, safe);
      try {
        if (!OK_EXT[x.t].test(safe) || path.resolve(dest).indexOf(path.resolve(dir, sub) + path.sep) !== 0) throw new Error('nombre de archivo no válido');
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await dl(x.url, dest, { sha1: x.sha1, sha512: x.sha512 || undefined, pooled: true });
      } catch (err) { if (err && err.cancel) throw err; failed.push(safe); }
      prog('Modpack', ++n, pv.list.length);
    }, x => x.size);
    if (failed.length) logErr('modpack-enlace', new Error(failed.length + ' archivos no se pudieron descargar'), { 'Qué se intentaba': 'Instalar el modpack ' + man.n, 'Archivos que fallaron': failed.slice(0, 60).join(', ') });
    if (old && mode === 'replace') {   // la instancia anterior se borra al final y solo si la nueva se instaló; antes se copian sus mundos
      try { await autoBackup(old.id, 'antes de reemplazar el modpack', true); } catch {}
      wr(insFile, li().filter(i => i.id !== old.id)); await rmAsync(iDir(old.id)); await rmAsync(path.join(root, 'backups', old.id)).catch(() => {});
    }
    const faltan = failed.length + pv.missing.length;
    send('status', faltan ? 'Modpack instalado (faltan ' + faltan + ' archivos)' : 'Modpack instalado: ' + man.n);
    try { R.novaAviso('download', 'Descarga terminada · ' + man.n); } catch {}
    try { notify('Modpack instalado', man.n + (faltan ? ' (faltan ' + faltan + ' archivos)' : '')); } catch {}
    return { ins: li().find(i => i.id === ins.id) || ins, failed: [...failed, ...pv.missing.map(m => m.project)] };
  } catch (x) {
    if (ins && !(x && x.cancel) && li().some(i => i.id === ins.id)) { wr(insFile, li().filter(i => i.id !== ins.id)); await rmAsync(iDir(ins.id)).catch(() => {}); }   // no se deja una instancia a medias
    if (x && x.cancel) throw x; x.step = x.step || step;
    throw withLog(x, logErr('modpack-enlace', x, { 'Qué se intentaba': 'Instalar un modpack desde un enlace', Modpack: man && man.n, Minecraft: man && man.mc, Cargador: man && man.ld }));
  } finally { send('progress', null); }
});

Object.assign(R, { packOpen });
