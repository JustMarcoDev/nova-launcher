// Carga la interfaz en un navegador simulado (jsdom) con una app falsa y comprueba que arranca sin errores.
const { JSDOM, VirtualConsole } = require('jsdom'), inline = require('./inline.js'), fs = require('fs'), path = require('path'), vm = require('vm');
const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push((e.detail && e.detail.message) || e.message)); vc.on('error', m => errors.push(String(m)));
const mock = { accAddOffline: { accounts: [{ id: 'o1', type: 'offline', name: 'Marco_1' }], active: 'o1' }, insts: [], versions: { v: [{ id: '1.21.1', type: 'release' }], src: 'mojang' }, cfg: { _first: false, setupDone: true, seenVersion: '99.0.0' }, sys: { total: 16 }, ver: '0.0.0', updGet: { s: 'idle' }, discordGet: { s: 'off' }, worldLast: null, srvStatus: {}, shotsList: [], bkList: [], modsList: [], releases: [], dqState: { active: 0, paused: false, limit: 0, speed: 0 } };
mock.skinList = { skins: [{ id: 'sabc1', name: 'Prueba', model: 'slim', data: 'data:image/png;base64,iVBORw0KGgo=' }], sel: 'sabc1', acc: { type: 'offline', name: 'Marco_1' } };
const _n = Date.now(); mock.statsGet = { sessions: [0, 1, 2, 3, 4, 5].map(k => ({ id: 'i' + (k % 2), name: ['Survival', 'Skyblock'][k % 2], mc: ['1.21.4', '1.20.1'][k % 2], ld: 'Fabric', server: k % 3 === 0 ? 'play.test.net' : '', start: _n - k * 864e5 * 3, ms: (k + 1) * 9e5 })), before: [{ id: 'i0', name: 'Survival', mc: '1.21.4', ld: 'Fabric', ms: 72e5 }], shots: 7 };
mock.worldLast = { inst: 'i1', name: 'Mundo de prueba', instName: 'Instancia', date: 123, mc: '1.21.4', ld: 'Vanilla' };
const EV = {}, api = new Proxy({ on(c, f) { EV[c] = f; }, win() {}, zoom() {}, folder() {}, open() {}, filePath: () => '' }, { get: (t, k) => k in t ? t[k] : async () => (k in mock ? JSON.parse(JSON.stringify(mock[k])) : (k === 'http' ? Promise.reject(new Error('sin red')) : undefined)) });
const dom = new JSDOM(inline(), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'file:///x/index.html', virtualConsole: vc, beforeParse(w) {
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 0 }) : () => ({ addColorStop() {} }), set: () => true });
  w.skinview3d = { SkinViewer: class { constructor() { this.controls = {}; } loadSkin() { return Promise.resolve(); } resetSkin() {} loadCape() { return Promise.resolve(); } resetCape() {} }, WalkingAnimation: class {} };
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true; w.api = api; Object.defineProperty(w.navigator, 'language', { value: 'es-ES' }); } });
const w = dom.window, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const need = ['home', 'vers', 'mods', 'srv', 'inst', 'con', 'soc', 'set', 'sk', 'sta'];
  for (const p of need) { const b = w.document.querySelector(`nav [data-p=${p}]`); if (!b) { errors.push('falta el botón de ' + p); continue; } b.click(); await sleep(150); if (!w.document.getElementById(p).classList.contains('on')) errors.push('no se abre la pestaña ' + p); }
  for (const s of w.document.querySelectorAll('#sn button')) { try { s.click(); } catch (e) { errors.push('ajustes: ' + e.message); } await sleep(10); }
  w.document.querySelector('nav [data-p=home]').click();
  w.dispatchEvent(Object.assign(new w.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  await sleep(100);
  // Botones de actualizar: deben tener acción en la app instalada (antes dependían de vista-previa.js, que no se empaqueta)
  {
    w.eval('cfg.autoInstall=false'); if (typeof EV['upd:state'] !== 'function') errors.push('Actualizar: la interfaz no escucha «upd:state»');
    else {
      EV['upd:state']({ s: 'ready', v: '0.2.15-beta.11' }); await sleep(30);
      for (const id of ['ubb', 'umb']) { const b = w.document.getElementById(id); if (!b || typeof b.onclick !== 'function') errors.push('Actualizar: el botón #' + id + ' no tiene acción'); }
      const b = w.document.getElementById('ubb'); b.click(); await sleep(30);
      if (b.textContent !== 'Instalando…') errors.push('Actualizar: al pulsar «Reiniciar e instalar» no pasó nada (texto: ' + b.textContent + ')');
      EV['upd:state']({ s: 'none' });
    }
  }
  // Perfil obligatorio: sin cuentas ni nombre propio hay que crear uno; la ventana no se puede cerrar hasta entonces
  {
    const $m = () => w.document.getElementById('mdl');
    if (w.eval('needProfile()') !== true) errors.push('Perfil: debería exigirse con la configuración de fábrica');
    w.eval('cfg.accounts=[];cfg.ms=null;cfg.username="Marco"'); if (w.eval('needProfile()') !== false) errors.push('Perfil: no debe exigirse si ya hay un nombre');
    w.eval('cfg.username="Jugador"'); w.eval('openAddAcc(true)');
    if ($m().querySelector('[data-x]')) errors.push('Perfil: la ventana obligatoria no debe tener botón de cerrar');
    w.eval('closeModal()'); w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); $m().click();
    if (!$m().classList.contains('on')) errors.push('Perfil: la ventana obligatoria se pudo cerrar sin crear perfil');
    w.document.getElementById('aan').value = 'Marco_1'; w.document.getElementById('aag').click(); for (let k = 0; k < 40 && $m().classList.contains('on'); k++) await sleep(100);
    if ($m().classList.contains('on')) errors.push('Perfil: no se cerró tras crear el perfil'); if (w.eval('needProfile()') !== false) errors.push('Perfil: sigue exigiéndose tras crearlo');
    w.eval('openAddAcc()'); if (!$m().querySelector('[data-x]')) errors.push('Perfil: el formulario normal sí debe poder cerrarse'); w.eval('closeModal()'); if ($m().classList.contains('on')) errors.push('Perfil: el formulario normal no se cerró');
  }
  // Modo juego: con Minecraft abierto el fondo sigue animado (a pocos fps); con el ajuste apagado todo sigue igual
  {
    const gm = () => w.document.documentElement.classList.contains('gm');
    if (typeof EV.running !== 'function') errors.push('Modo juego: la interfaz no escucha el aviso «running»');
    else {
      EV.running(1); if (!gm() || w.eval('GM') !== true) errors.push('Modo juego: no se activó al abrirse Minecraft');
      await sleep(80); if (!w.eval('RAF')) errors.push('Modo juego: el bucle de dibujo se paró (las animaciones deben seguir)');
      EV.running(0); await sleep(80); if (gm() || !w.eval('RAF')) errors.push('Modo juego: no reanudó las animaciones al cerrarse Minecraft');
      w.eval('cfg.gameMode=false'); EV.running(1); if (gm()) errors.push('Modo juego: se activó con el ajuste apagado'); EV.running(0); w.eval('cfg.gameMode=true');
    }
  }
  // Instancias: al pulsar una tarjeta se abre su ventana de detalle (nombre, descripción y lista de mods)
  {
    const g = id => w.document.getElementById(id);
    mock.insts = [{ id: 'i1', name: 'Mi instancia', mc: '1.21.1', ld: 'Fabric', note: 'Descripción de prueba' }];
    await w.eval('loadI()'); await sleep(100);
    const row = w.document.querySelector('#il .ir');
    if (!row) errors.push('Instancias: no se pintó la tarjeta');
    else {
      row.click(); for (let t = 0; t < 50 && !g('msr'); t++) await sleep(100); await sleep(50);
      if (!g('dn') || g('dn').value !== 'Mi instancia' || !g('dd') || g('dd').value !== 'Descripción de prueba') errors.push('Instancias: la ventana de detalle no muestra nombre y descripción');
      if (!g('mls') || !g('msr') || !g('mad')) errors.push('Instancias: faltan la lista de mods o los botones de añadir/buscar mods');
      // Panel «Añadir a esta instancia»: lo que ya tiene sale como instalado, y hay botones para shaders y texturas
      const seen = []; api.http = async ({ url }) => { seen.push(url); return { total_hits: 2, hits: [{ project_id: 'p1', slug: 'sodium', title: 'Sodium', description: 'x', icon_url: '' }, { project_id: 'p2', slug: 'lithium', title: 'Lithium', description: 'y', icon_url: '' }] }; };
      api.modsProjects = async () => ({ ids: ['p1'], files: [] });
      g('msr').click(); for (let t = 0; t < 40 && !(w.document.querySelectorAll('#adl button').length); t++) await sleep(100);
      const bs = [...w.document.querySelectorAll('#adl button')];
      if (bs.length !== 2 || bs[0].textContent.indexOf('Instalado') < 0 || !bs[0].disabled || bs[1].textContent !== 'Instalar' || bs[1].disabled) errors.push('Añadir a la instancia: lo que ya está no sale como instalado');
      if (!seen.some(u => u.includes('versions%3A') || u.includes('1.21.1'))) errors.push('Añadir a la instancia: no filtra por la versión de la instancia');
      for (let t = 0; t < 50 && w.document.querySelectorAll('#adk button').length < 3; t++) await sleep(100);
      const kb = [...w.document.querySelectorAll('#adk button')].map(b => b.textContent).join('|');
      if (kb !== 'Mods|Shaders|Texturas') errors.push('Añadir a la instancia: faltan los botones de shaders y texturas (' + kb + ')');
      const sb = [...w.document.querySelectorAll('#adk button')][1]; if (sb) sb.click(); else errors.push('Añadir a la instancia: no hay botón de shaders');
      for (let t = 0; t < 40 && !seen.some(u => u.includes('project_type%3Ashader')); t++) await sleep(100);
      if (!seen.some(u => u.includes('project_type%3Ashader'))) errors.push('Añadir a la instancia: el botón de shaders no busca shaders');
      delete api.http; delete api.modsProjects;
      w.eval('closeModal()'); await sleep(400);
    }
    // Opciones de una instancia con Fabric: el desplegable de versiones del cargador debe traer la lista, no solo «Automática»
    mock.insts = [{ id: 'i2', name: 'Con Fabric', mc: '1.21.1', ld: 'Fabric', loaderVersion: '' }];
    mock.loaderVersions = [{ v: '0.16.14', stable: true }, { v: '0.16.13', stable: true }, { v: '0.17.0-beta.1', stable: false }];
    await w.eval('loadI()'); for (let k = 0; k < 30 && !/Con Fabric/.test(w.document.getElementById('il').textContent); k++) await sleep(100);
    w.eval('closeModal()'); await sleep(200);
    w.document.querySelector('#il [data-a=opt]').click(); for (let k = 0; k < 30 && !(g('olv') && g('olv').options.length > 1); k++) await sleep(100);
    {
      const o = g('olv') ? [...g('olv').options].map(x => x.value) : [];
      if (o.length !== 4 || !o.includes('0.16.13') || !o.includes('0.17.0-beta.1')) errors.push('Instancias: el desplegable de la versión de Fabric no muestra la lista (' + o.join(',') + ')');
      w.eval('closeModal()'); await sleep(400);
    }
    delete mock.loaderVersions;
    // si la lista falla se ve el aviso con «Reintentar» (antes solo salía «Automática» sin explicación)
    mock.insts = [{ id: 'i3', name: 'Sin red', mc: '1.21.1', ld: 'Fabric', loaderVersion: '' }];
    await w.eval('loadI()'); for (let k = 0; k < 30 && !/Sin red/.test(w.document.getElementById('il').textContent); k++) await sleep(100);
    api.loaderVersions = async () => { throw new Error('No se pudo cargar la lista'); };
    w.document.querySelector('#il [data-a=opt]').click(); for (let k = 0; k < 30 && !g('olr'); k++) await sleep(100);
    if (!g('olr')) errors.push('Instancias: si falla la lista de versiones de Fabric no sale «Reintentar»');
    w.eval('closeModal()'); delete api.loaderVersions;
    mock.insts = []; await w.eval('loadI()');
  }
  // Pestaña Skin: lista de skins guardadas, texto según la cuenta (offline / Microsoft) y capas solo en Microsoft
  {
    const g = id => w.document.getElementById(id);
    await sleep(100);
    if (g('skl').querySelectorAll('.skc').length !== 1 || !g('skl').querySelector('.skc.use')) errors.push('Skin: no se pintó la skin guardada y en uso');
    if (!/sin conexión/.test(g('sks').textContent)) errors.push('Skin: falta el aviso de cuenta sin conexión');
    if (g('skcp').style.display !== 'none') errors.push('Skin: las capas solo deben verse con cuenta Microsoft');
    if (g('skx').style.display === 'none') errors.push('Skin: falta «Quitar la skin local» con una skin local elegida');
    if (g('skt').style.display === 'none') errors.push('Skin: falta la barra de la skin seleccionada (editar nombre / cambiar PNG / eliminar)');
    for (const i of ['skrn', 'skrp', 'skdel', 'skfo']) if (!g(i)) errors.push('Skin: falta el botón ' + i);
    mock.skinList = { ...mock.skinList, acc: { type: 'microsoft', name: 'Marco' } }; mock.skinCurrent = { name: 'Marco', skin: { variant: 'slim', data: 'data:image/png;base64,iVBORw0KGgo=' }, capes: [{ id: 'c1', alias: 'Migrator', active: true, data: '' }] };
    await w.eval('skLoad()'); await sleep(50);
    if (g('skcp').style.display === 'none' || !/Migrator/.test(g('skcl').textContent)) errors.push('Skin: no salen las capas de la cuenta Microsoft');
    if (g('sku').textContent !== 'Aplicar a mi cuenta') errors.push('Skin: el botón de Microsoft debe decir «Aplicar a mi cuenta»');
    w.document.querySelector('nav [data-p=home]').click();
  }
  // Crear instancia: botones en Instancias y en el desplegable de Lanzar; el diálogo crea la instancia sin lanzar
  {
    const g = id => w.document.getElementById(id);
    if (!g('icr') || !g('pcr')) errors.push('Crear instancia: faltan los botones');
    else {
      g('pcr').click(); await sleep(300);
      for (let k = 0; k < 20 && !g('cgo'); k++) await sleep(100);
      if (!g('cgo')) errors.push('Crear instancia: no se abrió el diálogo');
      else {
        if (!g('cnm').value) errors.push('Crear instancia: el nombre no trae uno por defecto');
        g('cnm').value = 'Mi instancia'; g('cgo').click(); await sleep(200);
        if (g('mdl').classList.contains('on')) errors.push('Crear instancia: el diálogo no se cerró');
      }
    }
  }
  // Botón «Continuar»: sale con el último mundo y la X lo quita hasta que cambie el mundo
  {
    const g = id => w.document.getElementById(id);
    await w.eval('contRefresh()'); await sleep(50);
    if (g('cont').hidden) errors.push('Continuar: debe verse con un mundo reciente');
    g('contx').click(); await sleep(20);
    if (!g('cont').hidden) errors.push('Continuar: la X no lo quitó');
    await w.eval('contRefresh()'); await sleep(50);
    if (!g('cont').hidden) errors.push('Continuar: no debe volver con el mismo mundo');
    mock.worldLast = { ...mock.worldLast, date: 456 }; await w.eval('contRefresh()'); await sleep(50);
    if (g('cont').hidden) errors.push('Continuar: debe volver cuando se juega el mundo otra vez');
  }
  // Pestaña Estadísticas: gráfico de 8 semanas, tres listas de top 5 y el total de capturas
  {
    const g = id => w.document.getElementById(id);
    w.document.querySelector('nav [data-p=sta]').click(); await sleep(300);
    if (g('stp').querySelectorAll('.stbar').length !== 8) errors.push('Estadísticas: el gráfico debe tener 8 barras (' + g('stp').querySelectorAll('.stbar').length + ')');
    if (g('stp').querySelectorAll('.stg3 .card').length !== 3) errors.push('Estadísticas: faltan las listas de instancias, versiones y servidores');
    if ([...g('stp').querySelectorAll('.stbig')].map(e => e.textContent).join() !== '7,3 h,6,7') errors.push('Estadísticas: no sale el total de capturas (' + [...g('stp').querySelectorAll('.stbig')].map(e => e.textContent).join() + ')');
    if (!/antes de que existieran/.test(g('stp').textContent)) errors.push('Estadísticas: falta el aviso del tiempo jugado de antes');
    w.document.querySelector('nav [data-p=home]').click();
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
  console.log('Interfaz correcta: arranca, abre las 10 pestañas y los ajustes sin errores'); process.exit(0);
})();
