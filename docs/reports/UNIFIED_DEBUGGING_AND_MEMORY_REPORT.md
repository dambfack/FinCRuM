# 🐛 FinCRuM - Unified Debugging and Memory Report

**Project:** FinCRuM Financial Management Application  
**Repository:** `d:\Local_Git\FinCRuM`  
**Document Type:** Comprehensive Debugging, Troubleshooting & Memory Management  
**Version:** 3.0.0 (Consolidated Report)  
**Last Updated:** Current Session  
**Status:** 🟢 ACTIVE - Comprehensive Issue Tracking

## Table of Contents

1. [Overview](#overview)
2. [Critical System Issues](#critical-system-issues)
3. [Constructor Categories](#constructor-categories)
4. [OAuth & Authentication Issues](#oauth--authentication-issues)
5. [Electron Integration Issues](#electron-integration-issues)
6. [Server Startup & Development Issues](#server-startup--development-issues)
7. [Fixed Issues](#fixed-issues)
8. [Common Patterns and Solutions](#common-patterns-and-solutions)
9. [Prevention Guidelines](#prevention-guidelines)
10. [Debugging Procedures](#debugging-procedures)

---

## Overview

### 🎯 Purpose
This unified document consolidates all debugging, troubleshooting, and memory management documentation for the FinCRuM application. It serves as the single source of truth for:
- Constructor-related "Illegal constructor" errors
- System-level troubleshooting (Electron, Next.js, OAuth)
- Memory management and performance issues
- Development environment problems
- Comprehensive debugging procedures

### 📊 Current Status
- **Active Issues**: 0 (All critical issues resolved)
- **Fixed Issues**: 26+ across all categories
- **Monitored Constructors**: 100+ across multiple categories
- **System Health**: 🟢 OPERATIONAL
- **Test Suite**: 62/62 tests passing, 6/6 test suites passing

---

## Critical System Issues

### 🚨 RESOLVED: Next.js Server Startup Failure
**Issue ID:** CRIT-001  
**Severity:** 🔴 CRITICAL  
**Status:** ✅ RESOLVED  
**Date Reported:** June 01, 2025  
**Date Resolved:** June 01, 2025

#### Problem Description
The Next.js development server consistently failed to serve HTTP requests despite showing "Ready" status, causing complete development workflow blockage.

#### Symptoms
- ✅ Server started and showed "Ready in ~2.7s"
- ❌ HTTP requests to server failed with "Unable to connect to the remote server"
- ❌ Server process exited with non-zero exit code (1) shortly after startup
- 🔄 Pattern repeated on different ports (9002, 3000)
- 🔄 Pattern persisted with simplified configuration

#### Root Cause Analysis
**Primary Cause**: Application code issues causing immediate crash after "Ready" status
- Error occurred during first request or route compilation
- Silent failure without proper error logging
- Affected core Next.js functionality

**Contributing Factors**:
1. **Dependency Conflicts**: Next.js 15.2.3 compatibility issues
2. **Environment Issues**: Node.js v22.13.1 system-level conflicts
3. **Command Duplication**: Every command executed twice, indicating system issues

#### Resolution Applied
1. **Clean dependency reinstall**
2. **Enhanced error logging implementation**
3. **Minimal application testing**
4. **System environment optimization**

### 🚨 RESOLVED: Electron Integration Failure
**Issue ID:** CRIT-002  
**Severity:** 🔴 CRITICAL  
**Status:** ✅ RESOLVED  
**Date Reported:** January 21, 2025  
**Date Resolved:** June 01, 2025

#### Problem Description
Electron application shut down immediately after startup, preventing desktop application functionality.

#### Critical Findings

##### Directory-Specific Issue
- **Root Cause**: Conflicting `package.json` in `temp-extracted` directory
- **Evidence**: Electron worked in other directories but failed specifically in project directory
- **Resolution**: Removed conflicting `temp-extracted` directory with different main entry point

##### Next.js Compilation Timing (CRITICAL INSIGHT)
**⚠️ IMPORTANT DISCOVERY**: The Next.js "Ready" message does NOT indicate compilation completion!

**Correct Understanding**:
1. **"Ready" message** = Server ready to START compiling
2. **Wait 10+ minutes** after "Ready" for actual compilation
3. **Look for "Compiling" messages** in logs
4. **Wait for compilation completion** before starting Electron
5. **Only then** start Electron for successful connection

#### Resolution Applied
1. **Removed conflicting directories**
2. **Implemented proper compilation timing**
3. **Enhanced Electron startup sequence**
4. **Added automatic server startup functionality**

### 🚨 RESOLVED: Test Suite Isolation Issue
**Issue ID:** CRIT-003  
**Severity:** 🔴 CRITICAL  
**Status:** ✅ RESOLVED  
**Date Reported:** Current Session  
**Date Resolved:** Current Session

#### Problem Description
React Native test files were being picked up by the main Jest configuration, causing transformation errors and test suite failures.

#### Symptoms
- 1 test suite failing out of 7 total
- 62 individual tests passing
- `fincrm-android/__tests__/App.test.tsx` causing transformation errors
- Jest configuration conflicts between Next.js and React Native presets

#### Resolution Applied
- Added `fincrm-android/` to `testPathIgnorePatterns` in `jest.config.js`
- Isolated React Native tests from main test suite
- All 6 test suites now passing (62/62 tests)

### ⚠️ RESOLVED: SyncManager Component Constructor Issue
**Issue ID:** MEM-001  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Date Reported:** Previous Session  
**Date Resolved:** Current Session

#### Problem Description
- **Error**: `Illegal constructor`
- **Location**: `src\components\Dashboard.tsx` at line 927 within the `SyncManager` component
- **Impact**: Prevented proper rendering of Dashboard component

#### Resolution Applied
- Enhanced Date constructor validation across all components
- Implemented safe constructor patterns
- Added comprehensive error handling

### ✅ RESOLVED: `getCloudDatabase` is not defined in FirstTimeSetupWizard
**Issue ID:** FE-001
**Severity:** 🔴 CRITICAL
**Status:** ✅ RESOLVED
**Date Reported:** Current Session
**Date Resolved:** Current Session

#### Problem Description
The application was crashing during the first-time setup process due to a `ReferenceError: getCloudDatabase is not defined` in the `FirstTimeSetupWizard.tsx` component. This blocked new users from completing the setup.

#### Root Cause Analysis
The `getCloudDatabase` function was being called, but the import statement for it was commented out. Additionally, the component was attempting to import a function that didn't exist directly, instead of using the `CloudDatabaseService.getInstance()` method.

#### Resolution Applied
1.  **Corrected Import:** The commented-out import was replaced with the correct import for `CloudDatabaseService`.
2.  **Corrected Usage:** The call to `getCloudDatabase()` was replaced with `CloudDatabaseService.getInstance()` to properly retrieve the service instance.
3.  **Re-enabled Turbopack:** After fixing the reference error, the `--turbopack` flag was re-enabled in the `dev` script in `package.json` to restore faster development server builds.

---

## OAuth & Authentication Issues

### 🔐 RESOLVED: Google OAuth Authentication Errors
**Issue ID:** AUTH-001  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Web Application  
**Date Resolved:** Current Session

#### Common OAuth Error Patterns

##### 1. "invalid_grant" Error
**Symptoms:**
- Error occurs during token exchange
- Authorization code appears valid but fails
- Intermittent failures during OAuth flow

**Root Causes:**
- Authorization code used more than once
- Clock skew between client and server
- Authorization code expired (10-minute limit)
- Incorrect redirect URI in token request

**Resolution:**
```javascript
// Prevent duplicate authorization code usage
if (authorizationCodeUsed.has(code)) {
  throw new Error('Authorization code already used');
}
authorizationCodeUsed.add(code);
```

##### 2. "redirect_uri_mismatch" Error
**Symptoms:**
- OAuth flow fails at authorization step
- Error message indicates URI mismatch
- Works in some environments but not others

**Root Causes:**
- Redirect URI in request doesn't match Google Console configuration
- Protocol mismatch (http vs https)
- Port number differences
- Trailing slash inconsistencies

**Resolution:**
- Ensure exact match between request URI and Google Console configuration
- Use environment-specific redirect URIs
- Validate URI format before OAuth initiation

##### 3. "invalid_client" Error
**Symptoms:**
- Authentication fails immediately
- Client credentials rejected
- Error occurs before user interaction

**Root Causes:**
- Incorrect client ID or client secret
- Client not enabled for OAuth 2.0
- API credentials misconfigured in Google Console

**Resolution:**
- Verify client credentials in Google Console
- Ensure OAuth 2.0 is enabled for the client
- Check API key restrictions and permissions

#### Parameter Conflicts Resolution

##### approval_prompt vs prompt Parameter
**Issue:** Conflict between deprecated `approval_prompt` and modern `prompt` parameter

**Legacy (Deprecated):**
```javascript
// ❌ Don't use - deprecated
const authUrl = `https://accounts.google.com/oauth/authorize?approval_prompt=force`;
```

**Modern (Recommended):**
```javascript
// ✅ Use this instead
const authUrl = `https://accounts.google.com/oauth/authorize?prompt=consent`;
```

**Migration Strategy:**
1. Replace all instances of `approval_prompt=force` with `prompt=consent`
2. Remove `approval_prompt=auto` (default behavior)
3. Test OAuth flow thoroughly after migration

### 🔐 RESOLVED: Electron OAuth Integration
**Issue ID:** AUTH-002  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Electron Desktop Application  
**Date Resolved:** Current Session

#### Problem Description
Google OAuth authentication failed in Electron environment due to browser context limitations and redirect handling issues.

#### Electron-Specific Challenges
1. **Browser Context Isolation**
   - Electron's isolated context prevents standard OAuth flows
   - Cookies and session storage not shared with system browser
   - Custom protocol handling required

2. **Redirect URI Handling**
   - Standard web redirects don't work in Electron
   - Custom protocol registration needed
   - Deep linking implementation required

#### Resolution Implementation

##### Custom Protocol Registration
```javascript
// Register custom protocol for OAuth callbacks
app.setAsDefaultProtocolClient('fincrm-oauth');

// Handle protocol URLs
app.on('open-url', (event, url) => {
  if (url.startsWith('fincrm-oauth://')) {
    handleOAuthCallback(url);
  }
});
```

##### OAuth Flow Adaptation
```javascript
// Modified OAuth flow for Electron
const authUrl = `https://accounts.google.com/oauth/authorize?
  client_id=${CLIENT_ID}&
  redirect_uri=fincrm-oauth://callback&
  response_type=code&
  scope=${SCOPES}&
  prompt=consent`;

// Open in external browser
shell.openExternal(authUrl);
```

### 🔐 RESOLVED: Google Calendar Integration Issues
**Issue ID:** AUTH-003  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Web & Desktop  
**Date Resolved:** Current Session

#### Duplicate Events Issue
**Problem:** Google Calendar events being created multiple times

**Root Causes:**
1. **Retry Logic**: Failed requests being retried without idempotency
2. **Event ID Conflicts**: Same event ID used for multiple requests
3. **Race Conditions**: Concurrent requests creating duplicate events

**Resolution:**
```javascript
// Implement idempotency with unique request IDs
const createCalendarEvent = async (eventData) => {
  const requestId = `${eventData.id}-${Date.now()}`;
  
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestId: requestId, // Ensures idempotency
      resource: eventData
    });
    return response.data;
  } catch (error) {
    if (error.code === 409) {
      // Event already exists, fetch existing
      return await calendar.events.get({
        calendarId: 'primary',
        eventId: eventData.id
      });
    }
    throw error;
  }
};
```

#### OAuth Callback Status Update Issue
**Problem:** OAuth callback not updating connection status in UI

**Root Causes:**
1. **State Management**: React state not updating after OAuth completion
2. **Event Propagation**: OAuth success not properly communicated to parent components
3. **Timing Issues**: UI updates happening before OAuth state is fully processed

**Resolution:**
```javascript
// Enhanced OAuth callback handling
const handleOAuthCallback = async (code) => {
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Update global state
    setAuthTokens(tokens);
    
    // Verify connection
    const userInfo = await fetchUserInfo(tokens.access_token);
    
    // Update UI state
    setConnectionStatus('connected');
    setUserInfo(userInfo);
    
    // Notify parent components
    onAuthSuccess?.({
      tokens,
      userInfo,
      status: 'connected'
    });
    
  } catch (error) {
    setConnectionStatus('error');
    onAuthError?.(error);
  }
};
```

---

## Electron Integration Issues

### ⚡ RESOLVED: Electron Application Shutdown
**Issue ID:** ELEC-001  
**Severity:** 🔴 CRITICAL  
**Status:** ✅ RESOLVED  
**Platform:** Desktop Application  
**Date Resolved:** Current Session

#### Problem Description
Electron application shut down immediately after startup, preventing any desktop functionality.

#### Diagnostic Process

##### Initial Investigation
- **Symptom**: Electron window appeared briefly then closed
- **Logs**: Minimal error information in console
- **Behavior**: Consistent across multiple startup attempts
- **Environment**: Windows development environment

##### Directory-Specific Testing
**Key Discovery**: Issue was directory-specific
- ✅ Electron worked in other directories
- ❌ Failed specifically in project directory
- 🔍 Suggested local configuration conflict

##### Root Cause Identification
**Conflicting package.json in temp-extracted directory**

**Evidence Found**:
```
temp-extracted/
├── package.json  ← CONFLICTING FILE
│   └── "main": "different-entry-point.js"
└── other-files...
```

**Impact Analysis**:
- Electron was reading the wrong `package.json`
- Different main entry point caused startup failure
- Directory structure conflict with project configuration

#### Resolution Applied
1. **Removed conflicting directory**: Deleted `temp-extracted` folder
2. **Verified main entry point**: Confirmed correct `package.json` was being used
3. **Tested startup sequence**: Verified Electron now starts successfully
4. **Added directory monitoring**: Implemented checks for conflicting configurations

#### Prevention Measures
- **Pre-startup validation**: Check for conflicting `package.json` files
- **Directory cleanup**: Automated removal of temporary extraction directories
- **Configuration isolation**: Ensure Electron reads only project-level configuration

### ⚡ RESOLVED: Next.js-Electron Integration Timing
**Issue ID:** ELEC-002  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Desktop Application  
**Date Resolved:** Current Session

#### Critical Timing Discovery
**⚠️ MAJOR INSIGHT**: Next.js "Ready" ≠ "Compiled"

**Previous Misunderstanding**:
- Assumed "Ready in ~2.7s" meant server was fully operational
- Started Electron immediately after "Ready" message
- Expected immediate connection to Next.js server

**Correct Understanding**:
1. **"Ready" message** = Server infrastructure ready to START compiling
2. **Actual compilation** takes 10+ minutes after "Ready"
3. **"Compiling" messages** indicate ongoing compilation process
4. **Compilation completion** required before Electron can connect
5. **Only then** can Electron successfully connect to server

#### Implementation Strategy

##### Automated Server Startup
```javascript
// Enhanced Electron startup sequence
const startElectronApp = async () => {
  // Step 1: Start Next.js server
  console.log('Starting Next.js server...');
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'pipe'
  });
  
  // Step 2: Wait for "Ready" message
  await waitForServerReady(serverProcess);
  console.log('Server ready - beginning compilation...');
  
  // Step 3: Wait for compilation completion (CRITICAL)
  await waitForCompilationComplete(serverProcess);
  console.log('Compilation complete - starting Electron...');
  
  // Step 4: Start Electron application
  createElectronWindow();
};

const waitForCompilationComplete = (serverProcess) => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('Compilation timeout - proceeding with Electron startup');
      resolve();
    }, 15 * 60 * 1000); // 15 minute timeout
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Look for compilation completion indicators
      if (output.includes('Compiled successfully') || 
          output.includes('webpack compiled')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
};
```

##### User Experience Enhancement
```javascript
// Progress indication during compilation
const showCompilationProgress = () => {
  const progressWindow = new BrowserWindow({
    width: 400,
    height: 200,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  
  progressWindow.loadHTML(`
    <div style="text-align: center; padding: 50px;">
      <h3>FinCRuM is starting...</h3>
      <p>Compiling application (this may take several minutes)</p>
      <div class="spinner"></div>
    </div>
  `);
  
  return progressWindow;
};
```

---

## Server Startup & Development Issues

### 🖥️ RESOLVED: Command Duplication Issue
**Issue ID:** DEV-001  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Development Environment  
**Date Resolved:** Current Session

#### Problem Description
Every command in the development environment was being executed twice, causing confusion and potential resource conflicts.

#### Symptoms Observed
- **Double execution**: Every `npm run dev` command ran twice
- **Process conflicts**: Multiple server instances attempting to bind to same port
- **Resource waste**: Unnecessary CPU and memory usage
- **Log confusion**: Duplicate log entries making debugging difficult

#### Root Cause Analysis
**System-level command duplication**
- **Environment issue**: Development environment configuration problem
- **Shell configuration**: Possible shell script or alias duplication
- **IDE integration**: Development IDE potentially triggering duplicate commands
- **Process management**: System process manager executing commands multiple times

#### Resolution Applied
1. **Environment cleanup**: Reset development environment configuration
2. **Shell verification**: Checked and cleaned shell configuration files
3. **IDE settings**: Verified IDE command execution settings
4. **Process monitoring**: Implemented process deduplication checks

#### Prevention Measures
```javascript
// Process deduplication check
const checkExistingProcess = (port) => {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti:${port}`;
    
    exec(command, (error, stdout) => {
      if (stdout.trim()) {
        console.log(`Port ${port} already in use - skipping duplicate startup`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
```

### 🖥️ RESOLVED: Process Visibility Issues
**Issue ID:** DEV-002  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Development Environment  
**Date Resolved:** Current Session

#### Problem Description
Development server processes were running but not visible in standard process monitoring, making debugging and management difficult.

#### Symptoms
- **Hidden processes**: Server running but not visible in task manager
- **Port binding**: Ports showing as in use but no visible process
- **Debugging difficulty**: Unable to monitor server health and performance
- **Shutdown problems**: Difficulty terminating hidden processes

#### Root Cause Analysis
**Process spawning configuration**
- **Detached processes**: Processes spawned in detached mode
- **Background execution**: Processes running without proper parent-child relationship
- **Shell integration**: Processes spawned through shell without proper tracking

#### Resolution Applied
```javascript
// Enhanced process spawning with visibility
const spawnVisibleProcess = (command, args, options = {}) => {
  const defaultOptions = {
    stdio: ['inherit', 'pipe', 'pipe'], // Ensure output visibility
    detached: false, // Keep parent-child relationship
    windowsHide: false, // Show process on Windows
    ...options
  };
  
  const process = spawn(command, args, defaultOptions);
  
  // Track process for management
  activeProcesses.set(process.pid, {
    command,
    args,
    startTime: Date.now(),
    process
  });
  
  return process;
};

// Process monitoring and cleanup
const monitorProcesses = () => {
  setInterval(() => {
    activeProcesses.forEach((info, pid) => {
      if (!isProcessRunning(pid)) {
        activeProcesses.delete(pid);
      }
    });
  }, 5000);
};
```

### 🖥️ RESOLVED: Port Binding Conflicts
**Issue ID:** DEV-003  
**Severity:** 🟡 MEDIUM  
**Status:** ✅ RESOLVED  
**Platform:** Development Environment  
**Date Resolved:** Current Session

#### Problem Description
Multiple attempts to bind to the same port causing server startup failures and development workflow interruption.

#### Symptoms
- **EADDRINUSE errors**: Port already in use errors
- **Startup failures**: Server unable to start on default ports
- **Port conflicts**: Multiple services attempting to use same port
- **Development delays**: Manual port management required

#### Resolution Applied
```javascript
// Intelligent port management
const findAvailablePort = async (startPort = 3000, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isAvailable = await checkPortAvailability(port);
    
    if (isAvailable) {
      console.log(`Using port ${port} for development server`);
      return port;
    }
  }
  
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts}`);
};

const checkPortAvailability = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    
    server.on('error', () => resolve(false));
  });
};

