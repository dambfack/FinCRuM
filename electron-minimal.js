const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Starting minimal Electron app...');
console.log('Electron version:', process.versions.electron);
console.log('Platform:', process.platform);

let mainWindow;

function createWindow() {
  console.log('Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  console.log('Window created, loading content...');
  
  // Load a simple HTML page
  mainWindow.loadURL('data:text/html,<h1>Minimal Electron App Running</h1><p>This is a test to verify Electron works.</p>');
  
  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });
  
  console.log('Window setup complete');
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
  
  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('Error in whenReady:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('Electron app initialized');