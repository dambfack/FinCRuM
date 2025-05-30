const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Configure logging
const log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(message);
  try {
    fs.appendFileSync('electron.log', message + '\n');
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
};

log('Starting FinCRuM application...');

let mainWindow;

function createWindow() {
  log('Creating main window...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        devTools: isDev
      },
      backgroundColor: '#FFFFFF',
      center: true,
      title: 'FinCRuM - Financial Credit Risk Management',
      icon: path.join(__dirname, 'assets', 'icon.png')
    });
    
    log('Main window created');
    
    // Load the application
    if (isDev) {
      const devServerUrl = 'http://localhost:9002';
      log(`Loading development URL: ${devServerUrl}`);
      mainWindow.loadURL(devServerUrl);
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, 'out', 'index.html');
      log(`Loading production file: ${indexPath}`);
      mainWindow.loadFile(indexPath);
    }
    
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
    
    // Security: Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      log(`Blocked window open attempt: ${url}`);
      return { action: 'deny' };
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

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:9002' && !navigationUrl.startsWith('file://')) {
      log(`Blocked navigation to: ${navigationUrl}`);
      navigationEvent.preventDefault();
    }
  });
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise, 'reason:', reason);
});