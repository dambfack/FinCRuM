// electron-improved.js - Enhanced version with improved window visibility handling
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log/main');

// Configure electron-log: output to console and file
log.transports.console.level = 'debug'; // Increase console logging level
log.transports.file.level = 'debug'; // Increase file logging level

// Set up a specific log file in the project directory
const logFilePath = path.join(__dirname, 'electron-improved.log');
log.transports.file.resolvePathFn = () => logFilePath;

// Log the actual path where logs will be written
console.log(`[FinCRuM] Logging to: ${logFilePath}`);
log.info(`[FinCRuM] Electron log file location: ${logFilePath}`);

// Ensure we can see all errors
process.on('uncaughtException', (error) => {
  log.error('[FinCRuM] Uncaught Exception:', error);
  console.error('[FinCRuM] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('[FinCRuM] Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('[FinCRuM] Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow;

function createWindow() {
  log.info('[FinCRuM] Creating main window');
  
  // Log system information for debugging
  log.info(`[FinCRuM] Process type: ${process.type}`);
  log.info(`[FinCRuM] Process platform: ${process.platform}`);
  log.info(`[FinCRuM] Node version: ${process.versions.node}`);
  log.info(`[FinCRuM] Electron version: ${process.versions.electron}`);
  log.info(`[FinCRuM] Chrome version: ${process.versions.chrome}`);
  
  // Create the browser window with enhanced configuration
  try {
    log.info('[FinCRuM] Initializing BrowserWindow');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true, // CHANGED: Show window immediately instead of waiting for ready-to-show
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true // Ensure DevTools are available
      },
      // Add these options to help with window display issues
      backgroundColor: '#FFFFFF',
      center: true,
      // ADDED: Force the window to be on top initially to ensure visibility
      alwaysOnTop: true
    });
    log.info('[FinCRuM] BrowserWindow created successfully');
    
    // ADDED: Reset alwaysOnTop after a short delay
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(false);
        log.info('[FinCRuM] Disabled always on top');
      }
    }, 3000);
    
    // ADDED: Log initial window state
    log.info(`[FinCRuM] Initial window visible: ${mainWindow.isVisible()}`);
    log.info(`[FinCRuM] Initial window focused: ${mainWindow.isFocused()}`);
  } catch (error) {
    log.error('[FinCRuM] Error creating BrowserWindow:', error);
    throw error; // Re-throw to be caught by the global handler
  }

  // Load the index.html file or the development server URL
  // Try to connect to the development server first, fallback to static files if needed
  const devServerUrl = 'http://localhost:9002';
  
  // ADDED: First try loading a simple test page to verify window functionality
  const testHtmlContent = `data:text/html,
    <html>
      <head><title>FinCRuM Window Test</title></head>
      <body style="background-color: #e0f7fa;">
        <h1>FinCRuM Window Test</h1>
        <p>If you can see this, the window is displaying correctly.</p>
        <p>The application will attempt to load the actual content shortly.</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `;
  
  mainWindow.loadURL(testHtmlContent);
  log.info('[FinCRuM] Loaded test HTML content');
  
  // ADDED: After a short delay, try loading the actual content
  setTimeout(() => {
    if (!mainWindow) return;
    
    // Determine the correct path for static files based on Next.js output structure
    // Next.js 13+ uses app directory structure
    const appIndexPath = path.join(__dirname, '.next', 'server', 'app', 'index.html');
    const pagesIndexPath = path.join(__dirname, '.next', 'server', 'pages', 'index.html');
    
    // Check which path exists and use it, with a fallback
    let staticFilePath;
    if (fs.existsSync(appIndexPath)) {
      staticFilePath = appIndexPath;
      log.info(`[FinCRuM] Found app directory index at: ${appIndexPath}`);
    } else if (fs.existsSync(pagesIndexPath)) {
      staticFilePath = pagesIndexPath;
      log.info(`[FinCRuM] Found pages directory index at: ${pagesIndexPath}`);
    } else {
      // Fallback to a default path if neither exists
      staticFilePath = path.join(__dirname, '.next', 'server', 'app', 'index.html');
      log.warn(`[FinCRuM] Could not find Next.js output files, using default path: ${staticFilePath}`);
    }
    
    const staticFileUrl = `file://${staticFilePath}`;
    const startUrl = process.env.ELECTRON_START_URL || devServerUrl;
    log.info(`[FinCRuM] Primary URL: ${startUrl}, Fallback: ${staticFileUrl}`);
    
    // Function to try loading the static file if dev server fails
    const tryLoadStaticFile = () => {
      log.info(`[FinCRuM] Attempting to load static file: ${staticFileUrl}`);
      
      // Check if the static file path exists before trying to load it
      if (fs.existsSync(staticFilePath)) {
        log.info(`[FinCRuM] Static file exists, loading: ${staticFilePath}`);
        mainWindow.loadURL(staticFileUrl);
      } else {
        log.error(`[FinCRuM] Static file does not exist: ${staticFilePath}`);
        // Show a meaningful error message in the window
        mainWindow.loadURL(`data:text/html,<html><body><h2>Error Loading Application</h2><p>Could not find the application files. Please make sure the Next.js application is built properly.</p><p>Missing file: ${staticFilePath}</p><p>Try running: <code>npm run build</code></p></body></html>`);
      }
    };
    
    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log.error(`[FinCRuM] Failed to load URL: ${errorDescription} (${errorCode})`);
      
      // If we failed to load the dev server, try the static file
      if (startUrl === devServerUrl) {
        log.info('[FinCRuM] Development server not available, trying static file');
        // Log more details about the error
        log.info(`[FinCRuM] Error details - Code: ${errorCode}, Description: ${errorDescription}`);
        tryLoadStaticFile();
      } else if (startUrl === staticFileUrl) {
        // If we're already trying to load the static file and it failed
        log.error('[FinCRuM] Static file failed to load, showing error page');
        // Show a meaningful error message in the window
        mainWindow.loadURL(`data:text/html,<html><body><h2>Error Loading Application</h2><p>Failed to load the application files. Error: ${errorDescription} (${errorCode})</p><p>Please make sure the Next.js application is built properly.</p><p>Try running: <code>npm run build</code></p></body></html>`);
      } else {
        // Otherwise retry the current URL after a short delay
        log.info(`[FinCRuM] Will retry loading URL in 1 second: ${startUrl}`);
        setTimeout(() => {
          if (!mainWindow) return;
          log.info(`[FinCRuM] Retrying to load URL: ${startUrl}`);
          mainWindow.loadURL(startUrl);
        }, 1000);
      }
    });
    
    // Also add a timeout to switch to static file if dev server takes too long
    const loadTimeout = setTimeout(() => {
      if (!mainWindow) return;
      if (startUrl === devServerUrl) {
        log.info('[FinCRuM] Development server load timeout, trying static file');
        tryLoadStaticFile();
      }
    }, 5000); // 5 second timeout
    
    // Clear the timeout if the page loads successfully
    mainWindow.webContents.on('did-finish-load', () => {
      clearTimeout(loadTimeout);
      log.info('[FinCRuM] Page loaded successfully');
    });
    
    mainWindow.loadURL(startUrl);
    log.info(`[FinCRuM] Attempting to load actual content: ${startUrl}`);
  }, 2000); // Wait 2 seconds before loading actual content
  
  // Show window when ready with enhanced logging
  mainWindow.once('ready-to-show', () => {
    log.info('[FinCRuM] Window ready to show');
    log.info(`[FinCRuM] Window bounds: ${JSON.stringify(mainWindow.getBounds())}`);
    log.info(`[FinCRuM] Window visible: ${mainWindow.isVisible()}`);
    log.info(`[FinCRuM] Window focused: ${mainWindow.isFocused()}`);
    
    // Force focus and show
    mainWindow.show();
    mainWindow.focus();
    
    // Log after showing
    log.info(`[FinCRuM] Window shown, now visible: ${mainWindow.isVisible()}`);
    
    // If in development mode, position DevTools for better debugging
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools({ mode: 'right' });
      log.info('[FinCRuM] DevTools opened in right panel');
    }
  });
  
  // Additional window state logging
  mainWindow.on('show', () => {
    log.info('[FinCRuM] Window show event fired');
  });
  
  mainWindow.on('focus', () => {
    log.info('[FinCRuM] Window focus event fired');
  });
  
  mainWindow.on('blur', () => {
    log.info('[FinCRuM] Window blur event fired');
  });
  
  // Add error handler for general window errors
  mainWindow.webContents.on('crashed', () => {
    log.error('[FinCRuM] Window crashed');
    // Attempt to reload the window
    if (mainWindow) {
      log.info('[FinCRuM] Attempting to reload window after crash');
      mainWindow.reload();
    }
  });
  
  // Add error handler for renderer process errors
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error(`[FinCRuM] Renderer process gone: ${details.reason}`);
    // Try to reload if the window is still available
    if (mainWindow) {
      log.info('[FinCRuM] Attempting to reload window after renderer process gone');
      mainWindow.reload();
    }
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
    log.info('[FinCRuM] DevTools opened');
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    log.info('[FinCRuM] Window closed');
    mainWindow = null;
  });

  log.info('[FinCRuM] Window created successfully');
}

log.info('[FinCRuM] Application starting');

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  log.info('[FinCRuM] App is ready');
  createWindow();

  // On macOS it's common to re-create a window when the dock icon is clicked
  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
      log.info('[FinCRuM] Window re-created on activate');
    }
  });
}).catch(err => {
  log.error('[FinCRuM] App ready error:', err);
  app.quit();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  log.info('[FinCRuM] All windows closed');
  if (process.platform !== 'darwin') {
    log.info('[FinCRuM] Quitting application');
    app.quit();
  }
});

log.info('[FinCRuM] Main process initialized, event listeners attached.');