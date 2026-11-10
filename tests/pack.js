// Prueba de la lógica pura de «Compartir modpack» (main/pack-core.js): codificar y decodificar, enlaces manipulados o demasiado grandes y vista previa
const assert = require('assert');
const zlib = require('zlib');
const C = require('../main/pack-core');

const B62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const crypto = require('crypto');
const id = () => Array.from(crypto.randomBytes(8), b => B62[b % 62]).join('');
const sha = () => crypto.randomBytes(20).toString('hex');
const man = (n = 60) => ({ v: 1, n: 'Mi pack', mc: '1.21.1', ld: 'Fabric', lv: '0.16.9', ram: 6, ic: 'box', co: '#2ee06f', f: Array.from({ length: n }, (_, k) => ['mrs'[k % 3], id(), id(), sha()]) });
const fails = (fn, re, msg) => assert.throws(fn, e => re.test(e.message), msg);
const pack = o => zlib.deflateRawSync(Buffer.from(JSON.stringify(o))).toString('base64url');

// 1. Ida y vuelta: lo que sale es igual a lo que entró (y no cambia con el orden de los campos)
{
  const m = man(), d = C.encode(m);
  assert.deepStrictEqual(C.decode(d), m, 'codificar y decodificar da lo mismo');
  assert.deepStrictEqual(C.decode(d), C.validate(m));
  assert.ok(/^[A-Za-z0-9_-]+$/.test(d), 'base64url: sin +, / ni =');
  const v = { v: 1, n: 'Vanilla', mc: '1.20.4', ld: 'Vanilla', f: [] };
  assert.deepStrictEqual(C.decode(C.encode(v)), { v: 1, n: 'Vanilla', mc: '1.20.4', ld: 'Vanilla', lv: '', ram: 0, ic: '', co: '', f: [] }, 'los campos opcionales vuelven vacíos');
  const dup = man(3); dup.f.push(dup.f[0]); assert.strictEqual(C.decode(C.encode(dup)).f.length, 3, 'un mismo archivo no se repite');
}
// 2. Los tres formatos de enlace dan el mismo modpack
{
  const m = man(20), L = C.links(m, 'https://ejemplo.dev/nova-launcher-web/');
  assert.ok(L.app.startsWith('nova://pack?d=') && L.web.startsWith('https://ejemplo.dev/nova-launcher-web/pack#'), 'formatos de enlace');
  const d = L.app.split('d=')[1];
  for (const t of [L.app, L.web, d, '  ' + L.app + '\n', d.replace(/(.{40})/g, '$1\n')]) assert.deepStrictEqual(C.fromLink(t), C.validate(m));
}
// 3. Enlaces manipulados o mal formados
{
  const d = C.encode(man(10));
  fails(() => C.fromLink(''), /Pega/);
  fails(() => C.decode(''), /vacío/);
  fails(() => C.decode(d + '!'), /no es válido/, 'caracteres que no son base64url');
  fails(() => C.decode(d.slice(0, d.length - 12)), /dañado|incompleto|no es válido/, 'cortado');
  fails(() => C.decode(d.slice(0, 20) + (d[20] === 'A' ? 'B' : 'A') + d.slice(21)), /dañado|incompleto|no tiene el formato|no es válido|no válid/, 'un carácter cambiado');
  fails(() => C.decode(Buffer.from('no soy deflate').toString('base64url')), /dañado|incompleto/);
  fails(() => C.decode(zlib.deflateRawSync(Buffer.from('{no json')).toString('base64url')), /dañado/);
  fails(() => C.fromLink('javascript:alert(1)'), /Solo se aceptan/);
  fails(() => C.fromLink('file:///etc/passwd'), /Solo se aceptan/);
  fails(() => C.fromLink('http://ejemplo.dev/pack#' + d), /Solo se aceptan/, 'http sin cifrar');
  fails(() => C.fromLink('nova://otra-cosa?d=' + d), /no es de un modpack/);
  fails(() => C.fromLink('https://ejemplo.dev/otra#' + d), /no es de un modpack/);
  // demasiado grande: texto largo y «bomba» (pequeña comprimida, enorme descomprimida)
  fails(() => C.decode('A'.repeat(C.MAX_ENC + 1)), /demasiado grande/);
  const bomba = zlib.deflateRawSync(Buffer.alloc(C.MAX_RAW + 1000, 'a'), { level: 9 }).toString('base64url');
  assert.ok(bomba.length < C.MAX_ENC, 'la bomba cabe en el límite del enlace, así que solo la frena el tamaño descomprimido');
  fails(() => C.decode(bomba), /demasiado grande/);
  const muchos = man(C.MAX_FILES + 1); fails(() => C.encode(muchos), /demasiados/);
  fails(() => C.decode(pack({ ...man(2), f: muchos.f })), /demasiados/);
}
// 4. Campos obligatorios y formatos (ids de Modrinth, sha1, versiones, cargador…)
{
  const ok = man(2), f0 = ok.f[0];
  const mal = (o, re, msg) => fails(() => C.validate({ ...ok, ...o }), re, msg);
  fails(() => C.validate(null), /formato/); fails(() => C.validate([]), /formato/);
  mal({ v: 2 }, /más nueva/); mal({ v: undefined }, /más nueva/);
  mal({ n: '' }, /nombre/); mal({ n: ' <>/:  ' }, /nombre/);
  mal({ mc: '' }, /Minecraft/); mal({ mc: '../1.21' }, /Minecraft/); mal({ mc: '1.21 x' }, /Minecraft/);
  mal({ ld: 'Quilt' }, /Cargador/); mal({ ld: 'Fabric', lv: '' }, /cargador/); mal({ lv: '0.16/../x' }, /cargador/);
  mal({ ram: -1 }, /RAM/); mal({ ram: 65 }, /RAM/); mal({ ram: 2.5 }, /RAM/); mal({ ram: '8' }, /RAM/);
  mal({ ic: 'a b!' }, /Icono/); mal({ co: 'rojo' }, /Color/);
  mal({ f: 'nada' }, /Faltan/); mal({ f: [['m', id()]] }, /no es válido/);
  mal({ f: [['x', id(), id(), sha()]] }, /Tipo/);
  mal({ f: [['m', 'corto', id(), sha()]] }, /identificador/); mal({ f: [['m', id(), 'con espacio', sha()]] }, /identificador/);
  mal({ f: [['m', id() + '9', id(), sha()]] }, /identificador/, 'ids de 9 caracteres');
  mal({ f: [['m', id(), id(), 'ABCDEF' + sha().slice(6)]] }, /huella/, 'el sha1 va en minúsculas');
  mal({ f: [['m', id(), id(), sha().slice(1)]] }, /huella/);
  mal({ f: [{ t: 'm', p: id(), v: id(), h: sha() }] }, /no es válido/, 'los archivos son listas, no objetos');
  assert.ok(C.validate({ ...ok, extra: 'se ignora', __proto__: { x: 1 } }) && !('extra' in C.validate({ ...ok, extra: 1 })), 'los campos desconocidos no pasan');
  assert.deepStrictEqual(Object.keys(C.validate(ok)).sort(), ['co', 'f', 'ic', 'ld', 'lv', 'mc', 'n', 'ram', 'v'], 'solo campos conocidos');
  assert.strictEqual(C.validate({ ...ok, n: 'A'.repeat(100) }).n.length, 40, 'el nombre se recorta a 40');
  void f0;
}
// 5. Armar el manifiesto desde la instancia: lo que no está en Modrinth se queda fuera y se avisa
{
  const items = [
    { t: 'm', file: 'sodium.jar', sha1: sha(), found: { project_id: id(), id: id() } },
    { t: 'm', file: 'propio.jar', sha1: sha(), found: null },
    { t: 'r', file: 'faithful.zip', sha1: sha(), found: { project_id: id(), id: id() } },
    { t: 's', file: 'mi-shader.zip', sha1: sha(), found: null },
  ];
  const { man: m, left } = C.build({ name: 'Mi instancia', mc: '1.21.1', ld: 'Fabric', loaderVersion: '0.16.9', ram: 4, icon: 'box', color: '#112233' }, items);
  assert.strictEqual(m.f.length, 2); assert.deepStrictEqual(left, [{ t: 'm', file: 'propio.jar' }, { t: 's', file: 'mi-shader.zip' }]);
  assert.deepStrictEqual(m.f.map(x => x[0]), ['m', 'r']); assert.strictEqual(m.ram, 4);
  assert.deepStrictEqual(C.decode(C.encode(m)), m);
  assert.ok(!JSON.stringify(m).match(/Users|\.options|accounts|saves/i), 'el manifiesto no lleva rutas, cuentas ni mundos');
}
// 6. Vista previa: cuenta bien los mods, suma el tamaño y lista lo que falta
{
  const f = [], V = [];
  const ver = (t, size, over = {}) => { const p = id(), v = id(), h = sha(); V.push({ id: v, project_id: p, files: [{ url: 'https://cdn.modrinth.com/data/' + p + '/versions/' + v + '/x', filename: v + (t === 'm' ? '.jar' : '.zip'), size, hashes: { sha1: h, sha512: 'ab' } }], ...over }); return [t, p, v, h]; };
  f.push(ver('m', 1000), ver('m', 2000), ver('m', 3000), ver('r', 500), ver('s', 250));        // 5 que sí están
  f.push(['m', id(), id(), sha()]);                                                           // 1: Modrinth ya no tiene esa versión
  const cambiado = ver('m', 10); V[V.length - 1].files[0].hashes.sha1 = sha(); f.push(cambiado);  // 2: el archivo ya no coincide con el sha1
  const ajeno = ver('m', 10); f.push([ajeno[0], id(), ajeno[2], ajeno[3]]);                      // 3: la versión es de otro proyecto
  const m = C.validate({ ...man(0), f });
  const p = C.preview(m, V);
  assert.strictEqual(p.mods, 3, 'mods encontrados'); assert.strictEqual(p.resourcepacks, 1); assert.strictEqual(p.shaders, 1);
  assert.strictEqual(p.size, 6750, 'tamaño estimado'); assert.strictEqual(p.total, 8);
  assert.strictEqual(p.missing.length, 3, 'faltan: versión retirada, huella distinta y proyecto que no coincide');
  assert.strictEqual(p.list.length, 5); assert.ok(p.list.every(x => /^https:\/\/cdn\.modrinth\.com\//.test(x.url) && /^[0-9a-f]{40}$/.test(x.sha1)));
  assert.strictEqual(p.mods + p.resourcepacks + p.shaders + p.missing.length, p.total, 'todo cuenta o falta');
  assert.strictEqual(C.preview(C.validate({ ...man(0) }), []).mods, 0, 'sin archivos');
}
// 7. Un modpack grande cabe en un enlace razonable
{
  const L = C.links(man(300), 'https://x.dev');
  assert.ok(L.length < 30000, 'enlace de 300 archivos: ' + L.length + ' caracteres');
}
console.log('Compartir modpack correcto: ida y vuelta, enlaces manipulados o demasiado grandes rechazados y vista previa con el recuento exacto');
