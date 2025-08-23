# FinCRuM Project Mind Map & File Relationships

## Current Session Focus: Electron OAuth Authentication Implementation

### 🎯 Core OAuth Implementation Files

```
Electron OAuth Flow
├── 🔧 src/utils/electron.ts
│   ├── isElectron() → Detects Electron environment
│   ├── isElectronIPCAvailable() → Checks IPC availability
│   ├── getElectronAPI() → Returns typed IPC interface
│   └── ElectronAPI interface → Type definitions for IPC methods
│
├── 🌉 preload.js
│   ├── electronAPI.openOAuthUrl() → Opens OAuth URL in system browser
│   ├── electronAPI.onOAuthCallback() → Listens for OAuth success
│   ├── electronAPI.onOAuthError() → Listens for OAuth errors
│   └── electronAPI.removeOAuthListener() → Cleanup listeners
│
├── ⚡ electron.js
│   ├── oauth:open-url handler → Starts callback server + opens browser
│   ├── createOAuthCallbackServer() → HTTP server on port 9003
│   ├── stopOAuthCallbackServer() → Cleanup server
│   └── shell.openExternal() → Opens system browser
│
├── 🔗 src/hooks/useGoogleSync.tsx
│   ├── connect() → Environment-aware OAuth initiation
│   ├── Electron flow → Uses IPC for OAuth
│   ├── Web flow → Uses window.open() fallback
│   └── exchangeCodeForTokensAction() → Processes OAuth code
│
├── 🔐 src/services/google-oauth.ts
│   ├── getRedirectUri() → Dynamic URI selection
│   ├── getOAuth2Client() → Uses dynamic redirect URI
│   └── generateGoogleAuthUrl() → Creates OAuth URL
│
└── 🌍 .env.local
    ├── NEXT_PUBLIC_GOOGLE_REDIRECT_URI → Web redirect
    └── NEXT_PUBLIC_GOOGLE_REDIRECT_URI_ELECTRON → Electron redirect
```

---

## 📊 File Relationship Matrix

### OAuth Implementation Dependencies

| File | Depends On | Provides To | Key Functions |
|------|------------|-------------|---------------|
| `electron.ts` | - | `useGoogleSync.tsx` | Environment detection, IPC types |
| `preload.js` | `electron.js` | Renderer process | Secure IPC bridge |
| `electron.js` | `preload.js` | Main process | OAuth server, IPC handlers |
| `useGoogleSync.tsx` | `electron.ts`, `google-oauth.ts` | Components | OAuth flow orchestration |
| `google-oauth.ts` | `.env.local` | `useGoogleSync.tsx` | OAuth client configuration |
| `.env.local` | - | `google-oauth.ts` | Environment variables |

---

## 🔄 OAuth Flow Sequence Diagram

```
User Clicks "Connect Google"
         ↓
    useGoogleSync.connect()
         ↓
    isElectron() check
         ↓
┌─────────────────┐    ┌─────────────────┐
│   Electron      │    │   Web Browser   │
│                 │    │                 │
│ 1. Start server │    │ 1. window.open()│
│ 2. Open browser │    │ 2. Direct flow  │
│ 3. IPC callback │    │ 3. Popup return │
│ 4. Process code │    │ 4. Process code │
└─────────────────┘    └─────────────────┘
         ↓                       ↓
    exchangeCodeForTokensAction()
         ↓
    Authentication Complete
```

---

## 🏗️ Application Architecture Overview

### Core Application Structure

```
FinCRuM Application
├── 🖥️ Desktop (Electron)
│   ├── electron.js → Main process
│   ├── preload.js → Security bridge
│   └── Renderer → Next.js app
│
├── 🌐 Web Application
│   ├── Next.js 14 → App router
│   ├── React components → UI layer
│   └── API routes → Backend logic
│
├── 📱 Mobile (React Native)
│   ├── fincrm-android/ → Android app
│   ├── Shared components → Cross-platform UI
│   └── Platform-specific → Native integrations
│
└── 🔄 Shared Services
    ├── Google APIs → Calendar, Drive, Auth
    ├── Microsoft Graph → Office 365
    └── Local storage → IndexedDB, sync queues
```

