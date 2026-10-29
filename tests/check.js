// Revisión estática: sintaxis, archivos enlazados, canales entre la app y la interfaz, versión y notas.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const fails = []; const bad = m => fails.push(m);

// 1. Sintaxis de todos los .js
const js = ['main.js', ...fs.readdirSync(path.join(root, 'main')).filter(f => f.endsWith('.js')).map(f => 'main/' + f), 'preload.js', 'nvb.js', ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f), ...fs.readdirSync(path.join(root, 'scripts')).filter(f => f.endsWith('.js')).map(f => 'scripts/' + f), ...fs.readdirSync(__dirname).filter(f => f.endsWith('.js')).map(f => 'tests/' + f)];
for (const f of js) { const r = cp.spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' }); if (r.status) bad('Error de sintaxis en ' + f + '\n' + r.stderr.split('\n').slice(0, 4).join('\n')); }
console.log('sintaxis: ' + js.length + ' archivos revisados');

// 2. index.html enlaza archivos que existen y no deja ningún .js sin usar
const html = rd('index.html'), refs = [...html.matchAll(/(?:src|href)="((?:js|css|lang)\/[^"]+)"/g)].map(m => m[1]);
for (const r of refs) if (!fs.existsSync(path.join(root, r))) bad('index.html enlaza ' + r + ' pero no existe');
for (const f of fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'))) if (!refs.includes('js/' + f)) bad('js/' + f + ' no está enlazado en index.html');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) bad('ids repetidos en index.html: ' + [...new Set(dup)].join(', '));

// 3. Todo lo que la interfaz pide a la app existe en main.js
const main = ['main.js', ...fs.readdirSync(path.join(root, 'main')).filter(f => f.endsWith('.js')).map(f => 'main/' + f)].map(rd).join('\n'), pre = rd('preload.js');
const handled = new Set([...main.matchAll(/ipcMain\.(?:handle|on)\('([^']+)'/g)].map(m => m[1]));
for (const m of pre.matchAll(/invoke\('([^']+)'/g)) if (!handled.has(m[1])) bad('preload.js llama a «' + m[1] + '» y main.js no lo atiende');
const api = new Set([...pre.matchAll(/^\s*([a-zA-Z]+):\s/gm)].map(m => m[1]).concat([...pre.matchAll(/,\s*([a-zA-Z]+):\s/g)].map(m => m[1])));
const used = new Set(); for (const f of fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'))) for (const m of rd('js/' + f).matchAll(/\bA\.([a-zA-Z]+)\(/g)) used.add(m[1]);
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

// 3c. Todos los idiomas completos tienen las mismas frases que el inglés (si falta una, esa frase se queda en español sin avisar)
{ const get = f => { const w = {}; new Function('window', rd('lang/' + f))(w); return Object.values(w.LANGS)[0]; };
  const en = get('en.js').d;
  for (const f of fs.readdirSync(path.join(root, 'lang')).filter(x => x.endsWith('.js') && x !== 'en.js' && x !== 'es-419.js')) {
    const d = get(f).d, falta = Object.keys(en).filter(k => !(k in d));
    if (falta.length) bad('lang/' + f + ' no traduce ' + falta.length + ' frases que sí están en inglés, por ejemplo: «' + falta.slice(0, 3).map(x => x.slice(0, 50)).join('», «') + '»');
  } }
// 4. Versión y notas
const pkg = JSON.parse(rd('package.json'));
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(pkg.version)) bad('versión no válida: ' + pkg.version);
const nt = cp.spawnSync(process.execPath, [path.join(root, 'scripts/release-notes.js'), pkg.version], { encoding: 'utf8' }).stdout;
if (/No hay una entrada/.test(nt)) bad('el README no tiene la entrada de la versión ' + pkg.version);
const ver = (rd('js/base.js').match(/let VER="([^"]+)"/) || [])[1];
if (ver !== pkg.version) bad('VER en js/base.js (' + ver + ') no coincide con package.json (' + pkg.version + ')');

// Menú de Nova: versiones de mod/versions.txt = NOVA_MC de main.js, con su .jar; vídeo de fondo y avisos de licencias presentes
{
  const vs = [...rd('mod/versions.txt').split(/\r?\n/), ...rd('mod26/versions.txt').split(/\r?\n/)].filter(l => l.trim() && !l.startsWith('#')).map(l => l.split(/\s+/)[0]);
  const nm = (main.match(/const NOVA_MC = \[([^\]]*)\]/) || [, ''])[1].split(',').map(x => x.replace(/['"\s]/g, '')).filter(Boolean);
  if (vs.join() !== nm.join()) bad('mod/versions.txt + mod26/versions.txt (' + vs.join() + ') no coinciden con NOVA_MC de main.js (' + nm.join() + ')');
  // Los .jar y los .nvb no están en git: en el release se compilan/descargan antes; la revisión de cada push (NOVA_SIN_JARS=1) no los necesita
  // Instalador ligero: solo van dentro las versiones de assets/incluidas.json (su jar y su Fabric); el resto se descarga la primera vez
  const inc = JSON.parse(rd('assets/incluidas.json')).versiones || [], files = (pkg.build && pkg.build.files) || [];
  for (const v of inc) {
    if (!vs.includes(v)) bad('assets/incluidas.json: ' + v + ' no está en las versiones del menú de Nova');
    if (!fs.existsSync(path.join(root, 'assets/fabric/' + v + '.json'))) bad('assets/incluidas.json: falta assets/fabric/' + v + '.json');
    if (!process.env.NOVA_SIN_JARS && !fs.existsSync(path.join(root, 'assets/mods/nova-menu-' + v + '.jar'))) bad('falta assets/mods/nova-menu-' + v + '.jar (versión incluida en el instalador)');
    if (files.some(f => f === '!assets/mods/nova-menu-' + v + '.jar' || f === '!assets/fabric/' + v + '.json')) bad('package.json excluye la versión incluida ' + v);
  }
  for (const v of vs) if (!inc.includes(v)) for (const f of ['!assets/mods/nova-menu-' + v + '.jar', '!assets/fabric/' + v + '.json']) if (!files.includes(f)) bad('package.json: falta excluir ' + f + ' del instalador (no está en assets/incluidas.json)');
  if (!process.env.NOVA_SIN_JARS) for (const v of vs) if (!fs.existsSync(path.join(root, 'assets/mods/nova-menu-' + v + '.jar'))) bad('falta assets/mods/nova-menu-' + v + '.jar');
  { const mj = JSON.parse(rd('assets/mirrors.json')); if (!Array.isArray(mj.rules) || !mj.rules.every(r => Array.isArray(r.match) && Array.isArray(r.mirrors))) bad('assets/mirrors.json: cada regla necesita «match» y «mirrors»'); }
  const bg = path.join(root, 'assets/nova-bg.nvb');
  if (!fs.existsSync(bg) || fs.readFileSync(bg).subarray(0, 4).toString() !== 'NVB1') bad('assets/nova-bg.nvb falta o no es un vídeo NVB1');
  if (!fs.existsSync(path.join(root, 'THIRD-PARTY-NOTICES.txt'))) bad('falta THIRD-PARTY-NOTICES.txt');
  console.log('menú de Nova: ' + vs.join(', ') + ' · vídeo y licencias presentes');
}

// Modo juego: pausar las animaciones dejaba la interfaz invisible (las de entrada se quedaban en opacity 0)
{
  const css = rd('css/style.css');
  if (/\.gm[^{]*\{[^}]*animation-play-state\s*:\s*paused/.test(css)) bad('css: el modo juego (.gm) no debe pausar animaciones (la interfaz se queda invisible); haz que terminen al instante');
  const wf = rd('.github/workflows/release.yml');
  if (!/signAndEditExecutable=true/.test(wf) || !/CSC_LINK/.test(wf)) bad('release.yml: falta escribir los datos del .exe y la firma opcional (CSC_LINK)');
}

// Marcadores seguros del mod (código por partida; el chat no puede pedirle nada al launcher)
{
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'marcas.js')], { encoding: 'utf8' });
  if (r.status !== 0) bad('tests/marcas.js falló:\n' + (r.stdout || '') + (r.stderr || ''));
  else console.log(r.stdout.trim());
  const jg = rd('main/juego.js');
  if (/\[NOVA:[A-Z]/.test(jg.replace(/\/\/.*$/gm, ''))) bad('main/juego.js: los marcadores se leen solo con main/marcas.js (con el código de la partida)');
}

if (fails.length) { console.log('\nFALLOS (' + fails.length + '):'); fails.forEach(f => console.log(' ✕ ' + f)); process.exit(1); }
console.log('Revisión estática correcta · versión ' + pkg.version);
