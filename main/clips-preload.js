// Preload de la página de clips: solo deja registrar tres respuestas (empezar, parar, entregar el clip).
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch, fn) => ipcRenderer.on(ch, async (e, id, arg) => { let r; try { r = await fn(arg); } catch (x) { r = null; } ipcRenderer.send('clips:reply', id, r); });
contextBridge.exposeInMainWorld('novaClips', { onStart: fn => on('clips:start', fn), onStop: fn => on('clips:stop', fn), onGrab: fn => on('clips:grab', fn) });
