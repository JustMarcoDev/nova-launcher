// Revisión estática: sintaxis, archivos enlazados, canales entre la app y la interfaz, versión y notas.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const fails = []; const bad = m => fails.push(m);

// 1. Sintaxis de todos los .js
const js = ['main.js', 'preload.js', ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f), ...fs.readdirSync(path.join(root, 'scripts')).map(f => 'scripts/' + f), ...fs.readdirSync(__dirname).filter(f => f.endsWith('.js')).map(f => 'tests/' + f)];
for (const f of js) { const r = cp.spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' }); if (r.status) bad('Error de sintaxis en ' + f + '\n' + r.stderr.split('\n').slice(0, 4).join('\n')); }
console.log('sintaxis: ' + js.length + ' archivos revisados');

// 2. index.html enlaza archivos que existen y no deja ningún .js sin usar
const html = rd('index.html'), refs = [...html.matchAll(/(?:src|href)="((?:js|css|lang)\/[^"]+)"/g)].map(m => m[1]);
for (const r of refs) if (!fs.existsSync(path.join(root, r))) bad('index.html enlaza ' + r + ' pero no existe');
for (const f of fs.readdirSync(path.join(root, 'js'))) if (!refs.includes('js/' + f)) bad('js/' + f + ' no está enlazado en index.html');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) bad('ids repetidos en index.html: ' + [...new Set(dup)].join(', '));

// 3. Todo lo que la interfaz pide a la app existe en main.js
const main = rd('main.js'), pre = rd('preload.js');
const handled = new Set([...main.matchAll(/ipcMain\.(?:handle|on)\('([^']+)'/g)].map(m => m[1]));
for (const m of pre.matchAll(/invoke\('([^']+)'/g)) if (!handled.has(m[1])) bad('preload.js llama a «' + m[1] + '» y main.js no lo atiende');
const api = new Set([...pre.matchAll(/^\s*([a-zA-Z]+):\s/gm)].map(m => m[1]).concat([...pre.matchAll(/,\s*([a-zA-Z]+):\s/g)].map(m => m[1])));
const used = new Set(); for (const f of fs.readdirSync(path.join(root, 'js'))) for (const m of rd('js/' + f).matchAll(/\bA\.([a-zA-Z]+)\(/g)) used.add(m[1]);
for (const u of used) if (u !== 'on' && !api.has(u)) bad('la interfaz usa A.' + u + '() y preload.js no lo ofrece');

// 3a. Idiomas bajo demanda: cada idioma de la lista tiene su archivo y index.html no los carga todos
{ const m = /const LANG_ORDER=(\[[^\]]*\])/.exec(rd('js/idioma.js')); const order = m ? JSON.parse(m[1]) : [];
  if (!order.length) bad('no se encuentra LANG_ORDER en js/idioma.js');
  for (const k of order) if (k !== 'es' && !fs.existsSync(path.join(root, 'lang', k + '.js'))) bad('falta lang/' + k + '.js');
  if (/<script src="lang\//.test(html)) bad('index.html carga archivos de idioma directamente: deben cargarse solo los activos'); }
// 3b. Idiomas: cada traducción conserva las partes variables {1}, {2}…
for (const f of fs.readdirSync(path.join(root, 'lang')).filter(x => x.endsWith('.js'))) {
  const w = {}; try { new Function('window', rd('lang/' + f))(w); } catch (e) { bad('lang/' + f + ': ' + e.message); continue; }
  const L = w.LANGS && Object.values(w.LANGS)[0]; if (!L || !L.name || !L.d) { bad('lang/' + f + ' no define name y d'); continue; }
  const ph = s => (String(s).match(/\{\d+\}/g) || []).sort().join();
  let n = 0; for (const [k, v] of Object.entries(L.d)) { n++; if (ph(k) !== ph(v)) bad('lang/' + f + ': «' + k.slice(0, 50) + '» no conserva las partes variables'); if (!String(v).trim()) bad('lang/' + f + ': «' + k.slice(0, 50) + '» está vacío'); }
  console.log('idioma ' + L.name + ': ' + n + ' textos');
}

// 4. Versión y notas
const pkg = JSON.parse(rd('package.json'));
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(pkg.version)) bad('versión no válida: ' + pkg.version);
const nt = cp.spawnSync(process.execPath, [path.join(root, 'scripts/release-notes.js'), pkg.version], { encoding: 'utf8' }).stdout;
if (/No hay una entrada/.test(nt)) bad('el README no tiene la entrada de la versión ' + pkg.version);
const ver = (rd('js/ajustes.js').match(/let VER="([^"]+)"/) || [])[1];
if (ver !== pkg.version) bad('VER en js/ajustes.js (' + ver + ') no coincide con package.json (' + pkg.version + ')');

if (fails.length) { console.log('\nFALLOS (' + fails.length + '):'); fails.forEach(f => console.log(' ✕ ' + f)); process.exit(1); }
console.log('Revisión estática correcta · versión ' + pkg.version);
