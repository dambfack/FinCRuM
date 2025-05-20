const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process'); // For startNextDevServer

// IMPORTANT: electron modules should be required AFTER initial fs logging if they interfere.
// For now, keeping them here, but if issues persist, move app/BrowserWindow require after initial log block.
const { app, BrowserWindow, dialog } = require('electron');

const SCRIPT_VERSION = "V4_UPDATE_RETRY"; // New version marker
const logFilePath = path.join(__dirname, 'electron-main.log'); // logFilePath is defined here

// Enhanced initial logging and log file reset, MUST HAPPEN BEFORE 'electron-log' is required.
try {
  const initialNodeEnv = process.env.NODE_ENV;
  let initLogContent = `[${new Date().toISOString()}] [FinCRuM_INIT] ${SCRIPT_VERSION} starting.\n`;
  initLogContent += `[${new Date().toISOString()}] [FinCRuM_INIT] Initial process.env.NODE_ENV: '${initialNodeEnv}' (type: ${typeof initialNodeEnv}).\n`;

  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
    initLogContent += `[${new Date().toISOString()}] [FinCRuM_INIT] Old log file ${logFilePath} deleted.\n`;
  } else {
    initLogContent += `[${new Date().toISOString()}] [FinCRuM_INIT] Log file ${logFilePath} did not exist, no deletion needed.\n`;
  }
  fs.writeFileSync(logFilePath, initLogContent, 'utf8');
  console.log(`[FinCRuM_DEBUG] ${SCRIPT_VERSION} started. Initial NODE_ENV: '${initialNodeEnv}'. Log file reset and initial content written to: ${logFilePath}`);
} catch (err) {
  console.error(`[FinCRuM_DEBUG] CRITICAL ERROR during initial log setup for ${SCRIPT_VERSION} (log file path: ${logFilePath}):`, err);
  try { 
    const criticalErrorLogPath = path.join(__dirname, 'electron-critical-error.log');
    fs.appendFileSync(criticalErrorLogPath, `[${new Date().toISOString()}] [${SCRIPT_VERSION}] Failed initial log setup for ${logFilePath}: ${err.message || err}\nStack: ${err.stack || 'N/A'}\n`, 'utf8'); 
  } catch (secondaryErr) {
    // If even critical error logging fails, do nothing further
  }
}
// The original 'const log = require('electron-log/main');' will follow this new block.

console.log('[FinCRuM_DEBUG] Required modules potentially loaded (app, BrowserWindow, spawn).');

const log = require('electron-log/main');
console.log('[FinCRuM_DEBUG] electron-log module loaded.');

// Configure electron-log: output to console and file
log.transports.console.level = 'debug'; // Increase console logging level
log.transports.file.level = 'debug'; // Increase file logging level

// Set up a specific log file in the project directory
// const logFilePath = path.join(__dirname, 'electron-main.log'); // This was a duplicate declaration
log.transports.file.resolvePathFn = () => logFilePath;

// Log the actual path where logs will be written
console.log(`[FinCRuM_DEBUG] Configured electron-log. Attempting to log to: ${logFilePath}`);
log.info(`[FinCRuM] Electron log file location: ${logFilePath} (electron-log)`);

// Test write with electron-log immediately after setup
log.info('[FinCRuM_DEBUG] This is an immediate test log entry from electron-log.');

