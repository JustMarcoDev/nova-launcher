// Página oculta que graba la ventana del juego (vp9, 30 fps, 720p) en dos grabadoras escalonadas (ver clips-core.js).
/* global NovaClipsCore, novaClips */
(() => {
  const C = NovaClipsCore;
  let stream = null, recs = [null, null], chunks = [[], []], starts = [0, 0], timer = null;

  function startRec(i) {
    if (!stream) return;
    chunks[i] = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
    r.ondataavailable = e => { if (e.data && e.data.size) chunks[i].push(e.data); };
    r.start(1000);
    recs[i] = r; starts[i] = Date.now();
  }
  function stopRec(i) { try { if (recs[i] && recs[i].state !== 'inactive') recs[i].stop(); } catch {} recs[i] = null; starts[i] = 0; chunks[i] = []; }

  async function start(srcId) {
    stop();
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: srcId, maxWidth: 1280, maxHeight: 720, maxFrameRate: 30 } } });
    startRec(0);
    setTimeout(() => startRec(1), C.MIN_MS);   // escalonadas 30 s
    timer = setInterval(() => {
      const now = Date.now();
      for (let i = 0; i < 2; i++) if (C.due(starts[i], now)) { stopRec(i); startRec(i); }
    }, 1000);
  }
  function stop() {
    clearInterval(timer); timer = null;
    stopRec(0); stopRec(1);
    if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
  }
  async function grab() {
    const i = C.pick(starts, Date.now());
    if (i < 0) return null;
    await new Promise(res => { try { recs[i].requestData(); } catch {} setTimeout(res, 300); });
    const blob = new Blob(chunks[i], { type: 'video/webm' });
    return blob.size ? await blob.arrayBuffer() : null;
  }
  novaClips.onStart(async srcId => { try { await start(srcId); return true; } catch (e) { return String(e && e.message || e); } });
  novaClips.onStop(() => { stop(); return true; });
  novaClips.onGrab(grab);
})();
