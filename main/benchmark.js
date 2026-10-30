// =====================================================================================
// Nova Launcher · main/benchmark.js
// «Probar rendimiento» de UNA instancia: usa una instancia oculta de la misma versión y cargador (Vanilla o Fabric), copia los
// mods de la instancia elegida (nunca toca sus mundos) y abre un mundo fijo con recorrido de cámara fijo (lo hace el mod, NovaBench).
// El mod escribe [NOVA:<código>:BENCH:<json>] y se cierra. Historial por instancia en bench.json.
// =====================================================================================
const { ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { S, R } = require('./compartido');
const { NOVA_MC } = R; // mod-nova
const { li, load, rd, root, running, send, wr, insFile } = R; // base

const HIST = () => path.join(root, 'bench.json');
let cur = null;   // {t0, timer, got, src, bid}
const iDir = id => path.join(root, 'instances', id);
const benchId = src => 'nova-bench-' + String(src.mc).replace(/[^\w.-]/g, '_') + '-' + (src.ld === 'Fabric' ? 'fabric' : 'vanilla');
function support(src) {
  if (!src) return 'Instancia no encontrada';
  if (!NOVA_MC.includes(src.mc)) return 'La prueba solo está disponible en Minecraft ' + NOVA_MC[0] + ' a ' + NOVA_MC[NOVA_MC.length - 1];
  if (src.ld && src.ld !== 'Vanilla' && src.ld !== 'Fabric') return 'La prueba solo funciona en instancias Vanilla o Fabric (' + src.ld + ' no lleva el menú de Nova)';
  if (src.noNova) return 'Esta instancia tiene el menú de Nova desactivado';
  return '';
}
function benchIns(src) {
  const id = benchId(src), ld = src.ld === 'Fabric' ? 'Fabric' : 'Vanilla';
  const L = li(), ex = L.find(i => i.id === id);
  const base = { id, name: 'Nova Benchmark', mc: src.mc, type: src.type === 'snapshot' ? 'snapshot' : 'release', ld, loaderVersion: ld === 'Fabric' ? (src.loaderVersion || undefined) : undefined, hidden: true, bench: true, fapi: 1, ram: +src.ram > 0 ? +src.ram : undefined, jvmPreset: src.jvmPreset || undefined, javaPath: src.javaPath || undefined, gcOff: src.gcOff || undefined };
  if (!ex) wr(insFile, [...L, base]); else wr(insFile, L.map(i => i.id === id ? { ...i, ...base } : i));
  return { ...base, dir: iDir(id) };
}
function copyDir(a, b) { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { const s = path.join(a, e.name), d = path.join(b, e.name); e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } }
// Copia solo los .jar activos de mods/ (no config, no saves). Devuelve cuántos mods se copiaron.
function copyMods(srcId, dir) {
  const to = path.join(dir, 'mods'); fs.rmSync(to, { recursive: true, force: true }); fs.mkdirSync(to, { recursive: true });
  let n = 0; let es = []; try { es = fs.readdirSync(path.join(iDir(srcId), 'mods')); } catch {}
  for (const f of es) if (/\.jar$/i.test(f) && !/^nova-menu/i.test(f)) { try { fs.copyFileSync(path.join(iDir(srcId), 'mods', f), path.join(to, f)); n++; } catch {} }
  return n;
}
function prepWorld(dir, mc) {
  const src = path.join(__dirname, '..', 'assets', 'bench', /^26\./.test(mc) ? 'NovaBench26' : 'NovaBench');
  if (!fs.existsSync(path.join(src, 'level.dat'))) throw new Error('Falta el mundo de pruebas del launcher');
  const w = path.join(dir, 'saves', 'NovaBench');
  fs.rmSync(w, { recursive: true, force: true }); copyDir(src, w);
  // Opciones fijas para que dos pruebas sean comparables (sin pausa por perder el foco, sin vsync, sin avisos)
  const f = path.join(dir, 'options.txt'); let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch {}
  const set = { pauseOnLostFocus: 'false', enableVsync: 'false', maxFps: '260', tutorialStep: 'none', onboardAccessibility: 'false', skipMultiplayerWarning: 'true', joinedFirstServer: 'true', renderDistance: '12', simulationDistance: '10', graphicsMode: '1' };
  const L = t.split(/\r?\n/).filter(Boolean).filter(l => !(l.split(':')[0] in set));
  for (const k in set) L.push(k + ':' + set[k]);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, L.join('\n') + '\n');
}
const hist = () => { const h = rd(HIST(), []); return Array.isArray(h) ? h : []; };
const histFor = id => hist().filter(e => e.ins === id);
function sysInfo() {
  const c = os.cpus() || [];
  return { cpu: (c[0] && c[0].model || '').replace(/\s+/g, ' ').trim(), cores: c.length, totalGb: Math.round(os.totalmem() / 1073741824), os: os.platform() + ' ' + os.release() };
}
// Recomendaciones como acciones que el botón «Aplicar recomendaciones» puede ejecutar: RAM, recolector de memoria y Modo FPS
function recs(e) {
  const out = [], tot = Math.round(os.totalmem() / 1073741824), cfg = load(), heap = e.heap || (e.ram || 4) * 1024, u = e.ramUsed || 0;
  if (u > heap * 0.85) { const v = Math.min(Math.max(2, Math.floor(tot * 0.5)), Math.max((e.ram || 4) + 2, Math.round(u / 1024 * 1.5) + 2)); if (v > (e.ram || 0)) out.push({ k: 'ram', v, txt: 'Subir la RAM a ' + v + ' GB' }); }
  else if (heap > 6144 && u < heap * 0.3) { const v = Math.max(4, Math.round(u / 1024 * 2) + 2); if (v < (e.ram || 0)) out.push({ k: 'ram', v, txt: 'Bajar la RAM a ' + v + ' GB' }); }
  if (e.low1 < e.avg * 0.5 && tot >= 8 && cfg.gc !== 'zgc') out.push({ k: 'gc', v: 'zgc', txt: 'Usar Generational ZGC' });
  if (!e.fpsMode && e.avg < 60) out.push({ k: 'fps', v: 60, txt: 'Activar el Modo FPS (meta 60)' });
  return out;
}
function finish(res) {
  if (cur) { clearTimeout(cur.timer); clearInterval(cur.watch); cur = null; }
  send('bench:done', res);
}
function onBench(id, a) {
  if (!cur || id !== cur.bid) return;
  let j; try { j = JSON.parse(a); } catch { return; }
  if (!j || !(j.avg > 0)) return;
  const cfg = load(), src = li().find(i => i.id === cur.src) || {}, bi = li().find(i => i.id === cur.bid) || {};
  const e = { t: Date.now(), ins: cur.src, insName: src.name || '', mc: bi.mc || src.mc, ld: bi.ld || 'Vanilla', mods: cur.mods || 0, ram: +bi.ram > 0 ? +bi.ram : cfg.ram, gc: cfg.gc || 'auto', optimize: cfg.optimize !== false, sys: sysInfo(),
    avg: +j.avg, low1: +j.low1, min: +j.min, ramUsed: +j.ram, alloc: +j.alloc, heap: +j.heap, frames: +j.frames, secs: +j.secs, view: j.view, sim: j.sim, fpsMode: !!j.fpsMode };
  e.recs = recs(e);
  const all = [...hist(), e]; // máx. 30 por instancia
  const mine = all.filter(x => x.ins === e.ins), keep = new Set(mine.slice(-30));
  const h = all.filter(x => x.ins !== e.ins || keep.has(x)).slice(-300); try { wr(HIST(), h); } catch {}
  cur.got = true;
  finish({ ok: true, id: cur.src, result: e, history: histFor(e.ins) });
}
async function run(id) {
  if (R.novaOff && R.novaOff('bench')) return { ok: false, why: 'La prueba de rendimiento está desactivada por ahora' };
  if (cur) return { ok: false, why: 'busy' };
  if (running.size) return { ok: false, why: 'running' };
  const src = li().find(i => i.id === id), why = support(src); if (why) return { ok: false, why };
  let ins, mods = 0; try { ins = benchIns(src); mods = ins.ld === 'Fabric' ? copyMods(src.id, ins.dir) : (fs.rmSync(path.join(ins.dir, 'mods'), { recursive: true, force: true }), 0); prepWorld(ins.dir, ins.mc); } catch (e) { return { ok: false, why: String(e.message || e) }; }
  cur = { t0: Date.now(), got: false, src: src.id, bid: ins.id, mods };
  send('bench:state', { phase: 'start', mc: ins.mc, id: src.id });
  cur.timer = setTimeout(() => { try { R.stopGame && R.stopGame(ins.id); } catch {} finish({ ok: false, id: src.id, why: 'Se agotó el tiempo de la prueba (8 min)' }); }, 8 * 60 * 1000);
  R.playGame({ id: ins.id, world: 'NovaBench', extraArgs: ['-Dnova.bench=true'], noRecover: true }).then(r => {
    if (!cur) return;
    if (!r || !r.ok) { finish({ ok: false, id: src.id, why: 'No se pudo iniciar Minecraft para la prueba' }); return; }
    cur.watch = setInterval(() => {
      if (!cur) return;
      if (!running.has(ins.id)) { setTimeout(() => { if (cur && !cur.got) finish({ ok: false, id: src.id, why: 'El juego se cerró antes de terminar la prueba' }); }, 1500); clearInterval(cur.watch); }
    }, 1000);
  }).catch(() => { if (cur) finish({ ok: false, id: src.id, why: 'No se pudo iniciar Minecraft para la prueba' }); });
  return { ok: true, mc: ins.mc, ld: ins.ld, mods };
}
// Aplica las recomendaciones de una prueba a la instancia: RAM (de la instancia), recolector (global) y Modo FPS (menu.json del mod)
function apply(id, ts) {
  const src = li().find(i => i.id === id); if (!src) return { ok: false, why: 'Instancia no encontrada' };
  const e = histFor(id).find(x => x.t === ts) || histFor(id).slice(-1)[0]; if (!e) return { ok: false, why: 'No hay ninguna prueba de esta instancia' };
  const done = [];
  for (const r of e.recs || []) {
    if (r.k === 'ram' && r.v > 0) { wr(insFile, li().map(i => i.id === id ? { ...i, ram: Math.min(64, Math.round(r.v)) } : i)); done.push(r.txt); }
    else if (r.k === 'gc' && r.v === 'zgc') { wr(R.cfgFile, { ...load(), gc: 'zgc' }); done.push(r.txt); }
    else if (r.k === 'fps' && [30, 60, 90, 120, 144].includes(r.v)) { const f = path.join(R.novaDir(), 'menu.json'); let c = {}; try { c = JSON.parse(fs.readFileSync(f, 'utf8')) || {}; } catch {} c.fps = { ...(c.fps || {}), goal: r.v }; try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(c)); done.push(r.txt); } catch {} }
  }
  return { ok: true, done };
}
ipcMain.handle('bench:run', (e, id) => run(String(id || '')));
ipcMain.handle('bench:apply', (e, o) => apply(String((o && o.id) || ''), o && +o.t));
ipcMain.handle('bench:info', (e, id) => { id = String(id || ''); const src = li().find(i => i.id === id), why = src ? support(src) : ''; return { id, mc: src ? src.mc : '', ld: src ? (src.ld || 'Vanilla') : '', why, history: histFor(id), busy: !!cur, sys: sysInfo(), cfg: (({ ram, gc, optimize }) => ({ ram, gc: gc || 'auto', optimize: optimize !== false }))(load()) }; });
ipcMain.handle('bench:clear', (e, id) => { try { wr(HIST(), id ? hist().filter(x => x.ins !== String(id)) : []); } catch {} return true; });
Object.assign(R, { onBench });
