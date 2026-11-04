// Historial por canal: con beta se ve todo; con oficial solo las estables, cada una con lo de sus betas dentro (en la app y en las notas de la release).
const fs = require('fs'), path = require('path'), vm = require('vm');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
// --- app: clhVista (js/ajustes.js) ---
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ajustes.js'), 'utf8');
const a = src.indexOf('function clhVista('), b = src.indexOf('const clhActual');
const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + '\nthis.clhVista = clhVista;', ctx);
const cv = (v, t, secs) => '<div class="cv"><h5>' + v + ' · ' + t + '</h5>' + Object.entries(secs).map(([k, l]) => '<div class="ct ' + k + '">X</div><ul>' + l.map(x => '<li>' + x + '</li>').join('') + '</ul>').join('') + '</div>';
const H = cv('0.3.0-beta.2', 'Beta dos', { a: ['b2 añade'], fx: ['b2 arregla'] }) + cv('0.3.0-beta.1', 'Beta uno', { a: ['b1 añade', 'igual'], m: ['b1 mejora'] }) +
  cv('0.2.9', 'Estable vieja', { a: ['vieja añade'] }) + cv('0.2.9-beta.1', 'Beta vieja', { a: ['vieja beta añade', 'igual'], q: ['vieja beta quita'] });
const hs = h => (h.match(/<h5>\S+( <small>actual)?/g) || []).map(x => x.slice(4).replace(' <small>actual', '*'));
const vb = ctx.clhVista(H, true, '0.3.0-beta.2');
ok(hs(vb).join('|') === '0.3.0-beta.2*|0.3.0-beta.1|0.2.9|0.2.9-beta.1', 'beta debe verlo todo, con la versión actual marcada (' + hs(vb).join('|') + ')');
const vs = ctx.clhVista(H, false, '0.2.9');
ok(hs(vs).join('|') === '0.2.9*', 'oficial solo ve las estables y no las betas sin estable (' + hs(vs).join('|') + ')');
ok(/vieja añade/.test(vs) && /vieja beta añade/.test(vs) && /vieja beta quita/.test(vs), 'la estable debe traer lo de sus betas');
ok((vs.match(/>igual</g) || []).length === 1 && !/b1 añade/.test(vs) && !/b2 /.test(vs), 'no repetir líneas ni mezclar betas de otra versión');
ok(/<div class="ct q">/.test(vs) && !/class="ct f"/.test(vb), 'categorías: Quitado presente y «Arreglado» sin la clase .f que rompe el estilo');
ok(!/<small>actual<\/small>/.test(ctx.clhVista(H, false, '0.3.0-beta.2')), 'una beta en canal oficial no marca ninguna como actual');
// --- release: scripts/release-notes.js ---
const N = require('../scripts/release-notes.js');
const md = '# Hist\n\n### 0.3.0-beta.2 — Dos\n\n- **B2**: dos\n\n### 0.3.0-beta.1 — Uno\n\n- **B1**: uno\n- común\n\n### 0.2.9 — Estable\n\n- **E**: estable\n- común\n\n### 0.2.9-beta.1 — Vieja\n\n- **V**: vieja\n- común\n';
const ns = N.notas('0.2.9', md), nb = N.notas('0.3.0-beta.2', md);
ok(/\*\*E\*\*/.test(ns) && /\*\*V\*\*: vieja/.test(ns) && !/0\.2\.9-beta/.test(ns), 'la estable debe traer lo de sus betas sin nombrarlas');
ok((ns.match(/- común/g) || []).length === 1, 'la estable no repite líneas');
ok(!/B1|B2/.test(ns), 'la estable no trae betas de otra versión');
ok(/\*\*B2\*\*/.test(nb) && !/\*\*B1\*\*/.test(nb) && /Versión \*\*beta\*\*/.test(nb), 'una beta solo lleva su propia entrada');
ok(N.take(md, '0.2.9').head.startsWith('0.2.9 —'), 'take no debe confundir 0.2.9 con 0.2.9-beta.1');
// el CHANGELOG real: cada release estable existente genera notas
const real = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
ok(/### Y todo lo que llegó durante las betas/.test(N.notas('0.2.17', real)), 'las notas reales de 0.2.17 deberían incluir lo de sus betas');
if (fails.length) { console.error('FALLOS en el historial:\n' + fails.map(f => ' ✕ ' + f).join('\n')); process.exit(1); }
console.log('Historial correcto: beta ve todo; oficial ve solo estables con lo de sus betas dentro, en la app y en las notas');
