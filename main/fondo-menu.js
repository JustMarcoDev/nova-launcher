// =====================================================================================
// Nova Launcher · main/fondo-menu.js
// «Usar el fondo del menú de Nova»: qué fondo eligió el jugador en el menú del mod (nova/menu.json → bg) y cómo pintarlo en el launcher.
// Sin dependencias de Electron: se prueba con tests/fondo.js.
// =====================================================================================
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const IMG = /\.(png|jpe?g|webp|gif)$/i, VID = /\.(mp4|webm|mov)$/i;

/** `bg` es 'hole' | 'nebula' | 'earth' | 'f:<archivo de la carpeta nova/fondos>'. El launcher solo sabe dibujar el agujero negro, una imagen o un vídeo
 *  (Nebulosa y Earth son vídeos .nvb propios del mod): lo demás se ve como agujero negro. Devuelve { id, kind: 'hole'|'image'|'video', url? }. */
function fondoInfo(menu, dir) {
  const id = menu && typeof menu.bg === 'string' ? menu.bg : 'hole';
  const m = /^f:([^\\/:*?"<>|]{1,120})$/.exec(id);
  if (!m) return { id, kind: 'hole' };
  const kind = IMG.test(m[1]) ? 'image' : VID.test(m[1]) ? 'video' : '';
  if (!kind) return { id, kind: 'hole' };
  const f = path.join(dir, m[1]);
  try { if (!fs.statSync(f).isFile()) return { id, kind: 'hole' }; } catch { return { id, kind: 'hole' }; }
  return { id, kind, url: pathToFileURL(f).href };
}
module.exports = { fondoInfo };
