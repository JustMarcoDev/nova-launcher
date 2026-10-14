const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('api', {
  cfg: () => r.invoke('cfg:get'), set: c => r.invoke('cfg:set', c),
  versions: () => r.invoke('versions'), play: o => r.invoke('play', o),
  http: o => r.invoke('http', o), mod: o => r.invoke('mod:install', o), pack: o => r.invoke('pack', o), packVersions: id => r.invoke('pack:versions', id),
  insts: () => r.invoke('inst:list'), saveInst: o => r.invoke('inst:save', o), delInst: id => r.invoke('inst:del', id),
  login: () => r.invoke('login'), sys: () => r.invoke('sys'), ver: () => r.invoke('ver'), updGet: () => r.invoke('upd:get'), updCheck: () => r.invoke('upd:check'), updDownload: () => r.invoke('upd:download'), updInstall: () => r.invoke('upd:install'), discordGet: () => r.invoke('discord:get'), cacheClear: () => r.invoke('cache:clear'), diskUsage: () => r.invoke('disk:usage'), srvStatus: h => r.invoke('srv:status', h), novaInfo: () => r.invoke('nova:info'), novaPack: () => r.invoke('nova:pack'), shortcut: () => r.invoke('shortcut:create'), open: u => r.invoke('open', u), zoom: f => r.invoke('zoom', f), folder: () => r.invoke('folder'),
  instUpdate: (id, patch) => r.invoke('inst:update', { id, patch }), instDup: id => r.invoke('inst:dup', id), instOpen: (id, sub) => r.invoke('inst:open', { id, sub }), instExport: o => r.invoke('inst:export', o), instImport: () => r.invoke('inst:import'), loaderVersions: o => r.invoke('loader:versions', o),
  modsList: id => r.invoke('mods:list', id), modsCheck: o => r.invoke('mods:check', o), modsToggle: o => r.invoke('mods:toggle', o), modsRemove: o => r.invoke('mods:remove', o), modsUpdate: o => r.invoke('mods:update', o), modsAdd: id => r.invoke('mods:add', id),
  bkList: id => r.invoke('bk:list', id), bkCreate: id => r.invoke('bk:create', id), bkRestore: o => r.invoke('bk:restore', o), bkDel: o => r.invoke('bk:del', o), bkOpen: id => r.invoke('bk:open', id), logOpen: f => r.invoke('log:open', f), logsFolder: () => r.invoke('logs:folder'),
  win: a => r.send('win', a), on: (ch, f) => r.on(ch, (e, d) => f(d))
});
