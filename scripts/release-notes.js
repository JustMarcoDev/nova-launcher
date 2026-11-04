// Saca del CHANGELOG las notas de una versión (### x.y.z — Título) para la release.
//  · Beta (x.y.z-beta.N): solo su entrada.
//  · Estable (x.y.z): su entrada MÁS lo que trajeron todas las betas de x.y.z (sin nombrar cada beta), para que quien solo recibe versiones
//    oficiales vea en una sola release todo lo que incluye.
// Uso: node scripts/release-notes.js [versión] > release-notes.md
const fs = require('fs'), path = require('path');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Entrada exacta de una versión: { head, body } o null (no confunde 0.2.17 con 0.2.17-beta.3). */
function take(md, v) {
  const m = new RegExp('^###\\s+' + esc(v) + '(?![\\w.-])[^\\n]*\\n([\\s\\S]*?)(?=^###\\s|^##\\s|(?![\\s\\S]))', 'm').exec(md);
  return m ? { head: m[0].split('\n')[0].replace(/^###\s+/, ''), body: m[1].trim() } : null;
}
/** Versiones beta de una estable, de la más antigua a la más nueva (en el CHANGELOG van de la más nueva a la más antigua). */
function betasDe(md, base) {
  const re = new RegExp('^###\\s+(' + esc(base) + '-beta\\.\\d+)(?![\\w.-])', 'gm'), L = []; let m;
  while ((m = re.exec(md))) L.push(m[1]);
  return L.reverse();
}
const fmt = b => b.replace(/^\*\*(.+)\*\*$/gm, '### $1');

function notas(ver, md) {
  ver = String(ver).replace(/^v/, ''); const base = ver.split('-')[0], beta = ver.includes('-');
  const e = take(md, ver) || take(md, base);
  if (!e) return '## Nova Launcher ' + ver + '\n\nNo hay una entrada de esta versión en el historial del README.\n';
  let body = fmt(e.body);
  if (!beta) {   // estable: se añade lo de sus betas, sin repetir líneas
    const seen = new Set(body.split('\n').map(l => l.trim()).filter(Boolean)), extra = [];
    for (const b of betasDe(md, base)) {
      const t = take(md, b); if (!t) continue;
      for (const l of fmt(t.body).split('\n')) { const k = l.trim(); if (!k) { if (extra.length && extra[extra.length - 1] !== '') extra.push(''); continue; } if (/^###\s/.test(k) ? false : seen.has(k)) continue; seen.add(k); extra.push(l); }
    }
    while (extra.length && extra[extra.length - 1] === '') extra.pop();
    if (extra.length) body += '\n\n### Y todo lo que llegó durante las betas\n\n' + extra.join('\n');
  }
  let out = '## Nova Launcher ' + ver + '\n\n' + e.head.replace(/^\S+\s+[—-]\s+/, '') + '\n\n' + body + '\n';
  if (beta) out = '> Versión **beta**: puede tener fallos. Si algo falla, vuelve a la estable desde Ajustes → Acerca de.\n\n' + out;
  return out;
}
module.exports = { notas, take, betasDe };
if (require.main === module) {
  const ver = String(process.argv[2] || require('../package.json').version);
  process.stdout.write(notas(ver, fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8')));
}
