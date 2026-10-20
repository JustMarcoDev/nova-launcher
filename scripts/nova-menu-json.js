// Crea dist/nova-menu.json con la versión, la URL y el sha256 de cada nova-menu-<mc>.jar de assets/mods.
// El launcher lo lee antes de jugar para actualizar el menú de Nova sin necesitar una versión nueva del launcher.
// Uso: node scripts/nova-menu-json.js <versión>   (la versión del launcher que se está publicando, p. ej. 0.2.15-beta.5)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ver = String(process.argv[2] || require('../package.json').version).replace(/^v/, ''), tag = 'v' + ver;
const repo = 'JustMarcoDev/nova-launcher', dir = path.join(__dirname, '..', 'assets', 'mods');
let minLauncher = null;
try { minLauncher = fs.readFileSync(path.join(__dirname, '..', 'mod', 'min-launcher.txt'), 'utf8').trim() || null; } catch {}
const jars = {};
for (const f of fs.readdirSync(dir).sort()) {
  const m = /^nova-menu-(.+)\.jar$/.exec(f); if (!m) continue;
  jars[m[1]] = { version: ver, url: 'https://github.com/' + repo + '/releases/download/' + tag + '/' + f, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex'), ...(minLauncher ? { minLauncher } : {}) };
}
if (!Object.keys(jars).length) { console.error('No hay nova-menu-*.jar en assets/mods'); process.exit(1); }
fs.mkdirSync(path.join(__dirname, '..', 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'nova-menu.json'), JSON.stringify({ schema: 1, tag, jars }, null, 2) + '\n');
console.log('dist/nova-menu.json:', Object.keys(jars).join(', '));
