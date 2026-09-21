const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, isolated desktop platform APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: '1.0.0'
});
