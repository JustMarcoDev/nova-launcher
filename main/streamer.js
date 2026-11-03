// =====================================================================================
// Nova Launcher · main/streamer.js
// Modo streamer: servidor local (solo 127.0.0.1) con el overlay para el navegador de OBS.
// El propio launcher sabe qué se está jugando (instancia, versión, lanzador, hora de inicio, servidor al que se conecta); el mod, si está activo, completa con nova/estado.json.
// Aquí se sirve /overlay con actualizaciones en vivo (SSE).
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const fs = require('fs');
const http = require('http');
const path = require('path');
const { R } = require('./compartido');
const { load } = R; // base

const DEF_PORT = 7777;
const portOf = c => { const p = parseInt(c && c.streamerPort, 10); return p >= 1024 && p <= 65535 ? p : DEF_PORT; };

/** El estado.json del mod, o un estado vacío si no existe o está viejo (el mod solo escribe cuando algo cambia: con el juego abierto vale aunque el archivo no se toque; sin juego, si lleva más de 15 s sin tocarse no vale). */
function leerEstado(dir, activo) {
  const vacio = { fps: 0, server: '', version: '', session: '', player: '', inWorld: false, streamer: false, ts: 0, live: false };
  try {
    const f = path.join(dir, 'estado.json'), st = fs.statSync(f), o = JSON.parse(fs.readFileSync(f, 'utf8'));
    return { ...vacio, ...o, live: activo === true || Date.now() - st.mtimeMs < 15000 };
  } catch { return vacio; }
}


// ---- La partida en curso: la apunta juego.js al lanzar, al leer cada línea del registro y al cerrar ----
const G = { on: false, start: 0, player: '', mc: '', launcher: '', server: '', host: '', ip: '', single: false, opts: null };
const hostKey = (h, p) => String(h).toLowerCase() + ':' + (+p || 25565);
const ipLabel = (h, p) => h + ((+p || 25565) !== 25565 ? ':' + p : '');
/** Nombre del lanzador que se enseña junto a la versión: Nova (vanilla con el menú), Fabric + Nova, Forge, NeoForge, Quilt… */
function lanzadorDe(ld, conNova) { const l = ld || 'Vanilla'; return conNova ? (l === 'Vanilla' ? 'Nova' : l + ' + Nova') : l; }
const game = {
  start(o) {
    const sv = o.server && o.server.host ? o.server : null;
    Object.assign(G, { on: true, start: o.t0 || Date.now(), player: o.player || '', mc: o.mc || '', launcher: o.launcher || '', single: false,
      opts: sv, server: sv ? String(sv.name || sv.host) : '', host: sv ? hostKey(sv.host, sv.port) : '', ip: sv ? ipLabel(sv.host, sv.port) : '' });
  },
  /** Una línea del registro de Minecraft: «Connecting to host, puerto» (entra a un servidor) o «Starting integrated minecraft server» (un jugador). */
  line(t, names) {
    if (!G.on) return;
    const m = /Connecting to ([A-Za-z0-9._-]{1,255}), (\d{1,5})/.exec(t);
    if (m) {
      const k = hostKey(m[1], m[2]); let name = '';
      if (G.opts && k === hostKey(G.opts.host, G.opts.port)) name = String(G.opts.name || '');
      if (!name && names) { try { name = String(names(m[1], +m[2]) || ''); } catch {} }
      Object.assign(G, { single: false, host: k, ip: ipLabel(m[1], m[2]), server: name || m[1] });
      return;
    }
    if (/Starting integrated minecraft server/.test(t)) Object.assign(G, { single: true, server: '', host: '', ip: '' });
  },
  stop() { G.on = false; G.server = G.host = G.ip = ''; G.single = false; },
  get: () => G,
};

/** Estado que se manda al overlay: lo del launcher más lo que añada el mod (solo si lo escribió durante esta partida). */
function componer(deps) {
  const g = deps.game ? deps.game() : null, c = deps.cfg ? deps.cfg() : {}, run = g ? g.on : (deps.running ? deps.running() : false);
  const mod = leerEstado(deps.dir(), run);
  const fresh = !!(g ? g.on && mod.ts >= g.start : mod.live);
  const show = { head: c.stHead !== false, server: c.stSrv !== false, ip: c.stIp === true, time: c.stTime !== false, ver: c.stVer !== false };
  let server = g ? g.server : '', ip = g ? g.ip : '', single = g ? g.single : false;
  if (fresh && g) {
    if (!mod.inWorld) { server = ''; ip = ''; single = false; }
    else if (mod.server && mod.server !== 'Multijugador' && mod.server !== 'Un jugador') server = mod.server;
    else if (mod.server === 'Un jugador') { single = true; server = ''; ip = ''; }
  } else if (!g) server = mod.server;
  if (single) server = 'Un jugador';
  return {
    live: !!(g ? g.on : mod.live), player: (g && g.player) || mod.player || '', version: (g && g.mc) || mod.version || '', launcher: g ? g.launcher : '',
    start: g && g.on ? g.start : 0, server, ip: show.ip ? ip : '', fps: fresh ? mod.fps : 0, show,
  };
}