---

## 📁 Directory Structure & Relationships

### Source Code Organization

```
src/
├── 📱 app/
│   ├── (dashboard)/ → Main application routes
│   ├── auth/ → Authentication pages
│   ├── api/ → Backend API routes
│   └── globals.css → Global styles
│
├── 🧩 components/
│   ├── ui/ → shadcn/ui components
│   ├── common/ → Reusable components
│   ├── forms/ → Form components
│   └── charts/ → Data visualization
│
├── 🪝 hooks/
│   ├── useGoogleSync.tsx → Google services integration
│   ├── useMicrosoftSync.tsx → Microsoft services
│   ├── useDataSync.tsx → Main sync orchestrator
│   └── useConflictResolution.tsx → Data conflicts
│
├── 📚 lib/
│   ├── types.ts → TypeScript definitions
│   ├── utils.ts → Utility functions
│   ├── validations.ts → Form validations
│   └── constants.ts → Application constants
│
├── 🔧 services/
│   ├── google-oauth.ts → Google authentication
│   ├── google-drive.ts → Drive operations
│   ├── google-calendar.ts → Calendar operations
│   └── microsoft-graph.ts → Microsoft services
│
└── 🛠️ utils/
    ├── electron.ts → Electron environment detection
    ├── sync-buffer.ts → Data synchronization
    └── conflict-resolution.ts → Merge strategies
```

---

## 🔗 Integration Points

### External Service Integrations

```
Google Services
├── 🔐 OAuth 2.0
│   ├── google-oauth.ts → Client configuration
│   ├── useGoogleSync.tsx → Flow orchestration
│   └── electron.ts → Environment detection
│
├── 📅 Google Calendar
│   ├── google-calendar.ts → API operations
│   ├── Calendar components → UI integration
│   └── Sync hooks → Data synchronization
│
├── 💾 Google Drive
│   ├── google-drive.ts → File operations
│   ├── File upload components → UI integration
│   └── Backup services → Data persistence
│
└── ✅ Google Tasks
    ├── google-tasks.ts → Task operations
    ├── Task components → UI integration
    └── Task sync → Data synchronization
```

### Microsoft Services (Planned)

```
Microsoft Graph
├── 🔐 OAuth 2.0
│   ├── microsoft-oauth.ts → Client configuration
│   └── useMicrosoftSync.tsx → Flow orchestration
│
├── 📅 Outlook Calendar
│   ├── microsoft-calendar.ts → API operations
│   └── Calendar sync → Data synchronization
│
├── 💾 OneDrive
│   ├── microsoft-drive.ts → File operations
│   └── File sync → Data persistence
│
└── ✅ Microsoft Tasks
    ├── microsoft-tasks.ts → Task operations
    └── Task sync → Data synchronization
```

---

## 🎨 UI Component Relationships

### Component Hierarchy

```
App Layout
├── 🏠 Dashboard
│   ├── StatsCards → Quick metrics
│   ├── RecentActivity → Activity feed
│   ├── UpcomingTasks → Task preview
│   └── CalendarWidget → Calendar preview
│
├── 👥 Customers
│   ├── CustomerList → Data table
│   ├── CustomerForm → CRUD operations
│   ├── CustomerProfile → Detail view
│   └── CustomerSearch → Filtering
│
├── ✅ Tasks
│   ├── TaskList → Data table
│   ├── TaskForm → CRUD operations
│   ├── TaskBoard → Kanban view
│   └── TaskCalendar → Calendar integration
│
├── 📅 Calendar
│   ├── CalendarView → Main calendar
│   ├── EventForm → CRUD operations
│   ├── EventList → List view
│   └── SyncStatus → Integration status
│
└── ⚙️ Settings
    ├── UserProfile → User management
    ├── Integrations → Service connections
    ├── SyncSettings → Sync configuration
    └── AppSettings → Application preferences
```

---

## 🔄 Data Flow Architecture

### Synchronization Flow

