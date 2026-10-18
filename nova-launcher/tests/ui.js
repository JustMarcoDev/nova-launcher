// Carga la interfaz en un navegador simulado (jsdom) con una app falsa y comprueba que arranca sin errores.
const { JSDOM, VirtualConsole } = require('jsdom'), inline = require('./inline.js'), fs = require('fs'), path = require('path'), vm = require('vm');
const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push((e.detail && e.detail.message) || e.message)); vc.on('error', m => errors.push(String(m)));
const mock = { insts: [], versions: { v: [{ id: '1.21.1', type: 'release' }], src: 'mojang' }, cfg: { _first: false, setupDone: true, seenVersion: '99.0.0' }, sys: { total: 16 }, ver: '0.0.0', updGet: { s: 'idle' }, discordGet: { s: 'off' }, worldLast: null, srvStatus: {}, shotsList: [], bkList: [], modsList: [], releases: [], dqState: { active: 0, paused: false, limit: 0, speed: 0 } };
const EV = {}, api = new Proxy({ on(c, f) { EV[c] = f; }, win() {}, zoom() {}, folder() {}, open() {}, filePath: () => '' }, { get: (t, k) => k in t ? t[k] : async () => (k in mock ? JSON.parse(JSON.stringify(mock[k])) : (k === 'http' ? Promise.reject(new Error('sin red')) : undefined)) });
const dom = new JSDOM(inline(), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'file:///x/index.html', virtualConsole: vc, beforeParse(w) {
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 0 }) : () => ({ addColorStop() {} }), set: () => true });
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true; w.api = api; Object.defineProperty(w.navigator, 'language', { value: 'es-ES' }); } });
const w = dom.window, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const need = ['home', 'vers', 'mods', 'srv', 'inst', 'con', 'soc', 'set'];
  for (const p of need) { const b = w.document.querySelector(`nav [data-p=${p}]`); if (!b) { errors.push('falta el botón de ' + p); continue; } b.click(); await sleep(150); if (!w.document.getElementById(p).classList.contains('on')) errors.push('no se abre la pestaña ' + p); }
  for (const s of w.document.querySelectorAll('#sn button')) { try { s.click(); } catch (e) { errors.push('ajustes: ' + e.message); } await sleep(10); }
  w.document.querySelector('nav [data-p=home]').click();
  w.dispatchEvent(Object.assign(new w.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  await sleep(100);
  // Modo juego: con Minecraft abierto el fondo se detiene y vuelve al cerrarlo; con el ajuste apagado todo sigue igual
  {
    const gm = () => w.document.documentElement.classList.contains('gm');
    if (typeof EV.running !== 'function') errors.push('Modo juego: la interfaz no escucha el aviso «running»');
    else {
      EV.running(1); if (!gm() || w.eval('RAF') !== 0 && w.eval('GM') !== true) errors.push('Modo juego: no paró las animaciones al abrirse Minecraft');
      await sleep(80); if (w.eval('RAF') !== 0) errors.push('Modo juego: el bucle de dibujo sigue activo');
      EV.running(0); await sleep(80); if (gm() || !w.eval('RAF')) errors.push('Modo juego: no reanudó las animaciones al cerrarse Minecraft');
      w.eval('cfg.gameMode=false'); EV.running(1); if (gm()) errors.push('Modo juego: se activó con el ajuste apagado'); EV.running(0); w.eval('cfg.gameMode=true');
    }
  }
  // Textos sin traducir: todo lo que se ve en español debe tener su traducción (si no, un cambio de redacción deja el idioma a medias sin avisar).
  // Los textos que son datos (nombres, versiones, cifras) se apuntan en tests/lang-baseline.json; cualquier texto nuevo que no esté traducido ni apuntado falla.
  {
    const en = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'lang', 'en.js'), 'utf8'), { window: en });
    const d = en.LANGS.en.d, esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), pats = Object.keys(d).filter(k => /\{\d+\}/.test(k)).map(k => new RegExp('^' + k.split(/\{\d+\}/).map(esc).join('[\\s\\S]+?') + '$'));
    const skip = '#log,.cov,#pq,.lpk,.cl,.cv,input,textarea,script,style', seen = new Set(), add = t => { t = String(t || '').trim(); if (/\p{L}{2}/u.test(t) && t.length < 400 && !(t in d) && !pats.some(r => r.test(t))) seen.add(t); };
    const walk = n => { if (n.nodeType === 3) { if (n.parentElement && !n.parentElement.closest(skip)) add(n.nodeValue); return; } if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.tagName)) return; for (const a of ['placeholder', 'title', 'aria-label', 'alt']) if (n.hasAttribute(a)) add(n.getAttribute(a)); if (n.tagName === 'TEXTAREA') return; n.childNodes.forEach(walk); };
    walk(w.document.body);
    const bf = path.join(__dirname, 'lang-baseline.json');
    if (process.env.NOVA_LANG_UPDATE) { fs.writeFileSync(bf, JSON.stringify([...seen].sort(), null, 1)); console.log('lang-baseline.json actualizado con ' + seen.size + ' textos'); }
    else { const base = new Set(JSON.parse(fs.readFileSync(bf, 'utf8'))), nuevos = [...seen].filter(t => !base.has(t)); if (nuevos.length) { errors.push('Textos sin traducir (añádelos a lang/*.js; si son datos y no hay que traducirlos, a tests/lang-baseline.json):\n    · ' + nuevos.slice(0, 25).join('\n    · ')); } }
  }
  if (errors.length) { console.log('FALLOS en la interfaz:'); errors.forEach(e => console.log(' ✕ ' + e)); process.exit(1); }
  console.log('Interfaz correcta: arranca, abre las 8 pestañas y los ajustes sin errores'); process.exit(0);
})();
