// Saca del CHANGELOG la entrada de una versión (### x.y.z — Título) para usarla como notas de la release.
// Uso: node scripts/release-notes.js [versión] > release-notes.md
const fs = require('fs'), path = require('path');
const ver = String(process.argv[2] || require('../package.json').version).replace(/^v/, '');
const base = ver.split('-')[0]; // 0.2.12-beta.1 → 0.2.12
const md = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function take(v) {
  const m = new RegExp('^###\\s+' + esc(v) + '\\b[^\\n]*\\n([\\s\\S]*?)(?=^###\\s|^##\\s|(?![\\s\\S]))', 'm').exec(md);
  return m ? { head: m[0].split('\n')[0].replace(/^###\s+/, ''), body: m[1].trim() } : null;
}
const e = take(ver) || take(base);
let out;
if (e) {
  out = '## Nova Launcher ' + ver + '\n\n' + e.head.replace(/^\S+\s+[—-]\s+/, '') + '\n\n' + e.body.replace(/^\*\*(.+)\*\*$/gm, '### $1') + '\n';
  if (ver.includes('-')) out = '> Versión **beta**: puede tener fallos. Si algo falla, vuelve a la estable desde Ajustes → Acerca de.\n\n' + out;
} else {
  out = '## Nova Launcher ' + ver + '\n\nNo hay una entrada de esta versión en el historial del README.\n';
}
process.stdout.write(out);