```
Local Data (IndexedDB)
         ↕️
    Sync Buffer
         ↕️
┌─────────────────┐    ┌─────────────────┐
│  Google APIs    │    │ Microsoft Graph │
│                 │    │                 │
│ • Calendar      │    │ • Calendar      │
│ • Drive         │    │ • OneDrive      │
│ • Tasks         │    │ • Tasks         │
│ • Contacts      │    │ • Contacts      │
└─────────────────┘    └─────────────────┘
         ↕️                       ↕️
    Conflict Resolution
         ↕️
    User Interface
```

### State Management

```
Zustand Stores
├── 👤 User Store
│   ├── Authentication state
│   ├── User preferences
│   └── Session management
│
├── 📊 Data Store
│   ├── Customers data
│   ├── Tasks data
│   ├── Calendar events
│   └── Local cache
│
├── 🔄 Sync Store
│   ├── Sync status
│   ├── Conflict queue
│   ├── Error handling
│   └── Progress tracking
│
└── 🎨 UI Store
    ├── Theme settings
    ├── Layout preferences
    ├── Modal states
    └── Loading states
```

---

## 🧪 Testing Architecture

### Test File Relationships

```
Testing Strategy
├── 🔬 Unit Tests
│   ├── components/__tests__/ → Component testing
│   ├── hooks/__tests__/ → Hook testing
│   ├── services/__tests__/ → Service testing
│   └── utils/__tests__/ → Utility testing
│
├── 🔗 Integration Tests
│   ├── api/__tests__/ → API endpoint testing
│   ├── sync/__tests__/ → Sync operation testing
│   └── auth/__tests__/ → Authentication testing
│
├── 🎭 E2E Tests (Cypress)
│   ├── google-calendar.cy.ts → Calendar integration
│   ├── google-calendar-duplicate-prevention.cy.ts → Duplicate handling
│   ├── customer-management.cy.ts → Customer workflows
│   └── task-management.cy.ts → Task workflows
│
└── 📱 Mobile Tests
    ├── __tests__/ → React Native tests
    ├── e2e/ → Mobile E2E tests
    └── integration/ → Cross-platform tests
```

---

## 🚀 Build & Deployment

### Build Pipeline

```
Development
├── 🌐 Web Development
│   ├── npm run dev → Next.js dev server
│   ├── Hot reload → Live updates
│   └── DevTools → Debugging
│
├── 🖥️ Electron Development
│   ├── npm run electron:dev → Electron dev mode
│   ├── Main process debugging → Node.js debugging
│   └── Renderer debugging → Chrome DevTools
│
└── 📱 Mobile Development
    ├── React Native CLI → Mobile development
    ├── Metro bundler → JavaScript bundling
    └── Platform simulators → Testing
```

### Production Build

```
Production
├── 🌐 Web Build
│   ├── npm run build → Next.js production build
│   ├── Static optimization → Performance
│   └── Deployment → Vercel/Netlify
│
├── 🖥️ Desktop Build
│   ├── npm run electron:build → Electron packaging
│   ├── Platform installers → Windows/Mac/Linux
│   └── Code signing → Security
│
└── 📱 Mobile Build
    ├── Android build → APK/AAB
    ├── iOS build → IPA
    └── Store deployment → App stores
```

---

## 🔧 Development Tools & Configuration

### Configuration Files

```
Project Configuration
├── 📦 Package Management
│   ├── package.json → Dependencies & scripts
│   ├── package-lock.json → Dependency lock
│   └── .npmrc → npm configuration
│
├── 🔧 Build Configuration
│   ├── next.config.js → Next.js configuration
│   ├── electron-builder.json → Electron packaging
│   ├── tailwind.config.js → Tailwind CSS
│   └── tsconfig.json → TypeScript configuration
│
├── 🧪 Testing Configuration
│   ├── jest.config.js → Jest testing
│   ├── cypress.config.ts → Cypress E2E
│   └── .eslintrc.json → Code linting
│
└── 🌍 Environment Configuration
    ├── .env.local → Local environment
    ├── .env.example → Environment template
    └── .gitignore → Git exclusions
```

---

## 📈 Performance Monitoring

### Optimization Points

