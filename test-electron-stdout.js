// test-electron-stdout.js
process.stdout.write('[ELECTRON_STDOUT_TEST] Script started. This is a process.stdout.write message (top level).\n');
process.stderr.write('[ELECTRON_STDOUT_TEST] Script started. This is a process.stderr.write message (top level).\n');
console.log('[ELECTRON_STDOUT_TEST] Script started. This is a console.log message (top level).\n');

try {
  process.stdout.write('[ELECTRON_STDOUT_TEST] Attempting to require Electron module...\n');
  const { app } = require('electron');
  process.stdout.write('[ELECTRON_STDOUT_TEST] Electron module required successfully.\n');
  console.log('[ELECTRON_STDOUT_TEST] Electron module required (console.log).\n');

  if (app) {
    process.stdout.write('[ELECTRON_STDOUT_TEST] Electron app object exists.\n');
    console.log('[ELECTRON_STDOUT_TEST] Electron app object exists (console.log).\n');

    if (app.isReady()) {
      process.stdout.write('[ELECTRON_STDOUT_TEST] App is already ready. Quitting.\n');
      console.log('[ELECTRON_STDOUT_TEST] App is already ready. Quitting (console.log).\n');
      app.quit();
    } else {
      process.stdout.write('[ELECTRON_STDOUT_TEST] App is not ready. Attaching ready listener to quit.\n');
      console.log('[ELECTRON_STDOUT_TEST] App is not ready. Attaching ready listener to quit (console.log).\n');
      app.on('ready', () => {
        process.stdout.write('[ELECTRON_STDOUT_TEST] App BECAME ready. Quitting now.\n');
        console.log('[ELECTRON_STDOUT_TEST] App BECAME ready. Quitting now (console.log).\n');
        app.quit();
      });
    }
  } else {
    process.stderr.write('[ELECTRON_STDOUT_TEST] ERROR: Electron app object is null/undefined after require.\n');
    console.error('[ELECTRON_STDOUT_TEST] ERROR: Electron app object is null/undefined after require (console.error).\n');
    // In a real scenario, we might want to exit differently if app is not available.
    // For this test, we let it proceed to the end of script logs.
  }
} catch (e) {
  process.stderr.write(`[ELECTRON_STDOUT_TEST] CRITICAL ERROR during Electron module handling: ${e.toString()}\n`);
  console.error(`[ELECTRON_STDOUT_TEST] CRITICAL ERROR during Electron module handling (console.error): ${e.toString()}\n`);
  // If Electron itself fails to load, try to exit with Node's process.exit, though Electron might override this.
  if (typeof process !== 'undefined' && process.exit) {
    process.exit(1);
  }
}

process.stdout.write('[ELECTRON_STDOUT_TEST] Script execution nominally finished (end of script).\n');
console.log('[ELECTRON_STDOUT_TEST] Script execution nominally finished (console.log at end of script).\n');