// Test write with fs.appendFileSync immediately after setup
try {
  fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] [FinCRuM_DEBUG] This is an immediate test log entry from fs.appendFileSync.\n`, 'utf8');
  console.log('[FinCRuM_DEBUG] Successfully wrote test entry with fs.appendFileSync.');
} catch (err) {
  console.error('[FinCRuM_DEBUG] Failed to write test entry with fs.appendFileSync:', err);
}

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
let devServerProcess = null; // To hold the Next.js dev server process

// Function to start the Next.js development server
function startNextDevServer() {
  return new Promise((resolve, reject) => {
    let resolved = false; // Flag to prevent multiple resolves/rejects

    const port = 9002; // Ensure this matches your devServerUrl in createWindow
    const command = 'npx';
    // Use npx.cmd on Windows for 'npx' commands
    const effectiveCommand = process.platform === 'win32' ? 'npx.cmd' : command;
    const args = ['next', 'dev', '-p', port.toString()];

    log.info(`[FinCRuM] Spawning Next.js dev server: ${effectiveCommand} ${args.join(' ')} in ${__dirname}`);

    devServerProcess = spawn(effectiveCommand, args, {
      cwd: __dirname, // Assumes electron.js is in the project root alongside package.json
      shell: true,    // shell:true can be helpful for resolving commands in PATH, especially with npx/npm.
      stdio: 'pipe'   // Capture stdout/stderr
    });

    const readyMessages = [
      `ready - started server on 0.0.0.0:${port}`,
      `event - compiled client and server successfully`,
      `Compiled successfully`,
      `started server on ::, url: http://localhost:${port}`
    ];

    const onData = (data) => {
      const output = data.toString();
      log.info(`[NextDevServer-stdout] ${output.trim()}`);
      if (!resolved) {
        if (readyMessages.some(msg => output.includes(msg))) {
          log.info('[FinCRuM] Next.js dev server reported ready.');
          resolved = true;
          resolve();
        }
      }
    };

    const onErrorData = (data) => {
      const errorOutput = data.toString();
      log.error(`[NextDevServer-stderr] ${errorOutput.trim()}`);
      if (!resolved && errorOutput.includes('already in use')) {
          log.error(`[FinCRuM] Port ${port} for dev server is already in use.`);
          resolved = true;
          reject(new Error(`Port ${port} already in use.`));
      }
    };

    devServerProcess.stdout.on('data', onData);
    devServerProcess.stderr.on('data', onErrorData);

    devServerProcess.on('error', (err) => {
      if (!resolved) {
        log.error('[FinCRuM] Failed to start Next.js dev server process (spawn error):', err);
        resolved = true;
        reject(err);
      } else {
        log.error('[FinCRuM] Error from Next.js dev server process after it was considered ready:', err);
      }
    });

    devServerProcess.on('close', (code) => {
      log.info(`[FinCRuM] Next.js dev server process exited with code ${code}.`);
      if (!resolved) {
        log.error(`[FinCRuM] Next.js dev server process closed (code ${code}) before becoming ready.`);
        resolved = true;
        reject(new Error(`Next.js dev server process exited prematurely with code ${code}`));
      }
    });
  });
}

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
  // const startUrl = process.env.ELECTRON_START_URL || devServerUrl; // Old logic
  // log.info(`[FinCRuM] Primary URL: ${startUrl}, Fallback: ${staticFileUrl}`); // Old log

  let resolvedStartUrl;
  const currentEnvInCreateWindow = process.env.NODE_ENV;
  log.info(`[FinCRuM] Current process.env.NODE_ENV: '${currentEnvInCreateWindow}' (type: ${typeof currentEnvInCreateWindow}) inside createWindow`);

  if (currentEnvInCreateWindow === 'development') {
    resolvedStartUrl = process.env.ELECTRON_START_URL || devServerUrl;
    log.info(`[FinCRuM] Decided in createWindow: Development mode. Primary URL: ${resolvedStartUrl}, Fallback: ${staticFileUrl}`);
  } else {
    resolvedStartUrl = staticFileUrl;
    log.info(`[FinCRuM] Decided in createWindow: Production mode (or not explicitly development). Using URL: ${resolvedStartUrl}`);
  }
  
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
    } else if (validatedURL === resolvedStartUrl) { // The primary configured URL failed
        if (process.env.NODE_ENV === 'development' && resolvedStartUrl !== staticFileUrl) {
            // If in dev and the thing that failed wasn't already the static file, try static file.
            log.info(`[FinCRuM] Main application URL (${resolvedStartUrl}) failed in dev mode. Trying static file: ${staticFileUrl}`);
            tryLoadStaticFile();
        } else {
            // In prod (resolvedStartUrl IS staticFileUrl) OR
            // in dev but resolvedStartUrl was already staticFileUrl (e.g. if ELECTRON_START_URL pointed to it and failed)
            log.error(`[FinCRuM] Primary URL (${resolvedStartUrl}) failed to load. This was the final target or production URL. Displaying error. Error: ${errorDescription} (${errorCode})`);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(`data:text/html,<html><body><h2>Error Loading Application</h2><p>Failed to load primary application URL: ${resolvedStartUrl}</p><p>Error: ${errorDescription} (${errorCode})</p><p>Please ensure Next.js build is correct (try <code>npm run build</code>) or dev server is running.</p></body></html>`);
            }
        }
    } else if (validatedURL === staticFileUrl) { // The static file fallback itself failed (likely after tryLoadStaticFile in dev)
        log.error(`[FinCRuM] Static file fallback (${staticFileUrl}) also failed to load. Displaying error. Error: ${errorDescription} (${errorCode})`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(`data:text/html,<html><body><h2>Error Loading Application</h2><p>Failed to load static file fallback: ${staticFileUrl}</p><p>Error: ${errorDescription} (${errorCode})</p><p>Please ensure Next.js build is correct. Try <code>npm run build</code>.</p></body></html>`);
        }
    } else { // C (for unexpected URLs)
      log.error(`[FinCRuM] Failed to load an UNEXPECTED URL: ${validatedURL}. Displaying generic error. Error: ${errorDescription} (${errorCode})`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`data:text/html,<html><body><h2>Application Load Error</h2><p>Failed to load an unexpected URL: ${validatedURL}</p><p>Error: ${errorDescription} (${errorCode})</p></body></html>`);
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
  
  mainWindow.webContents.on('did-finish-load', () => {
    const currentURL = mainWindow.webContents.getURL();
    const isTestPage = currentURL.startsWith('data:text/html,') && currentURL.includes('<title>Initial Load Test</title>');
    log.info(`[FinCRuM] DID-FINISH-LOAD: URL: ${currentURL.substring(0,100)}`);
    log.info(`[FinCRuM] DID-FINISH-LOAD: IsTestPage: ${isTestPage}, initialLoadDone: ${initialLoadDone}`);

    if (!initialLoadDone && isTestPage) {
      log.info('[FinCRuM] CONDITION MET: Initial test page loaded and initialLoadDone is false.');
      initialLoadDone = true;
      log.info('[FinCRuM] SET initialLoadDone = true.');

      if (mainAppLoadTimeout) {
        clearTimeout(mainAppLoadTimeout);
        log.info('[FinCRuM] Cleared existing mainAppLoadTimeout before setting new one.');
      }
      
      log.info('[FinCRuM] PREPARING to set 5s timeout to load main application.');
      mainAppLoadTimeout = setTimeout(() => {
        log.info('[FinCRuM] TIMEOUT FIRED (5s). Attempting to load main application URL.');
        if (mainWindow && !mainWindow.isDestroyed()) {
          log.info(`[FinCRuM] Main window OK. Loading main application URL: ${resolvedStartUrl}`);
          mainWindow.loadURL(resolvedStartUrl)
            .then(() => {
              log.info(`[FinCRuM] Successfully INITIATED load for main application URL: ${resolvedStartUrl}`);
            })
            .catch(err => {
              log.error(`[FinCRuM] Error INITIATING load for main application URL ${resolvedStartUrl}:`, err);
              if (process.env.NODE_ENV === 'development' && resolvedStartUrl !== staticFileUrl) {
                log.info(`[FinCRuM] Main application URL (${resolvedStartUrl}) failed to INITIATE load (dev mode). Trying static file: ${staticFileUrl}`);
                tryLoadStaticFile();
              } else {
                // In production (resolvedStartUrl is staticFileUrl) or if staticFileUrl was already the target in dev
                log.error(`[FinCRuM] Failed to INITIATE load for ${resolvedStartUrl}. No further fallback from .catch(). Displaying error.`);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.loadURL(`data:text/html,<html><body><h2>Critical Load Error</h2><p>Could not initiate loading of application URL: ${resolvedStartUrl}</p><p>Error: ${err.message}</p></body></html>`);
                }
              }
            });
        } else {
                log.error('[FinCRuM] Main application (static file) also failed after timeout.');
              }
            });
        } else {
          log.warn('[FinCRuM] TIMEOUT FIRED but main window was destroyed or null.');
        }
      }, 5000); // 5-second delay
      log.info(`[FinCRuM] SET 5s TIMEOUT to load main application. Timeout ID: ${mainAppLoadTimeout}`);

    } else if (initialLoadDone && isTestPage) {
      log.warn('[FinCRuM] CONDITION MET: Test page loaded AGAIN, but initialLoadDone is already true. Ignoring timeout logic.');
    } else if (currentURL === resolvedStartUrl || (process.env.NODE_ENV === 'development' && currentURL === staticFileUrl) ) { // Check against resolvedStartUrl, or staticFileUrl if it was a fallback in dev
      log.info(`[FinCRuM] Main application content loaded: ${currentURL.substring(0,100)}`);
      if (mainAppLoadTimeout) {
        clearTimeout(mainAppLoadTimeout);
        log.info('[FinCRuM] Cleared main app load timeout as main content is now loaded.');
        mainAppLoadTimeout = null;
      }
    } else {
      log.warn(`[FinCRuM] Page finished loading for an UNEXPECTED URL: ${currentURL.substring(0,100)}`);
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
app.whenReady().then(async () => { // Make the callback async
  log.info('[FinCRuM] App is ready.');
  const currentEnv = process.env.NODE_ENV;
  log.info(`[FinCRuM] App ready. Current process.env.NODE_ENV: '${currentEnv}' (type: ${typeof currentEnv})`);

  if (currentEnv === 'development') {
    log.info('[FinCRuM] Development mode detected. Attempting to start Next.js dev server...');
    try {
      await startNextDevServer();
      log.info('[FinCRuM] Next.js dev server started successfully (or reported ready). Proceeding to create window.');
      createWindow();
    } catch (error) {
      log.error('[FinCRuM] Critical error: Failed to start Next.js dev server:', error);
      log.error('[FinCRuM] Please check the logs for more details. The application will now quit.');
      // Ensure dialog is required: const { dialog } = require('electron'); at the top
      dialog.showErrorBox('Development Server Error', `Failed to start the Next.js development server.\n\n${error.message}\n\nPlease check the logs. The application will quit.`);
      app.quit();
      return; // Ensure no further code in this block runs
    }
  } else {
    log.info(`[FinCRuM] Production mode (or NODE_ENV not 'development': '${currentEnv}'). Creating window directly.`);
    createWindow();
  }

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info('[FinCRuM] App activated and no windows open. Re-creating window.');
      // This createWindow call will respect the NODE_ENV logic within createWindow itself
      // for URL selection. If dev server was needed and failed, app would have quit.
      // If dev server was needed and succeeded, it should still be running.
      createWindow();
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

// Event handler for when the application is about to quit
app.on('will-quit', () => {
  log.info('[FinCRuM] App is about to quit. Cleaning up dev server...');
  if (devServerProcess && devServerProcess.pid) { // Ensure process exists and has a PID
    log.info(`[FinCRuM] Stopping Next.js dev server (PID: ${devServerProcess.pid})...`);
    if (process.platform === "win32") {
      // On Windows, taskkill is more reliable for killing process trees.
      // detached: true and stdio: 'ignore' allow Electron to quit without waiting for taskkill.
      spawn('taskkill', ['/PID', devServerProcess.pid.toString(), '/T', '/F'], {
        detached: true,
        stdio: 'ignore' // No shell: true needed for system commands like taskkill
      });
      log.info(`[FinCRuM] Dispatched taskkill for PID ${devServerProcess.pid} on Windows.`);
    } else {
      // For macOS and Linux, SIGINT should allow graceful shutdown if the server handles it.
      devServerProcess.kill('SIGINT');
      log.info(`[FinCRuM] Sent SIGINT to dev server process ${devServerProcess.pid} on ${process.platform}.`);
    }
    devServerProcess = null; // Clear the reference
  } else {
    log.info('[FinCRuM] No running Next.js dev server process to stop.');
  }
});

log.info('[FinCRuM] Main process initialized, event listeners attached.');