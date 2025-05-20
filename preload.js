// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Example: Expose a simple API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any functions you want to expose here
  // e.g., send: (channel, data) => ipcRenderer.send(channel, data),
  // e.g., receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});

console.log('Preload script loaded.');