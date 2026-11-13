// =====================================================================================
// Nova Launcher · main/pack-core.js
// Lógica pura (sin Electron ni red) de «Compartir modpack»: manifiesto, enlaces, validación y vista previa.
// Un enlace lleva SOLO datos: nombre, versión de Minecraft, cargador, RAM y una lista de archivos de Modrinth
// (tipo, id de proyecto, id de versión y sha1). Nada de lo que viene en él se ejecuta ni se usa como ruta:
// al instalar, los nombres de archivo y las direcciones salen de Modrinth, no del enlace.
// =====================================================================================
const zlib = require('zlib');

const MAX_ENC = 200000;        // caracteres del enlace/código
const MAX_RAW = 400000;        // bytes del manifiesto ya descomprimido (frena las «bombas» de compresión)
const MAX_FILES = 800;         // archivos por modpack
const LOADERS = ['Vanilla', 'Fabric', 'Forge', 'NeoForge'];
const TYPES = { m: 'mods', r: 'resourcepacks', s: 'shaderpacks' };   // tipo → carpeta de la instancia
const RE = {
  b64: /^[A-Za-z0-9_-]+$/,
  id: /^[A-Za-z0-9]{8}$/,       // id de proyecto / versión de Modrinth
  sha1: /^[0-9a-f]{40}$/,
  mc: /^[0-9A-Za-z][\w.+-]{0,29}$/,
  lv: /^[\w.+-]{1,40}$/,
  icon: /^[\w-]{0,20}$/,
  color: /^#[0-9a-fA-F]{6}$/,
};

const bad = m => { throw new Error(m); };
const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>"\\/:*?|]/g, '').replace(/\s+/g, ' ').trim();

/** Comprueba y reconstruye un manifiesto: devuelve un objeto NUEVO solo con campos conocidos y válidos, o lanza un Error. */
function validate(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) bad('El modpack no tiene el formato correcto');
  if (m.v !== 1) bad('Este enlace es de una versión de Nova Launcher más nueva: actualiza el launcher');
  const n = clean(m.n).slice(0, 40); if (!n) bad('Al modpack le falta el nombre');
  const mc = String(m.mc || ''); if (!RE.mc.test(mc)) bad('Versión de Minecraft no válida');
  const ld = String(m.ld || 'Vanilla'); if (!LOADERS.includes(ld)) bad('Cargador no válido');
  const lv = m.lv == null || m.lv === '' ? '' : String(m.lv); if (lv && !RE.lv.test(lv)) bad('Versión del cargador no válida');
  if (ld !== 'Vanilla' && !lv) bad('Falta la versión del cargador');
  const ram = m.ram == null ? 0 : m.ram; if (!Number.isInteger(ram) || ram < 0 || ram > 64) bad('RAM no válida');
  const ic = m.ic == null ? '' : String(m.ic); if (!RE.icon.test(ic)) bad('Icono no válido');
  const co = m.co == null || m.co === '' ? '' : String(m.co); if (co && !RE.color.test(co)) bad('Color no válido');
  if (!Array.isArray(m.f)) bad('Faltan los archivos del modpack');
  if (m.f.length > MAX_FILES) bad('El modpack tiene demasiados archivos (máximo ' + MAX_FILES + ')');
  const seen = new Set(), f = [];
  for (const e of m.f) {
    if (!Array.isArray(e) || e.length !== 4) bad('Un archivo del modpack no es válido');
    const [t, p, v, h] = e;
    if (!Object.prototype.hasOwnProperty.call(TYPES, t)) bad('Tipo de archivo no válido');
    if (typeof p !== 'string' || !RE.id.test(p) || typeof v !== 'string' || !RE.id.test(v)) bad('Un identificador de Modrinth no es válido');
    if (typeof h !== 'string' || !RE.sha1.test(h)) bad('Una huella (sha1) no es válida');
    if (seen.has(h)) continue; seen.add(h);
    f.push([t, p, v, h]);
  }
  return { v: 1, n, mc, ld, lv, ram, ic, co, f };
}

/** Manifiesto → texto base64url (deflate crudo). */
function encode(man) {
  const m = validate(man);
  const o = { v: 1, n: m.n, mc: m.mc, ld: m.ld, f: m.f };
  if (m.lv) o.lv = m.lv; if (m.ram) o.ram = m.ram; if (m.ic) o.ic = m.ic; if (m.co) o.co = m.co;
  const out = zlib.deflateRawSync(Buffer.from(JSON.stringify(o), 'utf8'), { level: 9 }).toString('base64url');
  if (out.length > MAX_ENC) bad('El modpack es demasiado grande para un enlace');
  return out;
}

