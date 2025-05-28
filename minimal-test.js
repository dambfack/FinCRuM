const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Log file setup
const logFile = path.join(__dirname, 'minimal-test.log');
const log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
};

log('Starting minimal test...');

let mainWindow;

app.whenReady().then(() => {
  log('App is ready, creating window...');
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load a simple HTML page
  mainWindow.loadURL(`data:text/html,
    <!DOCTYPE html>
    <html>
      <head>
        <title>Minimal Test</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
            background-color: #f0f0f0;
          }
          .content { 
            text-align: center; 
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="content">
          <h1>Electron is working!</h1>
          <p>If you can see this, Electron is running correctly.</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      </body>
    </html>
  `);

  mainWindow.on('closed', () => {
    log('Window closed');
    mainWindow = null;
  });

  log('Window created and content loaded');
}).catch(err => {
  log('Error in whenReady:', err);
});

app.on('window-all-closed', () => {
  log('All windows closed, quitting...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

log('Main process initialized');
