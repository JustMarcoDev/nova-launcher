// Nova Launcher · main/clips-core.js
// Lógica pura de los clips de los últimos 30 s (sin Electron): se usa en el proceso principal y en la página oculta que graba (main/clips.html).
// La grabación no puede cortar un vídeo ya codificado, así que hay DOS grabadoras escalonadas que se reinician cada 60 s con 30 s de diferencia:
// siempre hay una que lleva entre 30 y 60 s grabados, y el clip es esa (los últimos 30 s como mínimo).
(function (root) {
  const MIN_MS = 30000, CYCLE_MS = 60000, MIN_SAVE_MS = 5000;

  /** Qué grabadora usar: la que más lleva grabado. starts = [inicio de la A, inicio de la B] (0 = parada). Devuelve el índice o -1. */
  function pick(starts, now) {
    let best = -1, bestMs = 0;
    for (let i = 0; i < starts.length; i++) {
      if (!starts[i]) continue;
      const ms = now - starts[i];
      if (ms > bestMs) { bestMs = ms; best = i; }
    }
    return bestMs >= MIN_SAVE_MS ? best : -1;
  }

  /** Cuándo toca reiniciar cada grabadora: al cumplir CYCLE_MS. */
  function due(start, now) { return !!start && now - start >= CYCLE_MS; }

  /** La ventana del juego: la que se titula «Minecraft…» (o «Nova…» con un mod que cambia el título) y no es el propio launcher. */
  function isGameWindow(name) {
    const n = String(name || '').trim();
    return /^minecraft\b/i.test(n) && !/launcher/i.test(n);
  }

  function clipName(d) {
    const z = n => String(n).padStart(2, '0');
    return `nova-clip-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.webm`;
  }

  /** ¿Hay RAM de sobra para tener dos grabadoras con vídeo en memoria? Menos de 8 GB: no. */
  function ramOk(totalBytes, lowRamMode) { return !lowRamMode && totalBytes > 8 * 1073741824; }

  const api = { MIN_MS, CYCLE_MS, MIN_SAVE_MS, pick, due, isGameWindow, clipName, ramOk };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NovaClipsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