/** Texto base64url → manifiesto válido. Rechaza lo demasiado grande, lo mal formado y lo manipulado. */
function decode(data) {
  data = String(data == null ? '' : data).replace(/\s+/g, '');
  if (!data) bad('El enlace está vacío');
  if (data.length > MAX_ENC) bad('El enlace es demasiado grande');
  if (!RE.b64.test(data)) bad('El enlace no es válido');
  let raw;
  try { raw = zlib.inflateRawSync(Buffer.from(data, 'base64url'), { maxOutputLength: MAX_RAW }); }
  catch (e) { bad(/maxOutputLength|larger/i.test(String(e && e.message)) ? 'El enlace es demasiado grande' : 'El enlace está dañado o incompleto'); }
  let m; try { m = JSON.parse(raw.toString('utf8')); } catch { bad('El enlace está dañado'); }
  return validate(m);
}

/** Lo que se puede pegar: código suelto, nova://pack?d=… o https://…/pack#… → manifiesto válido. */
function fromLink(text) {
  const s = String(text == null ? '' : text).trim();
  if (!s) bad('Pega un enlace o un código');
  if (s.length > MAX_ENC + 400) bad('El enlace es demasiado grande');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) return decode(s);
  let u; try { u = new URL(s.replace(/\s+/g, '')); } catch { bad('El enlace no es válido'); }
  if (u.protocol === 'nova:') {
    if (u.hostname !== 'pack') bad('Este enlace de Nova no es de un modpack');
    return decode(u.searchParams.get('d'));
  }
  if (u.protocol === 'https:') {
    if (!/\/pack\/?$/.test(u.pathname)) bad('Este enlace no es de un modpack de Nova');
    return decode(u.hash.replace(/^#/, ''));
  }
  return bad('Solo se aceptan enlaces nova:// o https://');
}

/** Los dos formatos de enlace. web = dirección base de la web de Nova (con o sin barra final). */
function links(man, web) {
  const d = encode(man), base = String(web || '').replace(/\/+$/, '');
  return { app: 'nova://pack?d=' + d, web: base + '/pack#' + d, length: d.length };
}

/**
 * Arma el manifiesto desde lo que hay en la instancia.
 * items: [{ t: 'm'|'r'|'s', file, sha1, found: { project_id, id } | null }] (found = lo que Modrinth reconoce por el sha1).
 * Devuelve { man, left } donde left son los archivos que se quedan fuera (no están en Modrinth), con su carpeta.
 */
function build(info, items) {
  const f = [], left = [];
  for (const it of items) {
    if (it.found && it.found.project_id && it.found.id) f.push([it.t, it.found.project_id, it.found.id, it.sha1]);
    else left.push({ t: it.t, file: it.file });
  }
  const man = validate({ v: 1, n: info.name, mc: info.mc, ld: info.ld || 'Vanilla', lv: info.loaderVersion || '', ram: info.ram || 0, ic: info.icon || '', co: info.color || '', f });
  return { man, left };
}

/**
 * Vista previa: cruza el manifiesto con las versiones que devuelve Modrinth (objetos de /v2/versions).
 * Cuenta por tipo, suma el tamaño y lista lo que falta (versión retirada o archivo que ya no coincide con el sha1).
 * Devuelve también `list` con lo que se descargaría: { t, file, url, size, sha1, sha512 }.
 */
function preview(man, versions) {
  const byId = new Map((versions || []).filter(v => v && typeof v.id === 'string').map(v => [v.id, v]));
  const n = { m: 0, r: 0, s: 0 }, missing = [], list = []; let size = 0;
  for (const [t, p, vid, h] of man.f) {
    const v = byId.get(vid), fl = v && v.project_id === p && Array.isArray(v.files) ? v.files.find(x => x && x.hashes && x.hashes.sha1 === h) : null;
    if (!fl || typeof fl.url !== 'string' || typeof fl.filename !== 'string') { missing.push({ t, project: p, version: vid }); continue; }
    n[t]++; size += +fl.size || 0;
    list.push({ t, file: fl.filename, url: fl.url, size: +fl.size || 0, sha1: h, sha512: fl.hashes.sha512 || '' });
  }
  return { name: man.n, mc: man.mc, ld: man.ld, lv: man.lv, ram: man.ram, mods: n.m, resourcepacks: n.r, shaders: n.s, total: man.f.length, size, missing, list };
}

module.exports = { MAX_ENC, MAX_RAW, MAX_FILES, validate, encode, decode, fromLink, links, build, preview };
