// Escribe en stdout (JSON) la lista de versiones que prueba el robot del CI: una por línea de mod/versions.txt y mod26/versions.txt.
const fs = require('fs');
const out = [];
const lines = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
for (const l of lines('mod/versions.txt')) {
  const [mc, yarn, layers] = l.split(/\s+/);
  // Cargador de Fabric para ejecutar el cliente: el mismo que se usó al probar a mano cada versión
  const loader = /^1\.21\.(6|7|8|9|10|11)$/.test(mc) ? '0.19.5' : '0.16.14';
  out.push({ tree: 'mod', mc, yarn, layers: layers || '', loader });
}
for (const l of lines('mod26/versions.txt')) {
  const [mc, layers] = l.split(/\s+/);
  out.push({ tree: 'mod26', mc, yarn: '', layers: layers || '', loader: '' });
}
process.stdout.write(JSON.stringify(out));