```
Performance Optimization
├── 📊 Bundle Analysis
│   ├── webpack-bundle-analyzer → Bundle size
│   ├── Code splitting → Lazy loading
│   └── Tree shaking → Dead code elimination
│
├── 🚀 Runtime Performance
│   ├── React.memo → Component memoization
│   ├── useMemo/useCallback → Hook optimization
│   ├── Virtual scrolling → Large lists
│   └── Image optimization → Next.js Image
│
├── 💾 Memory Management
│   ├── useEffect cleanup → Memory leaks
│   ├── Event listener cleanup → Resource management
│   ├── Cache management → Data persistence
│   └── Garbage collection → Memory optimization
│
└── 🌐 Network Optimization
    ├── API caching → Response caching
    ├── Request batching → Reduced requests
    ├── Offline support → Service workers
    └── Sync optimization → Efficient updates
```

---

## 🔒 Security Architecture

### Security Layers

```
Security Implementation
├── 🔐 Authentication
│   ├── OAuth 2.0 → Secure authentication
│   ├── Token management → Secure storage
│   ├── Session handling → Secure sessions
│   └── Multi-factor auth → Enhanced security
│
├── 🛡️ Data Protection
│   ├── Encryption at rest → Local data
│   ├── Encryption in transit → API calls
│   ├── Input validation → XSS prevention
│   └── CSRF protection → Request validation
│
├── 🔒 Electron Security
│   ├── Context isolation → Process separation
│   ├── Preload scripts → Secure IPC
│   ├── Content Security Policy → XSS protection
│   └── Node integration disabled → Renderer security
│
└── 🌐 API Security
    ├── Rate limiting → DDoS protection
    ├── Input sanitization → Injection prevention
    ├── HTTPS enforcement → Secure transport
    └── API key management → Credential security
```

---

## 📚 Documentation Structure

### Documentation Files

```
Project Documentation
├── 📋 Project Management
│   ├── MEMORY_BANK.md → Progress tracking
│   ├── PROJECT_MINDMAP_AND_RELATIONSHIPS.md → This file
│   └── BUGS_AND_FIXES_REPORT.md → Issue tracking
│
├── 🔧 Technical Documentation
│   ├── README.md → Project overview
│   ├── CONTRIBUTING.md → Development guidelines
│   ├── API.md → API documentation
│   └── DEPLOYMENT.md → Deployment guide
│
├── 🏗️ Architecture Documentation
│   ├── ARCHITECTURE.md → System architecture
│   ├── DATABASE_SCHEMA.md → Data models
│   ├── INTEGRATION_GUIDE.md → External services
│   └── SECURITY.md → Security guidelines
│
└── 👥 User Documentation
    ├── USER_GUIDE.md → User manual
    ├── INSTALLATION.md → Setup instructions
    ├── TROUBLESHOOTING.md → Common issues
    └── FAQ.md → Frequently asked questions
```

---

## 🎯 Current Session Summary

### OAuth Implementation Achievement

**Files Modified/Created:**
- ✅ `src/utils/electron.ts` → Environment detection utilities
- ✅ `preload.js` → Secure IPC bridge for OAuth
- ✅ `electron.js` → OAuth server and IPC handlers
- ✅ `src/hooks/useGoogleSync.tsx` → Electron-aware OAuth flow
- ✅ `src/services/google-oauth.ts` → Dynamic redirect URI
- ✅ `.env.local` → Electron redirect URI configuration

**Key Relationships Established:**
1. **Environment Detection** → `electron.ts` provides detection to `useGoogleSync.tsx`
2. **IPC Communication** → `preload.js` bridges `electron.js` and renderer
3. **OAuth Flow** → `useGoogleSync.tsx` orchestrates environment-specific flows
4. **Configuration** → `google-oauth.ts` uses dynamic environment variables
5. **Security** → Context isolation and secure IPC implementation

**Next Steps:**
1. Test complete OAuth flow in Electron environment
2. Verify web browser fallback functionality
3. Add comprehensive error handling and logging
4. Create automated tests for OAuth flows
5. Update documentation with OAuth implementation details

---

*This mind map serves as a living document that evolves with the project architecture and helps developers understand the relationships between different parts of the FinCRuM application.*

*Last Updated: Current Session - Electron OAuth Implementation*