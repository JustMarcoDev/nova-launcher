// Devuelve index.html con los .js y el .css metidos dentro (para probarlo en jsdom sin servidor)
const fs = require('fs'), path = require('path');
module.exports = function inline(root) {
  root = root || path.join(__dirname, '..');
  let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  h = h.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => '<style>' + fs.readFileSync(path.join(root, f), 'utf8') + '</style>');
  h = h.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => '<script>' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>');
  return h;
};
