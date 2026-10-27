// =====================================================================================
// Nova Launcher · main/marcas.js
// Marcadores seguros del mod: lo que el juego escribe en su salida para pedirle cosas al launcher.
// Sin Electron a propósito: así se puede probar sola (tests/marcas.js).
// =====================================================================================
// El launcher inventa un código al azar para cada partida (-Dnova.key=<código>) y solo el mod lo conoce. Cada marcador lleva ese código:
//   [NOVA:<código>:NOMBRE]   o   [NOVA:<código>:NOMBRE:argumento]
// Un mensaje de chat (o un servidor, o un cartel) puede escribir «[NOVA:SETTINGS]» en el registro, pero no puede adivinar el código, y además
// se ignora cualquier línea del chat ([CHAT]). Un marcador sin el código correcto no hace nada.
const crypto = require('crypto');

const newKey = () => crypto.randomBytes(16).toString('hex');
const MARK = /\[NOVA:([0-9a-f]{32}):([A-Z]{2,12})(?::(.*?))?\]\s*$/;   // al final de la línea, tras el prefijo de hora e hilo que pone el juego

// Lee un trozo de la salida del juego (puede traer varias líneas o una a medias) y devuelve los marcadores válidos: [{ n, a }]
function parse(state, text, key) {
  const out = [];
  if (!key) return out;
  const lines = (state.buf + String(text)).split(/\r?\n/);
  state.buf = lines.pop();   // lo que queda sin salto de línea se completa con el siguiente trozo
  if (state.buf.length > 4000) state.buf = '';
  for (const ln of lines) out.push(...fromLine(ln, key));
  const m = state.buf && fromLine(state.buf, key);   // una línea completa a la que aún no le ha llegado el salto de línea
  if (m && m.length) { out.push(...m); state.buf = ''; }
  return out;
}

function fromLine(ln, key) {
  if (ln.length > 4000 || ln.includes('[CHAT]')) return [];
  const m = MARK.exec(ln);
  if (!m || m[1] !== key) return [];
  return [{ n: m[2], a: m[3] === undefined ? '' : m[3] }];
}

// Devuelve una función(texto) que llama a acciones[NOMBRE](argumento) por cada marcador válido (los nombres que no están en `acciones` se ignoran)
function handler(key, acciones) {
  const st = { buf: '' };
  return text => { for (const m of parse(st, text, key)) { const f = Object.prototype.hasOwnProperty.call(acciones, m.n) ? acciones[m.n] : null; if (f) { try { f(m.a); } catch {} } } };
}

module.exports = { newKey, parse, handler };
