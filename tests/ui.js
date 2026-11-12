// Carga la interfaz en un navegador simulado (jsdom) con una app falsa y comprueba que arranca sin errores.
const { JSDOM, VirtualConsole } = require('jsdom'), inline = require('./inline.js'), fs = require('fs'), path = require('path'), vm = require('vm');
const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push((e.detail && e.detail.message) || e.message)); vc.on('error', m => errors.push(String(m)));
const mock = { accAddOffline: { accounts: [{ id: 'o1', type: 'offline', name: 'Marco_1' }], active: 'o1' }, insts: [], versions: { v: [{ id: '1.21.1', type: 'release' }], src: 'mojang' }, cfg: { _first: false, setupDone: true, seenVersion: '0.0.0' }, sys: { total: 16 }, ver: '0.0.0', updGet: { s: 'idle' }, discordGet: { s: 'off' }, worldLast: null, srvStatus: {}, shotsList: [], bkList: [], modsList: [], releases: [], dqState: { active: 0, paused: false, limit: 0, speed: 0 } };
mock.skinList = { skins: [{ id: 'sabc1', name: 'Prueba', model: 'slim', data: 'data:image/png;base64,iVBORw0KGgo=' }], sel: 'sabc1', acc: { type: 'offline', name: 'Marco_1' } };
const _n = Date.now(); mock.statsGet = { sessions: [0, 1, 2, 3, 4, 5].map(k => ({ id: 'i' + (k % 2), name: ['Survival', 'Skyblock'][k % 2], mc: ['1.21.4', '1.20.1'][k % 2], ld: 'Fabric', server: k % 3 === 0 ? 'play.test.net' : '', start: _n - k * 864e5 * 3, ms: (k + 1) * 9e5 })), before: [{ id: 'i0', name: 'Survival', mc: '1.21.4', ld: 'Fabric', ms: 72e5 }], shots: 7 };
mock.worldsAll = [{ inst: 'i1', instName: 'Survival', mc: '1.21.4', qp: true, folder: 'Beta', name: 'Beta', mode: 'creative', ver: '1.21.4', last: 2000, icon: '' }, { inst: 'i1', instName: 'Survival', mc: '1.21.4', qp: true, folder: 'Alfa', name: 'Alfa', mode: 'hardcore', ver: '1.21.4', last: 3000, icon: '' }, { inst: 'i2', instName: 'Skyblock', mc: '1.20.1', qp: false, folder: 'Cielo', name: 'Cielo', mode: 'survival', ver: '', last: 1000, icon: '' }];
mock.logrosGet = { cats: [['jugar', 'Jugar']], tiers: {}, got: 1, total: 4, pts: 10, ptsTotal: 245, plat: false, list: [
  { id: 'j1', cat: 'jugar', tier: 'b', name: 'Primer paso', desc: 'Lanza el juego por primera vez', got: true, t: 1700000000000, seen: true, have: 1, goal: 1, pct: 100, pts: 10 },
  { id: 'h10', cat: 'jugar', tier: 'b', name: 'Le voy cogiendo el gusto', desc: 'Juega 10 horas en total', got: false, t: 0, seen: true, have: 6, goal: 10, pct: 60, pts: 10 },
  { id: 'nt', cat: 'jugar', tier: 's', name: 'Logro secreto', desc: 'Sigue jugando para descubrirlo', secret: true, got: false, t: 0, seen: true, have: 0, goal: 0, pct: 0, pts: 25 },
  { id: 'plat', cat: 'plat', tier: 'p', name: 'Platino de Nova', desc: 'Consigue todos los demás logros', got: false, t: 0, seen: true, have: 1, goal: 3, pct: 33, pts: 200 }] };
