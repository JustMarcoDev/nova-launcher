// =====================================================================================
// Nova Launcher · main/logros.js
// Logros del launcher: guarda lo conseguido y los contadores en logros.json, los comprueba cuando pasa algo (con un pequeño retraso para agrupar)
// y avisa en el launcher (logro:unlock) y, si hay una partida abierta con el menú de Nova, dentro del juego (aviso «logro» o «platino»).
// La lista y las métricas están en logros-core.js (lógica pura, con pruebas).
// =====================================================================================
const { app, ipcMain } = require('electron');
const fsp = require('fs').promises;
const path = require('path');
const { R } = require('./compartido');
const C = require('./logros-core');
const { li, rd, wr, root, running, send } = R; // base
const iDir = id => path.join(root, 'instances', String(id));
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

// Reinicio de la 0.2.19-beta.3: los logros empiezan a contar desde esa beta (se conservan solo la versión y el idioma, para detectar actualizaciones y cambios de idioma).
const RESET = 3;
let st = rd(file, null);
if (!st || typeof st !== 'object') st = {};
if (st.rst !== RESET) st = { rst: RESET, ver: st.ver, lang: st.lang };
st.unlocked = st.unlocked && typeof st.unlocked === 'object' ? st.unlocked : {};
st.counters = st.counters && typeof st.counters === 'object' ? st.counters : {};

let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { wr(file, st); } catch {} }, 500); };
app.on('before-quit', () => { try { wr(file, st); } catch {} });

// ---- Logros de Minecraft: avances hechos en mundos de un jugador (saves/<mundo>/advancements/*.json) de instancias con el menú de Nova ----
// Solo cuentan los que se consiguen a partir de la beta.4 (por la hora de cada avance). Minecraft guarda el progreso en el disco al autoguardar (cada pocos minutos)
// y al salir del mundo, así que el aviso puede llegar con ese retraso. En servidores no se puede leer (el progreso lo guarda el servidor).
if (!st.mcSince) { st.mcSince = Date.now(); }
const novaInst = i => !i.noNova && (!i.ld || i.ld === 'Vanilla' || i.ld === 'Fabric') && R.NOVA_MC && R.NOVA_MC.includes(i.mc);
const advCache = new Map();   // archivo → { m: fecha de modificación, done: [avances hechos] }
async function mcDone() {
  const out = new Set();
  for (const ins of li()) {
    if (!novaInst(ins)) continue;
    const sd = path.join(iDir(ins.id), 'saves');
    let worlds = []; try { worlds = await fsp.readdir(sd); } catch { continue; }
    for (const w of worlds) {
      const ad = path.join(sd, w, 'advancements');
      let fl = []; try { fl = (await fsp.readdir(ad)).filter(f => f.endsWith('.json')); } catch { continue; }
      for (const f of fl) {
        const fp = path.join(ad, f);
        try {
          const mt = (await fsp.stat(fp)).mtimeMs;
          if (mt < st.mcSince) continue;   // no se ha tocado desde el reinicio: no puede tener nada nuevo
          let e = advCache.get(fp);
          if (!e || e.m !== mt) {
            const done = C.advDone(JSON.parse(await fsp.readFile(fp, 'utf8')), st.mcSince);
            e = { m: mt, done }; advCache.set(fp, e);
          }
          for (const k of e.done) out.add(k);
        } catch {}
      }
    }
  }
  return out;
}
// Con una partida abierta se mira cada 30 s (barato: solo se vuelven a leer los archivos que han cambiado)
setInterval(() => { if (running && running.size) soon(); }, 30000).unref();

// Logros del launcher conseguidos (sin el platino ni los de Minecraft): es lo que mira el platino
const mainCount = () => Object.keys(st.unlocked).filter(k => { const d = C.BY_ID.get(k); return d && !d.bonus && k !== C.PLAT.id; }).length;
const shotsC = { t: 0, n: 0 };
async function inputs() {
  let d = { sessions: [], before: [] }; try { d = R.statsLoad(); } catch {}
  let shots = shotsC.n; if (Date.now() - shotsC.t > 15000) { try { shots = shotsC.n = await R.shotsCount(); shotsC.t = Date.now(); } catch {} }   // leer todas las carpetas de capturas cada vez sería un gasto inútil
  if (st.shotsBase === undefined) { st.shotsBase = shots; save(); }   // las capturas que ya había antes del reinicio no cuentan
  shots = Math.max(0, shots - st.shotsBase);
  const m = { ...C.derive({ sessions: d.sessions, before: d.before || [], insts: li().length, shots, counters: st.counters }), unlockedCount: mainCount() };
  m.mcDone = await mcDone();
  return m;
}

// Avisa de un logro nuevo: en el launcher (tarjeta) y dentro del juego. El texto del juego lo traduce la ventana (que sabe el idioma) y lo devuelve por
// logros:aviso; si la ventana no contesta en 1,5 s (cerrada u ocupada) se manda en español para no perder el aviso.
const waiting = new Map();
const kind = id => id === C.PLAT.id ? 'platino' : 'logro';
function announce(def, m) {
  const v = C.view(def, def.bonus ? { [def.key]: 1 } : m, st.unlocked[def.id]);
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
    const ids = [...C.checkMc(m.mcDone, st.unlocked), ...C.check(m, st.unlocked)], now = Date.now();
    for (const id of ids) {
      st.unlocked[id] = { t: now, seen: false };
      m.unlockedCount = mainCount();
    }
    if (ids.length) save();
    for (const id of ids) announce(C.BY_ID.get(id), m);
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
  const m = await inputs(), list = C.ALL.map(d => C.view(d, m, st.unlocked[d.id])), mc = C.MCDEFS.map(d => C.view(d, { [d.key]: m.mcDone.has(d.adv) ? 1 : 0 }, st.unlocked[d.id]));
  const got = list.filter(x => x.got);
  return { cats: [...C.CATS, ['mc', 'Minecraft']], tiers: C.TIERS, list: [...list, ...mc], got: got.length, total: list.length, pts: got.reduce((a, x) => a + x.pts, 0), ptsTotal: list.reduce((a, x) => a + x.pts, 0), plat: !!st.unlocked[C.PLAT.id], mcGot: mc.filter(x => x.got).length, mcTotal: mc.length };
});
ipcMain.handle('logros:seen', () => { let ch = false; for (const k of Object.keys(st.unlocked)) if (st.unlocked[k].seen === false) { st.unlocked[k].seen = true; ch = true; } if (ch) save(); return true; });

// Al arrancar (sin competir con la ventana): si la versión cambió desde la última vez, es una actualización; después se mira todo
setTimeout(() => {
  try { if (!st.lang) st.lang = (rd(path.join(root, 'config.json'), {}) || {}).lang || ''; } catch {}
  try { const v = app.getVersion(); if (st.ver && st.ver !== v) st.counters.updates = (+st.counters.updates || 0) + 1; st.ver = v; save(); } catch {}
  evalNow().catch(() => {});
}, 4000);

Object.assign(R, { logroEvt: evt, logroSoon: soon });
