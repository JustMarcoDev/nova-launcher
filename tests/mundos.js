// Prueba del lector de level.dat (main/nbt.js): saca nombre, modo, versión y última partida; los archivos rotos no cuelgan ni tiran el launcher.
const zlib = require('zlib');
const { levelInfo, readNbt } = require('../main/nbt.js');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const s = t => { const b = Buffer.from(t, 'utf8'), h = Buffer.alloc(2); h.writeUInt16BE(b.length); return Buffer.concat([h, b]); };
const tag = (t, name, payload) => Buffer.concat([Buffer.from([t]), s(name), payload]);
const i32 = n => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
const i64 = n => { const b = Buffer.alloc(8); b.writeBigInt64BE(BigInt(n)); return b; };
const comp = (...c) => Buffer.concat([...c, Buffer.from([0])]);
const level = (o = {}) => zlib.gzipSync(tag(10, '', comp(tag(10, 'Data', comp(
  tag(8, 'LevelName', s(o.name === undefined ? 'Mi mundo ñ' : o.name)),
  tag(3, 'GameType', i32(o.mode === undefined ? 1 : o.mode)),
  tag(1, 'hardcore', Buffer.from([o.hc ? 1 : 0])),
  tag(4, 'LastPlayed', i64(o.last || 1700000000000)),
  tag(7, 'ArrBytes', Buffer.concat([i32(3), Buffer.from([1, 2, 3])])),
  tag(11, 'ArrInts', Buffer.concat([i32(2), i32(1), i32(2)])),
  tag(9, 'Lista', Buffer.concat([Buffer.from([3]), i32(2), i32(5), i32(6)])),
  o.noVer ? Buffer.alloc(0) : tag(10, 'Version', comp(tag(8, 'Name', s('1.21.4')), tag(3, 'Id', i32(4189))))
)))));
let r = levelInfo(level());
ok(r.name === 'Mi mundo ñ' && r.mode === 'creative' && r.ver === '1.21.4' && r.last === 1700000000000, 'level.dat normal mal leído: ' + JSON.stringify(r));
ok(levelInfo(level({ mode: 0 })).mode === 'survival' && levelInfo(level({ mode: 2 })).mode === 'adventure' && levelInfo(level({ mode: 3 })).mode === 'spectator', 'modos de juego');
ok(levelInfo(level({ hc: true })).mode === 'hardcore', 'hardcore');
ok(levelInfo(level({ noVer: true })).ver === '', 'mundo viejo sin Version debe dar versión vacía');
ok(readNbt(tag(10, '', comp(tag(3, 'x', i32(7))))).x === 7, 'NBT sin gzip');
for (const bad of [Buffer.alloc(0), Buffer.from('hola'), level().subarray(0, 20), Buffer.concat([Buffer.from([10, 0, 0, 9, 0, 1, 97, 3, 0x7f, 0xff, 0xff, 0xff])]), zlib.gzipSync(Buffer.from([10, 0, 0, 10, 0, 1, 97]))]) {
  let threw = false; try { levelInfo(bad); } catch { threw = true; }
  ok(threw, 'un level.dat roto debería lanzar un error controlado');
}
let deep = Buffer.alloc(0); for (let i = 0; i < 200; i++) deep = Buffer.concat([deep, Buffer.from([10, 0, 1, 97])]);
{ let threw = false; try { readNbt(Buffer.concat([Buffer.from([10, 0, 0]), deep])); } catch { threw = true; } ok(threw, 'anidado excesivo debe rechazarse'); }
if (fails.length) { console.error('FALLOS en el lector de mundos:\n' + fails.map(f => ' ✕ ' + f).join('\n')); process.exit(1); }
console.log('Lector de mundos correcto: nombre, modo, versión y fecha de level.dat; los archivos rotos se rechazan');
