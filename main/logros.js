// =====================================================================================
// Nova Launcher · main/logros.js
// Logros del launcher: guarda lo conseguido y los contadores en logros.json, los comprueba cuando pasa algo (con un pequeño retraso para agrupar)
// y avisa en el launcher (logro:unlock) y, si hay una partida abierta con el menú de Nova, dentro del juego (aviso «logro» o «platino»).
// La lista y las métricas están en logros-core.js (lógica pura, con pruebas).
// =====================================================================================
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { R } = require('./compartido');
const C = require('./logros-core');
const { li, rd, wr, root, send } = R; // base
const file = path.join(root, 'logros.json');

// Qué acción cuenta para qué contador. Se engancha a ipcMain.handle ANTES de que se registren los demás módulos (este se carga justo después de base),
// así no hace falta tocar cada manejador; solo cuenta si la acción terminó sin error.
const n0 = (r, k) => (r && typeof r === 'object' ? r[k] : 0);
const HOOK = {
  'mod:install': () => evt('modsInstalled'),
  'mods:add': (a, r) => { if (r) evt('modsInstalled'); },
  'mods:bundle': (a) => evt('modsInstalled', Math.max(1, (a && Array.isArray(a.slugs) ? a.slugs.length : 1))),
  'drop:install': () => evt('modsInstalled'),
  'pack:install': (a) => { evt('packsInstalled'); if (a && a.text) evt('packLinks'); },
  'share:make': () => evt('packShares'),
  'inst:export': (a, r) => { if (r) evt('exports'); },
  'inst:import': (a, r) => { if (r) evt('imports'); },
  'settings:export': (a, r) => { if (r) evt('exports'); },
  'settings:import': (a, r) => { if (r) evt('imports'); },
  'bk:create': () => evt('backups'),
  'clean:run': () => evt('cleans'),
  'diag:run': () => evt('diags'),
  'skin:save': () => evt('skinsSaved'),
  'nmenu:addbg': (a, r) => { if (n0(r, 'added')) evt('bgAdded'); },
  'inst:optimize': (a, r) => { if (r && r.ok) evt('optimized'); },
  'bench:run': () => evt('bench'),
  'bench:apply': () => evt('benchApply'),
  'cfg:set': (c) => {
    if (!c || typeof c !== 'object') return;
    const k = Object.keys(c).filter(x => !/^(setupDone|myServers|lastTab|_|win)/.test(x)).length;
    if (k) evt('settings', k);
    if (typeof c.lang === 'string' && c.lang) { if (st.lang && st.lang !== c.lang) evt('langs'); st.lang = c.lang; }
    if (c.streamer === true) evt('streamerOn');
  },
};
const origHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (ch, fn) => {
  const h = HOOK[ch];
  return origHandle(ch, h ? async (e, ...a) => { const r = await fn(e, ...a); try { h(a[0], r); } catch {} return r; } : fn);
};

const first = !fs.existsSync(file);   // primera vez: lo que ya se cumple por el historial se apunta sin avisos (si no, saldrían todos de golpe)
let st = rd(file, null);
if (!st || typeof st !== 'object') st = {};
st.unlocked = st.unlocked && typeof st.unlocked === 'object' ? st.unlocked : {};
st.counters = st.counters && typeof st.counters === 'object' ? st.counters : {};

let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { wr(file, st); } catch {} }, 500); };
app.on('before-quit', () => { try { wr(file, st); } catch {} });

async function inputs() {
  let d = { sessions: [], before: [] }; try { d = R.statsLoad(); } catch {}
  let shots = 0; try { shots = await R.shotsCount(); } catch {}
  const unlockedCount = Object.keys(st.unlocked).filter(k => k !== C.PLAT.id).length;
  return { ...C.derive({ sessions: d.sessions, before: d.before || [], insts: li().length, shots, counters: st.counters }), unlockedCount };
}

// Avisa de un logro nuevo: en el launcher (tarjeta) y dentro del juego. El texto del juego lo traduce la ventana (que sabe el idioma) y lo devuelve por
// logros:aviso; si la ventana no contesta en 1,5 s (cerrada u ocupada) se manda en español para no perder el aviso.
const waiting = new Map();
const kind = id => id === C.PLAT.id ? 'platino' : 'logro';
function announce(def, m) {
  const v = C.view(def, m, st.unlocked[def.id]);
  try { send('logro:unlock', v); } catch {}
  clearTimeout(waiting.get(def.id));
  waiting.set(def.id, setTimeout(() => { waiting.delete(def.id); try { R.novaAviso(kind(def.id), v.name + ' · ' + v.desc); } catch {} }, 1500));
}
ipcMain.handle('logros:aviso', (e, o) => {
  const id = String((o && o.id) || ''), text = String((o && o.text) || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 160);
  if (!C.BY_ID.has(id) || !waiting.has(id) || !text.trim()) return false;
  clearTimeout(waiting.get(id)); waiting.delete(id);
  try { R.novaAviso(kind(id), text); } catch {}
  return true;
});

let busy = false, again = false;
async function evalNow() {
  if (busy) { again = true; return []; }
  busy = true;
  try {
    const m = await inputs();
    const ids = C.check(m, st.unlocked), now = Date.now();
    for (const id of ids) {
      st.unlocked[id] = { t: now, seen: first && !st.armed };
      m.unlockedCount = Object.keys(st.unlocked).filter(k => k !== C.PLAT.id).length;
    }
    if (ids.length) save();
    if (!first || st.armed) for (const id of ids) announce(C.BY_ID.get(id), m);
    st.armed = true;
    return ids;
  } finally { busy = false; if (again) { again = false; setTimeout(() => evalNow().catch(() => {}), 300); } }
}
let soonT = null;
const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => evalNow().catch(() => {}), 800); };

/** Apunta que ha pasado algo (una instalación, un enlace compartido…) y mira si con eso se consigue un logro. */
function evt(key, n = 1) {
  if (!/^[A-Za-z]{2,24}$/.test(String(key))) return;
  st.counters[key] = (+st.counters[key] || 0) + (Number.isFinite(+n) ? +n : 1);
  save(); soon();
}

ipcMain.handle('logros:get', async () => {
  const m = await inputs(), list = C.ALL.map(d => C.view(d, m, st.unlocked[d.id]));
  const got = list.filter(x => x.got);
  return { cats: C.CATS, tiers: C.TIERS, list, got: got.length, total: list.length, pts: got.reduce((a, x) => a + x.pts, 0), ptsTotal: list.reduce((a, x) => a + x.pts, 0), plat: !!st.unlocked[C.PLAT.id] };
});
ipcMain.handle('logros:seen', () => { let ch = false; for (const k of Object.keys(st.unlocked)) if (st.unlocked[k].seen === false) { st.unlocked[k].seen = true; ch = true; } if (ch) save(); return true; });
ipcMain.handle('logros:view', () => { evt('views'); return true; });

// Al arrancar (sin competir con la ventana): si la versión cambió desde la última vez, es una actualización; después se mira todo
setTimeout(() => {
  try { if (!st.lang) st.lang = (rd(path.join(root, 'config.json'), {}) || {}).lang || ''; } catch {}
  try { const v = app.getVersion(); if (st.ver && st.ver !== v) st.counters.updates = (+st.counters.updates || 0) + 1; st.ver = v; save(); } catch {}
  evalNow().catch(() => {});
}, 4000);

Object.assign(R, { logroEvt: evt, logroSoon: soon });