const numQ = (v, min, max, def) => { const n = parseFloat(v); return n >= min && n <= max ? n : def; };
const colorOk = c => /^[0-9a-fA-F]{6}$/.test(c || '') ? '#' + c : '';

/** Diseños del overlay: barra inferior, tarjeta (el de siempre) y esquina. Se eligen con ?estilo=barra|tarjeta|esquina. */
const ESTILOS = ['barra', 'tarjeta', 'esquina'];
const estiloOf = v => ESTILOS.includes(v) ? v : 'tarjeta';
/** Posición del panel en la escena: tl/tc/tr (arriba izquierda/centro/derecha) y bl/bc/br (abajo). Se elige con ?pos=… */
const POSICIONES = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];
const posOf = v => POSICIONES.includes(v) ? v : 'tl';

/** HTML del overlay: fondo transparente (fuente de navegador de OBS). Qué se enseña (cabeza, servidor, IP, sesión, versión) lo decide el launcher en vivo desde Ajustes → Streamer; no hace falta volver a copiar el enlace.
 *  Parámetros opcionales: ?pos=tl|tc|tr|bl|bc|br (posición del panel)&scale=0.5–2 (tamaño)&estilo=barra|tarjeta|esquina&color=RRGGBB&op=0.2–1, head=0 server=0 time=0 ver=0 para esconder partes en una escena concreta, fps=1 para los FPS (solo con el mod) y demo=1 para ver datos de ejemplo. */
