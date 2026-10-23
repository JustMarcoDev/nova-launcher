// Sube solo la beta al fusionar cambios de mod/ en main: 0.2.15-beta.12 → 0.2.15-beta.13.
// Actualiza package.json, VER de js/base.js, la versión de index.html y añade una entrada al README con los commits del cambio.
// Uso: node scripts/auto-bump.js <commit anterior> <commit nuevo>   (lo llama «Crear version» en cada push a main que toque mod/)
// Si la versión no es beta (p. ej. 0.2.16 o 0.2.15), no hace nada: esas las sube una persona a mano.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s);

const pkg = JSON.parse(read('package.json'));
const m = /^(\d+\.\d+\.\d+)-beta\.(\d+)$/.exec(pkg.version);
if (!m) { console.log('La versión ' + pkg.version + ' no es beta: no se sube sola.'); process.exit(0); }
const next = m[1] + '-beta.' + (Number(m[2]) + 1);
const [before, after] = process.argv.slice(2);

// Commits que tocan mod/ en este push (los títulos van a las notas de la versión)
let subjects = [];
try {
  const range = before && !/^0+$/.test(before) ? before + '..' + (after || 'HEAD') : '-n 5';
  subjects = cp.execSync('git log ' + range + ' --pretty=%s -- mod', { cwd: root, encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean);
} catch { }
if (!subjects.length) subjects = ['Cambios en el menú de Nova'];

// 1. package.json (mismo formato: 2 espacios)
pkg.version = next;
write('package.json', JSON.stringify(pkg, null, 2) + '\n');

// 2. VER de js/base.js
const base = read('js/base.js');
if (!base.includes('let VER="' + m[0] + '"')) { console.error('No encuentro let VER="' + m[0] + '" en js/base.js'); process.exit(1); }
write('js/base.js', base.replace('let VER="' + m[0] + '"', 'let VER="' + next + '"'));

// 3. Versión escrita en index.html
const idx = read('index.html');
const idxNew = idx.replace('<b id="k4">' + m[0] + '</b>', '<b id="k4">' + next + '</b>');
if (idxNew === idx) { console.error('No encuentro la versión ' + m[0] + ' en index.html'); process.exit(1); }
write('index.html', idxNew);

// 4. Entrada en el README (la exige tests/check.js y la usan las notas de la release)
const readme = read('README.md');
const anchor = '\n### ' + m[0] + ' ';
if (!readme.includes(anchor)) { console.error('No encuentro la entrada ' + m[0] + ' en el README'); process.exit(1); }
const entry = '\n### ' + next + ' — Actualización automática del menú de Nova\n\n' +
  subjects.map(s => '- ' + s).join('\n') + '\n';
write('README.md', readme.replace(anchor, entry + anchor));

console.log('Versión ' + m[0] + ' → ' + next);
