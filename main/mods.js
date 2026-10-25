// =====================================================================================
// Nova Launcher · main/mods.js
// Mods: gestor de la instancia, modpacks, shaders, revisión antes de jugar y arrastrar y soltar
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { dialog, ipcMain } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { S, R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { addInst, fsp, load, mvSync, rd, rmAsync, root, send, wr } = R; // base
const { dl, hashOf, pool, prog, unzipSafe, win32 } = R; // descargas
const { logErr, withLog } = R; // errores
const { UA, get, post } = R; // red
const { autoBackup, getIns, iDir, importInstanceFile, safeName } = R; // instancias
const { importWorldZips } = R; // mundos
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const notify = (...a) => R.notify(...a); // sistema

ipcMain.handle('mod:install', async (e, { url, name, inst, dir, sha1, sha512 }) => {
  const sub = ['mods', 'shaderpacks', 'resourcepacks'].includes(dir) ? dir : 'mods';
  try {
    const d = path.join(root, inst ? path.join('instances', String(inst)) : '', sub); fs.mkdirSync(d, { recursive: true });
    await dl(url, path.join(d, path.basename(name)), { sha1, sha512 }); return true;
  } catch (x) { if (x && x.cancel) throw x; x.step = 'descargar el archivo'; throw withLog(x, logErr('mod', x, { 'Qué se intentaba': 'Instalar ' + name + ' en ' + sub, Dirección: url, Instancia: inst || '(carpeta general)' })); }
});
// Modpacks de Modrinth (.mrpack)
ipcMain.handle('pack:versions', async (e, pid) => (await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version`)).map(v => ({ id: v.id, name: v.name, num: v.version_number, mc: v.game_versions, ld: v.loaders, date: v.date_published, type: v.version_type })));
ipcMain.handle('pack', async (e, a) => {
  const { id: pid, vid } = typeof a === 'string' ? { id: a } : a;
  let step = 'buscar la versión del modpack', f = null, v = null;
  const tmp = path.join(root, 'tmp_pack');
  try {
    v = vid ? await get(`https://api.modrinth.com/v2/version/${encodeURIComponent(vid)}`) : (await get(`https://api.modrinth.com/v2/project/${encodeURIComponent(pid)}/version`))[0];
    if (!v) throw new Error('Este modpack no tiene versiones');
    f = (v.files || []).find(x => x.primary) || (v.files || [])[0]; if (!f) throw new Error('La versión no tiene ningún archivo para descargar');
    step = 'preparar la carpeta temporal'; await rmAsync(tmp); await fsp.mkdir(tmp, { recursive: true });
    const z = path.join(tmp, 'p.zip'); send('status', 'Descargando modpack…'); step = 'descargar el modpack (' + f.filename + ')';
    await dl(f.url, z, { sha1: f.hashes && f.hashes.sha1, sha512: f.hashes && f.hashes.sha512 });
    step = 'descomprimir el modpack'; await unzipSafe(z, tmp); fs.rmSync(z, { force: true });
    step = 'instalar el modpack'; return await installMrpackDir(tmp);
  } catch (x) {
    if (x && x.cancel) throw x; x.step = x.step || step;
    throw withLog(x, logErr('modpack', x, { 'Qué se intentaba': 'Instalar el modpack ' + (v && (v.name || v.version_number) || pid), Proyecto: pid, Versión: vid || '(la más nueva)', Archivo: f && f.filename, Dirección: f && f.url }));
  } finally { await rmAsync(tmp).catch(() => {}); send('progress', null); }
});
async function installMrpackDir(tmp) {
  const ix = rd(path.join(tmp, 'modrinth.index.json'), null); if (!ix) throw new Error('Modpack no válido');
  const d = ix.dependencies || {};
  if (d['quilt-loader']) throw new Error('Los modpacks de Quilt no están soportados');
  const ld = d['fabric-loader'] ? 'Fabric' : d.neoforge ? 'NeoForge' : d.forge ? 'Forge' : 'Vanilla';
  const ins = addInst({ name: ix.name || 'Modpack', mc: d.minecraft, ld, loaderVersion: d['fabric-loader'] || d.neoforge || d.forge || undefined, type: 'release', custom: true });
  const dir = path.join(root, 'instances', ins.id), list = (ix.files || []).filter(fl => !(fl.env && fl.env.client === 'unsupported')), failed = [], why = [];
  fs.mkdirSync(dir, { recursive: true }); let n = 0;
  await pool(list, 8, async fl => {
    const dest = path.resolve(dir, fl.path);
    try { if (!dest.startsWith(dir + path.sep)) throw new Error('ruta'); await dl(fl.downloads, dest, { sha1: fl.hashes && fl.hashes.sha1, sha512: fl.hashes && fl.hashes.sha512, pooled: true }); }
    catch (x) { failed.push(path.basename(String(fl.path))); why.push(`${fl.path} ← ${[].concat(fl.downloads || []).join(' | ')} → ${x && x.message}`); }
    prog('Modpack', ++n, list.length);
  }, fl => fl.fileSize);
  if (why.length) logErr('modpack-archivos', new Error(why.length + ' archivos no se pudieron descargar'), { 'Qué se intentaba': 'Instalar el modpack ' + (ix.name || ''), 'Archivos que fallaron': why.slice(0, 60).join('\n  ') });
  for (const o of ['overrides', 'client-overrides']) { const ov = path.join(tmp, o); if (fs.existsSync(ov)) await fsp.cp(ov, dir, { recursive: true }); }
  send('status', failed.length ? 'Modpack instalado (faltan ' + failed.length + ' archivos)' : 'Modpack instalado: ' + (ix.name || '')); notify('Modpack instalado', String(ix.name || 'Modpack') + (failed.length ? ' (faltan ' + failed.length + ' archivos)' : ' ya está listo'));
  return { ins, failed };
}
// ---- Gestor de mods de cada instancia ----
const modsDir = id => path.join(iDir(getIns(id).id), 'mods');
const modFile = (id, f) => { f = path.basename(String(f)); if (!/\.jar(\.disabled)?$/i.test(f)) throw new Error('Archivo no válido'); return path.join(modsDir(id), f); };
const hcache = new Map();
async function listMods(id) {
  const d = modsDir(id); let es = []; try { es = await fs.promises.readdir(d); } catch { return []; }
  const out = [];
  for (const f of es) {
    const m = /\.jar(\.disabled)?$/i.exec(f); if (!m) continue;
    const p = path.join(d, f); let st; try { st = await fs.promises.stat(p); } catch { continue; } if (!st.isFile()) continue;
    const k = p + '|' + st.size + '|' + st.mtimeMs; let h = hcache.get(k);
    if (!h) { h = hashOf(await fs.promises.readFile(p), 'sha1'); hcache.set(k, h); }
    out.push({ file: f, enabled: !m[1], size: st.size, sha1: h, mt: st.mtimeMs });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}
ipcMain.handle('mods:list', async (e, id) => (await listMods(id)).map(({ mt, ...m }) => m));
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
// Qué proyectos de Modrinth (y qué archivos) ya hay en una instancia, para marcar «ya instalado» en el catálogo
const pcache = new Map();
ipcMain.handle('mods:projects', async (e, { id, dir }) => {
  dir = ['shaderpacks', 'resourcepacks'].includes(dir) ? dir : 'mods';
  let L;
  if (dir === 'mods') L = await listMods(id);
  else {
    const d = path.join(iDir(getIns(id).id), dir); L = [];
    let es = []; try { es = await fs.promises.readdir(d); } catch {}
    for (const f of es) {
      if (!/\.zip$/i.test(f)) continue; const p = path.join(d, f); let st; try { st = await fs.promises.stat(p); } catch { continue; } if (!st.isFile() || st.size > 400 * 1024 * 1024) continue;
      const k = p + '|' + st.size + '|' + st.mtimeMs; let h = hcache.get(k);
      if (!h) { h = hashOf(await fs.promises.readFile(p), 'sha1'); hcache.set(k, h); }
      L.push({ file: f, sha1: h });
    }
  }
  const need = L.map(m => m.sha1).filter(h => !pcache.has(h));
  for (let i = 0; i < need.length; i += 400) {
    const part = need.slice(i, i + 400);
    try { const cur = await post('https://api.modrinth.com/v2/version_files', { hashes: part, algorithm: 'sha1' }); for (const h of part) pcache.set(h, cur[h] ? cur[h].project_id : ''); } catch {}
  }
  return { ids: [...new Set(L.map(m => pcache.get(m.sha1)).filter(Boolean))], files: L.map(m => m.file.toLowerCase().replace(/\.disabled$/, '')) };
});
ipcMain.handle('mods:toggle', (e, { id, file }) => {
  const p = modFile(id, file), n = /\.disabled$/i.test(p) ? p.replace(/\.disabled$/i, '') : p + '.disabled';
  if (fs.existsSync(n)) throw new Error('Ya existe un archivo con ese nombre'); mvSync(p, n); return path.basename(n);
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
  const d = modsDir(id); const r = await dialog.showOpenDialog(S.win, { title: 'Añadir mods', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Mods (.jar)', extensions: ['jar'] }] });
  if (r.canceled) return 0; fs.mkdirSync(d, { recursive: true }); for (const f of r.filePaths) fs.copyFileSync(f, path.join(d, path.basename(f))); return r.filePaths.length;
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
// ---- Revisión de mods antes de jugar ----
// Consulta Modrinth por la huella de cada mod activo y avisa de: mod de otro cargador, de otra versión de Minecraft,
// mods incompatibles entre sí y dependencias obligatorias que faltan. Los resultados se guardan por huella.
const MCK_TTL = 7 * 864e5, MCK_NEG = 864e5, MCK_LD = ['fabric', 'forge', 'neoforge', 'quilt'];
let mck = null, mckT = 0;
const mckFile = () => path.join(root, 'cache', 'modcheck.json');
async function mckLoad() {
  if (mck) return mck;
  mck = rd(mckFile(), null);
  if (!mck || mck.v !== 1 || !mck.h || !mck.p) mck = { v: 1, h: {}, p: {} };
  return mck;
}
function mckSave() {
  clearTimeout(mckT);
  mckT = setTimeout(async () => {
    try {
      const now = Date.now();
      for (const k of Object.keys(mck.h)) if (now - mck.h[k].t > 30 * 864e5) delete mck.h[k];
      for (const k of Object.keys(mck.p)) if (now - mck.p[k].t > 30 * 864e5) delete mck.p[k];
      wr(mckFile(), mck);
    } catch {}
  }, 400);
}
const mckJson = async (u, body) => {
  const r = await fetch(u, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(9000), headers: { 'User-Agent': UA(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
};
const mckMc = g => { const r = g.filter(x => /^\d+\.\d+(\.\d+)?$/.test(x)), L = r.length ? r : g; return L[L.length - 1]; };
const mckLd = n => ({ fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }[n] || n);
ipcMain.handle('mods:precheck', async (e, { id }) => {
  const none = (why, extra) => ({ skipped: why, problems: [], missing: [], ...extra });
  if (load().modCheck === false) return none('off');
  const ins = getIns(id), ld = String(ins.ld || '').toLowerCase();
  if (!['fabric', 'forge', 'neoforge'].includes(ld)) return none('vanilla');
  const files = (await listMods(ins.id)).filter(m => m.enabled);
  if (!files.length) return none('nomods');
  send('status', 'Revisando los mods…');
  const C = await mckLoad(), now = Date.now(), fresh = en => en && now - en.t < (en.d ? MCK_TTL : MCK_NEG);
  const need = [...new Set(files.map(f => f.sha1))].filter(h => !fresh(C.h[h]));
  let offline = false;
  if (need.length) {
    try {
      const r = await mckJson('https://api.modrinth.com/v2/version_files', { hashes: need, algorithm: 'sha1' });
      for (const h of need) { const v = r && r[h]; C.h[h] = { t: now, d: v ? { p: v.project_id, g: v.game_versions || [], l: v.loaders || [], dp: (v.dependencies || []).filter(x => x && x.project_id && (x.dependency_type === 'required' || x.dependency_type === 'incompatible')).map(x => [x.project_id, x.dependency_type]) } : null }; }
      mckSave();
    } catch { offline = true; }
  }
  const known = [];
  for (const f of files) { const en = C.h[f.sha1]; if (en && en.d) known.push({ ...f, e: en.d }); }
  if (!known.length) return none(offline ? 'offline' : 'unknown', { offline, checked: 0, unknown: files.length });
  // Nombres de los proyectos (también los de las dependencias que faltan)
  const byP = new Map(); for (const f of known) if (!byP.has(f.e.p)) byP.set(f.e.p, f);
  const pids = new Set(byP.keys()); for (const f of known) for (const [p] of f.e.dp) pids.add(p);
  const needP = [...pids].filter(p => !C.p[p] || now - C.p[p].t > MCK_TTL);
  if (needP.length && !offline) {
    for (let i = 0; i < needP.length; i += 80) {
      try { for (const p of await mckJson('https://api.modrinth.com/v2/projects?ids=' + encodeURIComponent(JSON.stringify(needP.slice(i, i + 80))))) C.p[p.id] = { t: now, n: p.title || '', s: p.slug || '' }; mckSave(); } catch { offline = true; break; }
    }
  }
  const title = p => (C.p[p] && C.p[p].n) || '', nm = f => title(f.e.p) || f.file.replace(/\.jar$/i, '');
  const problems = [], bad = new Set(), pairs = new Set();
  for (const f of known) {
    const mods = f.e.l.filter(x => MCK_LD.includes(x));
    if (mods.length && !mods.includes(ld)) { problems.push({ t: 'loader', file: f.file, name: nm(f), has: mods.map(mckLd).join(' / '), ld: mckLd(ld) }); bad.add(f.file); continue; }
    if (f.e.g.length && !f.e.g.includes(ins.mc)) { problems.push({ t: 'mc', file: f.file, name: nm(f), mc: mckMc(f.e.g), now: ins.mc }); bad.add(f.file); continue; }
  }
  for (const f of known) for (const [p, ty] of f.e.dp) {
    if (ty !== 'incompatible' || !byP.has(p)) continue;
    const o = byP.get(p); if (o.file === f.file || bad.has(f.file) || bad.has(o.file)) continue;
    const key = [f.file, o.file].sort().join('|'); if (pairs.has(key)) continue; pairs.add(key);
    const [off, keep] = f.mt >= o.mt ? [f, o] : [o, f]; // se apaga el último que se añadió
    problems.push({ t: 'inc', file: off.file, name: nm(off), other: nm(keep) }); bad.add(off.file);
  }
  const unk = files.filter(f => !C.h[f.sha1] || !C.h[f.sha1].d).map(f => f.file.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const miss = new Map();
  for (const f of known) {
    if (bad.has(f.file)) continue;
    for (const [p, ty] of f.e.dp) {
      if (ty !== 'required' || byP.has(p)) continue;
      const slug = ((C.p[p] && C.p[p].s) || '').replace(/[^a-z0-9]/g, ''); if (slug && unk.some(u => u.includes(slug))) continue; // lo trae un jar que Modrinth no conoce
      if (!miss.has(p)) miss.set(p, { pid: p, name: title(p) || '', by: [] }); const m = miss.get(p); if (!m.by.includes(nm(f))) m.by.push(nm(f));
    }
  }
  return { problems, missing: [...miss.values()], offline, checked: known.length, unknown: files.length - known.length };
});
// ---- Arrastrar y soltar ----
const zipList = z => new Promise((res, rej) => execFile(win32 ? 'tar' : 'unzip', win32 ? ['-tf', z] : ['-Z1', z], { maxBuffer: 1e8 }, (er, out) => er ? rej(er) : res(String(out).split(/\r?\n/).filter(Boolean))));
async function dropKind(f) {
  const ext = path.extname(f).toLowerCase();
  if (ext === '.jar') return 'mod';
  if (ext === '.mrpack') return 'modpack';
  if (ext !== '.zip') return 'unknown';
  let L = []; try { L = (await zipList(f)).map(x => x.replace(/\\/g, '/')); } catch { return 'unknown'; }
  const has = re => L.some(x => re.test(x));
  if (has(/^([^/]+\/)?modrinth\.index\.json$/)) return 'modpack';
  if (has(/^([^/]+\/)?nova-instance\.json$/)) return 'instance';
  if (has(/^([^/]+\/){0,2}level\.dat$/)) return 'world';
  if (has(/^([^/]+\/)?pack\.mcmeta$/)) return 'resource';
  if (has(/^([^/]+\/)?shaders\//)) return 'shader';
  if (has(/^([^/]+\/)?assets\//)) return 'resource';
  return 'unknown';
}
ipcMain.handle('drop:inspect', async (e, paths) => {
  const out = [];
  for (const f of (Array.isArray(paths) ? paths : []).slice(0, 20)) { try { const st = fs.statSync(String(f)); if (st.isFile()) out.push({ path: String(f), name: path.basename(String(f)), size: st.size, kind: await dropKind(String(f)) }); } catch {} }
  return out;
});
ipcMain.handle('drop:install', async (e, { path: f, kind, inst }) => {
  f = String(f || ''); if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw new Error('Archivo no encontrado');
  const ext = path.extname(f).toLowerCase(), place = { mod: ['mods', '.jar'], shader: ['shaderpacks', '.zip'], resource: ['resourcepacks', '.zip'] }[kind];
  if (place) {
    if (ext !== place[1]) throw new Error('Este tipo necesita un archivo ' + place[1]);
    const ins = getIns(inst), d = path.join(iDir(ins.id), place[0]); fs.mkdirSync(d, { recursive: true });
    if (kind === 'mod') { try { await autoBackup(ins.id, 'antes de añadir un mod'); } catch {} }
    const base = safeName(path.basename(f), 'archivo'); let nn = base, k = 2; while (fs.existsSync(path.join(d, nn))) nn = base.replace(/(\.[^.]*)?$/, ' (' + k++ + ')$1');
    await fs.promises.copyFile(f, path.join(d, nn)); return { kind, name: nn, inst: ins.name };
  }
  if (kind === 'world') { const ins = getIns(inst), r = await importWorldZips([f], ins.id); return { kind, name: r.names.join(', '), inst: ins.name }; }
  if (kind === 'modpack' || kind === 'instance') { const r = await importInstanceFile(f); return { kind, name: r.ins.name, failed: r.failed || [] }; }
  throw new Error('Tipo no reconocido');
});


// Lo que usan otros módulos
Object.assign(R, { installMrpackDir });
