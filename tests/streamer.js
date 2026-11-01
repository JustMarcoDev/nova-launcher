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
  const s = S.crear({ dir: () => dir, accent: () => '#112233', head: () => null });
  const port = await s.start(0);
  ok(s.srv.address().address === '127.0.0.1', 'debe escuchar solo en 127.0.0.1, no en ' + s.srv.address().address);
  const o = await get(port, '/overlay?color=ff0000');
  ok(o.code === 200 && /text\/html/.test(o.head['content-type']) && /background:transparent/.test(o.body) && o.body.includes('#ff0000'), 'overlay no es HTML transparente con el color');
  const o2 = await get(port, '/overlay?color=%22%3E%3Cscript%3E');
  ok(!o2.body.includes('<script>alert') && o2.body.includes('#112233'), 'un color malicioso debe ignorarse');
  for (const st of ['barra', 'tarjeta', 'esquina']) { const r = await get(port, '/overlay?estilo=' + st); ok(r.code === 200 && r.body.includes('<body class="' + st + '"'), 'el diseño ' + st + ' no se aplica'); }
  ok((await get(port, '/overlay?estilo=%22%3E%3Cx')).body.includes('<body class="tarjeta"'), 'un diseño raro debe caer en tarjeta');
  const e = await get(port, '/estado');
  ok(JSON.parse(e.body).server === 'Mi server', '/estado no devuelve el servidor');
  ok(!/\d+\.\d+\.\d+\.\d+/.test(e.body.replace('1.21.4', '')), '/estado no debería llevar IPs');
  ok((await get(port, '/cabeza.png')).code === 404, 'sin skin debe dar 404');
  ok((await get(port, '/../etc/passwd')).code === 404, 'ruta rara debe dar 404');
  const ev = await get(port, '/eventos', 1500);
  ok(/text\/event-stream/.test(ev.head['content-type'] || ''), '/eventos no es SSE');
  s.stop();
  fs.rmSync(dir, { recursive: true, force: true });
  if (fails.length) { console.error('FALLOS en el modo streamer:\n' + fails.map(f => ' ✕ ' + f).join('\n')); process.exit(1); }
  console.log('Modo streamer correcto: 127.0.0.1, overlay transparente, estado sin IP y SSE');
})().catch(e => { console.error(e); process.exit(1); });
