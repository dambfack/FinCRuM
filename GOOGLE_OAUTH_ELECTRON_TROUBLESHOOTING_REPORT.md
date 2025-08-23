# Google OAuth Electron Troubleshooting Report

## Issue Summary
The Google OAuth authentication flow in the Electron app continues to open in the default browser instead of being handled within the Electron app, despite implementing custom protocol redirect URIs.

## Root Cause Analysis

Based on Google's OAuth 2.0 documentation for native applications <mcreference link="https://developers.google.com/identity/protocols/oauth2/native-app" index="1">1</mcreference>, there are several critical limitations:

### 1. Custom URI Scheme Limitations
- **Google Policy**: Custom URI schemes are no longer supported on new Chrome apps and are disabled by default due to app impersonation risks <mcreference link="https://developers.google.com/identity/protocols/oauth2/native-app" index="1">1</mcreference>
- **Desktop Applications**: For regular desktop apps (like Electron), Google documentation suggests using `http://localhost:PORT` as the redirect URL instead of custom schemes <mcreference link="https://stackoverflow.com/questions/72562672/redirect-to-electron-app-custom-scheme-with-google-identity-service" index="5">5</mcreference>

### 2. Google Cloud Console Configuration
The custom protocol `fincrum://auth/callback/google` must be added as an authorized redirect URI in the Google Cloud Console OAuth client configuration. However, Google may reject custom schemes for security reasons.

## Current Configuration Status

### Environment Variables
- **Web Redirect URI**: `http://localhost:9002/auth/callback/google` ✅
- **Electron Redirect URI**: `fincrum://auth/callback/google` ❌ (Not supported by Google)
- **Google Client ID**: `712557462414-k8uvoh5vhshf634ei59dvhpsfbubnmnd.apps.googleusercontent.com`

### Code Implementation
- Custom protocol handling in `electron.js` ✅
- Environment variable configuration ✅
- OAuth service updated to use custom protocol ✅

## Recommended Solutions

### Solution 1: Use Localhost with Port Detection (Recommended)

**Approach**: Use a dynamic localhost redirect URI with automatic port detection.

```javascript
// In google-oauth.ts
function getRedirectUri(isElectron?: boolean): string {
  if (isElectron) {
    // Use localhost with the same port as the dev server
    return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:9002/auth/callback/google';
  }
  return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:9002/auth/callback/google';
}
```

**Benefits**:
- Complies with Google OAuth policies
- No need for custom protocol registration
- Works reliably across platforms

### Solution 2: Implement OAuth with System Browser + Local Server

**Approach**: Open OAuth in system browser but handle callback through a temporary local server.

```javascript
// Enhanced electron.js implementation
const { app, BrowserWindow, shell } = require('electron');
const express = require('express');
const http = require('http');

let oauthServer;
let oauthPort = 9003; // Different from main app port

function startOAuthServer() {
  const app = express();
  
  app.get('/auth/callback/google', (req, res) => {
    const { code, error, state } = req.query;
    
    if (error) {
      // Send error to main window
      mainWindow.webContents.send('oauth-error', error);
    } else if (code) {
      // Send success to main window
      mainWindow.webContents.send('oauth-callback', { code, state });
    }
    
    // Close the server after handling the callback
    res.send('<script>window.close();</script>');
    oauthServer.close();
  });
  
  oauthServer = http.createServer(app);
  oauthServer.listen(oauthPort, () => {
    console.log(`OAuth callback server running on port ${oauthPort}`);
  });
}

function handleOAuthFlow() {
  startOAuthServer();
  // Open OAuth URL in system browser
  shell.openExternal(oauthUrl);
}
```

### Solution 3: Use Deep Linking with App Registration

**Approach**: Register the Electron app as a handler for a custom protocol at the OS level.

**Windows Registry Entry**:
```registry
[HKEY_CLASSES_ROOT\fincrum]
@="URL:FinCRuM Protocol"
"URL Protocol"=""
[HKEY_CLASSES_ROOT\fincrum\shell\open\command]
@="\"C:\\path\\to\\fincrum.exe\" \"%1\""
```

**macOS Info.plist**:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>fincrum</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fincrum</string>
    </array>
  </dict>
</array>
```

## Immediate Action Required

### 1. Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Edit the OAuth 2.0 Client ID: `712557462414-k8uvoh5vhshf634ei59dvhpsfbubnmnd.apps.googleusercontent.com`
4. Add authorized redirect URIs:
   - `http://localhost:9002/auth/callback/google` (existing)
   - `http://localhost:9003/auth/callback/google` (for OAuth server)
   - `fincrum://auth/callback/google` (if Google allows custom schemes)

### 2. Code Implementation Update

Revert to using localhost redirect URI for Electron:

```env
# .env.local
NEXT_PUBLIC_GOOGLE_REDIRECT_URI_ELECTRON=http://localhost:9002/auth/callback/google
```

### 3. Enhanced Error Handling

Add better error handling and logging to identify OAuth flow issues:

```javascript
// In useGoogleSync.tsx
const handleGoogleAuth = async () => {
  try {
    console.log('Starting Google OAuth flow...');
    console.log('Is Electron:', isElectron);
    
    const response = await fetch('/api/auth/google?electron=' + isElectron);
    const data = await response.json();
    
    console.log('Auth URL generated:', data.authUrl);
    
    if (isElectron) {
      electronAPI.openOAuthUrl(data.authUrl);
    } else {
      window.open(data.authUrl, '_blank');
    }
  } catch (error) {
    console.error('OAuth flow error:', error);
  }
};
```

## Testing Strategy

1. **Test with localhost redirect URI** in Electron environment
2. **Verify Google Cloud Console** has correct redirect URIs
3. **Monitor network requests** to ensure correct redirect URI is being used
4. **Test OAuth callback handling** in both web and Electron environments

## Alternative Approaches

### Microsoft MSAL Approach
Microsoft's MSAL library for Electron uses custom protocols successfully <mcreference link="https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/6798" index="3">3</mcreference>. Consider implementing a similar pattern if Google allows custom schemes.

### Hybrid Approach
Use localhost for Google OAuth and custom protocols for other services that support them.

## Conclusion

The primary issue is likely that Google OAuth doesn't support custom URI schemes for desktop applications. The recommended solution is to use localhost redirect URIs with proper port management and enhanced callback handling.

## Next Steps

1. ✅ Update Google Cloud Console redirect URIs
2. ✅ Revert Electron redirect URI to localhost
3. ✅ Implement enhanced OAuth callback handling
4. ✅ Test OAuth flow in Electron environment
5. ✅ Monitor for any remaining issues

---
*Report Generated: Current Session*
*Status: Investigation Complete - Implementation Required*