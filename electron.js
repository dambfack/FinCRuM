console.log('[DEBUG] Starting Electron main process...');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
console.log('[DEBUG] All modules imported successfully');

// Custom protocol for OAuth
const PROTOCOL = 'fincrum';
let queuedOAuthUrl = null; // To store URL if received before app is ready

// Function to load environment variables for packaged app
function loadEnvironmentVariables() {
  if (app.isPackaged) {
    const envPath = path.join(process.resourcesPath, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !key.startsWith('#')) {
          process.env[key.trim()] = value.trim();
        }
      });
      console.log('Loaded environment variables from .env.local');
    }
  }
}

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

// Clear previous log
try {
  fs.writeFileSync('electron.log', '');
} catch (e) {
  console.error('Failed to clear log file:', e);
}

// Add process event listeners for debugging
process.on('exit', (code) => {
  log(`Process exiting with code: ${code}`);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM signal');
});

process.on('SIGINT', () => {
  log('Received SIGINT signal');
});

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
        devTools: true,
        preload: path.join(__dirname, 'preload.js')
      },
      backgroundColor: '#667eea',
      center: true,
      title: 'FinCRuM - Finsculpt Client ResoUrce Management'
    });
    
    log('Main window created successfully');
    
    // Add event listeners before loading URL
    mainWindow.on('ready-to-show', () => {
      log('Window is ready to show');
      mainWindow.show();
    });
    
    mainWindow.on('closed', () => {
      log('Main window closed');
      mainWindow = null;
    });
    
    // Load the loading screen first
    const loadingPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'loading.html')
      : path.join(__dirname, 'loading.html');
    log(`Loading loading screen: ${loadingPath}`);
    
    mainWindow.loadFile(loadingPath).then(() => {
      log('Loading screen loaded successfully');
      
      // Start checking for server availability
      checkServerAndLoad();
      
      // Open DevTools in development after loading screen loads
      if (process.env.NODE_ENV !== 'production') {
        mainWindow.webContents.openDevTools();
      }
    }).catch(error => {
      log('Error loading loading screen:', error);
      log('Stack trace:', error.stack);
      // Fallback to direct server connection
      loadMainApplication();
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
    log('Stack trace:', error.stack);
    app.quit();
  }
}

