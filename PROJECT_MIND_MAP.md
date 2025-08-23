# FinCRuM Project Mind Map

## File Relationships and Function Dependencies

### 🔗 Google Authentication & Sync System

```
📁 Google Sync Architecture
├── 🔧 useGoogleSync.tsx (Core Google Hook)
│   ├── 🔑 getGoogleTokensFromStorage()
│   ├── 🔗 checkConnection()
│   ├── 📤 uploadData()
│   ├── 📥 downloadData()
│   ├── 📅 syncCalendarEvent()
│   └── 🔄 refreshTokens()
│
├── 🔧 use-data-sync.tsx (Main Sync Orchestrator)
│   ├── 📊 useGoogleSync() → isGoogleConnected, isGoogleDriveConnected
│   ├── 📊 useMicrosoftSync() → isMicrosoftConnected, isOneDriveConnected
│   ├── 🔄 performSync()
│   ├── 🚀 performQuickSync()
│   ├── 📅 syncCalendarOnly()
│   └── 🔐 initiateAuthentication()
│
├── 🎨 Dashboard.tsx (UI Consumer)
│   ├── 📊 useDataSync() → { isGoogleDriveConnected }
│   ├── 🔗 isGoogleCalendarLinked = isGoogleDriveConnected
│   ├── 🎯 handleGoogleCalendarAuth()
│   └── 🔄 Sync Status Display
│
├── 🎨 SyncManager.tsx (Sync UI)
│   ├── 📊 useDataSync() → { isGoogleDriveConnected, isOneDriveConnected }
│   ├── 🔍 isAnyProviderConfigured()
│   └── 🎛️ Sync Controls
│
└── 🎨 GoogleAuthManager.tsx (Auth UI)
    ├── 🔍 loadGoogleServices()
    ├── 🔐 handleRevokeService()
    └── 🔐 handleRevokeAll()
```

### 🔗 Data Flow Connections

```
📊 Data Sync Flow
├── 🎯 User Action (Dashboard/SyncManager)
│   ↓
├── 🔧 useDataSync Hook
│   ├── → useGoogleSync (Google operations)
│   ├── → useMicrosoftSync (Microsoft operations)
│   ├── → useConflictResolution (Conflict handling)
│   └── → useNetworkStatus (Network monitoring)
│   ↓
├── 🔄 Sync Operations
│   ├── → Google Drive Actions
│   ├── → Google Calendar Actions
│   ├── → Microsoft Graph Actions
│   └── → Local Storage Operations
│   ↓
└── 🎨 UI State Updates
    ├── → Connection Status
    ├── → Sync Progress
    ├── → Error Messages
    └── → Success Notifications
```

### 🔗 Component Dependencies

```
📱 Component Hierarchy
├── 🏠 App
│   ├── 🎨 Dashboard
│   │   ├── 🔧 useDataSync
│   │   ├── 🔧 useAuth
│   │   ├── 🔧 useToast
│   │   └── 📊 Data Display Components
│   │
│   ├── 🎨 SyncManager
│   │   ├── 🔧 useDataSync
│   │   ├── 🔧 useToast
│   │   └── 🎛️ Sync Controls
│   │
│   ├── 🎨 GoogleAuthManager
│   │   ├── 🔧 useGoogleSync
│   │   ├── 🔧 useToast
│   │   └── 🔐 Auth Controls
│   │
│   ├── 📝 Forms (ReminderForm, TaskForm, AppointmentForm)
│   │   ├── 🔧 useDataSync
│   │   └── 📊 Form Components
│   │
│   └── 📋 Lists (ReminderList, TaskList, AppointmentList)
│       ├── 🔧 useDataSync
│       └── 📊 List Components
```

### 🔗 Hook Relationships

```
🔧 Custom Hooks Network
├── 🎯 useDataSync (Main Orchestrator)
│   ├── → useGoogleSync
│   ├── → useMicrosoftSync
│   ├── → useConflictResolution
│   └── → useNetworkStatus
│
├── 🔑 useGoogleSync (Google Operations)
│   ├── → useToast
│   └── → Google Actions
│
├── 🔑 useMicrosoftSync (Microsoft Operations)
│   ├── → useToast
│   └── → Microsoft Actions
│
├── ⚔️ useConflictResolution (Conflict Handling)
│   └── → Conflict Resolution Logic
│
├── 🌐 useNetworkStatus (Network Monitoring)
│   └── → Network Quality Checks
│
└── 🔐 useAuth (Authentication Context)
    └── → User Authentication State
```

### 🔗 Recent Bug Fixes & Relationships

```
🐛 Bug Fix History
├── 🔧 Google Sign-In Bug (Fixed)
│   ├── 📁 useGoogleSync.tsx
│   │   ├── ✅ Fixed function arguments
│   │   ├── ✅ Fixed token validation
│   │   └── ✅ Fixed useEffect dependency loop
│   └── 📊 Impact: Multiple components using useDataSync
│
└── 🔧 Google Drive Sync Connection Bug (Fixed)
    ├── 📁 use-data-sync.tsx
    │   ├── ✅ Added isGoogleDriveConnected property
    │   └── ✅ Updated TypeScript interface
    ├── 📁 Dashboard.tsx
    │   └── ✅ Now receives correct isGoogleDriveConnected value
    └── 📊 Impact: Fixed persistent "Link Google Services" button
```

### 🔗 Key Integration Points

```
🔗 Critical Integration Points
├── 🔑 Token Management
│   ├── 📁 services/auth.ts (Centralized token functions)
│   ├── 🔧 useGoogleSync (Token usage)
│   └── 🔧 useMicrosoftSync (Token usage)
│
├── 📊 State Management
│   ├── 🔧 useDataSync (Central state)
│   ├── 🎨 Dashboard (State consumer)
│   ├── 🎨 SyncManager (State consumer)
│   └── 📝 Forms (State consumer)
│
├── 🔄 Sync Operations
│   ├── 📁 app/actions/ (Server actions)
│   ├── 🔧 useGoogleSync (Action caller)
│   └── 🔧 useMicrosoftSync (Action caller)
│
└── 🎨 UI Components
    ├── 📁 components/ui/ (Base components)
    ├── 🎨 Feature components (Business logic)
    └── 🔧 Custom hooks (State & logic)
```

---

## 📝 Notes for Future Development

### 🎯 Quick Reference
- **Main Sync Hook**: `use-data-sync.tsx` - Central orchestrator for all sync operations
- **Google Integration**: `useGoogleSync.tsx` - Handles Google Drive & Calendar
- **Microsoft Integration**: `useMicrosoftSync.tsx` - Handles OneDrive & Outlook
- **UI Entry Points**: `Dashboard.tsx`, `SyncManager.tsx` - Main user interfaces
- **Token Management**: `services/auth.ts` - Centralized authentication utilities

### 🔍 Debugging Tips
- Check `useDataSync` return values for connection states
- Verify token presence in localStorage for auth issues
- Monitor network status for sync failures
- Check conflict resolution for data inconsistencies

### 🚀 Performance Considerations
- `useDataSync` is used by multiple components - optimize carefully
- Token checks happen frequently - consider caching
- Sync operations can be heavy - implement proper loading states
- Network status monitoring runs continuously - optimize polling

---

*Last Updated: January 18, 2025*
*This mind map helps track relationships between files and functions for better context and debugging.*