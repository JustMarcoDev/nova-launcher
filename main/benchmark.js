// =====================================================================================
// Nova Launcher · main/benchmark.js
// «Probar rendimiento»: instancia oculta «Nova Benchmark» (la última 26.x), mundo de semilla fija y recorrido
// de cámara fijo (lo hace el mod, mod26/NovaBench). El mod escribe [NOVA:<código>:BENCH:<json>] y se cierra.
// =====================================================================================
const { ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { S, R } = require('./compartido');
const { NOVA_MC } = R; // mod-nova
const { li, load, rd, root, running, send, wr, insFile } = R; // base

const BID = 'nova-bench', HIST = () => path.join(root, 'bench.json');
const latest26 = () => { const v = NOVA_MC.filter(m => /^26\./.test(m)); return v.length ? v[v.length - 1] : ''; };
let cur = null;   // {t0, timer, got}

function benchIns() {
  const mc = latest26(); if (!mc) throw new Error('Esta versión del launcher no incluye Minecraft 26.x');
  const L = li(), ex = L.find(i => i.id === BID);
  const base = { id: BID, name: 'Nova Benchmark', mc, type: 'release', ld: 'Vanilla', hidden: true, bench: true };
  if (!ex) wr(insFile, [...L, base]);
  else if (ex.mc !== mc || !ex.hidden) wr(insFile, L.map(i => i.id === BID ? { ...i, ...base } : i));
  return { ...base, dir: path.join(root, 'instances', BID) };
}
function copyDir(a, b) { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { const s = path.join(a, e.name), d = path.join(b, e.name); e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } }
function prepWorld(dir) {
  const src = path.join(__dirname, '..', 'assets', 'bench', 'NovaBench');
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
function sysInfo() {
  const c = os.cpus() || [];
  return { cpu: (c[0] && c[0].model || '').replace(/\s+/g, ' ').trim(), cores: c.length, totalGb: Math.round(os.totalmem() / 1073741824), os: os.platform() + ' ' + os.release() };
}
function finish(res) {
  if (cur) { clearTimeout(cur.timer); clearInterval(cur.watch); cur = null; }
  send('bench:done', res);
}
function onBench(id, a) {
  if (!cur || id !== BID) return;
  let j; try { j = JSON.parse(a); } catch { return; }
  if (!j || !(j.avg > 0)) return;
  const cfg = load(), ins = li().find(i => i.id === BID) || {};
  const e = { t: Date.now(), mc: ins.mc || latest26(), ram: +ins.ram > 0 ? +ins.ram : cfg.ram, gc: cfg.gc || 'auto', optimize: cfg.optimize !== false, sys: sysInfo(),
    avg: +j.avg, low1: +j.low1, min: +j.min, ramUsed: +j.ram, alloc: +j.alloc, heap: +j.heap, frames: +j.frames, secs: +j.secs, view: j.view, sim: j.sim, fpsMode: !!j.fpsMode };
  const h = [...hist(), e].slice(-30); try { wr(HIST(), h); } catch {}
  cur.got = true;
  finish({ ok: true, result: e, history: h });
}
async function run() {
  if (cur) return { ok: false, why: 'busy' };
  if (running.size) return { ok: false, why: 'running' };
  let ins; try { ins = benchIns(); prepWorld(ins.dir); } catch (e) { return { ok: false, why: String(e.message || e) }; }
  cur = { t0: Date.now(), got: false };
  send('bench:state', { phase: 'start', mc: ins.mc });
  cur.timer = setTimeout(() => { try { R.stopGame && R.stopGame(BID); } catch {} finish({ ok: false, why: 'Se agotó el tiempo de la prueba (8 min)' }); }, 8 * 60 * 1000);
  R.playGame({ id: BID, world: 'NovaBench', extraArgs: ['-Dnova.bench=true'], noRecover: true }).then(r => {
    if (!cur) return;
    if (!r || !r.ok) { finish({ ok: false, why: 'No se pudo iniciar Minecraft para la prueba' }); return; }
    cur.watch = setInterval(() => {
      if (!cur) return;
      if (!running.has(BID)) { setTimeout(() => { if (cur && !cur.got) finish({ ok: false, why: 'El juego se cerró antes de terminar la prueba' }); }, 1500); clearInterval(cur.watch); }
    }, 1000);
  }).catch(() => { if (cur) finish({ ok: false, why: 'No se pudo iniciar Minecraft para la prueba' }); });
  return { ok: true, mc: ins.mc };
}
ipcMain.handle('bench:run', () => run());
ipcMain.handle('bench:info', () => ({ mc: latest26(), history: hist(), busy: !!cur, sys: sysInfo(), cfg: (({ ram, gc, optimize }) => ({ ram, gc: gc || 'auto', optimize: optimize !== false }))(load()) }));
ipcMain.handle('bench:clear', () => { try { wr(HIST(), []); } catch {} return true; });
Object.assign(R, { onBench });
