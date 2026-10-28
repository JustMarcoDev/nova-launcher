// Puente seguro entre la interfaz y main.js: solo expone window.api con las funciones que la interfaz puede pedir.
const { contextBridge, ipcRenderer: r, webUtils } = require('electron');
contextBridge.exposeInMainWorld('api', {
  cfg: () => r.invoke('cfg:get'), set: c => r.invoke('cfg:set', c),
  versions: () => r.invoke('versions'), play: o => r.invoke('play', o),
  http: o => r.invoke('http', o), mod: o => r.invoke('mod:install', o), pack: o => r.invoke('pack', o), errLog: o => r.invoke('err:log', o), errFolder: () => r.invoke('err:folder'), errText: f => r.invoke('err:text', f), packVersions: id => r.invoke('pack:versions', id),
  insts: () => r.invoke('inst:list'), saveInst: o => r.invoke('inst:save', o), delInst: id => r.invoke('inst:del', id),
  login: () => r.invoke('acc:login'), sys: () => r.invoke('sys'), ver: () => r.invoke('ver'), updGet: () => r.invoke('upd:get'), updCheck: () => r.invoke('upd:check'), updDownload: () => r.invoke('upd:download'), updInstall: () => r.invoke('upd:install'), uninstall: o => r.invoke('app:uninstall', o), skinList: () => r.invoke('skin:list'), skinSave: o => r.invoke('skin:save', o), skinDel: i => r.invoke('skin:del', i), skinModel: o => r.invoke('skin:model', o), skinUse: i => r.invoke('skin:use', i), skinUnset: () => r.invoke('skin:unset'), skinRename: o => r.invoke('skin:rename', o), skinReplace: o => r.invoke('skin:replace', o), skinFolder: () => r.invoke('skin:folder'), skinCurrent: () => r.invoke('skin:current'), capeSet: i => r.invoke('cape:set', i), nvbgList: () => r.invoke('nvbg:list'), nmenuGet: () => r.invoke('nmenu:get'), nmenuSet: o => r.invoke('nmenu:set', o), nmenuShot: () => r.invoke('nmenu:shot'), nmenuExport: t => r.invoke('nmenu:export', t), nmenuImport: () => r.invoke('nmenu:import'), nvbgGet: f => r.invoke('nvbg:get', f), nvbgDel: f => r.invoke('nvbg:del', f), discordGet: () => r.invoke('discord:get'), cacheClear: () => r.invoke('cache:clear'), diskUsage: () => r.invoke('disk:usage'), srvStatus: h => r.invoke('srv:status', h), shortcut: () => r.invoke('shortcut:create'), open: u => r.invoke('open', u), notices: () => r.invoke('notices'), zoom: f => r.invoke('zoom', f), folder: () => r.invoke('folder'),
  instUpdate: (id, patch) => r.invoke('inst:update', { id, patch }), instDup: id => r.invoke('inst:dup', id), instOpen: (id, sub) => r.invoke('inst:open', { id, sub }), instExport: o => r.invoke('inst:export', o), instImport: () => r.invoke('inst:import'), loaderVersions: o => r.invoke('loader:versions', o),
  modsList: id => r.invoke('mods:list', id), modsPrecheck: o => r.invoke('mods:precheck', o), modsCheck: o => r.invoke('mods:check', o), modsToggle: o => r.invoke('mods:toggle', o), modsRemove: o => r.invoke('mods:remove', o), modsUpdate: o => r.invoke('mods:update', o), modsAdd: id => r.invoke('mods:add', id),
  bkList: id => r.invoke('bk:list', id), bkCreate: id => r.invoke('bk:create', id), bkRestore: o => r.invoke('bk:restore', o), bkDel: o => r.invoke('bk:del', o), bkOpen: id => r.invoke('bk:open', id), logOpen: f => r.invoke('log:open', f), logsFolder: () => r.invoke('logs:folder'),
  accAddOffline: n => r.invoke('acc:addOffline', n), accSwitch: id => r.invoke('acc:switch', id), accRemove: id => r.invoke('acc:remove', id),
  statsGet: () => r.invoke('stats:get'), shotsList: id => r.invoke('shots:list', id), shotsOpen: o => r.invoke('shots:open', o), shotsCopy: o => r.invoke('shots:copy', o), shotsDelete: o => r.invoke('shots:delete', o), shotsFolder: id => r.invoke('shots:folder', id),
  clip: t => r.invoke('clip:text', t), saveText: o => r.invoke('text:save', o),
  worldsList: id => r.invoke('worlds:list', id), worldsCopy: o => r.invoke('worlds:copy', o), worldsImport: id => r.invoke('worlds:import', id),
  modsHas: o => r.invoke('mods:has', o), modsProjects: o => r.invoke('mods:projects', o), modsBundle: o => r.invoke('mods:bundle', o),
  releases: () => r.invoke('app:releases'), rollback: o => r.invoke('app:rollback', o),
  importScan: () => r.invoke('import:scan'), importRun: d => r.invoke('import:run', d),
  settingsExport: o => r.invoke('settings:export', o), settingsImport: () => r.invoke('settings:import'),
  worldLast: () => r.invoke('world:last'), diag: id => r.invoke('diag:run', id),
  dqState: () => r.invoke('dq:state'), dqPause: on => r.invoke('dq:pause', on), dqCancel: () => r.invoke('dq:cancel'), dqLimit: mb => r.invoke('dq:limit', mb),
  prepRun: q => r.invoke('prep:run', q), cleanScan: () => r.invoke('clean:scan'), cleanRun: ids => r.invoke('clean:run', ids),
  dropInspect: p => r.invoke('drop:inspect', p), dropInstall: o => r.invoke('drop:install', o), filePath: f => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  win: a => r.send('win', a), on: (ch, f) => r.on(ch, (e, d) => f(d))
});
