// =====================================================================================
// Nova Launcher · main/descargas.js
// Descargas con reanudación, huellas, cola con pausa/límite y descompresión
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura del proyecto» en el README.)
// =====================================================================================
const { ipcMain } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { cfgFile, load, mv, rd, send, wr } = R; // base
const { UA, run } = R; // red

// ===== Estabilidad, instancias, mods y copias (0.2.11) =====
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hashOf = (b, a) => crypto.createHash(a).update(b).digest('hex');
// ---- Cola de descargas: pausar, cancelar y limitar la velocidad ----
const DQ = { paused: false, cancel: false, limit: +rd(cfgFile, {}).dlLimit || 0, active: 0, pools: 0, bytes: 0, t: Date.now(), speed: 0, next: 0, total: 0, done: 0 };
let dqT = null;
const cancelErr = () => Object.assign(new Error('Descarga cancelada'), { cancel: true });
const dqLeft = () => DQ.total > DQ.done ? DQ.total - DQ.done : 0;
const dqEta = () => { const l = dqLeft(); return l > 0 && DQ.speed > 1024 ? Math.round(l / DQ.speed) : 0; };
const dqSend = () => send('dq', { active: DQ.active + DQ.pools, paused: DQ.paused, limit: DQ.limit, speed: DQ.speed, left: dqLeft(), eta: dqEta() });
const dqTick = () => { if (dqT) return; DQ.t = Date.now(); DQ.bytes = 0; dqT = setInterval(() => { const n = Date.now(), dt = (n - DQ.t) / 1000; DQ.speed = dt > 0 ? DQ.bytes / dt : 0; DQ.bytes = 0; DQ.t = n; if (!DQ.active && !DQ.pools) { clearInterval(dqT); dqT = null; DQ.speed = 0; DQ.paused = false; DQ.total = 0; DQ.done = 0; } dqSend(); }, 700); if (dqT.unref) dqT.unref(); };
const dqIdle = () => { if (!DQ.active && !DQ.pools) DQ.cancel = false; };
async function dqChunk(n) {
  while (DQ.paused && !DQ.cancel) await sleep(150);
  if (DQ.cancel) throw cancelErr();
  DQ.bytes += n; DQ.done += n;
  if (DQ.limit > 0) { const now = Date.now(); DQ.next = Math.max(DQ.next, now) + n / (DQ.limit * 1048576) * 1000; const w = DQ.next - now - 300; if (w > 0) await sleep(Math.min(w, 5000)); }
}
// Las descargas van a «archivo.part» por trozos. Si se cortan se reanudan desde donde se quedaron (cabecera Range)
// y solo al terminar y comprobar la huella se renombran al nombre final. Junto al .part se guarda «.part.meta» con
// la dirección y el identificador del archivo (ETag / fecha) para no mezclar trozos de dos versiones distintas.
const DL_WAITS = process.env.NOVA_DL_WAITS ? JSON.parse(process.env.NOVA_DL_WAITS) : [1000, 3000, 8000];
const rmQ = p => fs.promises.rm(p, { force: true }).catch(() => {});
const metaOf = p => p + '.meta';
const hashFile = (p, a) => new Promise((ok, no) => { const h = crypto.createHash(a), s = fs.createReadStream(p); s.on('data', d => h.update(d)); s.on('end', () => ok(h.digest('hex'))); s.on('error', no); });
async function sleepC(ms) { const end = Date.now() + ms; while (Date.now() < end) { if (DQ.cancel) throw cancelErr(); await sleep(Math.max(1, Math.min(200, end - Date.now()))); } }
async function fetchPart(u, part, o, depth = 0) {
  let size = 0; try { size = (await fs.promises.stat(part)).size; } catch {}
  let meta = null; if (size) { try { meta = JSON.parse(await fs.promises.readFile(metaOf(part), 'utf8')); } catch {} }
  if (size && (!meta || meta.u !== u)) { await rmQ(part); await rmQ(metaOf(part)); size = 0; meta = null; } // un .part de otra dirección o sin datos no sirve
  const headers = { 'User-Agent': UA() };
  if (size) { headers.Range = 'bytes=' + size + '-'; const iv = meta.e || meta.m; if (iv) headers['If-Range'] = iv; }
  const r = await fetch(u, { signal: AbortSignal.timeout(600000), headers });
  const hd = k => (r.headers && r.headers.get ? r.headers.get(k) : null);
  const again = async () => { try { r.body && r.body.cancel && await r.body.cancel(); } catch {} await rmQ(part); await rmQ(metaOf(part)); if (depth) throw new Error('No se pudo reanudar la descarga'); return fetchPart(u, part, o, depth + 1); };
  if (r.status === 416 && size) return again(); // el .part ya estaba completo o no vale: se empieza de cero
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { http: r.status });
  let base = 0;
  if (size && r.status === 206) {
    const cr = /^bytes (\d+)-/.exec(hd('content-range') || ''); if (cr && +cr[1] !== size) return again();
    base = size; if (o.pooled) { const credit = size - o.st.cnt; if (credit > 0) DQ.done += credit; o.st.cnt = size; } // en los modpacks el total ya cuenta el archivo entero (se suma lo de otros intentos)
  } // con 200 (el servidor no admite Range o el archivo cambió) se empieza de cero
  const len = +hd('content-length') || 0; if (!o.pooled) DQ.total += len;
  let got = 0; if (!base) o.st.cnt = 0;
  try {
    await fs.promises.mkdir(path.dirname(part), { recursive: true });
    if (!base) await fs.promises.writeFile(metaOf(part), JSON.stringify({ u, e: hd('etag') || '', m: hd('last-modified') || '' })).catch(() => {});
    const fh = await fs.promises.open(part, base ? 'a' : 'w');
    try {
      if (r.body && typeof r.body.getReader === 'function') {
        const rd2 = r.body.getReader();
        try { for (;;) { const { done, value } = await rd2.read(); if (done) break; await dqChunk(value.length); await fh.write(value); got += value.length; o.st.cnt += value.length; if (o.onProgress) o.onProgress(base + got, base + len); } }
        catch (e) { try { rd2.cancel(); } catch {} throw e; }
      } else { const b = Buffer.from(await r.arrayBuffer()); await dqChunk(b.length); await fh.write(b); got = b.length; o.st.cnt += b.length; }
    } finally { await fh.close(); }
    if (len && got !== len) throw new Error('Descarga incompleta');
  } catch (e) { if (!o.pooled && len > got) DQ.total -= len - got; throw e; }
  return base + got;
}
// Descarga con comprobación de huella, reanudación y 3 reintentos (1 s, 3 s y 8 s; prueba también los enlaces alternativos)
async function dl(urls, dest, o = {}) {
  urls = [].concat(urls || []).filter(Boolean); if (!urls.length) throw new Error('Sin enlace de descarga');
  // Servidores alternativos (assets/mirrors.json): solo cuando se conoce la huella, para poder comprobar siempre lo descargado
  const mirU = new Set(); if (o.sha1 || o.sha512) for (const u of [...urls]) for (const m of R.mirrorsFor ? R.mirrorsFor(u) : []) if (!urls.includes(m)) { urls.push(m); mirU.add(m); }
  DQ.active++; dqTick();
  o = { ...o, st: { cnt: 0 } }; // st.cnt: bytes de este .part que ya cuentan en la cola
  const part = dest + '.part', bad = new Set(), clean = async () => { await rmQ(part); await rmQ(metaOf(part)); };
  try {
    let err;
    for (let round = 0; round <= DL_WAITS.length; round++) {
      for (const u of urls) {
        if (bad.has(u)) continue;
        for (let z = 0; z < 2; z++) {
          try {
            if (DQ.cancel) throw cancelErr();
            const n = await fetchPart(u, part, o);
            const want = String(o.sha512 || o.sha1 || '').toLowerCase();
            if (want && await hashFile(part, o.sha512 ? 'sha512' : 'sha1') !== want) { await clean(); err = new Error('hash'); if (z === 0) continue; bad.add(u); break; } // huella distinta: una vez más desde cero
            await rmQ(metaOf(part)); await mv(part, dest); if (mirU.has(u) && R.mirrorNotice) R.mirrorNotice(u); return n;
          } catch (e) { if (e.cancel) throw e; err = e; if (e.http >= 400 && e.http < 500 && e.http !== 408 && e.http !== 429) bad.add(u); break; }
        }
      }
      if (round === DL_WAITS.length || urls.every(u => bad.has(u))) break;
      if (!o.pooled) send('status', `Se cortó la descarga: reintentando (${round + 1} de ${DL_WAITS.length})…`);
      await sleepC(DL_WAITS[round]);
    }
    if (urls.every(u => bad.has(u))) await clean();
    throw new Error(err && err.message === 'hash' ? 'Archivo corrupto: la huella no coincide' : 'Descarga fallida: ' + (err && err.message));
  } catch (e) { if (e.cancel) await clean(); throw e; }
  finally { DQ.active--; dqIdle(); dqSend(); }
}
async function pool(items, n, fn, sizeOf) {
  DQ.pools++; dqTick(); if (sizeOf) for (const it of items) DQ.total += +sizeOf(it) || 0; let k = 0; const out = new Array(items.length);
  const w = async () => { while (k < items.length && !DQ.cancel) { const i = k++; out[i] = await fn(items[i], i); } };
  try { await Promise.all(Array.from({ length: Math.min(n, items.length) }, w)); if (DQ.cancel) throw cancelErr(); return out; }
  finally { DQ.pools--; dqIdle(); dqSend(); }
}
const prog = (t, n, tot) => { send('status', `${t}: ${n} de ${tot}`); send('progress', { task: n, total: tot }); };
const win32 = process.platform === 'win32';
const unzip = (z, d) => win32 ? run('tar', ['-xf', z, '-C', d]) : run('unzip', ['-oq', z, '-d', d]);
// Si «tar» falla (por ejemplo, otro tar que no sabe leer .zip), en Windows se usa PowerShell
const unzipSafe = async (z, d) => {
  try { await unzip(z, d); } catch (e1) {
    if (!win32) throw e1;
    try { await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath '${z.replace(/'/g, "''")}' -DestinationPath '${d.replace(/'/g, "''")}' -Force`]); }
    catch (e2) { throw Object.assign(new Error('No se pudo descomprimir: ' + (e1.message || e1)), { cause: e2 }); }
  }
};
const zipItems = async (zip, cwd, items) => {
  if (!items.length) throw new Error('No hay nada que comprimir'); fs.rmSync(zip, { force: true }); fs.mkdirSync(path.dirname(zip), { recursive: true });
  return win32 ? run('tar', ['-a', '-c', '-f', zip, '-C', cwd, ...items]) : run('zip', ['-qr', zip, ...items], { cwd });
};
// ---- Cola de descargas (controles) ----
ipcMain.handle('dq:state', () => ({ active: DQ.active + DQ.pools, paused: DQ.paused, limit: DQ.limit, speed: DQ.speed, left: dqLeft(), eta: dqEta() }));
ipcMain.handle('dq:pause', (e, on) => { DQ.paused = on === undefined ? !DQ.paused : !!on; dqSend(); return DQ.paused; });
ipcMain.handle('dq:cancel', () => { if (DQ.active || DQ.pools) { DQ.cancel = true; DQ.paused = false; } dqSend(); return true; });
ipcMain.handle('dq:limit', (e, mb) => { const v = Math.max(0, Math.min(100, +mb || 0)); DQ.limit = v; wr(cfgFile, { ...load(), dlLimit: v }); dqSend(); return v; });


// Lo que usan otros módulos
Object.assign(R, { dl, hashFile, hashOf, pool, prog, rmQ, sleep, unzip, unzipSafe, win32, zipItems });
