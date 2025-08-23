const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Simple logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  try {
    fs.appendFileSync('electron-test.log', logMessage);
  } catch (e) {
    console.error('Failed to write to log:', e);
  }
}

log('=== ELECTRON TEST STARTED ===');
log('Node version: ' + process.version);
log('Electron version: ' + process.versions.electron);
log('Platform: ' + process.platform);
log('Working directory: ' + process.cwd());

let mainWindow;

function createWindow() {
  log('Creating test window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('data:text/html,<h1>Electron Test Window</h1><p>If you see this, Electron is working!</p>');
  
  mainWindow.on('closed', () => {
    log('Test window closed');
    mainWindow = null;
  });
  
  log('Test window created successfully');
}

app.whenReady().then(() => {
  log('App is ready, creating window...');
  createWindow();
}).catch(error => {
  log('Error in whenReady: ' + error.message);
  log('Stack trace: ' + error.stack);
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    log('Quitting app...');
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    log('App activated, creating window...');
    createWindow();
  }
});

log('Test script initialized');