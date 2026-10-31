// Imprime el recuento anónimo de lanzamientos como tabla.
// Uso: NOVA_USAGE_URL=https://nova-presencia.TU-USUARIO.workers.dev USAGE_SECRET=… node scripts/uso.js [días=30]
// (si no pones la URL se usa «novaPresence» de package.json). Con --json imprime la respuesta tal cual.
const days = Math.max(1, Math.min(90, parseInt(process.argv.find(a => /^\d+$/.test(a)) || '30', 10)));
const url = String(process.env.NOVA_USAGE_URL || require('../package.json').novaPresence || '').replace(/\/+$/, '');
const secret = process.env.USAGE_SECRET || '';

// Convierte la respuesta del servidor en filas: por día y el total por combinación
function tabla(res) {
  const dias = (res && res.days) || [], tot = {};
  for (const d of dias) for (const [k, n] of Object.entries(d.combos || {})) tot[k] = (tot[k] || 0) + n;
  const por = dias.map(d => [d.day, String(d.launches), String(d.installs)]);
  const combos = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [l, mc, ld] = k.split('|'); return [l || '?', mc || '?', ld || '?', String(n)]; });
  return { por, combos };
}
function pinta(cab, filas) {
  const w = cab.map((c, i) => Math.max(c.length, ...filas.map(f => String(f[i]).length)));
  const l = f => f.map((c, i) => (i === f.length - 1 ? String(c).padStart(w[i]) : String(c).padEnd(w[i]))).join('  ');
  return [l(cab), w.map(n => '-'.repeat(n)).join('  '), ...filas.map(l)].join('\n');
}
module.exports = { tabla, pinta };
if (require.main === module) {
  if (!/^https:\/\//.test(url) || !secret) { console.error('Falta NOVA_USAGE_URL (o novaPresence en package.json) o USAGE_SECRET'); process.exit(1); }
  fetch(url + '/usage-summary?days=' + days, { headers: { authorization: 'Bearer ' + secret } }).then(async r => {
    if (!r.ok) { console.error('El servidor respondió ' + r.status); process.exit(1); }
    const j = await r.json();
    if (process.argv.includes('--json')) return console.log(JSON.stringify(j, null, 1));
    const t = tabla(j);
    console.log('Lanzamientos por día\n' + pinta(['Día', 'Lanzamientos', 'Instalaciones'], t.por));
    console.log('\nPor versión (total de los últimos ' + days + ' días)\n' + pinta(['Launcher', 'Minecraft', 'Cargador', 'Lanzamientos'], t.combos));
  }).catch(e => { console.error('No se pudo consultar: ' + e.message); process.exit(1); });
}
