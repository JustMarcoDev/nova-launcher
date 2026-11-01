// =====================================================================================
// Nova Launcher · main/nbt.js
// Lector mínimo de NBT (el formato de level.dat) para sacar los datos de un mundo sin abrir Minecraft.
// =====================================================================================
const zlib = require('zlib');

/** Lee un NBT (con o sin gzip) y devuelve el compuesto raíz como objeto. Los long salen como Number (los valores enormes pierden precisión, no importa aquí). */
function readNbt(buf) {
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf, { maxOutputLength: 64 * 1024 * 1024 });
  let o = 0;
  const need = n => { if (o + n > buf.length) throw new Error('NBT cortado'); };
  const str = () => { need(2); const n = buf.readUInt16BE(o); o += 2; need(n); const s = buf.toString('utf8', o, o + n); o += n; return s; };
  const val = (t, depth) => {
    if (depth > 64) throw new Error('NBT demasiado anidado');
    switch (t) {
      case 1: need(1); return buf.readInt8(o++);
      case 2: need(2); o += 2; return buf.readInt16BE(o - 2);
      case 3: need(4); o += 4; return buf.readInt32BE(o - 4);
      case 4: need(8); o += 8; return Number(buf.readBigInt64BE(o - 8));
      case 5: need(4); o += 4; return buf.readFloatBE(o - 4);
      case 6: need(8); o += 8; return buf.readDoubleBE(o - 8);
      case 7: { need(4); const n = buf.readInt32BE(o); o += 4; if (n < 0) throw new Error('NBT roto'); need(n); o += n; return null; }   // arrays de bytes: se saltan
      case 8: return str();
      case 9: { need(5); const it = buf.readInt8(o++), n = buf.readInt32BE(o); o += 4; if (n < 0 || n > 4e6) throw new Error('NBT roto'); const a = []; for (let i = 0; i < n; i++) a.push(val(it, depth + 1)); return a; }
      case 10: { const c = {}; for (;;) { need(1); const tt = buf.readInt8(o++); if (tt === 0) break; const k = str(); c[k] = val(tt, depth + 1); } return c; }
      case 11: { need(4); const n = buf.readInt32BE(o); o += 4; if (n < 0) throw new Error('NBT roto'); need(n * 4); o += n * 4; return null; }
      case 12: { need(4); const n = buf.readInt32BE(o); o += 4; if (n < 0) throw new Error('NBT roto'); need(n * 8); o += n * 8; return null; }
      default: throw new Error('Etiqueta NBT desconocida ' + t);
    }
  };
  need(1);
  if (buf.readInt8(o++) !== 10) throw new Error('level.dat no empieza con un compuesto');
  str();
  return val(10, 0);
}

const MODES = ['survival', 'creative', 'adventure', 'spectator'];

/** Datos de un level.dat: nombre, modo de juego, versión y última vez que se jugó (ms). */
function levelInfo(buf) {
  const d = (readNbt(buf) || {}).Data || {};
  const v = d.Version && typeof d.Version === 'object' ? d.Version : {};
  return {
    name: typeof d.LevelName === 'string' ? d.LevelName : '',
    mode: d.hardcore ? 'hardcore' : MODES[d.GameType | 0] || 'survival',
    ver: typeof v.Name === 'string' ? v.Name : '',
    last: Number.isFinite(d.LastPlayed) ? d.LastPlayed : 0,
  };
}

module.exports = { readNbt, levelInfo };
