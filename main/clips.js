// Nova Launcher · main/clips.js
// Clips de los últimos 30 s (apagado de fábrica, Ajustes → Rendimiento). Mientras el juego está abierto, una ventana oculta graba la ventana de Minecraft
// con desktopCapturer + MediaRecorder (vp9, 30 fps, 720p) en un búfer circular (dos grabadoras escalonadas, ver clips-core.js).
// El mod, con F8, escribe [NOVA:<código>:CLIP]; aquí se guarda nova-clip-….webm en la carpeta de capturas de la instancia y el mod avisa al verlo aparecer.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const { R } = require('./compartido');
const core = require('./clips-core');

let win = null, replies = new Map(), seq = 0, active = null, finder = null;

const enabled = () => !!R.load().clips && core.ramOk(os.totalmem(), !!R.LOWRAM);

/** El motivo por el que no se pueden usar los clips, o '' si se pueden. */
function why() {
  if (!R.load().clips) return '';
  return core.ramOk(os.totalmem(), !!R.LOWRAM) ? '' : 'Clips desactivados: este PC tiene poca RAM';
}

ipcMain.on('clips:reply', (e, id, val) => { const f = replies.get(id); if (f) { replies.delete(id); f(val); } });

function ask(ch, arg, ms = 15000) {
  return new Promise(res => {
    if (!win || win.isDestroyed()) return res(null);
    const id = ++seq, t = setTimeout(() => { replies.delete(id); res(null); }, ms);
    replies.set(id, v => { clearTimeout(t); res(v); });
    win.webContents.send(ch, id, arg);
  });
}

async function ensureWin() {
  if (win && !win.isDestroyed()) return win;
  win = new BrowserWindow({ show: false, width: 320, height: 200, webPreferences: { preload: path.join(__dirname, 'clips-preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
  win.on('closed', () => { win = null; });
  await win.loadFile(path.join(__dirname, 'clips.html'));
  return win;
}

async function findWindowId() {
  const src = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } });
  const g = src.find(s => core.isGameWindow(s.name));
  return g ? g.id : '';
}

/** Llamar al lanzar el juego: busca su ventana (tarda unos segundos en abrirse) y empieza a grabar. */
async function start(id, shotsDir) {
  await stop();
  if (!enabled()) return;
  active = { id: String(id), dir: shotsDir };
  const me = active;
  const tick = async () => {
    if (active !== me) return;
    try {
      const sid = await findWindowId();
      if (sid) {
        await ensureWin();
        const r = await ask('clips:start', sid, 20000);
        if (r === true) { finder = null; return; }
      }
    } catch {}
    finder = setTimeout(tick, 5000);   // la ventana aún no existe: se reintenta
  };
  finder = setTimeout(tick, 8000);
}

async function stop() {
  active = null;
  if (finder) { clearTimeout(finder); finder = null; }
  if (win && !win.isDestroyed()) { await ask('clips:stop', null, 4000); try { win.destroy(); } catch {} }
  win = null;
}

/** El mod pidió un clip: se guarda en la carpeta de capturas de la instancia. Devuelve la ruta o ''. */
async function save(id) {
  if (!active || active.id !== String(id)) return '';
  const buf = await ask('clips:grab', null, 20000);
  if (!buf) return '';
  fs.mkdirSync(active.dir, { recursive: true });
  const f = path.join(active.dir, core.clipName(new Date()));
  await fs.promises.writeFile(f + '.part', Buffer.from(buf));
  await fs.promises.rename(f + '.part', f);   // el mod busca *.webm: solo aparece cuando está completo
  return f;
}

Object.assign(R, { clipsStart: start, clipsStop: stop, clipsSave: save, clipsEnabled: enabled, clipsWhy: why });
module.exports = { start, stop, save, enabled, why };
