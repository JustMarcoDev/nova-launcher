// Prueba de la lógica pura de los logros (main/logros-core.js): lista, métricas derivadas, comprobación y platino
const assert = require('assert');
const C = require('../main/logros-core');

// Lista: más de 50 logros, ids únicos, métricas conocidas y un solo platino
assert(C.DEFS.length > 50, 'tiene que haber más de 50 logros, hay ' + C.DEFS.length);
const ids = C.ALL.map(d => d.id); assert.strictEqual(new Set(ids).size, ids.length, 'ids repetidos');
assert.strictEqual(C.ALL.filter(d => d.tier === 'p').length, 1, 'tiene que haber un único platino');
assert.strictEqual(C.ALL[C.ALL.length - 1].id, C.PLAT.id);
const cats = new Set(C.CATS.map(c => c[0]));
const keys = new Set(Object.keys(C.derive({ sessions: [{ start: 1, ms: 1, mc: '1.21', ld: 'Fabric' }] })).concat(['modsInstalled', 'packsInstalled', 'packShares', 'packLinks', 'exports', 'imports', 'clips', 'skinsSaved', 'settings', 'langs', 'bgAdded', 'bench', 'benchApply', 'optimized', 'backups', 'updates', 'diags', 'cleans', 'streamerOn', 'views', 'unlockedCount']));
for (const d of C.DEFS) {
  assert(cats.has(d.cat), d.id + ': categoría desconocida ' + d.cat);
  assert(C.TIERS[d.tier] && d.tier !== 'p', d.id + ': tipo no válido');
  assert(keys.has(d.key), d.id + ': métrica desconocida ' + d.key);
  assert(d.goal > 0 && d.name && d.desc, d.id + ': incompleto');
}

// Métricas: horas, racha, noche, cargadores, servidores
const H = 36e5, day = n => new Date(2026, 0, n, 12).getTime();
const m = C.derive({
  sessions: [
    { start: day(1), ms: 2 * H, mc: '1.21.1', ld: 'Fabric' },
    { start: day(2), ms: 1 * H, mc: '1.8.9', ld: 'Vanilla', server: 'mc.ejemplo.net' },
    { start: day(3), ms: 3 * H, mc: '26.1', ld: 'Forge', server: 'MC.ejemplo.net' },
    { start: new Date(2026, 0, 9, 3, 30).getTime(), ms: H, mc: '1.21.1', ld: 'NeoForge' },
    { start: 'x', ms: 5 }, null,
  ], before: [{ ms: 4 * H }], insts: 3, shots: 7, counters: { clips: 2 },
});
assert.strictEqual(m.launches, 4); assert.strictEqual(m.hours, 11); assert.strictEqual(m.longest, 3);
assert.strictEqual(m.streak, 3); assert.strictEqual(m.days, 4); assert.strictEqual(m.night, 1);
assert.strictEqual(m.loaders, 4); assert.strictEqual(m.versions, 3); assert.strictEqual(m.oldMc, 1); assert.strictEqual(m.newMc, 1);
assert.strictEqual(m.serverSessions, 2); assert.strictEqual(m.serversDistinct, 1); assert.strictEqual(m.clips, 2); assert.strictEqual(m.shots, 7);
const z = C.derive({}); assert.strictEqual(z.launches, 0); assert.strictEqual(z.streak, 0); assert.strictEqual(z.hours, 0);

// Comprobación: no repite, no inventa y el platino llega el último y solo con todos
assert.deepStrictEqual(C.check({}, {}), []);
const got = C.check(m, {}); assert(got.includes('j1') && got.includes('h10') && !got.includes('h50') && !got.includes(C.PLAT.id));
assert.deepStrictEqual(C.check(m, Object.fromEntries(got.map(i => [i, 1]))), []);
const all = Object.fromEntries(C.DEFS.map(d => [d.id, { t: 1 }])); delete all.j1;
const big = Object.fromEntries(C.DEFS.map(d => [d.key, d.goal]));
assert.deepStrictEqual(C.check(big, all), ['j1', C.PLAT.id], 'el platino sale justo después del último logro');
assert.deepStrictEqual(C.check(big, { ...all, j1: 1, [C.PLAT.id]: 1 }), []);
const fresh = C.check(big, {}); assert.strictEqual(fresh[fresh.length - 1], C.PLAT.id); assert.strictEqual(fresh.length, C.ALL.length);

// Vista: los secretos no enseñan nada hasta conseguirlos; el progreso no pasa del objetivo
const sec = C.DEFS.find(d => d.secret); assert(sec);
const v0 = C.view(sec, m, null), v1 = C.view(sec, m, { t: 5, seen: false });
assert(!v0.got && !/Noct|Nostal/.test(v0.name + v0.desc), 'un secreto sin conseguir no enseña su nombre'); assert(v1.got && v1.name === sec.name);
const vp = C.view(C.DEFS.find(d => d.id === 'h10'), { hours: 99 }, null); assert.strictEqual(vp.pct, 100); assert(vp.have <= vp.goal);
console.log('tests/logros.js: ' + C.DEFS.length + ' logros + platino, métricas, comprobación y secretos correctos');
