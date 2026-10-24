// =====================================================================================
// Nova Launcher · main/discord.js
// Discord Rich Presence
// (Parte del proceso principal; main.js carga todos los módulos. Mira «Estructura» en el README.)
// =====================================================================================
const { app, ipcMain } = require('electron');
const { R } = require('./compartido');
// De módulos anteriores (ya cargados):
const { load, send } = R; // base

ipcMain.handle('discord:get', () => dsc);
// ===== Discord Rich Presence =====
// Application ID de Discord de Nova Launcher (ver README). Con él, TODOS los usuarios muestran la actividad sin configurar nada.
const DISCORD_CLIENT_ID = '1559289890636824597';
const REPO_URL = 'https://github.com/JustMarcoDev/nova-launcher/releases/latest';
let rpc = null, rpcOk = false, rpcAct = null, dsc = { s: 'off' };
const tStart = Date.now();
const setDsc = o => { dsc = o; send('discord:state', dsc); };
function discordStop() { const c = rpc; rpc = null; rpcOk = false; if (c) { try { c.clearActivity().catch(() => {}); c.destroy().catch(() => {}); } catch {} } }
function discordSet(a) {
  if (a !== undefined) rpcAct = a;
  if (!rpc || !rpcOk) return;
  const v = app.getVersion();
  const x = rpcAct || { details: 'En el launcher', state: 'Nova Launcher v' + v, startTimestamp: tStart };
  rpc.setActivity({ ...x, largeImageKey: 'logo', largeImageText: 'Nova Launcher v' + v, instance: false,
    buttons: [{ label: 'Descargar Nova Launcher', url: REPO_URL }] }).catch(() => rpc && rpc.setActivity({ ...x, largeImageKey: 'logo', largeImageText: 'Nova Launcher v' + v, instance: false }).catch(() => {}));
}
function discordInit() {
  discordStop();
  const c = load();
  if (c.discord === false) return setDsc({ s: 'off' });
  const id = DISCORD_CLIENT_ID;   // fijo: ya no hace falta crear una aplicación de Discord
  if (!/^\d{15,25}$/.test(id)) return setDsc({ s: 'noid' });
  let RPC; try { RPC = require('discord-rpc'); } catch { return setDsc({ s: 'error', msg: 'Módulo de Discord no disponible' }); }
  setDsc({ s: 'connecting' });
  const cl = new RPC.Client({ transport: 'ipc' }); rpc = cl;
  const retry = msg => { if (rpc !== cl) return; rpcOk = false; setDsc({ s: 'error', msg }); try { cl.destroy().catch(() => {}); } catch {} setTimeout(() => { if (rpc === cl) discordInit(); }, 15000); };
  cl.on('ready', () => { rpcOk = true; setDsc({ s: 'on', user: cl.user && cl.user.username }); discordSet(); });
  cl.on('disconnected', () => retry('Discord se cerró'));
  cl.login({ clientId: id }).catch(() => retry('Abre Discord en el PC'));
}
app.on('before-quit', discordStop);


// Lo que usan otros módulos
Object.assign(R, { discordInit, discordSet });
