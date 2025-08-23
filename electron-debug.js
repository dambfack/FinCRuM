console.log('[DEBUG] Starting Electron main process...');
const { app, BrowserWindow } = require('electron');
const path = require('path');
console.log('[DEBUG] All modules imported successfully');

// Simple console-only logging
const log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(message);
};

log('=== NEW ELECTRON SESSION STARTED ===');
log('Starting Electron application...');
log('Node version:', process.version);
log('Electron version:', process.versions.electron);
log('Platform:', process.platform);
log('Working directory:', process.cwd());

let mainWindow;

function createWindow() {
  console.log('[DEBUG] createWindow() function called');
  log('Creating main window...');
  
  try {
    console.log('[DEBUG] About to create BrowserWindow');
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        devTools: true
      },
      backgroundColor: '#667eea',
      center: true,
      title: 'FinCRuM - Debug Version'
    });
    
    console.log('[DEBUG] BrowserWindow created successfully');
    log('Main window created successfully');
    
    // Load a simple test page
    mainWindow.loadURL('data:text/html,<h1>Debug Electron App</h1><p>This is running successfully!</p>');
    
    mainWindow.on('closed', () => {
      log('Main window closed');
      mainWindow = null;
    });
    
    console.log('[DEBUG] Window setup complete');
    
  } catch (error) {
    console.error('[DEBUG] Error creating window:', error);
    log('Error creating window:', error);
    app.quit();
  }
}

// App event handlers
app.whenReady().then(async () => {
  console.log('[DEBUG] App.whenReady() called');
  log('App is ready. Creating window...');
  
  console.log('[DEBUG] About to call createWindow');
  createWindow();
  
  app.on('activate', () => {
    if (mainWindow === null) {
      log('App activated, creating new window...');
      createWindow();
    }
  });
  
  console.log('[DEBUG] App.whenReady() completed');
}).catch(error => {
  console.error('[DEBUG] Error in whenReady:', error);
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

app.on('before-quit', () => {
  log('App is about to quit...');
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[DEBUG] Uncaught Exception:', error);
  log('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[DEBUG] Unhandled Rejection at:', promise, 'reason:', reason);
  log('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('[DEBUG] Main process initialized');
log('Main process initialized, event handlers configured.');