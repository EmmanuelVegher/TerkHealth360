const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, isolated desktop platform APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: '1.0.0',
  // Ask the main process to reload the window directly to the login page.
  // This is the safest way to handle logout in a packaged Electron app
  // because window.location.reload() can race against HashRouter state.
  reloadToLogin: () => ipcRenderer.send('reload-to-login')
});