function overlayHtml(accent, q) {
  const col = colorOk(q.get('color')) || accent || '#8b6cff', est = estiloOf(q.get('estilo'));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Nova overlay</title><style>
html{zoom:${numQ(q.get('scale'), 0.5, 2, 1)}}
html,body{margin:0;background:transparent;font-family:system-ui,Segoe UI,sans-serif;color:#fff}
.b{display:inline-flex;align-items:center;gap:12px;margin:10px;padding:10px 16px 10px 10px;border-radius:14px;background:rgba(14,14,30,.72);border:2px solid ${col};box-shadow:0 4px 18px rgba(0,0,0,.4);animation:in .4s both}
.b{opacity:${numQ(q.get('op'), 0.2, 1, 1)}}
.b[hidden]{display:none}
@keyframes in{from{opacity:0}}
/* posición del panel en la escena (?pos=): por defecto, arriba a la izquierda (solo en el diseño de tarjeta; barra y esquina tienen la suya) */
body.tarjeta .b{position:fixed;margin:0;width:fit-content}
body.tarjeta.p-tl .b{top:10px;left:10px}body.tarjeta.p-tr .b{top:10px;right:10px}body.tarjeta.p-bl .b{bottom:10px;left:10px}body.tarjeta.p-br .b{bottom:10px;right:10px}
body.tarjeta.p-tc .b{top:10px;left:0;right:0;margin:0 auto}body.tarjeta.p-bc .b{bottom:10px;left:0;right:0;margin:0 auto}
img{width:48px;height:48px;image-rendering:pixelated;border-radius:8px}
img[hidden]{display:none}
.n{font-weight:700;font-size:18px;line-height:1.1}.s{font-size:13px;opacity:.88;margin-top:3px;white-space:nowrap}.s[hidden]{display:none}
.f,.t{color:${col};font-weight:700}.t{font-variant-numeric:tabular-nums}
.ip{opacity:.7}
/* barra inferior: ocupa todo el ancho, pegada abajo, todo en una línea */
body.barra .b{position:fixed;left:0;right:0;bottom:0;margin:0;border-radius:0;border-width:2px 0 0;padding:8px 20px;gap:14px;display:flex;background:linear-gradient(90deg,rgba(14,14,30,.86),rgba(14,14,30,.62))}
body.barra .b[hidden]{display:none}
body.barra img{width:36px;height:36px}
body.barra .n{font-size:17px}body.barra .w{display:flex;align-items:center;gap:18px;flex:1}body.barra .s{margin:0;font-size:15px}body.barra .s:last-child{margin-left:auto}
/* esquina: pastilla pequeña arriba a la derecha, solo cabeza, nombre y tiempo */
body.esquina .b{position:fixed;top:8px;right:8px;margin:0;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;border-width:1px}
body.esquina img{width:28px;height:28px;border-radius:50%}
body.esquina .n{font-size:13px}body.esquina .s{font-size:11px;margin:0}
body.esquina .w{display:flex;align-items:center;gap:10px}
</style></head><body class="${est} p-${posOf(q.get('pos'))}"><div class="b" id="b" hidden><img id="h" alt="" hidden>
<div class="w"><div class="n" id="p"></div><div class="s" id="r1"></div><div class="s" id="r2"></div></div></div>
<script>
const $=i=>document.getElementById(i),Q=new URLSearchParams(location.search),HIDE=k=>Q.get(k)==='0';
const DEMO=Q.get('demo')==='1',SAMPLE={live:true,player:'Jugador',version:'1.21.1',launcher:'Fabric + Nova',start:Date.now()-3725000,server:'Mi servidor',ip:'play.ejemplo.net',fps:144,show:{head:true,server:true,ip:true,time:true,ver:true}};
let E=DEMO?SAMPLE:null,headOk=true;
const two=n=>String(n).padStart(2,'0');
function clock(ms){const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600);return (h?h+':'+two(Math.floor(s%3600/60)):Math.floor(s/60))+':'+two(s%60)}
function row(id,parts){const r=$(id);r.textContent='';const ok=parts.filter(Boolean);ok.forEach((x,k)=>{if(k)r.append(' · ');const e=document.createElement('span');if(x.c)e.className=x.c;e.textContent=x.t;r.append(e)});r.hidden=!ok.length}
function draw(){const e=E,b=$('b');if(!e||!e.live){b.hidden=true;return}
 const s=e.show||{},CO=document.body.className==='esquina',on=k=>s[k]!==false&&!HIDE(k);
 $('h').hidden=!(on('head')&&headOk);$('p').textContent=e.player||'';
 row('r1',CO?[]:[on('server')&&e.server?{t:e.server}:null,s.ip&&e.ip?{t:e.ip,c:'ip'}:null]);
 const v=[!CO&&on('ver')&&e.version?{t:[e.version,e.launcher].filter(Boolean).join(' · '),c:'v'}:null,Q.get('fps')==='1'&&e.fps?{t:e.fps+' FPS',c:'f'}:null,on('time')&&e.start?{t:clock(Date.now()-e.start),c:'t'}:null];
 row('r2',v);b.hidden=false}
const hd=$('h');hd.onerror=()=>{headOk=false;draw()};hd.onload=()=>{headOk=true;draw()};hd.src='/cabeza.png?'+Date.now();
function put(e){E=DEMO?SAMPLE:e;draw()}
setInterval(draw,1000);
if(!DEMO){fetch('/estado').then(r=>r.json()).then(put).catch(()=>{});const es=new EventSource('/eventos');es.onmessage=m=>{try{put(JSON.parse(m.data))}catch{}}}else draw();
</script></body></html>`;
}

/** Crea (sin arrancar) el servidor. `deps`: { dir, running() → bool (opcional), game() → partida (opcional), cfg() → ajustes (opcional), accent(), head() → Buffer|null }. Solo escucha en 127.0.0.1. */
function crear(deps) {
  const clientes = new Set();
  let ultimo = '', timer = null;
  const srv = http.createServer((req, res) => {
    let u; try { u = new URL(req.url, 'http://127.0.0.1'); } catch { res.writeHead(400).end(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const h = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (u.pathname === '/overlay') { res.writeHead(200, { ...h, 'Content-Type': 'text/html; charset=utf-8' }); res.end(overlayHtml(deps.accent(), u.searchParams)); return; }
    if (u.pathname === '/estado') { res.writeHead(200, { ...h, 'Content-Type': 'application/json' }); res.end(JSON.stringify(componer(deps))); return; }
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
    const js = JSON.stringify(componer(deps));
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
  return im.crop({ x: 8, y: 8, width: 8, height: 8 }).toPNG(); // 8×8: el overlay lo agranda con image-rendering:pixelated (resize de Electron solo admite good/better/best y lo emborronaría)
}
function accent() {
  try { const o = JSON.parse(fs.readFileSync(path.join(R.novaDir(), 'menu.json'), 'utf8')); const a = o.accent >>> 0; return '#' + (a & 0xFFFFFF).toString(16).padStart(6, '0'); } catch { return ''; }
}

async function streamerSync() {
  const c = load(), want = c.streamer === true, port = portOf(c);
  if (cur && (!want || port !== curPort)) { cur.stop(); cur = null; }
  if (want && !cur) {
    const s = crear({ dir: () => R.novaDir(), running: () => R.running ? R.running.size > 0 : false, game: game.get, cfg: load, accent, head: headPng });
    try { await s.start(port); cur = s; curPort = port; info = { on: true, port, err: '' }; }
    catch (e) { info = { on: false, port, err: e && e.code === 'EADDRINUSE' ? 'El puerto ' + port + ' está ocupado' : String(e && e.message || e) }; }
  } else if (!want) info = { on: false, port, err: '' };
  return info;
}

setTimeout(() => { streamerSync().catch(() => {}); }, 3000);

Object.assign(R, { streamerSync, streamerGame: game, streamerLauncher: lanzadorDe });
module.exports = { crear, leerEstado, overlayHtml, portOf, ESTILOS, estiloOf, posOf, POSICIONES, game, componer, lanzadorDe };
