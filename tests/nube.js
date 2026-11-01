// Ajustes en la nube (servidor/worker.js): solo con token de /verify, máx. 1 MB, hasta 10 skins PNG de 64 KB, y nunca tokens ni contraseñas.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const tmp = path.join(os.tmpdir(), 'nova-cloud-test-' + process.pid + '.mjs');
fs.writeFileSync(tmp, fs.readFileSync(path.join(__dirname, '..', 'servidor', 'worker.js'), 'utf8').replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject { constructor(c, e) { this.ctx = c; this.env = e; } }'));
// Un «sql» de mentira que entiende solo las tres sentencias que usa la clase Cloud
const fakeSql = () => {
  let row = null;
  return { exec(q, ...a) {
    if (/^CREATE TABLE/.test(q)) return { toArray: () => [] };
    if (/^INSERT INTO c/.test(q)) { row = { data: a[0], updated: a[1] }; return { toArray: () => [] }; }
    if (/^SELECT data, updated/.test(q)) return { toArray: () => row ? [row] : [] };
    if (/^DELETE FROM c/.test(q)) { row = null; return { toArray: () => [] }; }
    throw new Error('SQL no esperado: ' + q);
  } };
};
import(require('url').pathToFileURL(tmp).href).then(async ({ default: w, Presence, Cloud }) => {
  const m = new Map(), st = { get: async k => m.get(k), put: async (k, v) => m.set(k, v), delete: async k => m.delete(k), getAlarm: async () => 0, setAlarm: async () => {}, list: async () => new Map() };
  const room = new Presence({ storage: st, blockConcurrencyWhile: f => f() }, { RATE_LIMIT: '1000' });
  const boxes = new Map(), kv = new Map();
  const env = {
    PRESENCE: { get: () => room, idFromName: () => 1 },
    CLOUD: { idFromName: n => n, get: n => { if (!boxes.has(n)) boxes.set(n, new Cloud({ storage: { sql: fakeSql() } }, {})); return boxes.get(n); } },
    NOVA: { get: async k => kv.get(k), put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k) },
  };
  const uuid = 'b'.repeat(32), tk = 'c'.repeat(48), tk2 = 'd'.repeat(48);
  await room.addToken(tk, uuid); await room.addToken(tk2, 'e'.repeat(32));
  const rq = async (meth, body, token = tk) => { const r = await w.fetch(new Request('https://x/cloud', { method: meth, headers: token ? { authorization: 'Bearer ' + token } : {}, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }), env); return [r.status, await r.json()]; };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]).toString('base64');
  const skin = n => ({ name: 'Skin ' + n, model: 'slim', png });
  assert.strictEqual((await rq('GET', undefined, ''))[0], 401, 'sin token debe dar 401');
  assert.strictEqual((await rq('GET', undefined, 'f'.repeat(48)))[0], 401, 'token falso debe dar 401');
  assert.strictEqual((await rq('GET'))[0], 404, 'sin datos debe dar 404');
  const buenos = { menu: { accent: 1, hud: { fps: { on: true } }, zoom: { key: 67 } }, launcher: { theme: 'oscuro', accent: '#fff' }, skins: [skin(1), skin(2)] };
  const put = await rq('PUT', buenos);
  assert.strictEqual(put[0], 200); assert.ok(put[1].updated > 0);
  const got = await rq('GET');
  assert.strictEqual(got[0], 200); assert.deepStrictEqual(got[1].data.menu, buenos.menu); assert.strictEqual(got[1].data.skins.length, 2);
  assert.strictEqual((await rq('GET', undefined, tk2))[0], 404, 'cada jugador solo ve lo suyo');
  // rechazos
  for (const [mal, why] of [
    [{ menu: { accessToken: 'x' } }, 'token en menu'], [{ launcher: { a: { b: { password: 'x' } } } }, 'contraseña anidada'], [{ menu: { cfKey: 'k' } }, 'clave de CurseForge'],
    [{ skins: Array.from({ length: 11 }, (_, i) => skin(i)) }, '11 skins'], [{ skins: [{ name: 'x', png: Buffer.from('hola mundo').toString('base64') }] }, 'skin que no es PNG'],
    [{ skins: [{ name: 'x', png: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(70000)]).toString('base64') }] }, 'skin de más de 64 KB'],
    [{ menu: 'texto' }, 'menu no es objeto'], [[1, 2], 'array en la raíz'], ['{no json', 'json roto'],
  ]) { const r = await rq('PUT', mal); assert.ok(r[0] === 400, 'debería rechazar: ' + why + ' (' + r[0] + ')'); }
  assert.strictEqual((await rq('PUT', { menu: { x: 'a'.repeat(1000001) } }))[0], 413, 'más de 1 MB');
  assert.strictEqual((await rq('GET'))[1].data.skins.length, 2, 'un PUT rechazado no debe tocar lo guardado');
  assert.strictEqual((await rq('DELETE'))[0], 200); assert.strictEqual((await rq('GET'))[0], 404, 'borrar de verdad');
  console.log('Ajustes en la nube correctos: token obligatorio, aislado por jugador, 1 MB, 10 skins PNG y sin tokens ni contraseñas');
}).catch(e => { console.error('FALLO tests/nube.js: ' + (e && e.message || e)); process.exitCode = 1; }).finally(() => { try { fs.unlinkSync(tmp); } catch {} });