function checkServerAndLoad() {
  const devServerUrl = 'http://localhost:9002';
  let retryCount = 0;
  const maxRetries = 30;
  const retryInterval = 2000;
  
  function checkServer() {
    log(`Checking server availability (attempt ${retryCount + 1}/${maxRetries})...`);
    
    const http = require('http');
    const url = require('url');
    const parsedUrl = url.parse(devServerUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path || '/',
      method: 'GET',
      timeout: 5000
    };
    
    const request = http.request(options, (res) => {
      log(`Server responded with status: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        log('Server is available, loading main application...');
        loadMainApplication();
      } else {
        log(`Server returned error status: ${res.statusCode}`);
        retryConnection();
      }
    });
    
    request.on('error', (error) => {
      log(`Server check failed: ${error.message || error.code || 'Unknown error'}`);
      log(`Error details:`, error);
      retryConnection();
    });
    
    request.on('timeout', () => {
      log('Server check timeout');
      request.destroy();
      retryConnection();
    });
    
    request.setTimeout(5000);
    request.end();
    
    function retryConnection() {
      retryCount++;
      if (retryCount < maxRetries) {
        log(`Retrying in ${retryInterval}ms...`);
        setTimeout(checkServer, retryInterval);
      } else {
        log('Max retries reached, server may not be available');
        // Still try to load the main application as a last resort
        loadMainApplication();
      }
    }
  }
  
  // Start checking immediately
  checkServer();
}

function loadMainApplication() {
  const devServerUrl = 'http://localhost:9002';
  log(`Loading main application: ${devServerUrl}`);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(devServerUrl).then(() => {
      log('Main application loaded successfully.');
      // Process any queued OAuth URL now that the main app content is loaded
      if (queuedOAuthUrl) {
        log(`Processing queued OAuth URL after main app load: ${queuedOAuthUrl}`);
        const tempUrl = queuedOAuthUrl;
        queuedOAuthUrl = null; // Clear before processing
        processOAuthUrl(tempUrl); // Use the new dedicated processing function
      }
    }).catch(error => {
      log('Error loading main application:', error);
      // If main app fails to load, we might still want to show an error for OAuth if one was queued
      if (queuedOAuthUrl) {
        log(`Main app load failed, but an OAuth URL was queued: ${queuedOAuthUrl}. Attempting to show error.`);
        const tempUrl = queuedOAuthUrl;
        queuedOAuthUrl = null;
        processOAuthUrl(tempUrl); // It will likely send an error if code is present but app not fully working
      }
    });
  }
}

// New function for the core processing part of handleOAuthCallback
function processOAuthUrl(url) {
    log(`[PROCESS_OAUTH_URL] Processing: ${url}`);
    if (!mainWindow || mainWindow.isDestroyed()) {
        log('[PROCESS_OAUTH_URL_ERROR] Main window not available or destroyed during processing.');
        // If window is gone, we can't send IPC. Log and exit for this URL.
        return;
    }
    try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');
        const state = parsedUrl.searchParams.get('state'); // Important for security

        log(`[PROCESS_OAUTH_URL] Parsed from URL: code=${code ? "[PRESENT]" : "[ABSENT]"}, error=${error || "[ABSENT]"}, state=${state ? "[PRESENT]" : "[ABSENT]"}`);

        if (error) {
            log('[PROCESS_OAUTH_URL] OAuth error received, sending to renderer:', error);
            mainWindow.webContents.send('oauth:error', error);
        } else if (code) {
            log('[PROCESS_OAUTH_URL] OAuth code received, sending to renderer.');
            mainWindow.webContents.send('oauth:callback', code);
        }

        log('[PROCESS_OAUTH_URL] Attempting to focus and show main window.');
        if (mainWindow.isMinimized()) {
            log('[PROCESS_OAUTH_URL] Window was minimized, restoring.');
            mainWindow.restore();
        }
        mainWindow.show(); // Ensure window is visible
        mainWindow.focus(); // Bring window to front
        log('[PROCESS_OAUTH_URL] Main window shown and focused.');
    } catch (e) {
        log('[PROCESS_OAUTH_URL_ERROR] Error parsing/processing OAuth URL:', e.message, 'URL:', url);
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.send('oauth:error', 'Invalid callback URL format in main process.');
        }
    }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    console.log('[DEBUG] App.whenReady() called');
    log('App is ready. Loading environment variables and setting up protocol client and IPC handlers...');
    
    // Load environment variables for packaged app
    loadEnvironmentVariables();

    // Register custom protocol
    // This needs to be done after app is ready.
    if (process.defaultApp) {
      // Development mode: process.execPath is Electron, need to pass the script path.
      // process.argv[1] is typically the main script (e.g., '.' or 'electron.js')
      const scriptPath = path.resolve(process.argv[1] || '.');
      log(`Registering protocol client in dev mode: ${PROTOCOL} with execPath and script: ${scriptPath}`);
      if (!app.isDefaultProtocolClient(PROTOCOL, process.execPath, [scriptPath])) {
          app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [scriptPath]);
      }
    } else {
      // Packaged mode: process.execPath is the app executable itself.
      log(`Registering protocol client in packaged mode: ${PROTOCOL}`);
      if (!app.isDefaultProtocolClient(PROTOCOL)) {
          app.setAsDefaultProtocolClient(PROTOCOL);
      }
    }

    setupIPCHandlers(); // Setup IPC handlers now that app is ready

    // Only start local server in packaged mode
    if (app.isPackaged) {
      log('Starting local server for packaged app...');
      try {
        await startLocalServer();
        log('Local server started.');
      } catch (error) {
        log('Failed to start local server:', error);
        log('Proceeding with window creation anyway...');
      }
    } else {
      log('Development mode detected, skipping local server startup (expecting external dev server)');
    }
    
    log('Creating window after server start attempt...');
    createWindow(); // Creates mainWindow and loads loading.html, then main app URL
    
    app.on('activate', () => {
      if (mainWindow === null) {
        log('App activated, creating new window...');
        createWindow();
      }
    });
  } catch (error) {
    log('Error in app.whenReady handler:', error);
    log('Stack trace:', error.stack);
    throw error;
  }
}).catch(error => {
  log('Error in whenReady:', error);
  log('Stack trace:', error.stack);
  app.quit();
});

app.on('window-all-closed', () => {
  log('All windows closed');
  stopLocalServer();
  if (process.platform !== 'darwin') {
    log('Quitting application...');
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App is about to quit, stopping server...');
  stopLocalServer();
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);  
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise, 'reason:', reason);
});

let serverProcess = null;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    log('Starting local server on port 9002...');
    
    const serverCwd = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked')
      : __dirname;
    
    log('Server working directory:', serverCwd);
    
    // Start the Next.js local server
    serverProcess = spawn('npx', ['next', 'start', '-p', '9002'], {
      cwd: serverCwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, PATH: process.env.PATH }
    });
    
    let serverStarted = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      log('Server stdout:', output.trim());
      
      // Check if server is ready
      if (output.includes('Ready') || output.includes('started server') || output.includes('localhost:9002')) {
        if (!serverStarted) {
          serverStarted = true;
          log('Local server is ready!');
          resolve();
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      log('Server stderr:', output.trim());
    });
    
    serverProcess.on('error', (error) => {
      log('Server process error:', error);
      if (!serverStarted) {
        reject(error);
      }
    });
    
    serverProcess.on('exit', (code, signal) => {
      log(`Server process exited with code ${code} and signal ${signal}`);
      if (!serverStarted && code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverStarted) {
        log('Server startup timeout, proceeding anyway...');
        resolve();
      }
    }, 30000);
  });
}

function stopLocalServer() {
  if (serverProcess && !serverProcess.killed) {
    log('Stopping local server...');
    serverProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if it doesn't stop gracefully
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        log('Force killing local server...');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

// IPC Handlers
function setupIPCHandlers() {
  log('Setting up IPC handlers...');

  // OAuth handlers
  ipcMain.handle('oauth:open-url', async (event, url) => {
    log('Opening OAuth URL in dedicated window:', url);
    try {
      // Create a dedicated OAuth window instead of using main window
      const oauthWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        modal: true,
        parent: mainWindow,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          webSecurity: true
        }
      });

      // Load the OAuth URL in the dedicated window
      await oauthWindow.loadURL(url);
      log('OAuth URL loaded in dedicated window successfully');
      
      // Set up navigation listener for OAuth callback
      const handleNavigation = (event, navigationUrl) => {
        log('OAuth window navigating to:', navigationUrl);
        
        // Check if this is our callback URL
        if (navigationUrl.includes('/auth/callback/google') || navigationUrl.startsWith('fincrum://')) {
          log('OAuth callback detected, processing URL:', navigationUrl);
          event.preventDefault();
          
          // Process the OAuth callback
          processOAuthUrl(navigationUrl);
          
          // Close the OAuth window
          if (oauthWindow && !oauthWindow.isDestroyed()) {
            oauthWindow.close();
          }
        }
      };
      
      // Add navigation listener to OAuth window
      oauthWindow.webContents.on('will-navigate', handleNavigation);
      
      // Handle window closed event
      oauthWindow.on('closed', () => {
        log('OAuth window closed');
        // Remove navigation listener if window is closed manually
        if (oauthWindow && !oauthWindow.isDestroyed()) {
          oauthWindow.webContents.removeListener('will-navigate', handleNavigation);
        }
      });
      
      return { success: true };
    } catch (error) {
      log('Error opening OAuth URL:', error);
      return { success: false, error: error.message };
    }
  });

  // App handlers
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  // Window handlers
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Development handlers
  ipcMain.handle('dev:open-dev-tools', () => {
    if (mainWindow) mainWindow.webContents.openDevTools();
  });

  ipcMain.handle('dev:reload', () => {
    if (mainWindow) mainWindow.webContents.reload();
  });

  // Dialog handlers
  ipcMain.handle('dialog:select-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('dialog:select-directory', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      ...options,
      properties: ['openDirectory']
    });
    return result;
  });

  log('IPC handlers set up successfully');
}

// Modified function to handle OAuth callback via custom protocol, using queueing logic
function handleOAuthCallback(url) {
  log(`[HANDLE_OAUTH_CALLBACK] Received URL: ${url}. Checking main window status.`);
  const mainAppUrlPrefix = 'http://localhost:9002'; // Main app URL

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && 
      mainWindow.webContents.getURL().startsWith(mainAppUrlPrefix) && 
      !mainWindow.webContents.isLoading()) {
    log('[HANDLE_OAUTH_CALLBACK] Main window is ready and main app loaded. Processing URL directly.');
    processOAuthUrl(url);
  } else {
    const currentUrl = mainWindow && mainWindow.webContents ? mainWindow.webContents.getURL() : 'N/A';
    const isLoading = mainWindow && mainWindow.webContents ? mainWindow.webContents.isLoading() : 'N/A';
    log(`[HANDLE_OAUTH_CALLBACK] Main window not ready or loading (Current URL: ${currentUrl}, IsLoading: ${isLoading}). Queuing URL: ${url}`);
    queuedOAuthUrl = url;
    // Attempt to show and focus the window even if queuing, so the user sees the app has responded.
    if (mainWindow && !mainWindow.isDestroyed()) {
        log('[HANDLE_OAUTH_CALLBACK] Bringing window to front while URL is queued.');
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
  }
}

// Protocol registration and IPC handlers are set up in app.whenReady() below


// Handle custom protocol URLs when app is already open
app.on('open-url', (event, url) => {
  event.preventDefault(); // Prevent default handling
  log(`[EVENT open-url] Received URL: ${url}`);
  if (url.startsWith(`${PROTOCOL}://`)) {
    log(`[EVENT open-url] URL is for our protocol. Handling...`);
    handleOAuthCallback(url);
  } else {
    log(`[EVENT open-url] URL is not for our protocol. Ignoring.`);
  }
});

// Handle custom protocol URLs when app is opened by it (macOS)
// This handler is primarily for macOS, for when the app is launched by a URL.
app.on('will-finish-launching', () => {
  log('[EVENT will-finish-launching] Setting up open-url listener for app launch.');
  app.on('open-url', (event, url) => {
    event.preventDefault();
    log(`[EVENT will-finish-launching -> open-url] Received URL: ${url}`);
    if (url.startsWith(`${PROTOCOL}://`)) {
        log('[EVENT will-finish-launching -> open-url] URL is for our protocol. Queuing/Handling...');
        // mainWindow might not exist or be ready yet. handleOAuthCallback will queue if necessary.
        handleOAuthCallback(url);
    } else {
        log('[EVENT will-finish-launching -> open-url] URL not for our protocol. Ignoring.');
    }
  });
});

// Ensure that setupIPCHandlers is called after app is ready.
// The original code had a second app.whenReady().then(() => { setupIPCHandlers(); });
// We've moved setupIPCHandlers into the main whenReady block, so this is no longer needed here.
// If it was intended for a different purpose, it needs clarification. For now, assuming it's covered.

// Ensure only one instance of the app can run
log('Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();

log(`Single instance lock result: ${gotTheLock}`);
if (!gotTheLock) {
  log('Another instance is already running. Quitting this instance.');
  log('Process exiting with code: 0');
  app.quit();
} else {
  log('Single instance lock acquired successfully.');
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const fullCommandLine = commandLine.join(' ');
    log(`[EVENT second-instance] Detected. Full commandLine: ${fullCommandLine}`);
    
    // Focus the existing window
    if (mainWindow) {
      log('[EVENT second-instance] Main window exists. Restoring and focusing.');
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show(); // Ensure it's visible
      mainWindow.focus();
    } else {
      log('[EVENT second-instance] Main window does NOT exist. This is unexpected for a second instance.');
      // If mainWindow is null, the app might be in the process of quitting or starting.
      // We might need to wait for it to be created if this instance is supposed to pass the URL.
    }

    // Handle custom protocol URL from second instance (primarily for Windows/Linux)
    const urlFromCommandLine = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (urlFromCommandLine) {
      log(`[EVENT second-instance] Received custom protocol URL: ${urlFromCommandLine}. Handling...`);
      // mainWindow might not be fully ready (e.g. content loaded). handleOAuthCallback will queue if needed.
      handleOAuthCallback(urlFromCommandLine);
    } else {
      log('[EVENT second-instance] No custom protocol URL found in commandLine.');
    }
  });
}

// setupIPCHandlers is now called within the main app.whenReady() block.

log('Main process initialized, event handlers and protocol registration configured.');
