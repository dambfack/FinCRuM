// simple-node-test.js
const fs = require('fs');
const path = require('path');

console.log('[SIMPLE_NODE_TEST] Script starting.');
const nodeLogFilePath = path.join(__dirname, 'simple-node-output.log');

// Ensure log directory exists or handle errors
const logDir = path.dirname(nodeLogFilePath);
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`[SIMPLE_NODE_TEST] Created log directory: ${logDir}`);
  } catch (e) {
    console.error(`[SIMPLE_NODE_TEST] Failed to create log directory ${logDir}: ${e.toString()}`);
    // Decide if to proceed or exit if directory creation is critical
  }
}

// Attempt to delete the log file if it exists, to ensure a fresh run
try {
  if (fs.existsSync(nodeLogFilePath)) {
    fs.unlinkSync(nodeLogFilePath);
    console.log(`[SIMPLE_NODE_TEST] Deleted existing log file: ${nodeLogFilePath}`);
  }
} catch (e) {
  console.warn(`[SIMPLE_NODE_TEST] Could not delete existing log file ${nodeLogFilePath}: ${e.toString()}`);
}

try {
  fs.writeFileSync(nodeLogFilePath, `Test log from simple-node-test.js at ${new Date().toISOString()}\n`);
  console.log(`[SIMPLE_NODE_TEST] Successfully wrote to ${nodeLogFilePath}`);
} catch (e) {
  console.error(`[SIMPLE_NODE_TEST] Failed to write to ${nodeLogFilePath}: ${e.toString()}`);
}

console.log('[SIMPLE_NODE_TEST] Script finished.');
process.exit(0); // Explicit exit to ensure the script terminates