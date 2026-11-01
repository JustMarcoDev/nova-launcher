// Prueba de la lógica pura de los clips (main/clips-core.js): qué grabadora se usa, cuándo se reinicia, qué ventana es el juego y el nombre del archivo.
const assert = require('assert');
const C = require('../main/clips-core');
const t0 = 1_000_000;
assert.strictEqual(C.pick([0, 0], t0), -1, 'sin grabar no hay clip');
assert.strictEqual(C.pick([t0 - 3000, 0], t0), -1, 'con menos de 5 s no vale la pena');
assert.strictEqual(C.pick([t0 - 20000, 0], t0), 0, 'solo una grabadora');
assert.strictEqual(C.pick([t0 - 20000, t0 - 50000], t0), 1, 'gana la que lleva más grabado');
assert.strictEqual(C.pick([t0 - 59000, t0 - 29000], t0), 0);
assert.ok(C.due(t0 - 60000, t0) && !C.due(t0 - 59000, t0) && !C.due(0, t0), 'se reinicia a los 60 s');
// escalonadas: A empieza en 0 y B a los 30 s; en cualquier instante una lleva entre 30 y 60 s (salvo el primer medio minuto)
for (let s = 30; s < 600; s += 7) {
  const starts = [0, 0];
  for (let i = 0; i < 2; i++) { const off = i * 30; const k = Math.floor((s - off) / 60); starts[i] = s >= off ? off + k * 60 : 0; }
  const idx = C.pick(starts.map(x => (x === 0 && s < 30 ? 0 : t0 + x * 1000)), t0 + s * 1000);
  const ms = idx < 0 ? 0 : s * 1000 - (starts[idx] * 1000);
  assert.ok(ms >= 30000 && ms <= 60000, 'en el segundo ' + s + ' la grabadora elegida lleva ' + ms + ' ms');
}
assert.ok(C.isGameWindow('Minecraft 1.21.4') && C.isGameWindow('Minecraft* 1.20.1 - Singleplayer'));
assert.ok(!C.isGameWindow('Nova Launcher') && !C.isGameWindow('Minecraft Launcher') && !C.isGameWindow(''));
assert.strictEqual(C.clipName(new Date(2026, 10, 1, 9, 5, 7)), 'nova-clip-20261101-090507.webm');
assert.ok(!C.ramOk(8 * 1073741824, false) && C.ramOk(16 * 1073741824, false) && !C.ramOk(16 * 1073741824, true), 'con poca RAM se desactiva');
console.log('Clips correctos: elige la grabadora con 30–60 s, reinicia a los 60 s, reconoce la ventana del juego y se apaga con poca RAM');
