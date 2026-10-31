// Recuento anónimo: el worker suma por día y valida lo que entra; scripts/uso.js lo convierte en tabla.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { tabla } = require('../scripts/uso.js');
const t = tabla({ days: [{ day: '2026-10-30', launches: 3, installs: 2, combos: { 'a|1.21|Fabric': 2, 'a|26.3|Vanilla': 1 } }] });
assert.deepStrictEqual(t.por, [['2026-10-30', '3', '2']]); assert.strictEqual(t.combos[0][3], '2');
const tmp = path.join(os.tmpdir(), 'nova-worker-test-' + process.pid + '.mjs');
fs.writeFileSync(tmp, fs.readFileSync(path.join(__dirname, '..', 'servidor', 'worker.js'), 'utf8').replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject { constructor(c, e) { this.ctx = c; this.env = e; } }'));
import(require('url').pathToFileURL(tmp).href).then(async ({ default: w, Presence }) => {
  const m = new Map(), st = { get: async k => m.get(k), put: async (k, v) => m.set(k, v), delete: async k => m.delete(k), getAlarm: async () => 0, setAlarm: async () => {},
    list: async o => { let e = [...m.entries()].filter(([k]) => k.startsWith(o.prefix || '')).sort((a, b) => a[0] < b[0] ? -1 : 1); if (o.reverse) e.reverse(); if (o.limit) e = e.slice(0, o.limit); return new Map(e); } };
  const room = new Presence({ storage: st, blockConcurrencyWhile: f => f() }, {}), env = { PRESENCE: { get: () => room, idFromName: () => 1 }, USAGE_SECRET: 's' };
  const rq = async (p, o) => { const r = await w.fetch(new Request('https://x' + p, o), env); return [r.status, await r.text()]; };
  const id = 'a'.repeat(32), post = b => rq('/usage', { method: 'POST', body: JSON.stringify(b) });
  assert.strictEqual((await post({ id, launcher: '0.2.16', mc: '1.21', loader: 'Fabric' }))[0], 200);
  assert.strictEqual((await post({ id, launcher: '0.2.16', mc: '1.21', loader: 'Fabric' }))[0], 200);
  assert.strictEqual((await post({ id: 'x' }))[0], 400);
  assert.strictEqual((await rq('/usage-summary'))[0], 401);
  const j = JSON.parse((await rq('/usage-summary', { headers: { authorization: 'Bearer s' } }))[1]);
  assert.strictEqual(j.days[0].launches, 2); assert.strictEqual(j.days[0].installs, 1); assert.strictEqual(j.days[0].combos['0.2.16|1.21|Fabric'], 2);
  console.log('Recuento anónimo correcto: suma por día, valida el id y exige secreto para leerlo');
}).catch(e => { console.error('FALLO tests/uso.js: ' + (e && e.message || e)); process.exitCode = 1; }).finally(() => { try { fs.unlinkSync(tmp); } catch {} });
