const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('api', {
  cfg: () => r.invoke('cfg:get'), set: c => r.invoke('cfg:set', c),
  versions: () => r.invoke('versions'), play: o => r.invoke('play', o),
  http: o => r.invoke('http', o), mod: o => r.invoke('mod:install', o), pack: id => r.invoke('pack', id),
  insts: () => r.invoke('inst:list'), saveInst: o => r.invoke('inst:save', o), delInst: id => r.invoke('inst:del', id),
  login: () => r.invoke('login'), sys: () => r.invoke('sys'), ver: () => r.invoke('ver'), updGet: () => r.invoke('upd:get'), updCheck: () => r.invoke('upd:check'), updDownload: () => r.invoke('upd:download'), updInstall: () => r.invoke('upd:install'), discordGet: () => r.invoke('discord:get'), cacheClear: () => r.invoke('cache:clear'), diskUsage: () => r.invoke('disk:usage'), srvStatus: h => r.invoke('srv:status', h), novaInfo: () => r.invoke('nova:info'), novaPack: () => r.invoke('nova:pack'), shortcut: () => r.invoke('shortcut:create'), open: u => r.invoke('open', u), zoom: f => r.invoke('zoom', f), folder: () => r.invoke('folder'),
  win: a => r.send('win', a), on: (ch, f) => r.on(ch, (e, d) => f(d))
});
