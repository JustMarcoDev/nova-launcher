// Firma de lo que el launcher descarga (nova-menu.json, fondos.json, nova-config.json) con ed25519 (crypto de Node).
//   node scripts/firmar.js generar <archivo-clave-privada>   crea un par de claves: guarda la privada en ese archivo y muestra la pública para main/firma.js
//   node scripts/firmar.js firmar <archivo...>               escribe <archivo>.sig (base64) con la clave del secreto NOVA_SIGN_KEY (o --clave <archivo.pem>)
//   node scripts/firmar.js verificar <archivo...>            comprueba <archivo>.sig con la clave pública de main/firma.js
//   node scripts/firmar.js subir <archivo>                   firma y sube archivo + .sig a la release «recursos» (necesita gh y la clave)
// La clave privada NUNCA va al repositorio: es el secreto NOVA_SIGN_KEY de GitHub (PEM, o ese PEM en base64).
const fs = require('fs'), crypto = require('crypto'), cp = require('child_process');

function clavePrivada(args) {
  const i = args.indexOf('--clave');
  let t = i >= 0 ? fs.readFileSync(args[i + 1], 'utf8') : process.env.NOVA_SIGN_KEY || '';
  t = t.trim();
  if (!t) throw new Error('Falta la clave privada: secreto NOVA_SIGN_KEY o --clave <archivo.pem>');
  if (!t.includes('BEGIN')) t = Buffer.from(t, 'base64').toString('utf8');   // el secreto puede venir en base64
  return crypto.createPrivateKey(t);
}
const firmar = (buf, key) => crypto.sign(null, buf, key).toString('base64');

function main(argv) {
  const [cmd, ...rest] = argv, files = rest.filter((x, i) => x !== '--clave' && rest[i - 1] !== '--clave');
  if (cmd === 'generar') {
    const out = files[0]; if (!out) throw new Error('Uso: generar <archivo-clave-privada>');
    const k = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(out, k.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    console.log('Clave privada guardada en ' + out + ' (guárdala en el secreto NOVA_SIGN_KEY y bórrala del disco).\nClave pública para main/firma.js:\n' + k.publicKey.export({ type: 'spki', format: 'pem' }));
  } else if (cmd === 'firmar' || cmd === 'subir') {
    if (!files.length) throw new Error('Faltan archivos');
    const key = clavePrivada(rest);
    for (const f of files) { fs.writeFileSync(f + '.sig', firmar(fs.readFileSync(f), key) + '\n'); console.log('firmado ' + f + '.sig'); }
    if (cmd === 'subir') for (const f of files) cp.execFileSync('gh', ['release', 'upload', 'recursos', f, f + '.sig', '--clobber'], { stdio: 'inherit' });
  } else if (cmd === 'verificar') {
    const { verificar } = require('../main/firma');
    let bad = 0;
    for (const f of files) { const ok = verificar(fs.readFileSync(f), fs.readFileSync(f + '.sig', 'utf8')); console.log((ok ? 'BIEN  ' : 'MAL   ') + f); if (!ok) bad++; }
    process.exit(bad ? 1 : 0);
  } else throw new Error('Uso: firmar.js generar|firmar|verificar|subir …');
}
try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