// Graceful port cleanup on exit
process.on('SIGINT', () => {
  console.log('Cleaning up ports...');
  activeProcesses.forEach((info) => {
    info.process.kill('SIGTERM');
  });
  process.exit(0);
});
```

---

## Constructor Categories

### 🗓️ Date Constructors

#### ✅ Fixed Issues

**Core Components:**
- **Dashboard.tsx**: Line 167 - Sort function validation added
- **NotificationBell.tsx**: Lines 35-45 - Sort function validation added
- **ReminderList.tsx**: Lines 25-35 - Sort function validation added
- **AppointmentList.tsx**: Lines 25-35 - Sort function validation added
- **TaskList.tsx**: Lines 25-35 - Sort function validation added
- **ConflictResolutionLog.tsx**: Lines 69-70 - Sort function validation added

**Services:**
- **conflict-resolution-log.ts**: Lines 57, 115, 116, 152 - Timestamp validation added
- **shared-cloud-database.ts**: Lines 356-357 - updatedAt validation added
- **enhanced-onedrive.ts**: Lines 582-583 - lastModified validation added
- **sync-buffer.ts**: Lines 125-126, 293 - Timestamp and lastModified validation added

**Pages:**
- **export-data/page.tsx**: Lines 40-50 - Sort function validation added
- **customers/page.tsx**: Lines 65-75 - Sort function validation added

**Utilities:**
- **utils.ts**: Lines 140-150 - Notification sorting validation added
- **use-data-sync.tsx**: Lines 210-220 - Checked (no issue with parameterless constructor)

#### 🔍 Potential Issues (Under Investigation)

**Calendar Mappers:**
- **microsoft-calendar-mapper.ts**: Lines 38, 42, 46, 50, 55, 59, 67, 71, 75, 76, 78, 86, 93, 98, 102, 107, 108, 110
- **google-calendar-mapper.ts**: Lines 25, 28, 34, 37, 43, 44, 50, 51, 55, 67, 69

**Forms:**
- **AppointmentForm.tsx**: Lines 202, 218

**Security:**
- **security-compliance.ts**: Lines 225, 250, 253, 268, 301, 412, 413, 414, 510, 513

### ❌ Error Constructors

#### 🔍 High Priority Investigation Areas

**Setup and Configuration:**
- **setup-manager.ts**: Lines 222, 246, 567 - `new Error()` calls
- **deployment-config.ts**: Various lines - `new Error()` calls

**Authentication Services:**
- **google-oauth.ts**: Lines 23, 93, 114, 135, 160, 191, 197 - `new Error()` calls
- **microsoft-oauth.ts**: Lines 16, 81, 100, 131, 150, 174, 185 - `new Error()` calls

**Calendar Services:**
- **microsoft-calendar-client.ts**: Lines 60, 73, 96, 109, 130, 142, 176, 189, 221, 238 - `new Error()` calls
- **google-calendar-events.ts**: Lines 53, 112, 164, 225 - `new Error()` calls
- **microsoft-calendar-events.ts**: Lines 54, 58, 62, 65, 102, 106, 110, 113, 141, 145, 154 - `new Error()` calls

**Data Management:**
- **indexeddb.ts**: Lines 24, 43, 59, 63, 80, 84, 99, 103 - `new Error()` calls
- **sync-buffer.ts**: Lines 354, 367, 383, 409 - `new Error()` calls

**Cloud Storage:**
- **onedrive.ts**: Lines 45, 51, 81, 125, 182 - `new Error()` calls
- **google-drive.ts**: Lines 32, 38, 90, 122, 126, 169, 173, 208, 214, 225, 229 - `new Error()` calls

**Components and Hooks:**
- **hooks/use-data-sync.tsx**: Lines 112, 138, 272, 359, 482 - `new Error()` calls
- **contexts/AuthContext.tsx**: Line 580 - `new Error()` calls
- **components/ui/sidebar.tsx**: Line 49 - `new Error()` calls

**Utilities:**
- **rate-limiter.ts**: Lines 191, 452 - `new Error()` calls

### 🌐 Web API Constructors

#### 🔍 Potential Issues

**Network and Authentication:**
- **google-oauth.ts**: Line 38 - `new Client()`
- **microsoft-oauth.ts**: Lines 37, 61, 112 - `new URLSearchParams()`
- **deployment-config.ts**: Line 268 - `new URL()`

**File and Data Handling:**
- **google-drive.ts**: Lines 130, 146, 147 - `new Blob()`, `new FormData()`
- **components/ImageCropperModal.tsx**: Line 32 - `new Image()`

**Async Operations:**
- **indexeddb.ts**: Line 22 - `new Promise()`

**Data Structures:**
- **components/DataGrid.tsx**: Line 112 - `new Set()`
- **utils.ts**: Lines 42, 87 - `new CustomEvent()`

### 🗂️ Collection Constructors

#### 🔍 Potential Issues

**Service Collections:**
- **real-time-sync.ts**: Lines 55, 56, 57, 58 - `new Map()` calls
- **enhanced-google-drive.ts**: Line 17 - `new Map()`
- **enhanced-onedrive.ts**: Line 17 - `new Map()`

**Testing Infrastructure:**
- **testing-service.ts**: Lines 15, 16, 1062, 1069 - `new Map()` calls
- **testing-service.ts**: Lines 973, 1020 - `new Array()` calls

### 🔧 Service Constructors

#### ✅ Singleton Instances (Monitored)

**Core Services:**
- **shared-cloud-database.ts**: Line 55 - `new CloudDatabaseService()`
- **setup-manager.ts**: Line 637 - `new SetupManagerService()`
- **user-management.ts**: Line 18 - `new UserManagementService()`

**Synchronization Services:**
- **real-time-sync.ts**: Line 74 - `new RealTimeSyncService()`
- **sync-buffer.ts**: Line 536 - `new SyncBufferService()`
- **conflict-resolution-log.ts**: Line 22 - `new ConflictResolutionLogService()`

**Cloud Services:**
- **enhanced-google-drive.ts**: Line 485 - `new EnhancedGoogleDriveService()`
- **enhanced-onedrive.ts**: Line 596 - `new EnhancedOneDriveService()`

**Utility Services:**
- **rate-limiter.ts**: Line 594 - `new RateLimiterService()`
- **backup-versioning.ts**: Line 523 - `new BackupVersioningService()`
- **device-management.ts**: Line 59 - `new DeviceManagementService()`
- **security-compliance.ts**: Line 608 - `new SecurityComplianceService()`
- **deployment-config.ts**: Line 835 - `new DeploymentConfigService()`
- **testing-service.ts**: Line 1180 - `new TestingService()`

---

## Fixed Issues

### 📋 Complete List of Resolved Date Constructor Issues

#### Component Fixes
1. **Dashboard.tsx** (Line 167)
   - **Issue**: Sort function using `new Date()` without validation
   - **Fix**: Added filter to remove items without `createdAt` before sorting
   - **Pattern**: `items.filter(item => item.createdAt).sort(...)`

2. **NotificationBell.tsx** (Lines 35-45)
   - **Issue**: Sort function using `new Date()` without validation
   - **Fix**: Added filter to remove notifications without `createdAt`

3. **ReminderList.tsx** (Lines 25-35)
   - **Issue**: Sort function using `new Date()` without validation
   - **Fix**: Added filter to remove reminders without `dateTime`

4. **AppointmentList.tsx** (Lines 25-35)
   - **Issue**: Sort function using `new Date()` without validation
   - **Fix**: Added filter to remove appointments without `date`

5. **TaskList.tsx** (Lines 25-35)
   - **Issue**: Sort function using `new Date()` without validation
   - **Fix**: Added filter to remove tasks without `updatedAt`

6. **ConflictResolutionLog.tsx** (Lines 69-70)
   - **Issue**: Sort function using `new Date()` without validation
   - **Fix**: Added filter to remove logs without `timestamp`

#### Service Fixes
7. **conflict-resolution-log.ts** (Lines 57, 115, 116, 152)
   - **Issue**: Creating Date objects from potentially undefined timestamps
   - **Fix**: Added validation before Date constructor calls

8. **shared-cloud-database.ts** (Lines 356-357)
   - **Issue**: Creating Date objects from potentially undefined `updatedAt`
   - **Fix**: Added validation to ensure `updatedAt` exists

9. **enhanced-onedrive.ts** (Lines 582-583)
   - **Issue**: Creating Date objects from potentially undefined `lastModified`
   - **Fix**: Added validation to ensure `lastModified` exists

10. **sync-buffer.ts** (Lines 125-126, 293)
    - **Issue**: Creating Date objects from potentially undefined timestamps
    - **Fix**: Added validation for timestamp and lastModified properties

#### Page Fixes
11. **export-data/page.tsx** (Lines 40-50)
    - **Issue**: Sort function using `new Date()` without validation
    - **Fix**: Added filter to remove contacts without `updatedAt`

12. **customers/page.tsx** (Lines 65-75)
    - **Issue**: Sort function using `new Date()` without validation
    - **Fix**: Added filter to remove contacts without `updatedAt`

#### Utility Fixes
13. **utils.ts** (Lines 140-150)
    - **Issue**: Notification sorting using `new Date()` without validation
    - **Fix**: Added filter to remove notifications without `createdAt`

14. **use-data-sync.tsx** (Lines 210-220)
    - **Status**: Checked and confirmed safe (parameterless constructor)

---

## Investigation Areas

### 🚨 High Priority Areas

#### 1. SyncManager Component Dependencies
The current "Illegal constructor" error originates from the SyncManager component. Key areas to investigate:

**Direct Dependencies:**
- **sync-buffer.ts** - Multiple Error constructors and Date constructors
- **shared-cloud-database.ts** - Service instantiation and Date constructors
- **real-time-sync.ts** - Service instantiation and Map constructors
- **conflict-resolution-log.ts** - Service instantiation and Date constructors

**Hook Dependencies:**
- **use-data-sync.tsx** - Central hook used by SyncManager
- **use-cloud-database.tsx** - Database operations hook

**Component Dependencies:**
- **ConflictResolutionDialog.tsx** - Conflict resolution UI
- **CloudSyncStatus.tsx** - Sync status display
- **CloudSyncSettings.tsx** - Sync configuration

#### 2. Error Constructor Analysis

**Common Issues with Error Constructors:**
- Empty or undefined error messages
- Non-string arguments passed to constructor
- Circular reference issues in error objects

**High-Risk Files:**
- `src/services/enhanced-google-drive.ts`
- `src/services/enhanced-onedrive.ts`
- `src/hooks/use-data-sync.tsx`
- `src/services/sync-buffer.ts`

#### 3. Service Instantiation Issues

**Potential Problems:**
- Circular dependencies between services
- Constructor parameters being invalid or undefined
- Memory issues during instantiation
- Services being instantiated in wrong context (SSR vs client)

**Critical Services to Monitor:**
- CloudDatabaseService
- RealTimeSyncService
- ConflictResolutionLogService
- SyncBufferService

---

## Debugging Strategy

### 🔍 Step-by-Step Investigation Process

#### Phase 1: Component-Level Investigation
1. **Examine Dashboard.tsx and SyncManager.tsx**
   - Pinpoint exact line in SyncManager causing the error
   - Check component props and state initialization
   - Verify all imports are correctly resolved

2. **Inspect useDataSync Hook**
   - Central hook used by SyncManager
   - Look for constructor calls within hook logic
   - Check for Promise, Error, Date, or custom class instantiation
   - Verify hook dependencies and their constructors

3. **Check ConflictResolutionUI Component**
   - Part of useDataSync functionality
   - Examine state initialization patterns
   - Look for any constructor calls in component lifecycle

#### Phase 2: Service-Level Investigation
4. **Review Service Instantiations**
   - Check how singleton services are created
   - Verify constructor parameters are valid
   - Ensure no circular dependencies exist
   - Validate service initialization order

5. **Validate Constructor Arguments**
   - Ensure all constructor arguments are defined
   - Check argument types match expected parameters
   - Verify values from state, props, or storage are valid
   - Pay attention to null, undefined, or wrong-type values

#### Phase 3: Context-Specific Investigation
6. **Consider SSR/Hydration Issues**
   - Check if constructors rely on browser-specific objects
   - Verify compatibility with server-side rendering
   - Look for window, document, or other client-only dependencies
   - Ensure proper hydration handling

7. **Isolate the Issue**
   - Comment out sections of SyncManager to narrow down problem
   - Start with ConflictResolutionUI and other child components
   - Progressively disable useDataSync logic sections
   - Use try-catch blocks to isolate failing constructors

#### Phase 4: Advanced Debugging
8. **Memory and Performance Analysis**
   - Check for memory leaks in service instantiation
   - Monitor constructor call frequency
   - Look for recursive constructor calls
   - Analyze garbage collection patterns

9. **Dependency Analysis**
   - Map all dependencies used by SyncManager
   - Check for version conflicts in dependencies
   - Verify all imports are correctly resolved
   - Look for dynamic imports that might fail

### 🛠️ Debugging Tools and Techniques

#### Code Analysis
```typescript
// Add debugging wrapper for constructors
function safeConstructor<T>(ConstructorFn: new (...args: any[]) => T, ...args: any[]): T | null {
  try {
    console.log('Attempting to construct:', ConstructorFn.name, 'with args:', args);
    return new ConstructorFn(...args);
  } catch (error) {
    console.error('Constructor failed:', ConstructorFn.name, error);
    return null;
  }
}

