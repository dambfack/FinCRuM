const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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

log('=== NEW ELECTRON SESSION STARTED ===');
log('Starting Electron application...');
log('Node version:', process.version);
log('Electron version:', process.versions.electron);
log('Platform:', process.platform);
log('Working directory:', process.cwd());

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
        devTools: true
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
    const loadingPath = path.join(__dirname, 'loading.html');
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
    const request = http.get(devServerUrl, (res) => {
      log('Server is available, loading main application...');
      loadMainApplication();
    });
    
    request.on('error', (error) => {
      log(`Server check failed: ${error.message || error.code || 'Unknown error'}`);
      retryCount++;
      
      if (retryCount < maxRetries) {
        log(`Retrying in ${retryInterval}ms...`);
        setTimeout(checkServer, retryInterval);
      } else {
        log('Max retries reached, server may not be available');
        // Still try to load the main application as a last resort
        loadMainApplication();
      }
    });
    
    request.setTimeout(5000, () => {
      log('Server check timeout');
      request.destroy();
    });
  }
  
  // Start checking immediately
  checkServer();
}

function loadMainApplication() {
  const devServerUrl = 'http://localhost:9002';
  log(`Loading main application: ${devServerUrl}`);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(devServerUrl).then(() => {
      log('Main application loaded successfully');
    }).catch(error => {
      log('Error loading main application:', error);
    });
  }
}

// App event handlers
app.whenReady().then(async () => {
  log('App is ready, starting production server...');
  
  try {
    // Start the production server first
    await startProductionServer();
    log('Production server started, creating window...');
  } catch (error) {
    log('Failed to start production server:', error);
    log('Proceeding with window creation anyway...');
  }
  
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
  stopProductionServer();
  if (process.platform !== 'darwin') {
    log('Quitting application...');
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App is about to quit, stopping production server...');
  stopProductionServer();
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);  
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise, 'reason:', reason);
});

let serverProcess = null;

function startProductionServer() {
  return new Promise((resolve, reject) => {
    log('Starting production server on port 9002...');
    
    // Start the Next.js production server
    serverProcess = spawn('npx', ['next', 'start', '-p', '9002'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let serverStarted = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      log('Server stdout:', output.trim());
      
      // Check if server is ready
      if (output.includes('Ready') || output.includes('started server') || output.includes('localhost:9002')) {
        if (!serverStarted) {
          serverStarted = true;
          log('Production server is ready!');
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

function stopProductionServer() {
  if (serverProcess && !serverProcess.killed) {
    log('Stopping production server...');
    serverProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if it doesn't stop gracefully
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        log('Force killing production server...');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

log('Main process initialized');
