// Prueba del modo streamer (main/streamer.js): solo escucha en 127.0.0.1, sirve /overlay, /estado y /eventos, y el HTML no deja pasar nada raro.
const Module = require('module'), fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const orig = Module._load;
Module._load = function (req, ...a) {
  if (req === 'electron') return { ipcMain: { handle() {} }, nativeImage: {} };
  if (req === './compartido') return { R: { load: () => ({}), novaDir: () => dir, accState: null } };
  return orig.call(this, req, ...a);
};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-str-'));
const S = require('../main/streamer.js');
Module._load = orig;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const get = (port, p, ms) => new Promise((res, rej) => { const r = http.get({ host: '127.0.0.1', port, path: p }, x => { let b = ''; x.on('data', d => { b += d; if (ms) { r.destroy(); res({ code: x.statusCode, head: x.headers, body: b }); } }); x.on('end', () => res({ code: x.statusCode, head: x.headers, body: b })); }); r.on('error', e => ms ? res({ code: 0 }) : rej(e)); });

(async () => {
  ok(S.portOf({}) === 7777 && S.portOf({ streamerPort: '8787' }) === 8787 && S.portOf({ streamerPort: 80 }) === 7777 && S.portOf({ streamerPort: 'x' }) === 7777, 'puerto por defecto o inválido');
  ok(S.leerEstado(dir).live === false, 'sin estado.json no debería estar vivo');
  fs.writeFileSync(path.join(dir, 'estado.json'), JSON.stringify({ fps: 144, server: 'Mi server', version: '1.21.4', session: '1 h 2 min', player: 'Marco', inWorld: true, streamer: true }));
  ok(S.leerEstado(dir).live === true && S.leerEstado(dir).fps === 144, 'no lee estado.json');
  const cfgO = {};
  const s = S.crear({ dir: () => dir, accent: () => '#112233', head: () => null, game: S.game.get, cfg: () => cfgO });
  const port = await s.start(0);
  ok(s.srv.address().address === '127.0.0.1', 'debe escuchar solo en 127.0.0.1, no en ' + s.srv.address().address);
  const o = await get(port, '/overlay?color=ff0000');
  ok(o.code === 200 && /text\/html/.test(o.head['content-type']) && /background:transparent/.test(o.body) && o.body.includes('#ff0000'), 'overlay no es HTML transparente con el color');
  const o2 = await get(port, '/overlay?color=%22%3E%3Cscript%3E');
  ok(!o2.body.includes('<script>alert') && o2.body.includes('#112233'), 'un color malicioso debe ignorarse');
  for (const st of ['barra', 'tarjeta', 'esquina']) { const r = await get(port, '/overlay?estilo=' + st); ok(r.code === 200 && r.body.includes('<body class="' + st + ' '), 'el diseño ' + st + ' no se aplica'); }
  ok((await get(port, '/overlay?estilo=%22%3E%3Cx')).body.includes('<body class="tarjeta '), 'un diseño raro debe caer en tarjeta');
  // Partida en curso: la apunta el launcher; el overlay se basa en eso (no hace falta el mod)
  ok(JSON.parse((await get(port, '/estado')).body).live === false, 'sin partida el overlay no debe salir');
  const T0 = Date.now() - 5000;
  S.game.start({ t0: T0, player: 'Marco', mc: '1.21.1', launcher: S.lanzadorDe('Fabric', true), server: { name: 'Hypixel', host: 'mc.hypixel.net' } });
  let e = JSON.parse((await get(port, '/estado')).body);
  ok(e.live && e.player === 'Marco' && e.version === '1.21.1' && e.launcher === 'Fabric + Nova' && e.server === 'Hypixel' && e.start === T0, '/estado no refleja la partida (' + JSON.stringify(e) + ')');
  ok(e.ip === '' && !/mc\.hypixel\.net/.test(JSON.stringify(e)), 'la IP no debe salir si el ajuste está apagado');
  cfgO.stIp = true; e = JSON.parse((await get(port, '/estado')).body); ok(e.ip === 'mc.hypixel.net', 'con el ajuste de IP encendido debe salir la IP');
  cfgO.stHead = false; cfgO.stTime = false; e = JSON.parse((await get(port, '/estado')).body); ok(e.show.head === false && e.show.time === false && e.show.server === true && e.show.ver === true, 'los ajustes del launcher no llegan al overlay');
  // el jugador cambia de servidor: el nombre sale de servers.dat/mis servidores, o la dirección si no se conoce
  S.game.line('[Render thread/INFO]: Connecting to play.cubecraft.net, 25565', (h) => h === 'play.cubecraft.net' ? 'CubeCraft' : '');
  e = JSON.parse((await get(port, '/estado')).body); ok(e.server === 'CubeCraft' && e.ip === 'play.cubecraft.net', 'al cambiar de servidor no cambia el nombre (' + e.server + ')');
  S.game.line('Connecting to 10.0.0.5, 25570', null);
  e = JSON.parse((await get(port, '/estado')).body); ok(e.server === '10.0.0.5' && e.ip === '10.0.0.5:25570', 'un servidor sin nombre debe salir con su dirección y el puerto no estándar');
  S.game.line('[Server thread/INFO]: Starting integrated minecraft server version 1.21.1');
  e = JSON.parse((await get(port, '/estado')).body); ok(e.server === 'Un jugador' && e.ip === '', 'en un jugador no hay servidor ni IP');
  // el mod, si escribió durante esta partida, manda sobre el nombre; si el archivo es de otra partida, se ignora
  S.game.line('Connecting to mc.hypixel.net, 25565', null);
  fs.writeFileSync(path.join(dir, 'estado.json'), JSON.stringify({ fps: 90, server: 'Viejo', version: '1.21.4', player: 'X', inWorld: true, streamer: true, ts: T0 - 99999 }));
  e = JSON.parse((await get(port, '/estado')).body); ok(e.server === 'Hypixel' && e.fps === 0, 'un estado.json de otra partida debe ignorarse');
  fs.writeFileSync(path.join(dir, 'estado.json'), JSON.stringify({ fps: 90, server: 'Mi server', version: '1.21.4', player: 'X', inWorld: true, streamer: true, ts: Date.now() }));
  e = JSON.parse((await get(port, '/estado')).body); ok(e.server === 'Mi server' && e.fps === 90 && e.player === 'Marco', 'el nombre del servidor del mod no se aplica');
  S.game.stop(); ok(JSON.parse((await get(port, '/estado')).body).live === false, 'al cerrar el juego el overlay debe apagarse');
  ok(S.lanzadorDe('Vanilla', true) === 'Nova' && S.lanzadorDe('Vanilla', false) === 'Vanilla' && S.lanzadorDe('Fabric', false) === 'Fabric' && S.lanzadorDe('Forge', false) === 'Forge' && S.lanzadorDe('NeoForge', false) === 'NeoForge', 'nombres del lanzador');
  ok((await get(port, '/cabeza.png')).code === 404, 'sin skin debe dar 404');
  ok((await get(port, '/../etc/passwd')).code === 404, 'ruta rara debe dar 404');
  const ev = await get(port, '/eventos', 1500);
  ok(/text\/event-stream/.test(ev.head['content-type'] || ''), '/eventos no es SSE');
  for (const ps of ['tl', 'tc', 'tr', 'bl', 'bc', 'br']) ok((await get(port, '/overlay?pos=' + ps)).body.includes(' p-' + ps + '"'), 'la posición ' + ps + ' no se aplica');
  ok((await get(port, '/overlay?pos=%22%3E%3Cx')).body.includes(' p-tl"') && (await get(port, '/overlay')).body.includes(' p-tl"'), 'una posición rara o ausente debe caer en arriba a la izquierda');
  { const r = (await get(port, '/overlay?scale=1.5&op=0.5')).body;
    for (const id of ['h', 'p', 'r1', 'r2']) ok(r.includes('id="' + id + '"'), 'el overlay no tiene el elemento ' + id);
    ok(r.includes('zoom:1.5') && r.includes('opacity:0.5'), 'scale y op no se aplican');
    const x = (await get(port, '/overlay?scale=999&op=abc')).body; ok(x.includes('zoom:1}') && x.includes('opacity:1}'), 'scale/op fuera de rango deben caer al valor normal'); }
  s.stop();
  fs.rmSync(dir, { recursive: true, force: true });
  if (fails.length) { console.error('FALLOS en el modo streamer:\n' + fails.map(f => ' ✕ ' + f).join('\n')); process.exit(1); }
  console.log('Modo streamer correcto: 127.0.0.1, overlay transparente, estado en vivo del launcher, IP solo si se pide y SSE');
})().catch(e => { console.error(e); process.exit(1); });
