// Prueba de los marcadores seguros del mod (main/marcas.js): sin el código de la partida, o desde el chat, no se hace nada.
const M = require('../main/marcas.js');
const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); };
const key = M.newKey();
ok(/^[0-9a-f]{32}$/.test(key) && key !== M.newKey(), 'el código no es de 32 hex aleatorios');

const calls = [];
const acc = {};
for (const n of ['SETTINGS', 'SHOW', 'OPENMODS', 'OPENDIR', 'GETBG', 'PICKBG', 'SWITCH', 'SHOTNEW', 'SHOTCOPY', 'SHOTVIEW', 'SHOTOPEN']) acc[n] = a => calls.push(n + ':' + a);
const run = (txt, k = key) => { calls.length = 0; M.handler(k, acc)(txt); return calls.slice(); };
const pre = '[12:00:01] [Render thread/INFO]: ';

// 1) Mensajes de chat con marcadores: no hacen nada (con o sin código, y aunque el servidor ponga el marcador en otra línea)
for (const m of ['[NOVA:SETTINGS]', '[NOVA:OPENMODS]', '[NOVA:GETBG:earth]', '[NOVA:SWITCH:off1]', '[NOVA:SHOW]', '[NOVA:PICKBG]']) {
  ok(run(pre + '[CHAT] <Pepe> ' + m + '\n').length === 0, 'chat sin código ejecutó ' + m);
  ok(run(pre + '(Minecraft) [CHAT] ' + m.replace('[NOVA:', '[NOVA:' + key + ':') + '\n').length === 0, 'chat con el código ejecutó ' + m);
  ok(run(pre + m + '\n').length === 0, 'marcador sin código ejecutó ' + m);
  ok(run(pre + m.replace('[NOVA:', '[NOVA:' + 'a'.repeat(32) + ':') + '\n').length === 0, 'marcador con código falso ejecutó ' + m);
}
ok(run('[NOVA:SETTINGS]\n[NOVA:OPENMODS]\n[NOVA:GETBG:earth]\n').length === 0, 'varios marcadores sin código ejecutaron algo');

// 2) Los marcadores buenos funcionan (también partidos en dos trozos)
ok(run(pre + `[NOVA:${key}:SETTINGS]\n`).join() === 'SETTINGS:', 'SETTINGS válido no se ejecutó');
ok(run(`[NOVA:${key}:GETBG:earth]\n`).join() === 'GETBG:earth', 'GETBG válido no se ejecutó');
ok(run(`[NOVA:${key}:SWITCH:off1]`).join() === 'SWITCH:off1', 'marcador al final sin salto de línea no se ejecutó');
{
  calls.length = 0; const h = M.handler(key, acc);
  h(pre + `[NOVA:${key}:OPEN`); h('MODS]\n');
  ok(calls.join() === 'OPENMODS:', 'marcador partido en dos trozos no se ejecutó');
}
ok(run(`[NOVA:${key}:SHOTCOPY:C:\\Juego\\screenshots\\a b.png]\n`).join() === 'SHOTCOPY:C:\\Juego\\screenshots\\a b.png', 'argumento con ruta mal leído');
// 3) Nombres desconocidos y sin código de partida (launcher sin mod): nada
ok(run(`[NOVA:${key}:BORRARTODO]\n`).length === 0, 'un nombre desconocido ejecutó algo');
ok(run(`[NOVA:${key}:SETTINGS]\n`, '').length === 0, 'sin código de partida se ejecutó algo');
ok(run(`[NOVA:${key}:__proto__]\n`).length === 0 && run(`[NOVA:${key}:CONSTRUCTOR]\n`).length === 0, 'un nombre de prototipo ejecutó algo');

if (fails.length) { console.log('FALLOS en los marcadores:'); fails.forEach(f => console.log(' ✕ ' + f)); process.exit(1); }
console.log('Marcadores seguros correctos: el chat y los marcadores sin código no hacen nada');
