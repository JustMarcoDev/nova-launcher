// Abre la app de verdad (Electron) en modo prueba: carga la interfaz, comprueba que no hay errores y se cierra sola.
const { spawnSync } = require('child_process'), path = require('path');
const electron = require('electron');
const r = spawnSync(electron, ['.'], { cwd: path.join(__dirname, '..'), env: { ...process.env, NOVA_SMOKE: '1', ELECTRON_ENABLE_LOGGING: '0' }, stdio: 'inherit', timeout: 120000 });
process.exit(r.status === null ? 1 : r.status);
