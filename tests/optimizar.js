// Prueba de «Optimizar FPS» (main/optimizar-core.js): mods por cargador y ajustes de options.txt que solo se bajan
const assert = require('assert');
const C = require('../main/optimizar-core');

const slugs = (ld, mc) => C.modsFor(ld, mc).map(m => m[0]);
assert.deepStrictEqual(slugs('Fabric', '1.21.1'), ['sodium', 'lithium', 'ferrite-core', 'immediatelyfast', 'entityculling', 'modernfix']);
assert(slugs('Forge', '1.20.1').includes('embeddium') && !slugs('Forge', '1.20.1').includes('sodium'));
assert(slugs('NeoForge', '1.21.1').includes('sodium') && slugs('NeoForge', '1.20.4').includes('embeddium') && !slugs('NeoForge', '1.20.4').includes('sodium'));
assert.deepStrictEqual(slugs('Vanilla', '1.21'), []); assert.deepStrictEqual(slugs('', ''), []);
for (const l of ['fabric', 'forge', 'neoforge']) for (const [s, frag] of C.modsFor(l, '1.21')) assert(/^[a-z0-9-]+$/.test(s) && frag);

// options.txt: se bajan los valores pesados, el resto queda igual (orden, claves desconocidas y saltos de línea)
const o = ['version:3955', 'renderDistance:24', 'simulationDistance:16', 'entityDistanceScaling:1.0', 'biomeBlendRadius:5', 'graphicsMode:2', 'particles:0', 'entityShadows:true', 'renderClouds:true', 'enableVsync:true', 'maxFps:60', 'fov:0.5', 'key_key.jump:key.keyboard.space', ''];
for (const nl of ['\n', '\r\n']) {
  const r = C.tweak(o.join(nl)), L = r.text.split(nl);
  assert.strictEqual(L.length, o.length); assert.strictEqual(r.changes.length, 10);
  assert.deepStrictEqual(L, ['version:3955', 'renderDistance:12', 'simulationDistance:8', 'entityDistanceScaling:0.75', 'biomeBlendRadius:2', 'graphicsMode:1', 'particles:1', 'entityShadows:false', 'renderClouds:fast', 'enableVsync:false', 'maxFps:260', 'fov:0.5', 'key_key.jump:key.keyboard.space', '']);
  if (nl === '\n') assert(!r.text.includes('\r'));
}
// ya optimizado, o más bajo: no cambia nada; y nunca se sube
const low = 'renderDistance:6\nsimulationDistance:5\nentityDistanceScaling:0.5\nbiomeBlendRadius:0\ngraphicsMode:0\nparticles:2\nentityShadows:false\nrenderClouds:false\nenableVsync:false\nmaxFps:260\n';
const r2 = C.tweak(low); assert.strictEqual(r2.text, low); assert.deepStrictEqual(r2.changes, []);
assert.strictEqual(C.tweak('renderClouds:fast\nmaxFps:144\n').changes.length, 0);
// claves que no existen no se añaden; texto vacío o raro no rompe
assert.strictEqual(C.tweak('').text, ''); assert.strictEqual(C.tweak('basura sin dos puntos\nrenderDistance:abc').changes.length, 0);
assert(!/renderDistance/.test(C.tweak('fov:0.5').text));
console.log('tests/optimizar.js: mods por cargador y options.txt (solo se bajan ajustes, nunca se suben ni se añaden)');