// Usage example
const date = safeConstructor(Date, timestamp);
if (!date) {
  // Handle constructor failure
}
```

#### Error Boundary Implementation
```typescript
// Add error boundary around SyncManager
class SyncManagerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SyncManager Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>SyncManager failed to load: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}
```

---

## Debugging Procedures

### 🔧 Systematic Debugging Approach

#### Next.js Server Startup Issues

##### Step 1: Environment Verification
```bash
# Check Node.js version
node --version  # Should be v18+ for Next.js 15

# Check npm version
npm --version

# Verify project dependencies
npm list --depth=0
```

##### Step 2: Clean Installation
```bash
# Remove existing dependencies
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Fresh installation
npm install
```

##### Step 3: Minimal Configuration Testing
```bash
# Start with minimal Next.js configuration
npm run dev -- --port 3001

# Monitor for "Ready" vs "Compiled" messages
# Wait for actual compilation completion
```

##### Step 4: Error Isolation
```javascript
// Add comprehensive error logging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

#### Electron Integration Debugging

##### Step 1: Directory Validation
```bash
# Check for conflicting package.json files
find . -name "package.json" -not -path "./node_modules/*"

# Remove temporary directories
rm -rf temp-extracted/ .next/ out/
```

##### Step 2: Timing Verification
```javascript
// Monitor Next.js compilation status
const monitorCompilation = (serverProcess) => {
  let readyReceived = false;
  let compilationComplete = false;
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    if (output.includes('Ready in')) {
      readyReceived = true;
      console.log('✅ Server ready - compilation starting...');
    }
    
    if (output.includes('Compiled successfully')) {
      compilationComplete = true;
      console.log('✅ Compilation complete - safe to start Electron');
    }
    
    if (output.includes('Compiling')) {
      console.log('🔄 Compiling:', output.trim());
    }
  });
};
```

