// =====================================================================================
// Nova Launcher · main/restablecer.js
// Borrar los datos del launcher (para «Restablecer» y «Desinstalar»), opcionalmente conservando las cuentas premium.
// Sin dependencias de Electron: se prueba con tests/restablecer.js.
// =====================================================================================
const fs = require('fs');
const path = require('path');

/** Lo que se conserva de config.json: solo las cuentas de Microsoft (premium), cuál está activa y sus skins elegidas. null si no hay ninguna. */
function cuentasPremium(c) {
  c = c || {};
  const acc = (Array.isArray(c.accounts) ? c.accounts : []).filter(x => x && x.id && x.type === 'microsoft');
  if (!acc.length) return null;
  const act = acc.find(x => x.id === c.activeAccount) || acc[0];
  const out = { accounts: acc, activeAccount: act.id, username: act.name || c.username || 'Jugador', setupDone: true };
  if (c.ms && c.ms.token) out.ms = c.ms;
  if (c.skinSel && typeof c.skinSel === 'object') {
    const sel = {}; for (const x of acc) if (c.skinSel[x.id]) sel[x.id] = c.skinSel[x.id];
    if (Object.keys(sel).length) out.skinSel = sel;
  }
  return out;
}

const rm = p => fs.promises.rm(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }).catch(() => {});

/** Borra todo lo de `root`. Con `conservar` ({cfg, skins}) deja config.json con las cuentas premium y la carpeta nova/skins. Devuelve true si conservó cuentas. */
async function borrar(root, conservar) {
  let cfg = null;
  if (conservar) { try { cfg = cuentasPremium(JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'))); } catch {} }
  let es = []; try { es = await fs.promises.readdir(root); } catch { return false; }
  for (const n of es) {
    const p = path.join(root, n);
    if (cfg && n === 'config.json') continue;
    if (cfg && n === 'nova') {
      let sub = []; try { sub = await fs.promises.readdir(p); } catch {}
      for (const s of sub) if (s !== 'skins') await rm(path.join(p, s));
      continue;
    }
    await rm(p);
  }
  if (cfg) fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify(cfg, null, 1));
  return !!cfg;
}

module.exports = { borrar, cuentasPremium };
