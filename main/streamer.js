// =====================================================================================
// Nova Launcher · main/streamer.js
// Modo streamer: servidor local (solo 127.0.0.1) con el overlay para el navegador de OBS.
// El mod escribe nova/estado.json cada segundo (FPS, servidor sin IP, versión, tiempo de sesión); aquí se sirve /overlay con actualizaciones en vivo (SSE).
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { ipcMain } = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { R } = require('./compartido');
const { load } = R; // base

const DEF_PORT = 7777;
const portOf = c => { const p = parseInt(c && c.streamerPort, 10); return p >= 1024 && p <= 65535 ? p : DEF_PORT; };

/** El estado.json del mod, o un estado vacío si no existe o está viejo (el mod solo escribe cuando algo cambia: con el juego abierto vale aunque el archivo no se toque; sin juego, si lleva más de 15 s sin tocarse no vale). */
function leerEstado(dir, activo) {
  const vacio = { fps: 0, server: '', version: '', session: '', player: '', inWorld: false, streamer: false, live: false };
  try {
    const f = path.join(dir, 'estado.json'), st = fs.statSync(f), o = JSON.parse(fs.readFileSync(f, 'utf8'));
    return { ...vacio, ...o, live: activo === true || Date.now() - st.mtimeMs < 15000 };
  } catch { return vacio; }
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const colorOk = c => /^[0-9a-fA-F]{6}$/.test(c || '') ? '#' + c : '';

/** Diseños del overlay: barra inferior, tarjeta (el de siempre) y esquina. Se eligen con ?estilo=barra|tarjeta|esquina. */
const ESTILOS = ['barra', 'tarjeta', 'esquina'];
const estiloOf = v => ESTILOS.includes(v) ? v : 'tarjeta';

/** HTML del overlay: fondo transparente (fuente de navegador de OBS). Parámetros: ?estilo=barra|tarjeta|esquina&color=RRGGBB&fps=0&server=0&time=0 para esconder partes. */
function overlayHtml(accent, q) {
  const show = k => q.get(k) !== '0';
  const col = colorOk(q.get('color')) || accent || '#8b6cff', est = estiloOf(q.get('estilo'));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Nova overlay</title><style>
html,body{margin:0;background:transparent;font-family:system-ui,Segoe UI,sans-serif;color:#fff}
.b{display:inline-flex;align-items:center;gap:12px;margin:10px;padding:10px 16px 10px 10px;border-radius:14px;background:rgba(14,14,30,.72);border:2px solid ${col};box-shadow:0 4px 18px rgba(0,0,0,.4)}
.b[hidden]{display:none}
img{width:48px;height:48px;image-rendering:pixelated;border-radius:8px}
.n{font-weight:700;font-size:18px;line-height:1.1}.s{font-size:13px;opacity:.85;margin-top:2px;white-space:nowrap}
.f{color:${col};font-weight:700}
/* barra inferior: ocupa todo el ancho, pegada abajo */
body.barra .b{position:fixed;left:0;right:0;bottom:0;margin:0;border-radius:0;border-width:2px 0 0;padding:8px 20px;gap:14px;display:flex;background:linear-gradient(90deg,rgba(14,14,30,.86),rgba(14,14,30,.62))}
body.barra .b[hidden]{display:none}
body.barra img{width:36px;height:36px}
body.barra .n{font-size:17px}body.barra .s{margin:0 0 0 auto;font-size:15px}
/* esquina: pastilla pequeña arriba a la derecha, solo cabeza, nombre y FPS */
body.esquina .b{position:fixed;top:8px;right:8px;margin:0;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;border-width:1px}
body.esquina img{width:28px;height:28px;border-radius:50%}
body.esquina .n{font-size:13px}body.esquina .s{font-size:11px;margin:0}
body.esquina .s #sv,body.esquina .s #t{display:none}
</style></head><body class="${est}"><div class="b" id="b" hidden><img id="h" src="/cabeza.png" alt="">
<div><div class="n" id="p"></div><div class="s">${show('fps') ? '<span class="f" id="f"></span> FPS' : ''}${show('fps') && show('server') ? ' · ' : ''}${show('server') ? '<span id="sv"></span>' : ''}${show('time') ? ' · <span id="t"></span>' : ''}</div></div></div>
<script>
const $=i=>document.getElementById(i);
function put(e){$('b').hidden=!(e&&e.live&&e.inWorld);if(!e)return;$('p').textContent=e.player||'';if($('f'))$('f').textContent=e.fps;if($('sv'))$('sv').textContent=e.server||'';if($('t'))$('t').textContent=e.session||'';}
fetch('/estado').then(r=>r.json()).then(put).catch(()=>{});
const es=new EventSource('/eventos');es.onmessage=m=>{try{put(JSON.parse(m.data))}catch{}};
</script></body></html>`;
}

/** Crea (sin arrancar) el servidor. `deps`: { dir, running() → bool (opcional), accent(), head() → Buffer|null }. Solo escucha en 127.0.0.1. */
function crear(deps) {
  const clientes = new Set();
  let ultimo = '', timer = null;
  const srv = http.createServer((req, res) => {
    let u; try { u = new URL(req.url, 'http://127.0.0.1'); } catch { res.writeHead(400).end(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const h = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (u.pathname === '/overlay') { res.writeHead(200, { ...h, 'Content-Type': 'text/html; charset=utf-8' }); res.end(overlayHtml(deps.accent(), u.searchParams)); return; }
    if (u.pathname === '/estado') { res.writeHead(200, { ...h, 'Content-Type': 'application/json' }); res.end(JSON.stringify(leerEstado(deps.dir(), deps.running ? deps.running() : false))); return; }
    if (u.pathname === '/cabeza.png') { let b = null; try { b = deps.head(); } catch {} if (!b) { res.writeHead(404, h).end(); return; } res.writeHead(200, { ...h, 'Content-Type': 'image/png' }); res.end(b); return; }
    if (u.pathname === '/eventos') {
      res.writeHead(200, { ...h, 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n'); clientes.add(res);
      req.on('close', () => clientes.delete(res));
      return;
    }
    res.writeHead(404, h).end();
  });
  const tick = () => {
    if (!clientes.size) return;
    const js = JSON.stringify(leerEstado(deps.dir(), deps.running ? deps.running() : false));
    if (js === ultimo) { for (const c of clientes) c.write(': .\n\n'); return; }
    ultimo = js;
    for (const c of clientes) c.write('data: ' + js + '\n\n');
  };
  return {
    srv,
    start(port) {
      return new Promise((ok, no) => {
        srv.once('error', no);
        srv.listen(port, '127.0.0.1', () => { srv.removeListener('error', no); timer = setInterval(tick, 1000); if (timer.unref) timer.unref(); ok(srv.address().port); });
      });
    },
    stop() { clearInterval(timer); for (const c of clientes) { try { c.end(); } catch {} } clientes.clear(); try { srv.close(); } catch {} },
  };
}

// ---- integración con el launcher ----
let cur = null, curPort = 0, info = { on: false, port: DEF_PORT, err: '' };

function headPng() {
  const { nativeImage } = require('electron');
  const st = R.accState ? R.accState() : null;
  if (!st || !R.accSkinFile) return null;
  const f = R.accSkinFile(st.act.id) || '';
  if (!f) return null;
  const im = nativeImage.createFromPath(f);
  if (im.isEmpty()) return null;
  return im.crop({ x: 8, y: 8, width: 8, height: 8 }).resize({ width: 64, height: 64, quality: 'pixelated' }).toPNG();
}
function accent() {
  try { const o = JSON.parse(fs.readFileSync(path.join(R.novaDir(), 'menu.json'), 'utf8')); const a = o.accent >>> 0; return '#' + (a & 0xFFFFFF).toString(16).padStart(6, '0'); } catch { return ''; }
}

async function streamerSync() {
  const c = load(), want = c.streamer === true, port = portOf(c);
  if (cur && (!want || port !== curPort)) { cur.stop(); cur = null; }
  if (want && !cur) {
    const s = crear({ dir: () => R.novaDir(), running: () => R.running ? R.running.size > 0 : false, accent, head: headPng });
    try { await s.start(port); cur = s; curPort = port; info = { on: true, port, err: '' }; }
    catch (e) { info = { on: false, port, err: e && e.code === 'EADDRINUSE' ? 'El puerto ' + port + ' está ocupado' : String(e && e.message || e) }; }
  } else if (!want) info = { on: false, port, err: '' };
  return info;
}

ipcMain.handle('streamer:info', () => ({ ...info, url: 'http://127.0.0.1:' + info.port + '/overlay' }));
ipcMain.handle('streamer:sync', async () => { const i = await streamerSync(); return { ...i, url: 'http://127.0.0.1:' + i.port + '/overlay' }; });
setTimeout(() => { streamerSync().catch(() => {}); }, 3000);

Object.assign(R, { streamerSync });
module.exports = { crear, leerEstado, overlayHtml, portOf, ESTILOS, estiloOf };
