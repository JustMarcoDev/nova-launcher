// Carga la interfaz en un navegador simulado (jsdom) con una app falsa y comprueba que arranca sin errores.
const { JSDOM, VirtualConsole } = require('jsdom'), inline = require('./inline.js');
const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push((e.detail && e.detail.message) || e.message)); vc.on('error', m => errors.push(String(m)));
const mock = { insts: [], versions: { v: [{ id: '1.21.1', type: 'release' }], src: 'mojang' }, cfg: { _first: false, setupDone: true, seenVersion: '99.0.0' }, sys: { total: 16 }, ver: '0.0.0', updGet: { s: 'idle' }, discordGet: { s: 'off' }, worldLast: null, srvStatus: {}, shotsList: [], bkList: [], modsList: [], releases: [], dqState: { active: 0, paused: false, limit: 0, speed: 0 } };
const api = new Proxy({ on() {}, win() {}, zoom() {}, folder() {}, open() {}, filePath: () => '' }, { get: (t, k) => k in t ? t[k] : async () => (k in mock ? JSON.parse(JSON.stringify(mock[k])) : (k === 'http' ? Promise.reject(new Error('sin red')) : undefined)) });
const dom = new JSDOM(inline(), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'file:///x/index.html', virtualConsole: vc, beforeParse(w) {
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 0 }) : () => ({ addColorStop() {} }), set: () => true });
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true; w.api = api; } });
const w = dom.window, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const need = ['home', 'vers', 'mods', 'srv', 'inst', 'con', 'soc', 'set'];
  for (const p of need) { const b = w.document.querySelector(`nav [data-p=${p}]`); if (!b) { errors.push('falta el botón de ' + p); continue; } b.click(); await sleep(150); if (!w.document.getElementById(p).classList.contains('on')) errors.push('no se abre la pestaña ' + p); }
  for (const s of w.document.querySelectorAll('#sn button')) { try { s.click(); } catch (e) { errors.push('ajustes: ' + e.message); } await sleep(10); }
  w.document.querySelector('nav [data-p=home]').click();
  w.dispatchEvent(Object.assign(new w.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  await sleep(100);
  if (errors.length) { console.log('FALLOS en la interfaz:'); errors.forEach(e => console.log(' ✕ ' + e)); process.exit(1); }
  console.log('Interfaz correcta: arranca, abre las 8 pestañas y los ajustes sin errores'); process.exit(0);
})();
