// =====================================================================================
// Nova Launcher · main/firma.js
// Comprobación de firmas (ed25519, crypto de Node) de lo que el launcher descarga: nova-menu.json, fondos.json y nova-config.json.
// La clave PRIVADA nunca está en el repositorio: es el secreto NOVA_SIGN_KEY de GitHub (scripts/firmar.js firma con ella en release.yml).
// Aquí solo está la clave PÚBLICA. Para cambiar de clave mira «Firma de lo que se descarga» en docs/GUIA.md.
// =====================================================================================
const crypto = require('crypto');

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAt/HYi6UWaMsK1m5iqh2mGD6hHml+LbN2X1r4mon7pJY=
-----END PUBLIC KEY-----`;

/** ¿La firma (base64) corresponde a estos bytes con esta clave pública? Nunca lanza: ante cualquier duda, false. */
function verificar(data, sigB64, publicKey = PUBLIC_KEY) {
  try {
    const sig = Buffer.from(String(sigB64 || '').trim(), 'base64');
    if (sig.length !== 64) return false;
    return crypto.verify(null, Buffer.isBuffer(data) ? data : Buffer.from(String(data)), publicKey, sig);
  } catch { return false; }
}

module.exports = { PUBLIC_KEY, verificar };
