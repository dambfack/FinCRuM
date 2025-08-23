# FinCRuM Project Memory Bank

## Project Overview
FinCRuM is a comprehensive financial and task management application built with Next.js and Electron, featuring Google and Microsoft OAuth integration for calendar and cloud storage synchronization.

## Recent Major Tasks Completed

### 1. Google OAuth Token Sharing Fix (Current Session)
**Status**: ✅ IMPLEMENTED - READY FOR TESTING
**Issue**: Google OAuth authentication popup was not sharing tokens with main window in Electron
**Root Cause**: 
- OAuth flow using HTTP redirect URI instead of custom protocol for Electron
- Server-side environment detection failing (window undefined)
- Missing isElectron parameter in action chain

**Solution**: 
- Fixed action parameter handling to accept isElectron parameter
- Updated hook implementation to pass Electron detection
- Created proper environment configuration with both redirect URIs
- Ensured correct redirect URI selection based on environment

**Files Modified**:
- `src/app/actions/google-auth-actions.ts` - Added isElectron parameter support
- `src/hooks/useGoogleSync.tsx` - Updated to pass Electron detection
- `.env` - Created with proper OAuth configuration
- `GOOGLE_OAUTH_ELECTRON_FIX_REPORT.md` - Comprehensive fix documentation

**Technical Flow**:
1. Client detects Electron environment
2. Passes isElectron=true to generateGoogleAuthUrlAction
3. Action forwards electron=true to API route
4. Service uses custom protocol redirect URI (fincrum://auth/callback/google)
5. Electron handles custom protocol and processes OAuth callback
6. Token exchange uses correct redirect URI
7. Authentication completes successfully

### 2. Google OAuth Electron Window Solution (December 2024)
**Status**: ✅ IMPLEMENTED - ENHANCED IN CURRENT SESSION
**Issue**: Google OAuth callback was opening in browser and launching new app instances
**Root Cause**: Using `shell.openExternal()` caused system browser to handle OAuth, leading to callback URL launching new app instances
**Solution**: 
- Replaced system browser OAuth with dedicated Electron BrowserWindow
- Implemented automatic callback detection and processing
- Used modal window approach for better UX and security

**Files Modified**:
- `electron.js` - Completely rewrote `oauth:open-url` handler to use dedicated window
- `.env.local` - Reverted to localhost redirect URI for both web and Electron
- `OAUTH_ELECTRON_WINDOW_SOLUTION_REPORT.md` - Created comprehensive solution report

**Technical Details**:
- Creates 500x700 modal BrowserWindow for OAuth
- Monitors `will-navigate` events to detect callback URLs
- Automatically processes callbacks and closes OAuth window
- Maintains security with proper webPreferences
- Supports both localhost and custom protocol callbacks

### 3. Google OAuth Redirect URI Configuration (December 2024) - SUPERSEDED
**Status**: ❌ SUPERSEDED BY CURRENT SESSION FIX
**Previous Attempt**: Custom protocol approach (`fincrum://`) - enhanced and fixed in current session

## Project Architecture Overview

### Core Technologies
- **Frontend**: Next.js 14 with TypeScript
- **Desktop**: Electron for cross-platform desktop app
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Google OAuth 2.0, Microsoft Graph API
- **State Management**: React Context API
- **Testing**: Jest, React Testing Library

### Key Components
- **Authentication**: Google and Microsoft OAuth flows
- **Calendar Integration**: Google Calendar and Microsoft Calendar sync
- **Cloud Storage**: Google Drive and OneDrive integration
- **Task Management**: Local and cloud-synced task management
- **Financial Tracking**: Expense and income management

### Environment Configuration
- **Development**: `http://localhost:9002`
- **Google OAuth Web**: `http://localhost:9002/auth/callback/google`
- **Google OAuth Electron**: `fincrum://auth/callback/google`
- **Microsoft OAuth**: `http://localhost:9002/auth/callback/microsoft`

## Known Issues & Solutions

### Resolved Issues
1. **OAuth Browser Redirect Issue** ✅
   - **Problem**: OAuth callbacks opening in default browser instead of Electron app
   - **Solution**: Implemented custom protocol `fincrum://` for Electron OAuth redirects
   - **Files**: Environment configuration and OAuth service

### Pending Issues
- None currently identified

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Cloud Console project with OAuth credentials
- Microsoft Azure app registration (optional)

### Quick Start
1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Configure OAuth credentials in `.env.local`
4. Run `npm install`
5. Run `npm run dev` for web or `npm run electron:dev` for desktop

## File Structure Highlights

### Core Directories
- `/src/app/` - Next.js app router pages
- `/src/components/` - Reusable React components
- `/src/services/` - API and OAuth service layers
- `/src/hooks/` - Custom React hooks
- `/src/contexts/` - React context providers
- `/docs/` - Project documentation

### Key Files
- `electron.js` - Electron main process
- `preload.js` - Electron preload script
- `.env.local` - Environment configuration
- `google-oauth.ts` - Google OAuth service
- `microsoft-oauth.ts` - Microsoft OAuth service

## Testing Strategy
- Unit tests for services and utilities
- Component tests for React components
- Integration tests for OAuth flows
- E2E tests for critical user journeys

## Deployment
- Web: Vercel/Netlify deployment
- Desktop: Electron Builder for cross-platform packaging
- Auto-updater: Configured for desktop app updates

## Next Steps
- Test complete OAuth flow with valid Google credentials
- Verify token exchange and storage functionality
- Test error handling scenarios (user denial, network issues)
- Consider implementing additional OAuth providers if needed
- Enhance error handling for authentication failures

## Current Session Summary
**Major Achievements**: Fixed critical Electron integration issues

### 1. Google OAuth Token Sharing Fix ✅
- ✅ Identified root cause: incorrect redirect URI usage and parameter passing
- ✅ Implemented comprehensive fix across action chain
- ✅ Updated environment configuration
- ✅ Created detailed documentation and bug reports
- ⏳ Ready for end-to-end testing with valid credentials

### 2. Production Port Configuration Fix ✅
- ✅ Identified issue: Production builds starting on port 3000 instead of 9002
- ✅ Updated package.json scripts with PORT environment variable
- ✅ Added optimized standalone production script
- ✅ Ensured cross-platform compatibility with cross-env
- ✅ Documented comprehensive fix and testing procedures

---
*Last Updated: Current Session - OAuth & Production Port Configuration Fixes*