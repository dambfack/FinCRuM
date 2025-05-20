const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, 'test-electron-direct.log');

// Clear log file at the start of each run
try { fs.unlinkSync(logFilePath); } catch (e) { /* ignore if file doesn't exist */ }

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
  process.stdout.write(logMessage); // Also write to stdout for immediate feedback if possible
}

log('DIRECT_LOG: Script starting');

const { app } = require('electron');

log('DIRECT_LOG: App module required');

app.whenReady().then(() => {
  log('DIRECT_LOG: App is ready');
  setTimeout(() => {
    log('DIRECT_LOG: Quitting from ready event');
    app.quit();
  }, 200); // Increased delay slightly
}).catch(err => {
  log('DIRECT_LOG: App ready error: ' + err.toString());
  app.quit();
});

log('DIRECT_LOG: Event listeners attached / script end');