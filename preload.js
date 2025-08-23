const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth methods
  openOAuthUrl: (url) => ipcRenderer.invoke('oauth:open-url', url),
  onOAuthCallback: (callback) => ipcRenderer.on('oauth:callback', (event, code) => callback(code)),
  onOAuthError: (callback) => ipcRenderer.on('oauth:error', (event, error) => callback(error)),
  removeOAuthListener: (callback) => {
    ipcRenderer.removeListener('oauth:callback', callback);
    ipcRenderer.removeListener('oauth:error', callback);
  },

  // System methods
  platform: process.platform,
  isElectron: true,

  // App methods
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  quit: () => ipcRenderer.invoke('app:quit'),

  // File system methods (if needed in future)
  selectFile: (options) => ipcRenderer.invoke('dialog:select-file', options),
  selectDirectory: (options) => ipcRenderer.invoke('dialog:select-directory', options),

  // Window methods
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Development methods
  openDevTools: () => ipcRenderer.invoke('dev:open-dev-tools'),
  reload: () => ipcRenderer.invoke('dev:reload')
});

// Log that preload script has loaded
console.log('Preload script loaded successfully');