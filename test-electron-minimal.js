// test-electron-minimal.js
const fs = require('fs');
const path = require('path');

console.log(`[TEST_SCRIPT] Script starting. Running in directory: ${__dirname}`);

const logFilePathMinimal = path.join(__dirname, 'test-minimal-output.log');
const logFilePathCwd = path.join(process.cwd(), 'test-minimal-output-cwd.log');

try {
  fs.writeFileSync(logFilePathMinimal, `Test log from __dirname at ${new Date().toISOString()}\n`);
  console.log(`[TEST_SCRIPT] Successfully wrote to ${logFilePathMinimal}`);
} catch (e) {
  console.error(`[TEST_SCRIPT] Failed to write to ${logFilePathMinimal}: ${e.toString()}`);
  try {
    fs.writeFileSync(logFilePathCwd, `Test log from process.cwd() at ${new Date().toISOString()}\nInitial error with __dirname: ${e.toString()}`);
    console.log(`[TEST_SCRIPT] Successfully wrote to ${logFilePathCwd} as fallback.`);
  } catch (e2) {
    console.error(`[TEST_SCRIPT] Failed to write to ${logFilePathCwd} as well: ${e2.toString()}`);
  }
}

try {
  const { app } = require('electron');
  if (app) {
    console.log('[TEST_SCRIPT] Electron app object loaded successfully.');
    // app.whenReady().then(() => {
    //   console.log('[TEST_SCRIPT] Electron app is ready. Quitting.');
    //   app.quit();
    // });
    // Forcing a quit more directly for this minimal test if app is available
    // If app is not ready, quit might not work as expected or might be premature.
    // However, for a simple script test, this should be fine.
    // If 'electron' module loads but app is null, that's also an issue.
    if (app.isReady()) {
        app.quit();
    } else {
        app.on('ready', () => app.quit());
    }
  } else {
    console.log('[TEST_SCRIPT] Electron app object FAILED to load (was null/undefined after require).');
    // process.exit(1); // Exit if Electron module itself seems problematic
  }
} catch (e) {
    console.error('[TEST_SCRIPT] Error requiring/using Electron app module:', e.toString());
    // process.exit(1);
}

console.log('[TEST_SCRIPT] Script execution finished.');