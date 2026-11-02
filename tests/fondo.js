// Prueba de main/fondo-menu.js: qué fondo del menú de Nova puede pintar el launcher.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { fondoInfo } = require('../main/fondo-menu.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-fondo-'));
for (const f of ['a.png', 'b.mp4', 'c.mkv', 'd.JPG']) fs.writeFileSync(path.join(dir, f), 'x');
assert.deepStrictEqual(fondoInfo({}, dir), { id: 'hole', kind: 'hole' });
assert.deepStrictEqual(fondoInfo(null, dir), { id: 'hole', kind: 'hole' });
for (const id of ['hole', 'nebula', 'earth']) assert.strictEqual(fondoInfo({ bg: id }, dir).kind, 'hole');
const a = fondoInfo({ bg: 'f:a.png' }, dir); assert.strictEqual(a.kind, 'image'); assert.ok(a.url.startsWith('file://') && a.url.endsWith('/a.png'));
assert.strictEqual(fondoInfo({ bg: 'f:b.mp4' }, dir).kind, 'video');
assert.strictEqual(fondoInfo({ bg: 'f:d.JPG' }, dir).kind, 'image');
assert.strictEqual(fondoInfo({ bg: 'f:c.mkv' }, dir).kind, 'hole', 'un formato que Chromium no reproduce cae al agujero negro');
assert.strictEqual(fondoInfo({ bg: 'f:no-existe.png' }, dir).kind, 'hole');
assert.strictEqual(fondoInfo({ bg: 'f:../secreto.png' }, dir).kind, 'hole', 'no se sale de la carpeta');
assert.strictEqual(fondoInfo({ bg: 42 }, dir).kind, 'hole');
fs.rmSync(dir, { recursive: true, force: true });
console.log('Fondo del menú correcto: agujero negro, imagen o vídeo; lo que no se puede pintar cae al agujero negro');
