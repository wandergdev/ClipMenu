// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipAPI', {
  getHistory: () => ipcRenderer.invoke('get-history'),
  onHistoryUpdated: (cb) => {
    ipcRenderer.removeAllListeners('history-updated');
    ipcRenderer.on('history-updated', (_e, data) => cb(data));
  },
  useItem: (id) => ipcRenderer.send('use-item', id),
  clearHistory: () => ipcRenderer.send('clear-history'),
  deleteItem: (id) => ipcRenderer.send('delete-item', id),
});
