// Convierte una imagen o un vídeo en el fondo del menú de Nova (formato NVB1: fotogramas JPEG empaquetados).
// Se hace con el propio Chromium de la app (una ventana oculta), así no hace falta instalar nada más.
const { BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');

const IMG = /\.(png|jpe?g|webp|bmp|gif)$/i, VID = /\.(mp4|m4v|mov|webm|ogv|mkv)$/i;
const isImage = f => IMG.test(f), isVideo = f => VID.test(f);

// Código que se ejecuta dentro de la ventana oculta
const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
const {ipcRenderer}=require('electron');
window.run=async o=>{
  const cv=document.createElement('canvas');cv.width=o.w;cv.height=o.h;const g=cv.getContext('2d');
  const cover=(s,sw,sh)=>{const k=Math.max(o.w/sw,o.h/sh),dw=sw*k,dh=sh*k;g.fillStyle='#000';g.fillRect(0,0,o.w,o.h);g.drawImage(s,(o.w-dw)/2,(o.h-dh)/2,dw,dh)};
  const send=(i,u)=>ipcRenderer.invoke('nvb:frame',o.job,i,u);
  const jpeg=()=>cv.toDataURL('image/jpeg',o.q);
  if(o.image){const im=new Image();im.src=o.url;await im.decode();cover(im,im.naturalWidth,im.naturalHeight);await send(0,jpeg());return{n:1,fps:1}}
  const v=document.createElement('video');v.muted=true;v.preload='auto';v.src=o.url;
  await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=()=>no(new Error('No se pudo leer el vídeo'))});
  if(!(v.videoWidth>0))throw new Error('El vídeo no tiene imagen');
  const dur=Math.min(v.duration||o.maxSec,o.maxSec),N=Math.max(4,Math.floor(dur*o.fps)),K=Math.min(o.fps,Math.floor(N/3));
  // Se reproduce el vídeo y se toma una captura cada 1/fps: es mucho más rápido que saltar a cada fotograma
  const first=[],last=[],jobs=[];
  let i=0;
  const grab=idx=>{
    cover(v,v.videoWidth,v.videoHeight);
    if(idx<K){const b=createImageBitmap(cv);jobs.push(b.then(x=>{first[idx]=x}))}
    if(idx>=N-K){const b=createImageBitmap(cv);jobs.push(b.then(x=>{last[idx-(N-K)]=x}))}
    if(idx>=K&&idx<N-K)jobs.push(send(idx,jpeg()));
    if(idx%5===0)ipcRenderer.send('nvb:progress',o.job,(idx+1)/N);
  };
  await v.play();
  await new Promise(done=>{
    const cb=(now,meta)=>{
      if(i<N&&meta.mediaTime>=i/o.fps-0.0005){grab(i);i++}
      if(i>=N||v.ended)return done();
      v.requestVideoFrameCallback(cb);
    };
    v.onended=done;v.requestVideoFrameCallback(cb);
  });
  v.pause();
  while(i<N){grab(i);i++}   // si el vídeo terminó antes de tiempo se repite el último fotograma
  await Promise.all(jobs);
  // el final se funde con el principio para que el bucle no tenga salto
  for(let i=0;i<K;i++){g.globalAlpha=1;g.drawImage(last[i],0,0);g.globalAlpha=i/K;g.drawImage(first[i],0,0);g.globalAlpha=1;await send(i,jpeg())}
  return{n:N-K,fps:o.fps}
};
</script>`;

let job = 0;
const jobs = new Map();
ipcMain.handle('nvb:frame', (e, id, i, url) => { const j = jobs.get(id); if (j) j.frames[i] = Buffer.from(String(url).split(',')[1] || '', 'base64'); });
ipcMain.on('nvb:progress', (e, id, p) => { const j = jobs.get(id); if (j && j.onProgress) j.onProgress(p); });

/** Crea el archivo `out` (NVB1) a partir de `file`. opts: w, h, fps, q, maxSec, onProgress(0..1). Devuelve {n, w, h, fps, bytes}. */
async function convert(file, out, opts = {}) {
  const o = { w: 1920, h: 1080, fps: 15, q: 0.78, maxSec: 20, ...opts };
  const image = isImage(file);
  if (!image && !isVideo(file)) throw new Error('Formato no compatible. Usa una imagen (png, jpg, webp) o un vídeo (mp4, webm).');
  const id = ++job, j = { frames: [], onProgress: o.onProgress };
  jobs.set(id, j);
  const tmp = path.join(path.dirname(out), '.nvb-page-' + id + '.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(tmp, PAGE);
  const w = new BrowserWindow({ show: false, width: 640, height: 360, webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } });
  try {
    await w.loadFile(tmp);
    const r = await w.webContents.executeJavaScript('window.run(' + JSON.stringify({ job: id, url: pathToFileURL(file).href, image, w: o.w, h: o.h, fps: o.fps, q: o.q, maxSec: o.maxSec }) + ')');
    const fr = j.frames.slice(0, r.n);
    if (fr.length !== r.n || fr.some(b => !b || !b.length)) throw new Error('Faltan fotogramas al convertir');
    const hdr = Buffer.alloc(16 + 4 * (r.n + 1));
    hdr.write('NVB1', 0, 'latin1'); hdr.writeUInt32LE(r.n, 4); hdr.writeUInt16LE(r.fps, 8); hdr.writeUInt16LE(o.w, 10); hdr.writeUInt16LE(o.h, 12);
    let off = hdr.length;
    for (let i = 0; i < r.n; i++) { hdr.writeUInt32LE(off, 16 + 4 * i); off += fr[i].length; }
    hdr.writeUInt32LE(off, 16 + 4 * r.n);
    const t = out + '.tmp';
    fs.writeFileSync(t, Buffer.concat([hdr, ...fr]));
    try { fs.renameSync(t, out); } catch (e) { fs.copyFileSync(t, out); try { fs.unlinkSync(t); } catch {} }
    if (o.w >= 1920 && !o.single) { try { await make720(out); } catch {} }   // versión ligera (720p) para pantallas pequeñas y el Modo bajo consumo
    return { n: r.n, w: o.w, h: o.h, fps: r.fps, bytes: off };
  } finally {
    jobs.delete(id);
    try { w.destroy(); } catch {}
    try { fs.unlinkSync(tmp); } catch {}
  }
}


/** Ruta de la versión 720p de un .nvb: «foto.mp4.nvb» → «foto.mp4.720.nvb». */
const lowPath = f => f.replace(/\.nvb$/i, '') + '.720.nvb';

/** Crea la versión 720p (1280×720) de un .nvb de 1080p reescalando cada fotograma; el mod la elige en pantallas pequeñas o con el Modo bajo consumo. */
async function make720(file) {
  const out = lowPath(file), d = fs.readFileSync(file);
  if (d.toString('latin1', 0, 4) !== 'NVB1') throw new Error('No es un .nvb');
  const n = d.readUInt32LE(4), fps = d.readUInt16LE(8), W = d.readUInt16LE(10), H = d.readUInt16LE(12);
  if (W <= 1280) return false;   // ya es ligero
  const w = 1280, h = Math.round(H * 1280 / W), fr = [];
  for (let i = 0; i < n; i++) {
    const a = d.readUInt32LE(16 + 4 * i), b = d.readUInt32LE(16 + 4 * (i + 1));
    fr.push(nativeImage.createFromBuffer(d.subarray(a, b)).resize({ width: w, height: h, quality: 'good' }).toJPEG(72));
    if (i % 4 === 3) await new Promise(r => setImmediate(r));   // sin bloquear la ventana
  }
  const hdr = Buffer.alloc(16 + 4 * (n + 1));
  hdr.write('NVB1', 0, 'latin1'); hdr.writeUInt32LE(n, 4); hdr.writeUInt16LE(fps, 8); hdr.writeUInt16LE(w, 10); hdr.writeUInt16LE(h, 12);
  let off = hdr.length;
  for (let i = 0; i < n; i++) { hdr.writeUInt32LE(off, 16 + 4 * i); off += fr[i].length; }
  hdr.writeUInt32LE(off, 16 + 4 * n);
  const t = out + '.tmp';
  fs.writeFileSync(t, Buffer.concat([hdr, ...fr]));
  try { fs.renameSync(t, out); } catch (e) { fs.copyFileSync(t, out); try { fs.unlinkSync(t); } catch {} }
  return true;
}

module.exports = { convert, make720, lowPath, isImage, isVideo };
