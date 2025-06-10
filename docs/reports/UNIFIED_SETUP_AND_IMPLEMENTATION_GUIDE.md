# FinCRuM - Unified Setup and Implementation Guide

**Project:** FinCRuM Financial Management Application  
**Repository:** `d:\Local_Git\FinCRuM`  
**Remote URL:** `https://github.com/dambfack/FinCRuM.git`  
**Current Branch:** `FinCRuM`  
**Document Type:** Comprehensive Setup & Implementation Documentation  
**Version:** 1.0.0 (Unified Guide)  
**Last Updated:** December 2024

---

## 📋 Table of Contents

1. [Quick Start Guide](#-quick-start-guide)
2. [Development Environment Setup](#-development-environment-setup)
3. [Third-Party Service Integration](#-third-party-service-integration)
4. [Cloud Database Integration](#-cloud-database-integration)
5. [Deployment and Distribution](#-deployment-and-distribution)
6. [Testing and Quality Assurance](#-testing-and-quality-assurance)
7. [Troubleshooting and Debugging](#-troubleshooting-and-debugging)
8. [Advanced Configuration](#-advanced-configuration)

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+ (for backend components)
- **Git** for version control
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Clone the repository
git clone https://github.com/dambfack/FinCRuM.git
cd FinCRuM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### First Run
1. Open `http://localhost:9002` in your browser
2. Complete the First Time Setup Wizard
3. Configure your preferred cloud storage (optional)
4. Start using the application!

---

## 💻 Development Environment Setup

### System Requirements

#### Windows
- Windows 10/11
- PowerShell 5.1+ or PowerShell Core 7+
- No additional requirements for basic development

#### macOS
- macOS 10.15+ (Catalina or later)
- Xcode Command Line Tools
- Apple Developer account (for code signing - optional)

#### Linux
- Ubuntu 18.04+ or equivalent distribution
- `fpm` gem for building packages: `gem install fpm`

### Development Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type checking
npm run type-check

# Electron development
npm run electron:dev

# Build Electron app
npm run electron:build
```

### Environment Variables

Create `.env.local` from `.env.example` and configure:

```env
# Application Configuration
NEXT_PUBLIC_APP_NAME=FinCRuM
NEXT_PUBLIC_APP_VERSION=1.0.0

# Google Services
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:9002/auth/callback/google

# Microsoft Services
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:9002/auth/callback/microsoft
MICROSOFT_TENANT_ID=your_tenant_id

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 🔗 Third-Party Service Integration

### Google Services Setup

#### 1. Google Cloud Console Configuration

1. **Create Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable required APIs:
     - Google Calendar API
     - Google Drive API
     - Google+ API (for user info)

2. **OAuth 2.0 Credentials**
   - Navigate to "APIs & Services" > "Credentials"
   - Create OAuth 2.0 Client ID
   - **Application type**: Web application
   - **Authorized JavaScript origins**: `http://localhost:9002`
   - **Authorized redirect URIs**: `http://localhost:9002/auth/callback/google`

3. **Environment Configuration**
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id
   GOOGLE_CLIENT_SECRET=your_actual_client_secret
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:9002/auth/callback/google
   ```

#### 2. Google Calendar Integration

**Features**:
- Sync reminders and appointments with Google Calendar
- Duplicate prevention
- Real-time synchronization
- Conflict resolution

**Testing**:
```bash
# Run calendar sync tests
npm test google-calendar-sync.test.tsx

# Run integration tests
npx cypress run --spec "cypress/e2e/google-calendar-duplicate-prevention.cy.ts"
```

#### 3. Google Drive Integration

**Features**:
- Automatic data backup
- File synchronization
- Version control
- Conflict resolution

### Microsoft Services Setup

#### 1. Azure App Registration

1. **Create App Registration**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to "Azure Active Directory" > "App registrations"
   - Click "New registration"
   - **Name**: `FinCRuM Calendar Sync`
   - **Supported account types**: Choose based on requirements
   - **Redirect URI**: `http://localhost:9002/auth/callback/microsoft`

2. **API Permissions**
   - Add Microsoft Graph permissions:
     - `Calendars.ReadWrite` - Calendar access
     - `Files.ReadWrite` - OneDrive access
     - `User.Read` - Basic profile
     - `offline_access` - Refresh tokens
   - Grant admin consent if required

3. **Client Secret**
   - Go to "Certificates & secrets"
   - Create new client secret
   - Copy the secret value immediately

4. **Environment Configuration**
   ```env
   NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_application_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:9002/auth/callback/microsoft
   MICROSOFT_TENANT_ID=your_tenant_id
   ```

#### 2. OneDrive Integration

**Implementation Status**:
- ✅ Service structure created
- ✅ Environment variables configured
- ❌ OAuth flow incomplete (shows "not yet implemented" toast)
- ❌ Token refresh mechanism missing

**Required Implementation**:
1. Complete OAuth service in `src/services/microsoft-oauth.ts`
2. Update authentication flow in `src/hooks/use-data-sync.tsx`
3. Implement token refresh mechanism
4. Add proper error handling

### Firebase Setup

#### 1. Firebase Project Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Firestore Database
   - Get project configuration

2. **Firestore Database**
   - Create database in production mode
   - Set up security rules
   - Configure indexes as needed

3. **Environment Configuration**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

#### 2. Activate Firebase Services

1. **Update `src/services/firebase.ts`**
   - Uncomment Firebase imports
   - Replace placeholder initialization
   - Add proper error handling

2. **Create Firestore Service**
   - Implement CRUD operations
   - Add real-time listeners
   - Handle offline scenarios

**Current Status**:
- ✅ Firebase SDK installed
- ✅ Environment variables configured
- ❌ Firebase initialization commented out
- ❌ Firestore operations not implemented
- ❌ Real-time synchronization not active

---

## ☁️ Cloud Database Integration

### Overview

The FinCRuM application includes a comprehensive shared cloud database system that enables real-time data synchronization across multiple devices and users. This system integrates with Google Drive and OneDrive to provide seamless data backup, synchronization, and conflict resolution.

### Implementation Status

#### ✅ Completed Features
- **Multi-provider Support**: Google Drive and OneDrive integration
- **Real-time Sync**: Automatic data synchronization across devices
- **Conflict Resolution**: Manual conflict resolution with user precedence
- **Offline Support**: Local data persistence with sync on reconnection
- **Authentication**: OAuth integration with Google and Microsoft
- **Data Encryption**: Secure data storage and transmission
- **Audit Trail**: Comprehensive logging of all sync operations
- **UI Components**: Status indicators and settings panels

#### 🔄 Remaining Tasks
- Performance optimization for large datasets
- Advanced conflict resolution strategies
- Batch operation improvements
- Enhanced error recovery mechanisms

### Key Features

1. **Automatic Synchronization**: Changes are automatically synced across all connected devices
2. **Conflict Resolution**: When conflicts occur, users can choose which version to keep
3. **Offline Support**: Full functionality when offline, with sync when connection is restored
4. **Multi-User Collaboration**: Multiple users can work on the same data with conflict management
5. **Data Integrity**: Checksums and validation ensure data consistency
6. **Privacy**: All data is encrypted and stored securely in user's cloud storage

### Quick Start Guide

#### 1. Enable Cloud Sync

```typescript
import { useCloudDatabase } from '@/hooks/useCloudDatabase';
import { CloudSyncStatus } from '@/components/CloudSyncStatus';

function MyComponent() {
  const { isAuthenticated, isOnline, conflictCount } = useCloudDatabase();
  
  return (
    <div>
      <CloudSyncStatus showDetails={true} />
      {/* Your component content */}
    </div>
  );
}
```

#### 2. Add Data with Cloud Sync

```typescript
import { addOrUpdateItemWithCloudSync, DataItemType } from '@/lib/shared-cloud-database';

const handleAddContact = async (contact: Contact) => {
  try {
    await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);
    console.log('Contact saved and synced!');
  } catch (error) {
    console.error('Failed to save contact:', error);
  }
};
```

#### 3. Handle Data with Cloud Sync

```typescript
import { 
  addOrUpdateItemWithCloudSync,
  deleteItemWithCloudSync,
  DataItemType 
} from '@/lib/shared-cloud-database';

// Add or update an item
const contact: Contact = {
  id: 'contact-123',
  name: 'John Doe',
  email: 'john@example.com',
  updatedAt: new Date().toISOString()
};

await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);

// Delete an item
await deleteItemWithCloudSync(DataItemType.Contacts, 'contact-123');
```

### Integration Steps

#### Step 1: Authentication Setup

Ensure Google and Microsoft OAuth are properly configured:

```typescript
// Check authentication status
import { useCloudDatabase } from '@/hooks/useCloudDatabase';

const { isAuthenticated, provider } = useCloudDatabase();

if (!isAuthenticated) {
  // Redirect to authentication
  window.location.href = '/auth';
}
```

#### Step 2: Component Integration

Add cloud sync status to your components:

```typescript
import { CloudSyncStatus } from '@/components/CloudSyncStatus';
import { CloudSyncSettings } from '@/components/CloudSyncSettings';

// In your main layout
<header>
  <CloudSyncStatus showDetails={false} />
</header>

// In settings page
<CloudSyncSettings className="max-w-4xl" />
```

#### Step 3: Data Operations

Replace local data operations with cloud-enabled versions:

```typescript
// Before (local only)
import { saveData } from '@/lib/storage';
saveData(DataItemType.Contacts, contacts);

// After (with cloud sync)
import { addOrUpdateItemWithCloudSync } from '@/lib/shared-cloud-database';
await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);
```

#### Step 4: Error Handling

Implement proper error handling for cloud operations:

```typescript
try {
  await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);
} catch (error) {
  if (error.message.includes('not authenticated')) {
    // Redirect to authentication
  } else if (error.message.includes('network')) {
    // Show offline message
  } else {
    // Generic error handling
  }
}
```

### API Reference

#### CloudDatabaseService

```typescript
class CloudDatabaseService {
  // Sync data with cloud storage
  async syncWithCloud(): Promise<SyncResult>
  
  // Resolve conflicts manually
  async resolveConflicts(resolutions: Map<string, ConflictResolution>): Promise<void>
  
  // Get sync status
  getSyncStatus(): SyncStatus
  
  // Enable/disable auto-sync
  setAutoSync(enabled: boolean): void
}
```

#### useCloudDatabase Hook

```typescript
const {
  isAuthenticated,    // User authentication status
  isOnline,          // Network connectivity status
  isSyncing,         // Current sync operation status
  conflictCount,     // Number of unresolved conflicts
  lastSyncTime,      // Timestamp of last successful sync
  provider,          // Current cloud provider (google/microsoft)
  syncNow,           // Manual sync trigger
  resolveConflict    // Conflict resolution function
} = useCloudDatabase();
```

### Cloud-Enabled Utility Functions

```typescript
// Add or update item with cloud sync
await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);

// Delete item with cloud sync
await deleteItemWithCloudSync(DataItemType.Contacts, contactId);

// Bulk operations with cloud sync
await bulkUpdateWithCloudSync(DataItemType.Contacts, contacts);

// Get conflict resolution logs
const logs = await actions.getConflictResolutionLogs();
```

### Data Flow

1. **Local Change**: User modifies data in the application
2. **Local Storage**: Data is immediately saved to local storage
3. **Cloud Sync**: Data is queued for cloud synchronization
4. **Conflict Detection**: System checks for conflicts with cloud data
5. **Resolution**: Conflicts are resolved (manual or automatic)
6. **Propagation**: Resolved data is synced to all connected devices

### UI Components

#### CloudSyncStatus

Real-time sync status with conflict indicators:

```typescript
import { CloudSyncStatus } from '@/components/CloudSyncStatus';

// Compact version for headers/toolbars
<CloudSyncStatus showDetails={false} />

// Full version for settings/status pages
<CloudSyncStatus showDetails={true} />
```

#### CloudSyncSettings

Comprehensive settings panel with conflict management:

```typescript
import { CloudSyncSettings } from '@/components/CloudSyncSettings';

<CloudSyncSettings className="max-w-4xl" />
```

### Conflict Resolution

The system prioritizes manual conflict resolution, allowing users to make informed decisions:

```typescript
// Check for conflicts during sync
const result = await cloudDatabase.syncWithCloud();
if (result.conflicts.length > 0) {
  // Conflicts require manual resolution
  console.log('Conflicts detected:', result.conflicts);
  
  // User must provide manual resolutions
  const manualResolutions = new Map([
    ['item-id-1', 'user_precedence'], // Keep local changes
    ['item-id-2', 'cloud_precedence'], // Accept cloud changes
    ['item-id-3', 'merge'] // Attempt merge
  ]);
  
  // Apply resolutions and sync
  await cloudDatabase.resolveConflicts(manualResolutions);
}

// Access conflict resolution log
const logs = await actions.getConflictResolutionLogs();
console.log('Conflict resolution history:', logs);
```

#### Conflict Resolution Features

1. **Manual Priority**: Users make informed decisions about conflicts
2. **User Precedence by Default**: All conflicts default to keeping user changes
3. **Interactive UI**: Visual comparison of conflicting data
4. **Audit Trail**: All resolutions are logged with metadata
5. **90-day Retention**: Automatic cleanup of old log entries
6. **Export Capability**: CSV export for external analysis
7. **Real-time Updates**: Live conflict count and status indicators
8. **Non-blocking**: Users can continue working while conflicts exist

### Best Practices

#### 1. Always Use Cloud-Enabled Functions
```typescript
// ✅ Good - with cloud sync
await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);

// ❌ Avoid - local only
saveData(DataItemType.Contacts, contacts);
```

#### 2. Handle Async Operations
```typescript
// ✅ Good - proper async handling
const handleSave = async () => {
  setLoading(true);
  try {
    await addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact);
    showSuccess('Contact saved!');
  } catch (error) {
    showError('Failed to save contact');
  } finally {
    setLoading(false);
  }
};

// ❌ Avoid - not handling promises
const handleSave = () => {
  addOrUpdateItemWithCloudSync(DataItemType.Contacts, contact); // No await!
};
```

#### 3. Show Sync Status
```typescript
// ✅ Good - user knows what's happening
<div>
  <CloudSyncStatus showDetails={false} />
  <Button disabled={isSyncing}>Save</Button>
</div>

// ❌ Avoid - user doesn't know sync status
<Button>Save</Button>
```

#### 4. Include updatedAt Timestamps
```typescript
// ✅ Good - enables conflict resolution
const contact: Contact = {
  id: 'contact-123',
  name: 'John Doe',
  updatedAt: new Date().toISOString() // Important!
};

// ❌ Avoid - no timestamp for conflict resolution
const contact: Contact = {
  id: 'contact-123',
  name: 'John Doe'
  // Missing updatedAt
};
```

### Testing Cloud Database Integration

1. **Multi-User Testing**: Open app in multiple browsers/devices
2. **Offline Testing**: Disconnect internet, make changes, reconnect
3. **Conflict Testing**: Make simultaneous changes from different users
4. **Provider Testing**: Test with both Google Drive and OneDrive

### Troubleshooting Cloud Database

#### Common Issues

**"Not authenticated" errors:**
- Check if user is logged in to Google/Microsoft
- Verify tokens are not expired
- Re-authenticate if necessary

**Sync not working:**
- Check internet connection
- Verify cloud provider permissions
- Check browser console for errors

**Data not appearing:**
- Wait for sync to complete
- Manually trigger sync with `actions.syncNow()`
- Check if auto-sync is enabled

**Duplicate data:**
- This shouldn't happen with proper integration
- Check if using cloud-enabled functions
- Verify items have unique IDs

### Migration Guide

To migrate existing components:

1. **Identify Data Operations**: Find all `saveData`, `deleteItemById` calls
2. **Replace Functions**: Use cloud-enabled versions
3. **Add Error Handling**: Wrap in try-catch blocks
4. **Add Loading States**: Show progress during sync
5. **Add Status Indicators**: Use CloudSyncStatus components
6. **Test Thoroughly**: Verify multi-user functionality

### Demo Component

See `src/components/CloudDatabaseDemo.tsx` for a complete working example that demonstrates:

- Adding/editing/deleting contacts with cloud sync
- Real-time status monitoring
- Error handling
- Loading states
- Multi-user collaboration

This demo can be used as a reference for integrating cloud database functionality into your existing components.

---

## 📦 Deployment and Distribution

### Desktop Application Build

#### 1. Prepare Application Icons

Required icon formats:
- `assets/icon.svg` (source)
- `assets/icon.png` (512x512) - Linux
- `assets/icon.ico` (256x256) - Windows
- `assets/icon.icns` (512x512) - macOS

```bash
# Generate icons (optional tool)
npm install -g electron-icon-builder
electron-icon-builder --input=assets/icon.svg --output=assets/
```

#### 2. Build Process

```bash
# Install dependencies
npm install

# Build Next.js application
npm run electron:build

# Build installers
npm run build:installer          # Current platform
npm run build:installer:win      # Windows
npm run build:installer:mac      # macOS
npm run build:installer:linux    # Linux
npm run build:installer:all      # All platforms
```

#### 3. Distribution Packages

Built installers will be in the `dist/` directory:

**Windows**:
- `.exe` (NSIS installer)
- `.exe` (portable)

**macOS**:
- `.dmg` (disk image)
- `.zip` (archive)

**Linux**:
- `.AppImage` (universal)
- `.deb` (Debian/Ubuntu)
- `.rpm` (Red Hat/Fedora)

#### 4. Code Signing (Production)

**Windows**:
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "password"
    }
  }
}
```

**macOS**:
```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name"
    }
  }
}
```

### Web Application Deployment

#### 1. Static Export
```bash
# Build static export
npm run build
npm run export

# Deploy to static hosting
# Upload 'out' directory to your hosting provider
```

#### 2. Server Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 🧪 Testing and Quality Assurance

### Test Structure

```
src/
├── components/__tests__/
│   └── google-calendar-sync.test.tsx
├── hooks/__tests__/
├── services/__tests__/
cypress/
├── e2e/
│   ├── google-calendar.cy.ts
│   └── google-calendar-duplicate-prevention.cy.ts
└── support/
```

### Unit Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test google-calendar-sync.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Integration Testing

```bash
# Run Cypress tests headlessly
npm run cypress:run

# Open Cypress test runner
npm run cypress:open

# Run specific test file
npx cypress run --spec "cypress/e2e/google-calendar-duplicate-prevention.cy.ts"
```

### Manual Testing Procedures

#### Calendar Sync Testing

1. **Duplicate Prevention Test**
   - Create reminder with calendar sync enabled
   - Verify only one event appears in Google Calendar
   - Update reminder and verify event is updated (not duplicated)

2. **Error Handling Test**
   - Test with invalid/expired tokens
   - Test network connectivity issues
   - Verify graceful error handling

3. **Conflict Resolution Test**
   - Create conflicting events
   - Verify conflict detection
   - Test manual resolution workflow

#### Data Import/Export Testing

1. **File Format Support**
   - Test Excel files (.xlsx, .xls)
   - Test CSV files
   - Verify data parsing accuracy

2. **Cloud Backup Testing**
   - Test Google Drive backup
   - Test OneDrive backup
   - Verify data integrity

---

## 🔧 Troubleshooting and Debugging

### Common Issues and Solutions

#### 1. Server Startup Issues

**Problem**: Next.js server shows "Ready" but doesn't respond to requests

**Solution**:
1. Wait for full compilation (10+ minutes after "Ready")
2. Look for "Compiled successfully" message
3. Check for port conflicts
4. Clear node_modules and reinstall

#### 2. Electron Integration Issues

**Problem**: Electron app shuts down immediately

**Solutions**:
1. Ensure Next.js server is fully compiled
2. Check for conflicting package.json files
3. Remove temp directories
4. Verify Electron configuration

#### 3. OAuth Authentication Errors

**Google OAuth**:
- Verify redirect URI matches exactly
- Check API permissions
- Clear browser cache and localStorage
- Use only `prompt: 'consent'` parameter

**Microsoft OAuth**:
- Verify tenant ID and client ID
- Check redirect URI configuration
- Ensure proper API permissions
- Grant admin consent if required

#### 4. Build and Deployment Issues

**Icon Issues**:
- Ensure all required icon formats are present
- Verify icon dimensions and formats
- Check file paths in build configuration

**Code Signing**:
- Verify certificate validity
- Check certificate password
- Ensure proper identity configuration

### Debugging Procedures

#### 1. Development Environment

```bash
# Enable debug mode
DEBUG=* npm run dev

# Check server logs
npm run dev -- --verbose

# Verify environment variables
node -e "console.log(process.env)"
```

#### 2. Network and API Issues

```bash
# Test API endpoints
curl http://localhost:9002/api/auth/google/config

# Check network connectivity
ping google.com
ping graph.microsoft.com
```

#### 3. Database and Storage

```bash
# Check localStorage
# Open browser DevTools > Application > Local Storage

# Verify IndexedDB
# Open browser DevTools > Application > IndexedDB
```

---

## ⚙️ Advanced Configuration

### Performance Optimization

#### 1. Build Optimization

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

#### 2. Bundle Analysis

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

### Security Configuration

#### 1. Content Security Policy

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval';"
          }
        ]
      }
    ];
  }
};
```

#### 2. Environment Variable Security

- Never commit `.env.local` to version control
- Use different configurations for development/production
- Rotate secrets regularly
- Use secure storage for production secrets

### Monitoring and Analytics

#### 1. Error Tracking

```javascript
// Add error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
    // Send to error tracking service
  }
}
```

#### 2. Performance Monitoring

```javascript
// Add performance metrics
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
  });
}
```

---

## 📚 Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Google Calendar API](https://developers.google.com/calendar)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Firebase Documentation](https://firebase.google.com/docs)

### Development Tools
- [React Developer Tools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [Cypress Testing](https://www.cypress.io/)
- [Jest Testing Framework](https://jestjs.io/)

### Community
- [GitHub Issues](https://github.com/dambfack/FinCRuM/issues)
- [Discussions](https://github.com/dambfack/FinCRuM/discussions)

---

**Document Maintainer**: Development Team  
**Last Updated**: December 2024  
**Next Review**: Quarterly or as needed  
**Document Status**: 🟢 CURRENT AND COMPREHENSIVE

*This unified guide replaces all previous individual setup and implementation documents and serves as the single source of truth for FinCRuM setup and configuration.*