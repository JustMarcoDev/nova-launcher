// Prueba del diagnóstico de cierres de Minecraft (main/juego.js → diagnose): no debe culpar a la gráfica por la línea normal «Using graphics backend OpenGL».
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'main', 'juego.js'), 'utf8');
const a = src.indexOf('const CAUSES = ['), b = src.indexOf('\n}\n', src.indexOf('function diagnose(')) + 3;
const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + '\nthis.diagnose = diagnose;', ctx);
const d = ctx.diagnose, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const normal = ['[22:47:23] [Render thread/INFO]: Using graphics backend OpenGL, using drivers: 3.3.0 NVIDIA 621.01', '[22:47:23] [Render thread/INFO]: Using graphics device: NVIDIA GeForce RTX 5060/PCIe/SSE2 (NVIDIA Corporation)', '[22:47:26] [Render thread/INFO]: Created: 512x512x0 minecraft:textures/atlas/chest.png-atlas'];
ok(d(normal).id === 'unknown', 'el registro normal de arranque no debe dar un diagnóstico de gráfica (' + d(normal).id + ')');
ok(/0xC0000005/.test(d(normal, -1073741819).d) && d(normal, -1073741819).id === 'unknown', 'un código de salida nativo debe mostrarse en hexadecimal');
ok(/código de salida 0x1/.test(d(normal, 1).d), 'el código de salida 1 debe salir');
const gpu = ['# A fatal error has been detected by the Java Runtime Environment:', '#  EXCEPTION_ACCESS_VIOLATION (0xc0000005) at pc=0x00007ff8', '# Problematic frame:', '# C  [nvoglv64.dll+0x1a2b3c]'];
ok(d(normal.concat(gpu)).id === 'gpu' && /nvoglv64/.test(d(normal.concat(gpu)).d), 'un fallo en nvoglv64.dll sí es de la gráfica');
const otro = ['# A fatal error has been detected by the Java Runtime Environment:', '# Problematic frame:', '# C  [nova_native.dll+0x10]'];
ok(d(normal.concat(otro)).id === 'native', 'un fallo nativo en otro módulo no debe culpar a la gráfica');
ok(d(['GLFW error 65543: WGL: The driver does not appear to support OpenGL']).id === 'gpu', 'un error real de GLFW sigue siendo de la gráfica');
ok(d(['java.lang.OutOfMemoryError: Java heap space']).id === 'ram', 'sin memoria');
if (fails.length) { console.error('FALLOS en el diagnóstico:\n' + fails.map(f => ' ✕ ' + f).join('\n')); process.exit(1); }
console.log('Diagnóstico correcto: «OpenGL» en el registro normal ya no culpa a la gráfica; los fallos nativos se reparten bien');
