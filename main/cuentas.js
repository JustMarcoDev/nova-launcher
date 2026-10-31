// =====================================================================================
// Nova Launcher · main/cuentas.js
// Cuentas Microsoft y offline (sesiones cifradas)
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { Auth } = require('msmc');
const { ipcMain, safeStorage } = require('electron');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { cfgFile, load, wr } = R; // base

// ---- Varias cuentas (Microsoft y offline) ----
// Las sesiones de Microsoft se guardan cifradas con el almacén seguro del sistema (en Windows, DPAPI: solo tu usuario de Windows puede leerlas)
const tokOk = () => { try { return safeStorage.isEncryptionAvailable(); } catch { return false; } };
const encTok = t => { if (typeof t !== 'string' || !t || t.startsWith('enc:') || !tokOk()) return t; try { return 'enc:' + safeStorage.encryptString(t).toString('base64'); } catch { return t; } };
const decTok = t => { if (typeof t !== 'string' || !t.startsWith('enc:')) return t; try { return safeStorage.decryptString(Buffer.from(t.slice(4), 'base64')); } catch { return null; } };
function accState(c = load()) {
  let a = Array.isArray(c.accounts) ? c.accounts.filter(x => x && x.id).map(x => x.token ? { ...x, token: decTok(x.token) } : x) : null;
  const msTok = c.ms && c.ms.token ? decTok(c.ms.token) : null;
  if (!a || !a.length) { a = []; if (c.ms && c.ms.token) a.push({ id: 'ms1', type: 'microsoft', name: c.ms.name || 'Microsoft', token: msTok }); a.push({ id: 'off1', type: 'offline', name: c.username || 'Jugador' }); }
  let act = a.find(x => x.id === c.activeAccount);
  if (!act) act = (c.ms && c.ms.token ? a.find(x => x.type === 'microsoft') : null) || a.find(x => x.type === 'offline') || a[0];
  return { a, act };
}
function saveAcc(a, actId) { const act = a.find(x => x.id === actId) || a[0]; wr(cfgFile, { ...load(), accounts: a.map(x => x.token ? { ...x, token: encTok(x.token) } : x), activeAccount: act.id, username: act.name, ms: act.type === 'microsoft' ? { name: act.name, token: encTok(act.token) } : null }); try { R.novaAccountsWrite && R.novaAccountsWrite(); } catch {} }
// Al arrancar: las sesiones guardadas sin cifrar de versiones anteriores se cifran una sola vez
function encryptOldTokens() {
  try {
    if (!tokOk()) return; const c = load(), raw = JSON.stringify([c.accounts, c.ms]);
    if (!/"token":"(?!enc:)[^"]+"/.test(raw)) return;
    const st = accState(c); saveAcc(st.a, st.act.id);
  } catch {}
}
const accOut = () => { const st = accState(); return { accounts: st.a.map(({ token, pid, ...r }) => ({ ...r, skin: R.accSkinData ? R.accSkinData(r.id) : '' })), active: st.act.id }; };
ipcMain.handle('acc:addOffline', (e, name) => {
  name = String(name || '').trim(); if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('El nombre debe tener de 3 a 16 letras, números o _');
  const st = accState(); if (st.a.some(x => x.type === 'offline' && x.name.toLowerCase() === name.toLowerCase())) throw new Error('Ya tienes una cuenta offline con ese nombre');
  const id = 'o' + Date.now().toString(36); saveAcc([...st.a, { id, type: 'offline', name }], id); return accOut();
});
ipcMain.handle('acc:login', async () => {
  try {
    const x = await new Auth('select_account').launch('electron'), t = await x.getMinecraft(), st = accState(), name = t.profile.name, pid = t.profile.id;
    const ex = st.a.find(z => z.type === 'microsoft' && (z.pid === pid || z.name === name)); let id, a;
    if (ex) { id = ex.id; a = st.a.map(z => z.id === id ? { ...z, name, pid, token: x.save() } : z); } else { id = 'm' + Date.now().toString(36); a = [...st.a, { id, type: 'microsoft', name, pid, token: x.save() }]; }
    saveAcc(a, id); return accOut();
  } catch { return { error: 'No se pudo iniciar sesión con Microsoft' }; }
});
ipcMain.handle('acc:switch', (e, id) => { const st = accState(); if (!st.a.some(x => x.id === id)) throw new Error('Cuenta no encontrada'); saveAcc(st.a, id); return accOut(); });
ipcMain.handle('acc:remove', (e, id) => { const st = accState(); if (st.a.length <= 1) throw new Error('Debe quedar al menos una cuenta'); const a = st.a.filter(x => x.id !== id); saveAcc(a, st.act.id === id ? a[0].id : st.act.id); return accOut(); });


// Lo que usan otros módulos
Object.assign(R, { accOut, accState, encryptOldTokens, saveAcc });
