const {contextBridge, ipcRenderer} = require('electron');
const allowed = new Set(['shixu-tasks-v1', 'shixu-settings-v1']);
contextBridge.exposeInMainWorld('stillDesktop', {
  platform: process.platform,
  storage: {
    getItem(key) { return allowed.has(key) ? ipcRenderer.sendSync('storage:get', key) : null; },
    setItem(key, value) { if (!allowed.has(key)) throw new Error('Unknown data key'); const result=ipcRenderer.sendSync('storage:set',key,String(value)); if (!result.ok) throw new Error(result.error); }
  },
  notify(title, body, tag) { return ipcRenderer.sendSync('notification:show', {title, body, tag}); },
  notificationStatus() { return ipcRenderer.sendSync('notification:status'); },
  openNotificationSettings() { ipcRenderer.send('notification:settings'); },
  onDataChanged(callback) { ipcRenderer.on('storage:changed', () => callback()); },
  onNotificationError(callback) { ipcRenderer.on('notification:error', (_, message) => callback(message)); }
});
