const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log/main');

// Configure electron-log: output to console and file
log.transports.console.level = 'debug'; // Increase console logging level
log.transports.file.level = 'debug'; // Increase file logging level

// Set up a specific log file in the project directory
const logFilePath = path.join(__dirname, 'electron-main.log');
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
      show: false, // Set to false initially
      alwaysOnTop: true, // Keep on top initially to ensure visibility
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true // Ensure DevTools are available
      },
      // Add these options to help with window display issues
      backgroundColor: '#FFFFFF',
      center: true
    });
    log.info('[FinCRuM] BrowserWindow created successfully');
  } catch (error) {
    log.error('[FinCRuM] Error creating BrowserWindow:', error);
    throw error; // Re-throw to be caught by the global handler
  }

  // Load the index.html file or the development server URL
  // Try to connect to the development server first, fallback to static files if needed
  const devServerUrl = 'http://localhost:9002';
  
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
  
  let mainAppLoadTimeout;
  const simpleTestHtmlUrl = `data:text/html,<html><head><title>Initial Load Test</title><style>body{background-color: red; color: white; font-size: 24px; padding: 20px; text-align: center;} h1{margin-top: 30vh;}</style></head><body><h1>Testing Initial Render</h1><p>You should see a RED background.</p><p id="time"></p><script>document.getElementById('time').innerText = 'Timestamp: ' + new Date().toISOString();</script></body></html>`;
  let initialLoadDone = false;

  // Handle load errors with more detailed URL info
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) {
        log.warn(`[FinCRuM] Non-mainframe load failed for ${validatedURL}. This is often a sub-resource. Error: ${errorDescription} (${errorCode})`);
        return;
    }
    log.error(`[FinCRuM] Main frame failed to load URL: ${validatedURL}, Error: ${errorDescription} (${errorCode})`);
    if (mainAppLoadTimeout) clearTimeout(mainAppLoadTimeout);

    if (validatedURL === simpleTestHtmlUrl) {
      log.error('[FinCRuM] CRITICAL: Initial test HTML failed to load. Displaying error.');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`data:text/html,<html><body><h2>Critical Error</h2><p>Failed to load initial test page. Electron window might not be working correctly.</p><p>Error: ${errorDescription} (${errorCode})</p></body></html>`);
      }
    } else if (validatedURL === startUrl && startUrl === devServerUrl) {
      log.info('[FinCRuM] Main application (dev server) failed to load, trying static file.');
      tryLoadStaticFile();
    } else if (validatedURL === staticFileUrl) {
      log.error('[FinCRuM] Static file also failed to load. Displaying final error page.');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`data:text/html,<html><body><h2>Error Loading Application</h2><p>Failed to load the application files (static fallback). Error: ${errorDescription} (${errorCode})</p><p>Please ensure Next.js build is correct. Try <code>npm run build</code>.</p></body></html>`);
      }
    } else {
      log.error(`[FinCRuM] Failed to load an unexpected URL: ${validatedURL}. Displaying generic error.`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`data:text/html,<html><body><h2>Application Load Error</h2><p>Failed to load: ${validatedURL}</p><p>Error: ${errorDescription} (${errorCode})</p></body></html>`);
      }
    }
  });
  
  // Add error handler for general window errors
  mainWindow.webContents.on('crashed', () => {
    log.error('[FinCRuM] Window crashed');
    if (mainWindow && !mainWindow.isDestroyed()) {
      log.info('[FinCRuM] Attempting to reload window after crash');
      mainWindow.reload();
    }
  });
  
  // Add error handler for renderer process errors
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error(`[FinCRuM] Renderer process gone: ${details.reason}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      log.info('[FinCRuM] Attempting to reload window after renderer process gone');
      mainWindow.reload();
    }
  });
  
  // Listener for when content finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    const currentURL = mainWindow.webContents.getURL();
    log.info(`[FinCRuM] Page finished loading: ${currentURL.startsWith('data:text/html') ? 'TestDataURI' : currentURL}`);

    if (!initialLoadDone && currentURL === simpleTestHtmlUrl) {
      log.info('[FinCRuM] Initial simple test HTML loaded successfully. Displaying for 10 seconds.');
      initialLoadDone = true; // Mark that the test HTML has been processed once

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
        log.info('[FinCRuM] alwaysOnTop set to false.');
      }

      // Clear any premature mainAppLoadTimeout (should not exist yet, but good practice)
      if (mainAppLoadTimeout) clearTimeout(mainAppLoadTimeout);

      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          log.info(`[FinCRuM] 10-second delay for test HTML is over. Now attempting to load main application: ${startUrl}`);
          
          // Set up the timeout for the main application load itself
          mainAppLoadTimeout = setTimeout(() => {
            const latestURL = mainWindow.webContents.getURL();
            if (mainWindow && !mainWindow.isDestroyed() &&
                latestURL !== startUrl &&
                latestURL !== staticFileUrl &&
                !latestURL.startsWith('data:text/html')) { // Check current URL at time of timeout
              if (startUrl === devServerUrl) {
                log.warn(`[FinCRuM] Main application (dev server) load timeout after delay. Current URL: ${latestURL}. Trying static file: ${staticFileUrl}`);
                tryLoadStaticFile();
              } else {
                log.warn(`[FinCRuM] Main application (${startUrl}) load timeout after delay. Current URL: ${latestURL}. No further fallback.`);
              }
            } else {
              log.info(`[FinCRuM] Main app load timeout check: Main app already loaded or on a data/test page. Current URL: ${latestURL}`);
            }
          }, 15000); // 15-second timeout for the main app to load

          mainWindow.loadURL(startUrl);
        }
      }, 10000); // Display test HTML for 10 seconds

    } else if (initialLoadDone) {
      // This block handles loads *after* the initial test HTML has been processed
      if (mainAppLoadTimeout) {
        clearTimeout(mainAppLoadTimeout);
        mainAppLoadTimeout = null; // Clear the timeout as the app (or fallback/error) has loaded
        log.info('[FinCRuM] Main application load sequence: Cleared mainAppLoadTimeout.');
      }

      if (currentURL === startUrl || currentURL === staticFileUrl) {
        log.info(`[FinCRuM] Main application (or static fallback) loaded successfully: ${currentURL}`);
      } else if (currentURL.startsWith('data:text/html') && currentURL !== simpleTestHtmlUrl) {
        // This means an error page (which are data: URLs) loaded
        log.error(`[FinCRuM] An error page seems to have loaded: ${currentURL.substring(0,100)}...`);
      } else if (currentURL === simpleTestHtmlUrl) {
        // This would be unexpected if it happens *after* initialLoadDone and we've tried to load startUrl
        log.warn(`[FinCRuM] The simpleTestHtmlUrl loaded AGAIN unexpectedly after initialLoadDone was true. URL: ${currentURL}`);
      }
      else {
        log.warn(`[FinCRuM] Loaded an unexpected URL after initial test sequence: ${currentURL.substring(0,100)}...`);
      }
    }
  });
  
  log.info(`[FinCRuM] Attempting initial load with SIMPLIFIED test HTML.`);
  mainWindow.loadURL(simpleTestHtmlUrl);

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