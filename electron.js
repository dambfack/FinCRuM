const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Configure logging
const log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(message);  // Log to console
  try {
    fs.appendFileSync('electron.log', message + '\n');  // Log to file
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
};

log('Starting Electron application...');

let mainWindow;

function createWindow() {
  log('Creating main window...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false, // Only for development
        devTools: true
      },
      backgroundColor: '#FFFFFF',
      center: true,
      title: 'FinCRuM - Financial Credit Risk Management'
    });
    
    log('Main window created');
    
    // Load the Next.js dev server URL
    const devServerUrl = 'http://localhost:9002';
    log(`Loading URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
    
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
    
    mainWindow.on('closed', () => {
      log('Main window closed');
      mainWindow = null;
    });
    
    // Handle navigation events
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log(`Failed to load: ${errorCode} - ${errorDescription}`);
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      log('Page finished loading');
    });
    
  } catch (error) {
    log('Error creating window:', error);
    app.quit();
  }
}

// App event handlers
app.whenReady().then(() => {
  log('App is ready, creating window...');
  createWindow();
  
  app.on('activate', () => {
    if (mainWindow === null) {
      log('App activated, creating new window...');
      createWindow();
    }
  });
}).catch(error => {
  log('Error in whenReady:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    log('Quitting application...');
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);  
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise, 'reason:', reason);
});

log('Main process initialized');
