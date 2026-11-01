// Cliente de la nube (main/nube.js): sube solo aspecto + menu.json + skins sin secretos, y al recuperar guarda antes una copia local.
const Module = require('module'), fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-nube-')), nova = path.join(root, 'nova'), sk = path.join(nova, 'skins');
fs.mkdirSync(sk, { recursive: true });
let cfg = { accent: '#112233', theme: 'negro', ms: { token: 'SECRETO-MS' }, accounts: [{ token: 'enc:xx' }], cfKey: 'CLAVE', javaPath: 'C:/java', cloud: true };
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const wr = (f, o) => { if (f === 'CFG') { cfg = o; return; } fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o)); };
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 7)]);
let idx = [{ id: 'sabc1', name: 'Mi skin', model: 'slim' }]; fs.writeFileSync(path.join(sk, 'sabc1.png'), png);
const R = { cfgFile: 'CFG', load: () => cfg, rd, root, send() {}, wr, novaDir: () => nova, novaOff: () => false,
  skinsDir: () => sk, skinsIdx: () => idx, skinsPut: l => { idx = l; }, skinFile: id => path.join(sk, id + '.png'), isPng: b => b.length > 67 && b.slice(1, 4).toString() === 'PNG' };
const orig = Module._load;
Module._load = function (req, ...a) { if (req === 'electron') return { ipcMain: { handle() {} } }; if (req === './compartido') return { R }; return orig.call(this, req, ...a); };
const N = require('../main/nube.js'); Module._load = orig;
fs.writeFileSync(path.join(nova, 'menu.json'), JSON.stringify({ accent: 1, hud: { fps: { on: true } }, zoom: { key: 67 }, apiToken: 'NO', nested: { password: 'NO', ok: 1 } }));
const g = N.gather();
const txt = g.text;
assert.ok(!/SECRETO|CLAVE|C:\/java|enc:xx|"NO"|apiToken|password/.test(txt), 'la subida lleva algo que no debería: ' + txt.slice(0, 200));
assert.deepStrictEqual(g.data.launcher, { accent: '#112233', theme: 'negro' }, 'del launcher solo viaja el aspecto');
assert.strictEqual(g.data.menu.zoom.key, 67); assert.strictEqual(g.data.menu.nested.ok, 1);
assert.strictEqual(g.data.skins.length, 1); assert.strictEqual(g.data.skins[0].model, 'slim');
assert.strictEqual(N.gather().hash, g.hash, 'el hash debe ser estable');
// recuperar: copia local antes, menu.json y aspecto sustituidos, skins nuevas añadidas sin duplicar
const nube = { menu: { accent: 5, token: 'x' }, launcher: { theme: 'violeta', cfKey: 'NO', ms: 'NO' }, skins: [g.data.skins[0], { name: 'Otra', model: 'classic', png: Buffer.concat([png, Buffer.from([9])]).toString('base64') }] };
const back = N.apply(nube);
assert.ok(fs.existsSync(path.join(back, 'menu.json')) && fs.existsSync(path.join(back, 'ajustes.json')), 'falta la copia local antes de sustituir');
assert.strictEqual(rd(path.join(back, 'menu.json')).apiToken, 'NO', 'la copia local conserva el menu.json de antes tal cual');
assert.strictEqual(rd(path.join(nova, 'menu.json')).accent, 5); assert.ok(!('token' in rd(path.join(nova, 'menu.json'))), 'menu.json nuevo sin secretos');
assert.strictEqual(cfg.theme, 'violeta'); assert.strictEqual(cfg.accent, '#112233'); assert.strictEqual(cfg.cfKey, 'CLAVE', 'la nube no puede tocar claves ni sesiones'); assert.strictEqual(cfg.ms.token, 'SECRETO-MS');
assert.strictEqual(idx.length, 2, 'una skin repetida no se duplica y la nueva se añade');
console.log('Cliente de la nube correcto: sube solo aspecto, menú y skins sin secretos; recupera con copia local previa');
fs.rmSync(root, { recursive: true, force: true });
