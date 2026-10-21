// Añade a assets/fabric el perfil de Fabric y la «intermediary» de una versión de Minecraft (hace falta una vez por versión nueva del menú de Nova).
// Uso: node scripts/add-fabric.js 1.21.4 [versión-del-loader]   (sin segundo argumento usa el fabric-loader que ya hay en assets/fabric)
const fs = require('fs'), path = require('path');
const mc = process.argv[2]; if (!mc) { console.error('Uso: node scripts/add-fabric.js <versión de Minecraft>'); process.exit(1); }
const dir = path.join(__dirname, '..', 'assets', 'fabric'), libs = path.join(dir, 'libraries');
const loader = process.argv[3] || (fs.readdirSync(path.join(libs, 'net/fabricmc/fabric-loader'))[0]);
(async () => {
  const prof = await (await fetch('https://meta.fabricmc.net/v2/versions/loader/' + mc + '/' + loader + '/profile/json')).json();
  for (const l of prof.libraries) {
    const [g, n, v] = l.name.split(':'), rel = g.replace(/\./g, '/') + '/' + n + '/' + v + '/' + n + '-' + v + '.jar', dst = path.join(libs, rel);
    if (fs.existsSync(dst)) continue;
    const r = await fetch((l.url || 'https://maven.fabricmc.net/') + rel); if (!r.ok) throw new Error(l.name + ' → HTTP ' + r.status);
    fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, Buffer.from(await r.arrayBuffer())); console.log('+ ' + rel);
  }
  fs.writeFileSync(path.join(dir, mc + '.json'), JSON.stringify(prof));
  console.log('perfil ' + prof.id + ' guardado');
})().catch(e => { console.error(e.message); process.exit(1); });
