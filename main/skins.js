// =====================================================================================
// Nova Launcher · main/skins.js
// Skins: biblioteca, cambio de skin y capa, skin local en vivo para el mod
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { Auth } = require('msmc');
const { ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { cfgFile, load, rd, wr } = R; // base
const { accState, saveAcc } = R; // cuentas
// De módulos que se cargan después (funciones: se buscan al llamarlas):
const novaDir = (...a) => R.novaDir(...a); // mod-nova
const novaSkin = (...a) => R.novaSkin(...a); // mod-nova

// ---- Skins (0.2.15-beta.12): biblioteca de skins, cambio de skin y capa en cuentas Microsoft, y skin local en cuentas offline ----
// Las skins guardadas viven en <datos>/nova/skins (PNG + skins.json). En Microsoft se suben a Mojang con la sesión cifrada de la cuenta;
// en offline el launcher pasa la elegida al mod (-Dnova.skin) y solo la ve quien juega (los demás jugadores no).
const skinsDir = () => { const d = path.join(novaDir(), 'skins'); try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; };
const skinsIdx = () => { const l = rd(path.join(skinsDir(), 'skins.json'), []); return Array.isArray(l) ? l.filter(x => x && /^s[\w]{3,20}$/.test(x.id)) : []; };
const skinsPut = l => wr(path.join(skinsDir(), 'skins.json'), l);
const isPng = b => Buffer.isBuffer(b) && b.length > 67 && b.length < 200000 && b.slice(1, 4).toString() === 'PNG';
const pngWH = b => [b.readUInt32BE(16), b.readUInt32BE(20)];
const dataUrl = b => 'data:image/png;base64,' + b.toString('base64');
const skinFile = id => path.join(skinsDir(), id + '.png');
const skinSelGet = accId => { const m = load().skinSel; return m && typeof m === 'object' ? m[accId] || '' : ''; };
const skinSelSet = (accId, id) => { const c = load(), m = { ...(c.skinSel || {}) }; if (id) m[accId] = id; else delete m[accId]; wr(cfgFile, { ...c, skinSel: m }); try { R.novaAccountsWrite && R.novaAccountsWrite(); } catch {} };
// Skin elegida de una cuenta (ruta del PNG o '') y esa misma como data URL (para los avatares del launcher)
const accSkinFile = accId => { const id = skinSelGet(accId); return id && skinsIdx().some(z => z.id === id) && fs.existsSync(skinFile(id)) ? skinFile(id) : ''; };
const accSkinData = accId => { const f = accSkinFile(accId); try { return f ? dataUrl(fs.readFileSync(f)) : ''; } catch { return ''; } };
// Skin local en vivo: el launcher deja la skin elegida en <datos>/nova/skin-local.png y su descripción en skin-local.json;
// el mod las vigila cada segundo, así que el cambio se ve sin reiniciar Minecraft (también en una partida individual y con cuentas de Microsoft).
function skinLocalWrite(act) {
  try {
    const dir = novaDir(), id = skinSelGet(act.id), x = id && skinsIdx().find(z => z.id === id), png = path.join(dir, 'skin-local.png');
    let on = false;
    if (x && fs.existsSync(skinFile(id))) { fs.copyFileSync(skinFile(id), png + '.tmp'); fs.renameSync(png + '.tmp', png); on = true; }
    const j = path.join(dir, 'skin-local.json');
    // Cuenta sin conexión y sin skin elegida: el mod le pone la de Steve (si no, el juego reparte una por azar según el nombre)
    const steve = !on && act.type !== 'microsoft';
    fs.writeFileSync(j + '.tmp', JSON.stringify({ on: on || steve, steve, user: act.name, model: on && x.model === 'slim' ? 'slim' : 'classic', v: Date.now(), id: on ? id : '' })); fs.renameSync(j + '.tmp', j);
  } catch {}
}
// Si la skin se cambió desde el menú del juego (el mod marca «by: mod» en skin-local.json), el launcher adopta esa elección para la cuenta.
function skinSyncFromMod() {
  try {
    const act = accState().act, j = path.join(novaDir(), 'skin-local.json'), o = rd(j, null);
    if (!o || o.by !== 'mod' || o.user !== act.name) return;
    const id = o.on && o.id && skinsIdx().some(x => x.id === o.id) ? String(o.id) : '';
    if (skinSelGet(act.id) !== id) skinSelSet(act.id, id);
    delete o.by; fs.writeFileSync(j + '.tmp', JSON.stringify(o)); fs.renameSync(j + '.tmp', j);
  } catch {}
}
function skinList() {
  const act = accState().act, sel = skinSelGet(act.id);
  const skins = skinsIdx().filter(x => fs.existsSync(skinFile(x.id))).map(x => ({ id: x.id, name: x.name, model: x.model === 'slim' ? 'slim' : 'classic', data: dataUrl(fs.readFileSync(skinFile(x.id))) }));
  return { skins, sel: skins.some(x => x.id === sel) ? sel : '', acc: { type: act.type, name: act.name } };
}
// Token de Minecraft de la cuenta Microsoft activa (se renueva con la sesión cifrada)
async function msBearer() {
  const st = accState(), act = st.act;
  if (act.type !== 'microsoft' || !act.token) throw new Error('Esta función es para cuentas de Microsoft');
  let x;
  try { x = await new Auth('select_account').refresh(act.token); } catch { throw new Error('La sesión de Microsoft de «' + act.name + '» caducó. Vuelve a iniciarla desde la cuenta (barra superior).'); }
  const mc = await x.getMinecraft();
  saveAcc(st.a.map(z => z.id === act.id ? { ...z, token: x.save() } : z), act.id);
  return mc.mcToken;
}
async function mojang(tok, method, url, opt = {}) {
  const r = await fetch('https://api.minecraftservices.com' + url, { method, headers: { Authorization: 'Bearer ' + tok, ...(opt.json ? { 'content-type': 'application/json' } : {}) }, body: opt.json ? JSON.stringify(opt.json) : opt.body, signal: AbortSignal.timeout(20000) });
  if (r.status === 401) throw new Error('La sesión de Microsoft caducó. Vuelve a iniciarla desde la cuenta (barra superior).');
  if (r.status === 429) throw new Error('Mojang limita los cambios de skin. Espera un minuto y vuelve a intentarlo.');
  if (!r.ok) { let m = ''; try { m = (await r.json()).errorMessage || ''; } catch {} throw new Error('Mojang rechazó el cambio (' + r.status + ')' + (m ? ': ' + m.slice(0, 120) : '')); }
  return r;
}
const imgUrl = async u => { u = String(u || '').replace(/^http:\/\//, 'https://'); if (!/^https:\/\/([\w-]+\.)?minecraft\.net\//.test(u)) return ''; try { const r = await fetch(u, { signal: AbortSignal.timeout(10000) }); const b = Buffer.from(await r.arrayBuffer()); return isPng(b) ? dataUrl(b) : ''; } catch { return ''; } };
ipcMain.handle('skin:list', () => { skinSyncFromMod(); return skinList(); });
ipcMain.handle('skin:save', (e, o) => {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(o && o.data || '')); if (!m) throw new Error('Elige un archivo .png');
  const b = Buffer.from(m[1], 'base64'); if (!isPng(b)) throw new Error('Ese archivo no es una imagen PNG válida');
  const [w, h] = pngWH(b); if (w !== 64 || (h !== 64 && h !== 32)) throw new Error('Una skin de Minecraft mide 64×64 píxeles (o 64×32 las antiguas)');
  const l = skinsIdx(); if (l.length >= 60) throw new Error('Has guardado demasiadas skins: borra alguna');
  const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  fs.writeFileSync(skinFile(id), b);
  skinsPut([...l, { id, name: skinName(o.name) || 'Skin', model: o.model === 'slim' ? 'slim' : 'classic' }]);
  return skinList();
});
ipcMain.handle('skin:del', (e, id) => {
  skinsPut(skinsIdx().filter(x => x.id !== id)); try { fs.rmSync(skinFile(String(id).replace(/[^\w]/g, '')), { force: true }); } catch {}
  const c = load(), m = { ...(c.skinSel || {}) }; let ch = false; for (const k of Object.keys(m)) if (m[k] === id) { delete m[k]; ch = true; } if (ch) { wr(cfgFile, { ...c, skinSel: m }); skinLocalWrite(accState().act); }
  return skinList();
});
ipcMain.handle('skin:model', (e, o) => { skinsPut(skinsIdx().map(x => x.id === o.id ? { ...x, model: o.model === 'slim' ? 'slim' : 'classic' } : x)); const act = accState().act; if (skinSelGet(act.id) === o.id) skinLocalWrite(act); return skinList(); });
const skinName = n => String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 30);
ipcMain.handle('skin:rename', (e, o) => {
  const n = skinName(o && o.name); if (!n) throw new Error('Escribe un nombre para la skin');
  if (!skinsIdx().some(x => x.id === o.id)) throw new Error('Skin no encontrada');
  skinsPut(skinsIdx().map(x => x.id === o.id ? { ...x, name: n } : x)); return skinList();
});
// Cambiar el PNG de una skin guardada (mantiene su nombre y su lugar en la lista)
ipcMain.handle('skin:replace', (e, o) => {
  if (!skinsIdx().some(x => x.id === o.id)) throw new Error('Skin no encontrada');
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(o && o.data || '')); if (!m) throw new Error('Elige un archivo .png');
  const b = Buffer.from(m[1], 'base64'); if (!isPng(b)) throw new Error('Ese archivo no es una imagen PNG válida');
  const [w, h] = pngWH(b); if (w !== 64 || (h !== 64 && h !== 32)) throw new Error('Una skin de Minecraft mide 64×64 píxeles (o 64×32 las antiguas)');
  fs.writeFileSync(skinFile(o.id), b);
  const act = accState().act; if (skinSelGet(act.id) === o.id) skinLocalWrite(act);
  return skinList();
});
ipcMain.handle('skin:folder', async () => { const d = skinsDir(); await shell.openPath(d); return d; });
// Usar una skin: en Microsoft se sube a Mojang (cambia para todos); en offline se guarda como skin local del jugador
ipcMain.handle('skin:use', async (e, id) => {
  const x = skinsIdx().find(z => z.id === id); if (!x || !fs.existsSync(skinFile(id))) throw new Error('Skin no encontrada');
  const act = accState().act;
  if (act.type === 'microsoft') {
    const tok = await msBearer(), fd = new FormData();
    fd.append('variant', x.model === 'slim' ? 'slim' : 'classic');
    fd.append('file', new Blob([fs.readFileSync(skinFile(id))], { type: 'image/png' }), 'skin.png');
    await mojang(tok, 'POST', '/minecraft/profile/skins', { body: fd });
  }
  skinSelSet(act.id, id); skinLocalWrite(act);
  return { ...skinList(), mode: act.type === 'microsoft' ? 'microsoft' : 'offline', accs: R.accOut() };
});
ipcMain.handle('skin:unset', () => { const act = accState().act; skinSelSet(act.id, ''); skinLocalWrite(act); return { ...skinList(), accs: R.accOut() }; });
// Skin y capas actuales de la cuenta Microsoft (para la vista previa y la lista de capas)
ipcMain.handle('skin:current', async () => {
  const act = accState().act; if (act.type !== 'microsoft') return { offline: true };
  const tok = await msBearer(), p = await (await mojang(tok, 'GET', '/minecraft/profile')).json();
  const sk = (p.skins || []).find(z => z.state === 'ACTIVE') || (p.skins || [])[0];
  const capes = await Promise.all((p.capes || []).map(async c => ({ id: c.id, alias: c.alias || 'Capa', active: c.state === 'ACTIVE', data: await imgUrl(c.url) })));
  return { name: p.name, skin: sk ? { variant: String(sk.variant || '').toLowerCase() === 'slim' ? 'slim' : 'classic', data: await imgUrl(sk.url) } : null, capes };
});
ipcMain.handle('cape:set', async (e, id) => {
  const tok = await msBearer();
  if (id) await mojang(tok, 'PUT', '/minecraft/profile/capes/active', { json: { capeId: String(id) } });
  else await mojang(tok, 'DELETE', '/minecraft/profile/capes/active');
  return true;
});
// Skin que se pasa al juego: la elegida (en cualquier tipo de cuenta, el mod la pone al jugador local aunque Mojang aún no la haya actualizado),
// o la que descarga novaSkin de la cuenta. Además deja skin-local.png/json al día para el mod.
async function novaSkinFor(act) {
  skinSyncFromMod(); skinLocalWrite(act);
  const id = skinSelGet(act.id), x = id && skinsIdx().find(z => z.id === id);
  if (x && fs.existsSync(skinFile(id))) return { file: skinFile(id), model: x.model === 'slim' ? 'slim' : 'classic', local: true };
  return { file: act.type === 'microsoft' ? await novaSkin(act.name) : '', model: '', local: false };   // sin conexión y sin skin: ninguna (el mod pone Steve)
}


// Lo que usan otros módulos
Object.assign(R, { novaSkinFor, accSkinFile, accSkinData });
