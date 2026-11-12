// =====================================================================================
// Nova Launcher · main/optimizar-core.js
// «Optimizar FPS» (lógica pura, sin Electron): qué mods de rendimiento le tocan a cada cargador y qué ajustes de options.txt se bajan.
// Los ajustes solo se BAJAN (nunca se sube una distancia ni se activa un efecto) y las claves que no existen no se añaden.
// =====================================================================================

// Mods de Modrinth por cargador. `has` es un trozo del nombre del archivo, para no reinstalar lo que ya está.
const MODS = {
  fabric: [['sodium', 'sodium'], ['lithium', 'lithium'], ['ferrite-core', 'ferritecore'], ['immediatelyfast', 'immediatelyfast'], ['entityculling', 'entityculling'], ['modernfix', 'modernfix']],
  forge: [['embeddium', 'embeddium'], ['ferrite-core', 'ferritecore'], ['modernfix', 'modernfix'], ['entityculling', 'entityculling']],
  neoforge: [['sodium', 'sodium'], ['ferrite-core', 'ferritecore'], ['modernfix', 'modernfix'], ['entityculling', 'entityculling']],
};

/** Lista [slug, trozoDelNombre] para un cargador y una versión de Minecraft. NeoForge 1.20.x usa Embeddium (Sodium solo existe para NeoForge desde la 1.21). */
function modsFor(ld, mc) {
  const k = String(ld || '').toLowerCase();
  if (!MODS[k]) return [];
  let l = MODS[k];
  if (k === 'neoforge' && /^1\.20(\.|$)/.test(String(mc))) l = l.map(m => m[0] === 'sodium' ? ['embeddium', 'embeddium'] : m);
  return l.map(m => m.slice());
}

const num = v => { const n = parseFloat(String(v).trim()); return Number.isFinite(n) ? n : null; };
// [clave, función(valorActual) → valor nuevo o null si ya está bien]
const RULES = [
  ['renderDistance', v => { const n = num(v); return n !== null && n > 12 ? '12' : null; }],
  ['simulationDistance', v => { const n = num(v); return n !== null && n > 8 ? '8' : null; }],
  ['entityDistanceScaling', v => { const n = num(v); return n !== null && n > 0.75 ? '0.75' : null; }],
  ['biomeBlendRadius', v => { const n = num(v); return n !== null && n > 2 ? '2' : null; }],
  ['graphicsMode', v => String(v).trim() === '2' ? '1' : null],   // Elegante → Detallado
  ['particles', v => String(v).trim() === '0' ? '1' : null],      // Todas → Reducidas
  ['entityShadows', v => String(v).trim() === 'true' ? 'false' : null],
  ['renderClouds', v => String(v).trim() === 'true' ? 'fast' : null],
  ['enableVsync', v => String(v).trim() === 'true' ? 'false' : null],
  ['maxFps', v => { const n = num(v); return n !== null && n < 120 ? '260' : null; }],   // 260 = sin límite
];

/** Devuelve { text, changes: [{ key, from, to }] }. Respeta el orden, los saltos de línea (CRLF o LF) y las líneas que no conoce. */
function tweak(text) {
  const src = String(text || ''), nl = src.includes('\r\n') ? '\r\n' : '\n', changes = [];
  const lines = src.split(/\r?\n/).map(line => {
    const m = /^([A-Za-z0-9_]+):(.*)$/.exec(line);
    if (!m) return line;
    const rule = RULES.find(r => r[0] === m[1]);
    if (!rule) return line;
    const to = rule[1](m[2]);
    if (to === null) return line;
    changes.push({ key: m[1], from: m[2].trim(), to });
    return m[1] + ':' + to;
  });
  return { text: lines.join(nl), changes };
}

module.exports = { MODS, modsFor, tweak, RULES };