mock.worldLast = { inst: 'i1', name: 'Mundo de prueba', instName: 'Instancia', date: 123, mc: '1.21.4', ld: 'Vanilla' };
const EV = {}, api = new Proxy({ on(c, f) { EV[c] = f; }, win() {}, zoom() {}, folder() {}, open() {}, filePath: () => '' }, { get: (t, k) => k in t ? t[k] : async () => (k in mock ? JSON.parse(JSON.stringify(mock[k])) : (k === 'http' ? Promise.reject(new Error('sin red')) : undefined)) });
const dom = new JSDOM(inline(), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'file:///x/index.html', virtualConsole: vc, beforeParse(w) {
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 0 }) : () => ({ addColorStop() {} }), set: () => true });
  w.skinview3d = { SkinViewer: class { constructor() { this.controls = {}; } loadSkin() { return Promise.resolve(); } resetSkin() {} loadCape() { return Promise.resolve(); } resetCape() {} }, WalkingAnimation: class {} };
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true; w.api = api; Object.defineProperty(w.navigator, 'language', { value: 'es-ES' }); } });
const w = dom.window, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const need = ['home', 'vers', 'mods', 'srv', 'inst', 'con', 'soc', 'set', 'sk', 'sta', 'mun', 'lgr'];
  for (const p of need) { const b = w.document.querySelector(`nav [data-p=${p}]`); if (!b) { errors.push('falta el botón de ' + p); continue; } b.click(); await sleep(150); if (!w.document.getElementById(p).classList.contains('on')) errors.push('no se abre la pestaña ' + p); }
  await sleep(500);
  for (const id of ['vers', 'inst', 'mods', 'mun', 'lgr']) { const l = w.document.querySelector('#' + id + '>.skld'); if (!l) errors.push('Pantalla de carga: falta en ' + id); else if (!l.hidden) errors.push('Pantalla de carga: se queda puesta en ' + id); }
  if (w.document.querySelectorAll('#lgp .lgc').length < 3) errors.push('Logros: la pestaña no pinta las tarjetas');
  for (const s of w.document.querySelectorAll('#sn button')) { try { s.click(); } catch (e) { errors.push('ajustes: ' + e.message); } await sleep(10); }
  // Ajustes → Menú de Nova: pinta las opciones, ya no hay editor del HUD, y «Añadir fondo» elige el fondo nuevo
  { mock.nmenuGet = { cfg: { hud: { fps: { on: true, x: 0.5, y: 0.5, s: 1 } } }, mtime: 1, bgs: [{ id: 'hole', name: 'Agujero negro' }], accents: ['#8b6cff'], accentVals: [-7639809] };
    const saved = []; api.nmenuSet = async p => { saved.push(p); return { ok: true }; };
    api.nmenuAddBg = async () => { mock.nmenuGet = { ...mock.nmenuGet, bgs: [{ id: 'hole', name: 'Agujero negro' }, { id: 'f:mio.png', name: 'Earth' }] }; return { added: ['mio.png'] }; };
    await w.eval('nmInit()'); for (let t = 0; t < 30 && !w.document.querySelector('#nmbga'); t++) await sleep(100);
    if (w.document.querySelector('#nmcv') || /Editar el HUD/.test(w.document.getElementById('nmenu').textContent)) errors.push('Menú de Nova: el editor del HUD ya no debería estar en el launcher');
    if (!w.document.querySelector('#nmbga')) errors.push('Menú de Nova: falta el botón «Añadir fondo»');
    else { w.document.querySelector('#nmbga').click(); for (let t = 0; t < 30 && !w.document.querySelector('[data-nmc=bg] [data-v="f:mio.png"]'); t++) await sleep(100);
      if (!w.document.querySelector('[data-nmc=bg] [data-v="f:mio.png"]')) errors.push('Menú de Nova: el fondo añadido no sale en la lista');
      await sleep(400); const p = saved[saved.length - 1]; if (!p || p.bg !== 'f:mio.png') errors.push('Menú de Nova: el fondo añadido no se eligió (' + JSON.stringify(p) + ')'); } }
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
    w.eval("show('inst')"); await w.eval('loadI()'); await sleep(100);
    const row = w.document.querySelector('#il .ir');
    if (!row) errors.push('Instancias: no se pintó la tarjeta');
    else {
      row.click(); for (let t = 0; t < 50 && !g('msr'); t++) await sleep(100); await sleep(50);
      if (!g('dn') || g('dn').value !== 'Mi instancia' || !g('dd') || g('dd').value !== 'Descripción de prueba') errors.push('Instancias: la ventana de detalle no muestra nombre y descripción');
      if (!g('mls') || !g('msr') || !g('mad')) errors.push('Instancias: faltan la lista de mods o los botones de añadir/buscar mods');
      // Panel «Añadir a esta instancia»: lo que ya tiene sale como instalado, y hay botones para shaders y texturas
      const seen = []; api.http = api.modSearch = async ({ url }) => { seen.push(url); return { total_hits: 2, hits: [{ project_id: 'p1', slug: 'sodium', title: 'Sodium', description: 'x', icon_url: '' }, { project_id: 'p2', slug: 'lithium', title: 'Lithium', description: 'y', icon_url: '' }] }; };
      api.modsProjects = async () => ({ ids: ['p1'], files: [] });
      g('msr').click(); for (let t = 0; t < 40 && !(w.document.querySelectorAll('#adl button').length >= 2 && /Instalado/.test(w.document.querySelector('#adl button').textContent)); t++) await sleep(100);
      const bs = [...w.document.querySelectorAll('#adl button')];
      if (bs.length !== 2 || bs[0].textContent.indexOf('Instalado') < 0 || !bs[0].disabled || bs[1].textContent !== 'Instalar' || bs[1].disabled) errors.push('Añadir a la instancia: lo que ya está no sale como instalado');
      if (!seen.some(u => u.includes('versions%3A') || u.includes('1.21.1'))) errors.push('Añadir a la instancia: no filtra por la versión de la instancia');
      for (let t = 0; t < 50 && w.document.querySelectorAll('#adk button').length < 3; t++) await sleep(100);
      const kb = [...w.document.querySelectorAll('#adk button')].map(b => b.textContent).join('|');
      if (kb !== 'Mods|Shaders|Texturas') errors.push('Añadir a la instancia: faltan los botones de shaders y texturas (' + kb + ')');
      const sb = [...w.document.querySelectorAll('#adk button')][1]; if (sb) sb.click(); else errors.push('Añadir a la instancia: no hay botón de shaders');
      for (let t = 0; t < 40 && !seen.some(u => u.includes('project_type%3Ashader')); t++) await sleep(100);
      if (!seen.some(u => u.includes('project_type%3Ashader'))) errors.push('Añadir a la instancia: el botón de shaders no busca shaders');
      delete api.http; delete api.modSearch; delete api.modsProjects;
      w.eval('closeModal()'); await sleep(400);
    }
    // Opciones de una instancia con Fabric: el desplegable de versiones del cargador debe traer la lista, no solo «Automática»
    mock.insts = [{ id: 'i2', name: 'Con Fabric', mc: '1.21.1', ld: 'Fabric', loaderVersion: '' }];
    mock.loaderVersions = [{ v: '0.16.14', stable: true }, { v: '0.16.13', stable: true }, { v: '0.17.0-beta.1', stable: false }];
    w.eval("show('inst')"); await w.eval('loadI()'); for (let k = 0; k < 30 && !/Con Fabric/.test(w.document.getElementById('il').textContent); k++) await sleep(100);
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
    w.eval("show('inst')"); await w.eval('loadI()'); for (let k = 0; k < 30 && !/Sin red/.test(w.document.getElementById('il').textContent); k++) await sleep(100);
    api.loaderVersions = async () => { throw new Error('No se pudo cargar la lista'); };
    w.document.querySelector('#il [data-a=opt]').click(); for (let k = 0; k < 30 && !g('olr'); k++) await sleep(100);
    if (!g('olr')) errors.push('Instancias: si falla la lista de versiones de Fabric no sale «Reintentar»');
    w.eval('closeModal()'); delete api.loaderVersions;
    mock.insts = []; w.eval("show('inst')"); await w.eval('loadI()');
  }
  // Compartir modpack y Añadir modpack: enlace con dos formatos, aviso de lo que se queda fuera, vista previa y «Instalar»
  {
    const g = id => w.document.getElementById(id), $q = s => w.document.querySelector(s);
    mock.insts = [{ id: 'i9', name: 'Mi pack', mc: '1.21.1', ld: 'Vanilla' }];
    w.eval("show('inst')"); await w.eval('loadI()'); for (let k = 0; k < 30 && !/Mi pack/.test(g('il').textContent); k++) await sleep(100);
    api.shareMake = async () => ({ app: 'nova://pack?d=ABC', web: 'https://x.dev/pack#ABC', length: 3, shared: 5, left: [{ t: 'm', file: 'propio.jar' }] });
    const copied = []; api.clip = async t => { copied.push(t); };
    $q('#il [data-a=opt]').click(); for (let k = 0; k < 30 && !$q('.md [data-a=lk]'); k++) await sleep(100);
    if (!$q('.md [data-a=lk]')) errors.push('Compartir modpack: falta el botón en las opciones de la instancia');
    else {
      await sleep(300); $q('.md [data-a=lk]').click(); for (let k = 0; k < 30 && !g('shc'); k++) await sleep(100);
      if (!g('shc') || g('shl').value !== 'https://x.dev/pack#ABC' || !/propio\.jar/.test(g('shb').textContent)) errors.push('Compartir modpack: no muestra el enlace ni lo que se queda fuera: ' + (($q('.md') || {}).textContent || '').slice(0, 300));
      else { g('shc').click(); await sleep(50); if (copied[0] !== 'https://x.dev/pack#ABC') errors.push('Compartir modpack: «Copiar enlace» no copia el enlace'); }
    }
    w.eval('closeModal(true)');
    const pv = { name: 'Mi pack', mc: '1.21.1', ld: 'Fabric', lv: '0.16.9', ram: 6, mods: 3, resourcepacks: 1, shaders: 0, size: 5242880, missing: 2, exists: { id: 'i9', name: 'Mi pack' } };
    let got = null; api.packPreview = async a => { got = a; return pv; };
    const inst = []; api.packInstall = async a => { inst.push(a); return { ins: { id: 'n1', name: 'Mi pack (2)' }, failed: [] }; };
    w.document.getElementById('iam').click(); for (let k = 0; k < 30 && !g('pkl'); k++) await sleep(100);
    if (!g('pkl') || !g('pkf') || !g('pkm')) errors.push('Añadir modpack: faltan las tres opciones (pegar, archivo, Modrinth)');
    else {
      g('pkl').value = 'nova://pack?d=ABC'; g('pkg').click(); for (let k = 0; k < 30 && !g('pki'); k++) await sleep(100);
      const t = $q('.md').textContent;
      if (!g('pki') || !/3 mods/.test(t) || !/5\.0 MB/.test(t) || !/Faltan archivos.*2/.test(t) || !g('pkx')) errors.push('Añadir modpack: la vista previa no muestra mods, tamaño, lo que falta y la opción de reemplazar o copiar');
      else { g('pki').click(); for (let k = 0; k < 30 && !inst.length; k++) await sleep(100); if (!inst[0] || inst[0].text !== 'nova://pack?d=ABC' || inst[0].mode !== 'copy') errors.push('Añadir modpack: «Instalar» no manda el enlace con el modo elegido'); }
      if (!got || got.text !== 'nova://pack?d=ABC') errors.push('Añadir modpack: la vista previa no recibió el enlace');
    }
    w.eval('closeModal(true)');
    // «Pegar enlace de modpack» en el desplegable de Lanzar juego abre el mismo diálogo con el cuadro del enlace listo
    w.document.getElementById('ppk').click(); for (let k = 0; k < 30 && !g('pkl'); k++) await sleep(100);
    if (!g('pkl') || !g('pkg')) errors.push('Pegar enlace de modpack: el botón del desplegable no abre el diálogo');
    w.eval('closeModal(true)');
    delete api.shareMake; delete api.clip; delete api.packPreview; delete api.packInstall; mock.insts = []; w.eval("show('inst')"); await w.eval('loadI()');
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
    w.document.querySelector('nav [data-p=sta]').click(); await sleep(100);
    if (!g('stp').querySelector('.stld')) errors.push('Estadísticas: no sale la pantalla de carga');
    await sleep(1900); // carga mínima + cuenta de las cifras
    if (g('stp').querySelectorAll('.stbar').length !== 8) errors.push('Estadísticas: el gráfico debe tener 8 barras (' + g('stp').querySelectorAll('.stbar').length + ')');
    if (g('stp').querySelectorAll('.stg3 .card').length !== 3) errors.push('Estadísticas: faltan las listas de instancias, versiones y servidores');
    if ([...g('stp').querySelectorAll('.stbig')].map(e => e.textContent).join() !== '7,3 h,6,7') errors.push('Estadísticas: no sale el total de capturas (' + [...g('stp').querySelectorAll('.stbig')].map(e => e.textContent).join() + ')');
    if (!/antes de que existieran/.test(g('stp').textContent)) errors.push('Estadísticas: falta el aviso del tiempo jugado de antes');
    w.document.querySelector('nav [data-p=home]').click();
  }
  // Pestaña Mundos: lista de todas las instancias, búsqueda, orden y filtro por instancia
  {
    const g = id => w.document.getElementById(id), rows = () => [...g('mul').querySelectorAll('.mr')].map(r => r.dataset.f).join();
    w.document.querySelector('nav [data-p=mun]').click(); await sleep(400);
    if (rows() !== 'Alfa,Beta,Cielo') errors.push('Mundos: deberían salir 3 mundos por última partida y salen ' + rows());
    g('mus').querySelector('[data-k=name]').click(); await sleep(50);
    if (rows() !== 'Alfa,Beta,Cielo') errors.push('Mundos: orden por nombre mal (' + rows() + ')');
    g('muq').value = 'be'; g('muq').dispatchEvent(new w.Event('input')); await sleep(50);
    if (rows() !== 'Beta') errors.push('Mundos: la búsqueda no filtra (' + rows() + ')');
    g('muq').value = ''; g('muq').dispatchEvent(new w.Event('input'));
    g('mui').value = 'i2'; g('mui').dispatchEvent(new w.Event('change')); await sleep(50);
    if (rows() !== 'Cielo') errors.push('Mundos: el filtro por instancia no funciona (' + rows() + ')');
    if (!g('mul').querySelector('[data-a=play]').disabled) errors.push('Mundos: Jugar debe estar desactivado en versiones sin quickPlay');
    w.document.querySelector('nav [data-p=home]').click();
  }
  // Todos los menús (modales) llevan una X que los cierra; el modal obligatorio (perfil) no.
  {
    w.eval("openCreate({mc:'1.21.1',ld:'Fabric',type:'release'})");
    let x = null; for (let i = 0; i < 40 && !x; i++) { await new Promise(r => setTimeout(r, 100)); x = w.document.querySelector('#mdl .mx'); }
    if (!x) errors.push('Los menús no tienen la X de cerrar (#mdl .mx)');
    else { x.click(); if (w.document.getElementById('mdl').classList.contains('on')) errors.push('La X no cierra el menú'); }
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
  console.log('Interfaz correcta: arranca, abre las 12 pestañas y los ajustes sin errores'); process.exit(0);
})();
