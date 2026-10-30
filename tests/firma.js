// Prueba de las firmas: una válida y una manipulada (ed25519). Se usa un par de claves propio de la prueba; también se comprueba que firmar.js y firma.js se entienden.
const crypto = require('crypto'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { verificar, PUBLIC_KEY } = require('../main/firma');
const fails = []; const bad = m => fails.push(m);

const k = crypto.generateKeyPairSync('ed25519');
const pub = k.publicKey.export({ type: 'spki', format: 'pem' });
const body = Buffer.from(JSON.stringify({ off: ['presence'], aviso: { id: 'x', texto: 'hola' } }));
const sig = crypto.sign(null, body, k.privateKey).toString('base64');

if (!verificar(body, sig, pub)) bad('firma: una firma válida debería aceptarse');
if (verificar(Buffer.from(body.toString().replace('presence', 'cape')), sig, pub)) bad('firma: un archivo manipulado no debería aceptarse');
const s2 = Buffer.from(sig, 'base64'); s2[0] ^= 1;
if (verificar(body, s2.toString('base64'), pub)) bad('firma: una firma manipulada no debería aceptarse');
if (verificar(body, '', pub) || verificar(body, 'no-es-base64!!', pub) || verificar(body, sig, 'no es una clave')) bad('firma: entradas rotas deberían dar false, no un error');
const otra = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
if (verificar(body, sig, otra)) bad('firma: otra clave pública no debería validar');
if (!/BEGIN PUBLIC KEY/.test(PUBLIC_KEY)) bad('firma: main/firma.js no tiene clave pública');

// scripts/firmar.js firma y main/firma.js verifica (con una clave de prueba, pasada por --clave)
try {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'firma-')), kf = path.join(d, 'k.pem'), f = path.join(d, 'nova-config.json');
  fs.writeFileSync(kf, k.privateKey.export({ type: 'pkcs8', format: 'pem' })); fs.writeFileSync(f, body);
  cp.execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'firmar.js'), 'firmar', f, '--clave', kf], { stdio: 'pipe' });
  if (!verificar(fs.readFileSync(f), fs.readFileSync(f + '.sig', 'utf8'), pub)) bad('firmar.js: la firma que escribe no se verifica');
  fs.writeFileSync(f, body.toString().replace('hola', 'adiós'));
  if (verificar(fs.readFileSync(f), fs.readFileSync(f + '.sig', 'utf8'), pub)) bad('firmar.js: tras cambiar el archivo la firma debería fallar');
} catch (e) { bad('firmar.js: ' + (e.stderr ? e.stderr.toString() : e.message)); }

if (fails.length) { console.error('FALLOS en las firmas:\n' + fails.map(x => ' ✕ ' + x).join('\n')); process.exit(1); }
console.log('Firmas correctas: válida aceptada, manipulada rechazada');
