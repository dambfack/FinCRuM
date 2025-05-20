// test-window-visibility.js - Diagnostic script for window visibility issues
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Set up simple logging
const logFilePath = path.join(__dirname, 'window-visibility-test.log');

// Clear log file at the start of each run
try { fs.unlinkSync(logFilePath); } catch (e) { /* ignore if file doesn't exist */ }

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
  console.log(logMessage); // Also write to console for immediate feedback
}

log('VISIBILITY_TEST: Script starting');

let mainWindow;

function createWindow() {
  log('VISIBILITY_TEST: Creating main window');
  
  // Log system information
  log(`VISIBILITY_TEST: Process type: ${process.type}`);
  log(`VISIBILITY_TEST: Process platform: ${process.platform}`);
  log(`VISIBILITY_TEST: Node version: ${process.versions.node}`);
  log(`VISIBILITY_TEST: Electron version: ${process.versions.electron}`);
  
  // Create a minimal window with focus on visibility
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true, // Try showing immediately instead of waiting for ready-to-show
    backgroundColor: '#FFFFFF',
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });
  
  log('VISIBILITY_TEST: BrowserWindow created');
  log(`VISIBILITY_TEST: Window visible: ${mainWindow.isVisible()}`);
  log(`VISIBILITY_TEST: Window focused: ${mainWindow.isFocused()}`);
  
  // Load a simple HTML content directly
  mainWindow.loadURL(`data:text/html,
    <html>
      <head><title>Electron Window Visibility Test</title></head>
      <body style="background-color: #FF5733;">
        <h1>Electron Window Visibility Test</h1>
        <p>If you can see this, the window is displaying correctly.</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
  
  // Add visibility event listeners
  mainWindow.on('show', () => {
    log('VISIBILITY_TEST: Window show event fired');
  });
  
  mainWindow.on('focus', () => {
    log('VISIBILITY_TEST: Window focus event fired');
  });
  
  mainWindow.on('blur', () => {
    log('VISIBILITY_TEST: Window blur event fired');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    log('VISIBILITY_TEST: Content finished loading');
    log(`VISIBILITY_TEST: Window visible after load: ${mainWindow.isVisible()}`);
    log(`VISIBILITY_TEST: Window focused after load: ${mainWindow.isFocused()}`);
    
    // Force focus and show again after content loads
    mainWindow.show();
    mainWindow.focus();
    log(`VISIBILITY_TEST: Window visible after force show: ${mainWindow.isVisible()}`);
  });
  
  // Open DevTools to help diagnose issues
  mainWindow.webContents.openDevTools({ mode: 'detach' });
  log('VISIBILITY_TEST: DevTools opened');
  
  mainWindow.on('closed', () => {
    log('VISIBILITY_TEST: Window closed');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  log('VISIBILITY_TEST: App is ready');
  createWindow();
  
  // Set a timeout to quit the app after testing
  setTimeout(() => {
    log('VISIBILITY_TEST: Test complete, quitting application');
    app.quit();
  }, 15000); // Run for 15 seconds to give time to observe
}).catch(err => {
  log(`VISIBILITY_TEST: App ready error: ${err.toString()}`);
  app.quit();
});

app.on('window-all-closed', () => {
  log('VISIBILITY_TEST: All windows closed');
  app.quit();
});

log('VISIBILITY_TEST: Script initialized');