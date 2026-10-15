// Devuelve index.html con los .js y el .css metidos dentro (para probarlo en jsdom sin servidor)
const fs = require('fs'), path = require('path');
module.exports = function inline(root) {
  root = root || path.join(__dirname, '..');
  let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  h = h.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => '<style>' + fs.readFileSync(path.join(root, f), 'utf8') + '</style>');
  h = h.replace(/<script type="lazy" src="([^"]+)"><\/script>/g, (_, f) => '<script type="lazy" data-f="' + f + '">' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>');
  h = h.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => '<script>' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>');
  // En la app solo se carga el idioma activo; en las pruebas se incluyen todos para poder probar cualquiera
  const langs = fs.readdirSync(path.join(root, 'lang')).filter(f => f.endsWith('.js')).map(f => '<script>' + fs.readFileSync(path.join(root, 'lang', f), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>').join('\n');
  h = h.replace('<script>// Idiomas: el español', () => langs + '\n<script>// Idiomas: el español');
  return h;
};
