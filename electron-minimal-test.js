// Minimal Electron test - Phase 5.1 of debug plan
console.log('[MINIMAL-TEST] Starting minimal Electron test...');

const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('[MINIMAL-TEST] Electron modules loaded');

// Disable security warnings for testing
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

function createWindow() {
  console.log('[MINIMAL-TEST] Creating window...');
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  console.log('[MINIMAL-TEST] Window created, loading content...');
  
  // Load a simple HTML string instead of external URL
  mainWindow.loadURL('data:text/html,<html><body><h1>Minimal Electron Test</h1><p>If you see this, basic Electron is working!</p></body></html>');
  
  console.log('[MINIMAL-TEST] Content loaded');
  
  mainWindow.on('closed', () => {
    console.log('[MINIMAL-TEST] Window closed');
  });
  
  return mainWindow;
}

// App event handlers
app.on('ready', () => {
  console.log('[MINIMAL-TEST] App ready event fired');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('[MINIMAL-TEST] All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('[MINIMAL-TEST] App activate event fired');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('[MINIMAL-TEST] App before-quit event fired');
});

app.on('will-quit', () => {
  console.log('[MINIMAL-TEST] App will-quit event fired');
});

app.on('quit', () => {
  console.log('[MINIMAL-TEST] App quit event fired');
});

console.log('[MINIMAL-TEST] Event handlers registered, waiting for ready event...');