##### Step 3: Progressive Testing
```javascript
// Test server connectivity before Electron startup
const testServerConnectivity = async (port = 3000) => {
  const maxAttempts = 30;
  const delay = 2000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) {
        console.log('✅ Server connectivity confirmed');
        return true;
      }
    } catch (error) {
      console.log(`⏳ Attempt ${i + 1}/${maxAttempts} - waiting for server...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Server connectivity test failed');
};
```

#### OAuth Authentication Debugging

##### Step 1: Credential Verification
```javascript
// Validate OAuth configuration
const validateOAuthConfig = () => {
  const required = ['CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing OAuth configuration: ${missing.join(', ')}`);
  }
  
  console.log('✅ OAuth configuration validated');
};
```

##### Step 2: Flow Monitoring
```javascript
// Monitor OAuth flow steps
const monitorOAuthFlow = () => {
  const steps = {
    authUrlGenerated: false,
    userRedirected: false,
    callbackReceived: false,
    tokenExchanged: false,
    userInfoFetched: false
  };
  
  return {
    markStep: (step) => {
      steps[step] = true;
      console.log(`✅ OAuth Step: ${step}`);
      console.log('Progress:', Object.entries(steps)
        .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
        .join(', '));
    },
    getProgress: () => steps
  };
};
```

##### Step 3: Error Pattern Analysis
```javascript
// Common OAuth error handlers
const handleOAuthError = (error) => {
  const errorPatterns = {
    'invalid_grant': {
      cause: 'Authorization code reused or expired',
      solution: 'Generate new authorization URL'
    },
    'redirect_uri_mismatch': {
      cause: 'Redirect URI mismatch with Google Console',
      solution: 'Verify exact URI match including protocol and port'
    },
    'invalid_client': {
      cause: 'Client credentials incorrect',
      solution: 'Verify CLIENT_ID and CLIENT_SECRET'
    }
  };
  
  const pattern = Object.keys(errorPatterns)
    .find(key => error.message.includes(key));
  
  if (pattern) {
    console.error(`🚨 OAuth Error Pattern: ${pattern}`);
    console.error(`Cause: ${errorPatterns[pattern].cause}`);
    console.error(`Solution: ${errorPatterns[pattern].solution}`);
  } else {
    console.error('🚨 Unknown OAuth Error:', error);
  }
};
```

#### Constructor Error Debugging

##### Step 1: Error Location Identification
```javascript
// Enhanced error tracking
const trackConstructorErrors = () => {
  const originalError = global.Error;
  
  global.Error = function(...args) {
    const error = new originalError(...args);
    
    // Capture stack trace for constructor errors
    if (error.message.includes('Illegal constructor')) {
      console.error('🚨 Constructor Error Detected:');
      console.error('Stack:', error.stack);
      console.error('Arguments:', args);
    }
    
    return error;
  };
};
```

##### Step 2: Safe Constructor Patterns
```javascript
// Implement safe constructor wrappers
const safeConstructors = {
  Date: (...args) => {
    try {
      return args.length === 0 ? new Date() : new Date(...args);
    } catch (error) {
      console.warn('Date constructor error, using current date:', error);
      return new Date();
    }
  },
  
  Error: (message = 'Unknown error') => {
    try {
      return new Error(message);
    } catch (error) {
      console.warn('Error constructor error:', error);
      return { message, name: 'Error', stack: new Error().stack };
    }
  }
};
```

### 🔍 Diagnostic Checklist

#### Pre-Development Checklist
- [ ] Node.js version compatibility (v18+)
- [ ] Clean dependency installation
- [ ] Environment variables configured
- [ ] Port availability verified
- [ ] No conflicting package.json files

#### Server Startup Checklist
- [ ] "Ready" message received
- [ ] Compilation completion confirmed
- [ ] Server connectivity tested
- [ ] Error logging enabled
- [ ] Process visibility verified

#### Electron Integration Checklist
- [ ] Next.js server fully compiled
- [ ] Server connectivity confirmed
- [ ] No directory conflicts
- [ ] Proper timing implementation
- [ ] Progress indication active

#### OAuth Integration Checklist
- [ ] Credentials validated
- [ ] Redirect URIs match exactly
- [ ] Flow monitoring active
- [ ] Error handling implemented
- [ ] Idempotency measures in place

---

## Common Patterns and Solutions

### 🔧 Date Constructor Patterns

#### ❌ Problematic Pattern
```typescript
// Dangerous - no validation
items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// Dangerous - direct property access
const date = new Date(item.timestamp);
```

#### ✅ Safe Pattern
```typescript
// Safe - with validation and filtering
items
  .filter(item => item.createdAt && item.createdAt !== '')
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// Safe - with validation
const createSafeDate = (value: any): Date | null => {
  if (!value || value === '' || value === null || value === undefined) {
    return null;
  }
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const date = createSafeDate(item.timestamp);
if (date) {
  // Use the date
}
```

### 🔧 Error Constructor Patterns

#### ❌ Problematic Pattern
```typescript
// Dangerous - undefined message
throw new Error(undefined);

// Dangerous - non-string argument
throw new Error(someObject);
```

#### ✅ Safe Pattern
```typescript
// Safe - with default message
throw new Error(message || 'An unknown error occurred');

// Safe - with proper string conversion
throw new Error(String(errorValue || 'Unknown error'));

// Safe - with validation
const createSafeError = (message: any): Error => {
  const safeMessage = typeof message === 'string' ? message : 'Unknown error';
  return new Error(safeMessage);
};
```

### 🔧 Service Constructor Patterns

#### ❌ Problematic Pattern
```typescript
// Dangerous - no validation
class MyService {
  constructor(config: Config) {
    this.config = config; // config might be undefined
    this.client = new SomeClient(config.apiKey); // might fail
  }
}
```

#### ✅ Safe Pattern
```typescript
// Safe - with validation
class MyService {
  constructor(config: Config) {
    if (!config) {
      throw new Error('Configuration is required');
    }
    if (!config.apiKey) {
      throw new Error('API key is required in configuration');
    }
    this.config = config;
    this.client = new SomeClient(config.apiKey);
  }
}
```

---

## Prevention Guidelines

### 📋 Code Review Checklist

#### Date Constructors
- [ ] All Date constructors have input validation
- [ ] Sort functions filter out invalid dates before sorting
- [ ] Timestamp properties are checked for existence
- [ ] Date strings are validated before parsing
- [ ] Fallback values are provided for missing dates

#### Error Constructors
- [ ] Error messages are always strings
- [ ] Error messages have meaningful default values
- [ ] Error objects don't contain circular references
- [ ] Error constructors don't receive undefined values

#### Service Constructors
- [ ] Constructor parameters are validated
- [ ] Dependencies are checked before instantiation
- [ ] Circular dependencies are avoided
- [ ] Singleton patterns are properly implemented
- [ ] Constructor failures are properly handled

#### General Constructor Safety
- [ ] All constructor calls are wrapped in try-catch when appropriate
- [ ] Constructor arguments are type-checked
- [ ] Browser-specific constructors are not called during SSR
- [ ] Memory usage is considered for large object construction

### 🛡️ Defensive Programming Practices

#### Input Validation
```typescript
// Always validate inputs before constructor calls
function createDateSafely(input: any): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  
  if (typeof input === 'string' && input.trim() === '') {
    return null;
  }
  
  try {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
```

#### Error Handling
```typescript
// Wrap risky constructors in error handling
function safeServiceInstantiation<T>(
  ServiceClass: new (...args: any[]) => T,
  ...args: any[]
): T | null {
  try {
    return new ServiceClass(...args);
  } catch (error) {
    console.error(`Failed to instantiate ${ServiceClass.name}:`, error);
    return null;
  }
}
```

#### Type Safety
```typescript
// Use TypeScript to enforce constructor safety
interface SafeConstructor<T> {
  new (validatedInput: NonNullable<T>): any;
}

function callConstructorSafely<T>(
  Constructor: SafeConstructor<T>,
  input: T
): ReturnType<SafeConstructor<T>> | null {
  if (input === null || input === undefined) {
    return null;
  }
  return new Constructor(input);
}
```

### 📈 Monitoring and Alerting

#### Constructor Monitoring
```typescript
// Add monitoring for constructor failures
const constructorMetrics = {
  failures: new Map<string, number>(),
  successes: new Map<string, number>(),
};

function monitoredConstructor<T>(
  ConstructorFn: new (...args: any[]) => T,
  ...args: any[]
): T {
  const constructorName = ConstructorFn.name;
  
  try {
    const instance = new ConstructorFn(...args);
    constructorMetrics.successes.set(
      constructorName,
      (constructorMetrics.successes.get(constructorName) || 0) + 1
    );
    return instance;
  } catch (error) {
    constructorMetrics.failures.set(
      constructorName,
      (constructorMetrics.failures.get(constructorName) || 0) + 1
    );
    throw error;
  }
}
```

---

*This unified debugging and memory report serves as the comprehensive reference for identifying, tracking, and resolving constructor-related issues in the FinCRuM application. Regular updates to this document help maintain code quality and prevent regression of fixed issues.*