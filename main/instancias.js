// =====================================================================================
// Nova Launcher · main/instancias.js
// Instancias: opciones, duplicar, copias de seguridad, exportar/importar e importar de otros launchers
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { app, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { MAN, addInst, fsp, insFile, li, load, rd, rmAsync, root, running, send, wr } = R; // base
const { get, post } = R; // red
const { dl, hashOf, unzip, unzipSafe, zipItems } = R; // descargas
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const installMrpackDir = (...a) => R.installMrpackDir(...a); // mods
const loaderList = (...a) => R.loaderList(...a); // cargadores
const loaderPick = (...a) => R.loaderPick(...a); // cargadores
const notify = (...a) => R.notify(...a); // sistema

ipcMain.handle('inst:list', () => li().filter(i => !i.hidden));
ipcMain.handle('inst:save', async (e, o) => { const cc = !!(o && o.copyControls); if (o) { o = { ...o }; delete o.copyControls; } const i = addInst(o); if (cc) { try { copyControls(i); } catch {} } try { await ensureFabricApi(i); } catch {} return li().find(x => x.id === i.id) || i; });
ipcMain.handle('inst:del', async (e, id) => { id = String(id); if (running.has(id)) throw new Error('Cierra Minecraft antes de borrar la instancia'); wr(insFile, li().filter(i => i.id !== id)); await rmAsync(path.join(root, 'instances', id)); await rmAsync(path.join(root, 'backups', id)); });
const iDir = id => path.join(root, 'instances', String(id));
const getIns = id => { const i = li().find(x => x.id === String(id)); if (!i) throw new Error('Instancia no encontrada'); return i; };
const safeName = (n, d = 'instancia') => String(n || d).replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 60) || d;
// ---- Copiar los controles de la última instancia jugada (casilla «Usar mis controles» al crear una instancia) ----
// Solo se copian las teclas y unos pocos ajustes personales; nunca vídeo, ni archivos de otros mods (optionsof.txt, sodium…).
const CC_KEY = /^(key_.+|mouseSensitivity|fov|soundCategory_.+|lang|guiScale|autoJump|toggleCrouch|toggleSprint)$/;
const mcMinor = mc => { const m = /^1\.(\d+)/.exec(String(mc)); return m ? +m[1] : (/^\d{2}\.\d/.test(String(mc)) ? 99 : /^\d{2}w/.test(String(mc)) ? (+String(mc).slice(0, 2) >= 18 ? 13 : 12) : 99); };
const optParse = t => { const m = new Map(); for (const ln of String(t).split(/\r?\n/)) { const k = ln.indexOf(':'); if (k > 0) m.set(ln.slice(0, k), ln.slice(k + 1)); } return m; };
function copyControls(ins) {
  const dst = path.join(iDir(ins.id), 'options.txt');
  const from = li().filter(i => i.id !== ins.id && i.lastPlayed && fs.existsSync(path.join(iDir(i.id), 'options.txt'))).sort((a, b) => b.lastPlayed - a.lastPlayed)[0];
  if (!from) return null;
  const src = optParse(fs.readFileSync(path.join(iDir(from.id), 'options.txt'), 'utf8'));
  const sMin = mcMinor(from.mc), dMin = mcMinor(ins.mc), out = new Map();
  // Antes de la 1.13 las teclas se guardan como números y después como «key.keyboard.w»: si no coinciden, no se copian las key_*
  const sNum = [...src].filter(([k, v]) => k.startsWith('key_')).some(([, v]) => /^-?\d+$/.test(v));
  const sameKeys = sNum === (dMin < 13);
  for (const [k, v] of src) {
    if (!CC_KEY.test(k)) continue;
    if (k.startsWith('key_') && !sameKeys) continue;
    if (k === 'fov') { const sOld = +v <= 1.5, dOld = dMin < 14; if (sOld !== dOld) continue; }   // antes de la 1.14 el campo de visión va de 0 a 1
    if (k === 'lang') { if (dMin < 11) { const q = /^([a-z]{2})_([a-z]{2})$/i.exec(v); out.set(k, q ? q[1].toLowerCase() + '_' + q[2].toUpperCase() : v); } else out.set(k, v.toLowerCase()); continue; }
    out.set(k, v);
  }
  if (!out.size) return null;
  // Mezcla con el options.txt de destino si ya existe (sin tocar nada más); si no, se crea solo con esto y la versión de datos de origen, para que el juego convierta bien los valores
  const old = fs.existsSync(dst) ? optParse(fs.readFileSync(dst, 'utf8')) : null;
  if (old) { for (const [k, v] of out) old.set(k, v); }
  const fin = old || new Map([...(src.has('version') && dMin >= 13 ? [['version', src.get('version')]] : []), ...out]);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, [...fin].map(([k, v]) => k + ':' + v).join('\n') + '\n');
  return { from: from.id, n: out.size };
}
// ---- Opciones de cada instancia ----
// Fabric API: casi todos los mods de Fabric la necesitan. Una vez por instancia Fabric se instala la de su versión de Minecraft
// (si el jugador la borra después, no se vuelve a poner). Devuelve true si la instaló.
async function ensureFabricApi(ins) {
  if (!ins || ins.ld !== 'Fabric' || ins.custom || ins.novaPack || ins.fapi) return false;
  const md = path.join(iDir(ins.id), 'mods'), mark = () => wr(insFile, li().map(i => i.id === ins.id ? { ...i, fapi: 1 } : i));
  try { if (fs.readdirSync(md).some(f => /^fabric-api/i.test(f))) { mark(); return false; } } catch {}
  const q = x => encodeURIComponent(JSON.stringify(x));
  const v = await get('https://api.modrinth.com/v2/project/P7dR8mSH/version?game_versions=' + q([ins.mc]) + '&loaders=' + q(['fabric']));
  if (!v.length) { mark(); return false; }   // esa versión de Minecraft no tiene Fabric API
  const f = v[0].files.find(x => x.primary) || v[0].files[0];
  fs.mkdirSync(md, { recursive: true });
  await dl(f.url, path.join(md, path.basename(f.filename)), { sha1: f.hashes && f.hashes.sha1, sha512: f.hashes && f.hashes.sha512 });
  mark(); return true;
}
ipcMain.handle('inst:update', (e, { id, patch }) => {
  getIns(id); const p = {}, q = patch || {};
  if ('name' in q) { const n = String(q.name).trim().slice(0, 40); if (n) p.name = n; }
  if ('icon' in q) p.icon = String(q.icon || '').replace(/[^\w-]/g, '').slice(0, 20);
  if ('color' in q) p.color = /^#[0-9a-f]{6}$/i.test(q.color) ? q.color : '';
  if ('ram' in q) { const r = +q.ram; p.ram = r > 0 ? Math.min(64, Math.round(r)) : 0; }
  if ('javaPath' in q) p.javaPath = String(q.javaPath || '').trim();
  if ('loaderVersion' in q) p.loaderVersion = String(q.loaderVersion || '').trim();
  if ('gpu' in q) p.gpu = q.gpu === 'high' ? 'high' : '';
  if ('jvmPreset' in q) p.jvmPreset = ['rendimiento', 'tirones'].includes(q.jvmPreset) ? q.jvmPreset : '';
  if ('noNova' in q) p.noNova = !!q.noNova;
  if ('bkFreq' in q) p.bkFreq = ['daily', '3d', 'weekly'].includes(q.bkFreq) ? q.bkFreq : '';
  if ('bkMax' in q) p.bkMax = Math.max(1, Math.min(50, Math.round(+q.bkMax) || 5));
  if ('fav' in q) p.fav = !!q.fav;
  if ('note' in q) p.note = String(q.note || '').slice(0, 600);
  if ('tags' in q) p.tags = [...new Set((Array.isArray(q.tags) ? q.tags : String(q.tags || '').split(',')).map(t => String(t).trim().replace(/\s+/g, ' ').slice(0, 24)).filter(Boolean))].slice(0, 8);
  wr(insFile, li().map(i => i.id === String(id) ? { ...i, ...p } : i)); return getIns(id);
});
ipcMain.handle('inst:dup', async (e, id) => {
  const src = getIns(id), nid = Date.now().toString(36), { ...rest } = src;
  send('status', 'Duplicando instancia…');
  try { if (fs.existsSync(iDir(id))) await fs.promises.cp(iDir(id), iDir(nid), { recursive: true, filter: f => path.basename(f) !== '.nova-pack.json' }); else fs.mkdirSync(iDir(nid), { recursive: true }); }
  finally { send('status', ''); }
  const ins = { ...rest, id: nid, name: (src.name + ' (copia)').slice(0, 40), custom: true, playMs: 0, lastPlayed: 0 }; wr(insFile, [...li(), ins]); return ins;
});
ipcMain.handle('inst:open', (e, { id, sub }) => { getIns(id); const d = path.join(iDir(id), ['mods', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots'].includes(sub) ? sub : ''); fs.mkdirSync(d, { recursive: true }); return shell.openPath(d); });
ipcMain.handle('loader:versions', async (e, { ld, mc }) => (await loaderList(String(ld), String(mc))).slice(0, 80));
// ---- Copias de seguridad de los mundos ----
const bkRoot = id => path.join(root, 'backups', String(id));
const bkList = async id => {
  let es = []; try { es = (await fsp.readdir(bkRoot(id))).filter(x => x.endsWith('.zip')); } catch {}
  const out = []; for (const f of es) { try { const st = await fsp.stat(path.join(bkRoot(id), f)), m = /^\d{8}-\d{6}__(.*)\.zip$/.exec(f); out.push({ file: f, date: st.mtimeMs, size: st.size, auto: /__automatica\.zip$/.test(f), reason: m ? m[1].replace(/-/g, ' ') : f }); } catch {} }
  return out.sort((a, b) => b.date - a.date);
};
async function autoBackup(id, reason, force) {
  if (!force && load().autoBackup === false) return null;
  const idir = iDir(id); let has = false; try { has = (await fsp.readdir(path.join(idir, 'saves'))).length > 0; } catch {}
  if (!has) return null;
  const l = await bkList(id); if (!force && l.length && Date.now() - l[0].date < 600000) return null;
  const t = new Date(), z = n => String(n).padStart(2, '0'), st = `${t.getFullYear()}${z(t.getMonth() + 1)}${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}${z(t.getSeconds())}`;
  const slug = String(reason || 'manual').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'manual';
  const f = `${st}__${slug}.zip`; await zipItems(path.join(bkRoot(id), f), idir, ['saves']);
  if (reason === 'automatica') {   // copias programadas: solo se borran las automáticas más antiguas, nunca las manuales
    const mx = Math.max(1, +(li().find(i => i.id === String(id)) || {}).bkMax || 5);
    for (const o of (await bkList(id)).filter(x => x.auto).slice(mx)) await fsp.rm(path.join(bkRoot(id), o.file), { force: true });
    return f;
  }
  const keep = Math.max(1, +load().backupKeep || 8); for (const o of (await bkList(id)).filter(x => !x.auto).slice(keep)) await fsp.rm(path.join(bkRoot(id), o.file), { force: true });
  return f;
}
// Copias programadas: al abrir el launcher y al cerrar el juego, si a una instancia le toca, se copia sin bloquear la interfaz y nunca con esa instancia abierta
const BK_DAYS = { daily: 1, '3d': 3, weekly: 7 };
let bkBusy = false;
async function bkSchedule() {
  if (bkBusy) return; bkBusy = true;
  try {
    for (const ins of li().filter(x => !x.hidden)) {
      const d = BK_DAYS[ins.bkFreq]; if (!d || running.has(ins.id)) continue;
      const last = (await bkList(ins.id)).find(x => x.auto);
      if (last && Date.now() - last.date < d * 86400000 - 3600000) continue;
      // si no hay mundos, no se hace nada (autoBackup devuelve null)
      let f = null; try { f = await autoBackup(ins.id, 'automatica', true); } catch {}
      if (f) send('bk:auto', { id: ins.id, name: ins.name });
      await new Promise(r => setTimeout(r, 300));
    }
  } finally { bkBusy = false; }
}
setTimeout(() => { bkSchedule().catch(() => {}); }, 25000);
const bkFile = (id, f) => { f = path.basename(String(f)); const p = path.join(bkRoot(getIns(id).id), f); if (!f.endsWith('.zip') || !fs.existsSync(p)) throw new Error('Copia no encontrada'); return p; };
ipcMain.handle('bk:list', async (e, id) => { getIns(id); return await bkList(id); });
ipcMain.handle('bk:create', async (e, id) => { getIns(id); send('status', 'Copiando mundos…'); try { return await autoBackup(id, 'manual', true); } finally { send('status', ''); } });
ipcMain.handle('bk:restore', async (e, { id, file }) => {
  const z = bkFile(id, file); if (running.has(String(id))) throw new Error('Cierra Minecraft antes de restaurar');
  send('status', 'Restaurando mundos…');
  try { await autoBackup(id, 'antes de restaurar', true); await rmAsync(path.join(iDir(id), 'saves')); await fsp.mkdir(iDir(id), { recursive: true }); await unzip(z, iDir(id)); }
  finally { send('status', ''); }
  return true;
});
ipcMain.handle('bk:del', async (e, { id, file }) => { await fsp.rm(bkFile(id, file), { force: true }); return true; });
ipcMain.handle('bk:open', (e, id) => { getIns(id); fs.mkdirSync(bkRoot(id), { recursive: true }); return shell.openPath(bkRoot(id)); });
// ---- Exportar e importar instancias ----
const EXC = ['logs', 'crash-reports', 'screenshots', '.fabric', '.mixin.out', '.nova-pack.json', 'nova-instance.json', 'command_history.txt'];
ipcMain.handle('inst:export', async (e, { id, kind, worlds }) => {
  const ins = getIns(id), dir = iDir(id); kind = kind === 'mrpack' ? 'mrpack' : 'zip';
  const r = await dialog.showSaveDialog(S.win, { title: 'Exportar instancia', defaultPath: path.join(app.getPath('downloads'), safeName(ins.name) + '.' + kind), filters: [{ name: kind === 'mrpack' ? 'Modpack de Modrinth' : 'Instancia de Nova Launcher (ZIP)', extensions: [kind] }] });
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
    const stage = path.join(root, 'tmp_export'); await rmAsync(stage); await fsp.mkdir(path.join(stage, 'overrides'), { recursive: true });
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
    } finally { await rmAsync(stage).catch(() => {}); }
  } finally { send('status', ''); }
});
async function importInstanceFile(file) {
  const tmp = path.join(root, 'tmp_import'); await rmAsync(tmp); await fsp.mkdir(tmp, { recursive: true });
  try {
    send('status', 'Importando…'); await unzipSafe(file, tmp);
    let base = tmp; const es = fs.readdirSync(tmp); if (es.length === 1 && fs.statSync(path.join(tmp, es[0])).isDirectory()) base = path.join(tmp, es[0]);
    if (fs.existsSync(path.join(base, 'modrinth.index.json'))) return await installMrpackDir(base);
    const mf = path.join(base, 'nova-instance.json'), m = rd(mf, null);
    if (!m || !/^[\w.+\- ]{1,40}$/.test(String(m.mc || ''))) throw new Error('Formato no reconocido: usa un .mrpack o un .zip exportado desde Nova Launcher');
    const ins = addInst({ name: String(m.name || 'Importada').slice(0, 40), mc: String(m.mc), ld: ['Fabric', 'Forge', 'NeoForge'].includes(m.ld) ? m.ld : 'Vanilla', loaderVersion: m.loaderVersion || undefined, type: m.type === 'snapshot' ? 'snapshot' : 'release', icon: m.icon || undefined, color: m.color || undefined, ram: +m.ram || undefined, custom: true });
    fs.rmSync(mf, { force: true }); await fs.promises.cp(base, iDir(ins.id), { recursive: true });
    send('status', 'Instancia importada: ' + ins.name); return { ins, failed: [] };
  } finally { await rmAsync(tmp).catch(() => {}); send('progress', null); }
}
ipcMain.handle('inst:import', async () => {
  const r = await dialog.showOpenDialog(S.win, { title: 'Importar instancia o modpack', properties: ['openFile'], filters: [{ name: 'Instancia o modpack', extensions: ['zip', 'mrpack'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  return importInstanceFile(r.filePaths[0]);
});
// ===== Cuentas, estadísticas, bandeja y más (0.2.12) =====
const upIns = (id, p) => wr(insFile, li().map(i => i.id === id ? { ...i, ...p } : i));
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


// ---- Estadísticas de juego: stats.json guarda cada partida (instancia, versión, cargador, servidor, inicio y duración)
// Las partidas anteriores a esta función solo tienen el tiempo total de cada instancia: se importa como «previo».
const statsFile = path.join(root, 'stats.json');
function statsLoad() {
  const d = rd(statsFile, null);
  if (d && Array.isArray(d.sessions)) return d;
  const o = { v: 1, sessions: [], before: li().filter(i => i.playMs > 0).map(i => ({ id: i.id, name: i.name, mc: i.mc, ld: i.ld || 'Vanilla', ms: i.playMs })) };
  try { wr(statsFile, o); } catch {}
  return o;
}
function statsStart(ins, server) {
  const d = statsLoad(), key = Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  d.sessions.push({ key, id: ins.id, name: ins.name, mc: ins.mc, ld: ins.ld || 'Vanilla', server: server && server.host ? String(server.name || server.host) : '', start: Date.now(), ms: 0 });
  if (d.sessions.length > 5000) d.sessions.splice(0, d.sessions.length - 5000);
  try { wr(statsFile, d); } catch {}
  return key;
}
function statsEnd(key, ms) {
  if (!key) return;
  const d = statsLoad(), s = d.sessions.find(x => x.key === key);
  if (s) { s.ms = Math.max(0, Math.round(ms)); try { wr(statsFile, d); } catch {} }
}
ipcMain.handle('stats:get', async () => {
  const d = statsLoad();
  const shots = (await Promise.all(li().map(async i => { try { return (await fs.promises.readdir(path.join(iDir(i.id), 'screenshots'))).filter(f => /\.(png|jpe?g)$/i.test(f)).length; } catch { return 0; } }))).reduce((a, b) => a + b, 0);
  return { sessions: d.sessions.map(({ key, ...r }) => r), before: d.before || [], shots };
});

// Lo que usan otros módulos
Object.assign(R, { bkSchedule, statsStart, statsEnd, autoBackup, bkList, ensureFabricApi, getIns, iDir, importInstanceFile, safeName, upIns });
