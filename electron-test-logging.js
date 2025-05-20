console.log('[TEST_LOGGING_SCRIPT] Script started.');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const elLog = require('electron-log/main');

const testLogFilePath = path.join(__dirname, 'electron-test-log-output.log');
console.log(`[TEST_LOGGING_SCRIPT] Target log file: ${testLogFilePath}`);

// Try to delete old log
try {
  if (fs.existsSync(testLogFilePath)) {
    fs.unlinkSync(testLogFilePath);
    console.log(`[TEST_LOGGING_SCRIPT] Deleted old test log: ${testLogFilePath}`);
  }
} catch (e) {
  console.error(`[TEST_LOGGING_SCRIPT] Error deleting old test log: ${e}`);
}

// Configure electron-log
elLog.transports.file.resolvePathFn = () => testLogFilePath;
elLog.transports.file.level = 'debug';
elLog.transports.console.level = 'debug';

console.log('[TEST_LOGGING_SCRIPT] electron-log configured.');

elLog.info('[TEST_LOGGING_SCRIPT] Info message from electron-log.');
elLog.debug('[TEST_LOGGING_SCRIPT] Debug message from electron-log.');
elLog.error('[TEST_LOGGING_SCRIPT] Error message from electron-log.');

try {
  fs.appendFileSync(testLogFilePath, `[${new Date().toISOString()}] [TEST_LOGGING_SCRIPT] Direct fs.appendFileSync message.\n`, 'utf8');
  console.log('[TEST_LOGGING_SCRIPT] Direct fs.appendFileSync successful.');
} catch (e) {
  console.error(`[TEST_LOGGING_SCRIPT] Direct fs.appendFileSync failed: ${e}`);
}

app.whenReady().then(() => {
  console.log('[TEST_LOGGING_SCRIPT] App is ready. Quitting shortly.');
  elLog.info('[TEST_LOGGING_SCRIPT] App ready, will quit in 2s.');
  setTimeout(() => {
    console.log('[TEST_LOGGING_SCRIPT] Quitting now.');
    elLog.info('[TEST_LOGGING_SCRIPT] Quitting application.');
    app.quit();
  }, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // app.quit(); // Already handled by timeout
  }
});

console.log('[TEST_LOGGING_SCRIPT] Script execution finished setting up.');