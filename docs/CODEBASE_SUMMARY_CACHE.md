# FinCRuM Codebase Summary Cache

**Project:** FinCRuM Financial Credit Risk Management Application  
**Type:** Electron Desktop Application with Next.js Frontend  
**Architecture:** Cloud-First with Local Storage  
**Generated:** December 2024  
**Purpose:** Comprehensive codebase reference for AI agents

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [Directory Structure](#directory-structure)
4. [Core Components Map](#core-components-map)
5. [Services Layer](#services-layer)
6. [Data Flow & Dependencies](#data-flow--dependencies)
7. [Key File Relationships](#key-file-relationships)
8. [Integration Points](#integration-points)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Configuration Files](#configuration-files)

---

## Project Overview

### Core Purpose
FinCRuM is a comprehensive Financial Credit Risk Management application built as a local desktop application using Electron with a Next.js frontend. It features cloud-first architecture with mandatory cloud synchronization for multi-user PIN authentication and data sharing across devices.

### Key Characteristics
- **Local-First Execution**: Runs as desktop app for optimal performance
- **Cloud-Enabled Data**: Mandatory cloud synchronization for data sharing
- **Multi-User Support**: Admin, partner, and employee accounts with role-based access
- **Cross-Platform**: Built with Electron for Windows, macOS, and Linux
- **Secure Authentication**: PIN-based authentication with cloud storage

### Technology Stack
- **Frontend**: Next.js 15.2.3 + React 18 + TypeScript
- **Desktop**: Electron framework
- **UI**: Tailwind CSS + Radix UI components
- **State**: React Context API + React Query
- **Database**: IndexedDB (local) + Cloud Database (primary)
- **Testing**: Jest + React Testing Library + Cypress
- **External APIs**: Google (Calendar, Drive) + Microsoft (Calendar, OneDrive)

---

## Architecture Summary

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    FinCRuM Desktop App                         │
├─────────────────────────────────────────────────────────────────┤
│  Desktop Application (Electron)                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Next.js Frontend                               │ │
│  │         (React + TypeScript + Tailwind)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Core Services Layer                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Cloud Auth  │  │ Data Sync   │  │  Calendar Integration   │ │
│  │  (PIN/Bio)  │  │ (Mandatory) │  │  (Google/Microsoft)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Cloud DB    │  │ IndexedDB   │  │   Cloud Storage         │ │
│  │ (Primary)   │  │ (Cache)     │  │ (Google Drive/OneDrive) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core System Layers
1. **Desktop Application Layer**: Electron + Next.js frontend
2. **Frontend Application Layer**: React components + TypeScript
3. **Core Services Layer**: Authentication, sync, integrations
4. **Data Management Layer**: Cloud-first with local caching
5. **External Integration Layer**: Google/Microsoft services

---

## Directory Structure

### `/src` - Main Source Code
```
src/
├── ai/                     # AI/ML Integration
├── app/                    # Next.js App Router (Pages)
│   ├── actions/           # Server Actions
│   ├── add-customer/      # Customer Management Pages
│   ├── api/               # API Routes
│   ├── auth/              # Authentication Pages
│   ├── customers/         # Customer Views
│   ├── data-grid/         # Data Grid Interface
│   ├── export-data/       # Data Export Features
│   ├── help/              # Help Documentation
│   ├── import/            # Data Import Features
│   ├── test-calendar/     # Calendar Testing
│   ├── test-env/          # Environment Testing
│   └── users/             # User Management
├── components/            # React Components
│   ├── ui/                # Reusable UI Components (shadcn/ui)
│   └── [business-logic]   # Business-specific components
├── contexts/              # React Contexts
├── data/                  # Static Data
├── hooks/                 # Custom React Hooks
├── lib/                   # Utility Libraries
├── services/              # Business Logic Services
└── types/                 # TypeScript Type Definitions
```

---

## Core Components Map

### Authentication & User Management
| Component | Purpose | Dependencies | Key Features |
|-----------|---------|--------------|-------------|
| `PinLoginScreen.tsx` | PIN-based authentication UI | AuthContext, auth service | Multi-user login, biometric support |
| `SetPinScreen.tsx` | PIN setup and configuration | auth service | PIN creation, validation |
| `AuthContext.tsx` | Authentication state management | auth service | Global auth state, session management |
| `UserManagementScreen.tsx` | User account management | user-management service | Admin/Partner/Employee roles |
| `DeviceManagementScreen.tsx` | Device registration | device-management service | Cross-device authorization |

### Data Management & Synchronization
| Component | Purpose | Dependencies | Key Features |
|-----------|---------|--------------|-------------|
| `Dashboard.tsx` | Main application dashboard | cloud-database, sync services | Metrics, overview, real-time updates |
| `SyncManager.tsx` | Data synchronization interface | sync-buffer, real-time-sync | Manual/auto sync, status indicators |
| `SyncBufferManager.tsx` | Sync buffer management | sync-buffer service | Conflict resolution, queue management |
| `ConflictResolutionDialog.tsx` | Manual conflict resolution | conflict-resolution-log | User-driven conflict resolution |
| `DataGrid.tsx` | Data table interface | cloud-database hook | Filtering, sorting, pagination |

### Customer & Business Logic
| Component | Purpose | Dependencies | Key Features |
|-----------|---------|--------------|-------------|
| `CustomerTable.tsx` | Customer data display | cloud-database hook | CRUD operations, search, export |
| `CustomerForm.tsx` | Customer creation/editing | React Hook Form, Zod | Validation, file attachments |
| `CustomerDetailModal.tsx` | Customer detail view | cloud-database hook | Full customer information |
| `AppointmentForm.tsx` | Appointment scheduling | calendar services | Google/Microsoft integration |
| `TaskList.tsx` | Task management | google-tasks service | Task CRUD, sync with Google Tasks |
| `ReminderList.tsx` | Reminder system | calendar services | Calendar integration |

### File & Cloud Integration
| Component | Purpose | Dependencies | Key Features |
|-----------|---------|--------------|-------------|
| `FileUpload.tsx` | File upload interface | enhanced-google-drive, enhanced-onedrive | Multi-cloud upload |
| `FileAttachmentManager.tsx` | File attachment management | cloud storage services | File versioning, sharing |
| `GoogleAuthManager.tsx` | Google service authentication | google-oauth service | OAuth flow, token management |
| `MicrosoftAuthManager.tsx` | Microsoft service authentication | microsoft-oauth service | OAuth flow, token management |

### UI & UX Components
| Component | Purpose | Dependencies | Key Features |
|-----------|---------|--------------|-------------|
| `ThemeProvider.tsx` | Theme management | Tailwind CSS | Dark/light mode, custom themes |
| `ThemeSwitcher.tsx` | Theme toggle interface | ThemeProvider | User theme selection |
| `NotificationBell.tsx` | Notification system | toast hook | Real-time notifications |
| `HelpGuide.tsx` | In-app help system | FAQ data | Interactive help, tutorials |
| `FirstTimeSetupWizard.tsx` | Initial setup flow | setup-manager service | Onboarding, configuration |

---

## Services Layer

### Core Services
| Service | Purpose | Dependencies | Key Functions |
|---------|---------|--------------|---------------|
| `shared-cloud-database.ts` | Primary cloud database service | Firebase/custom backend | CRUD operations, real-time sync |
| `auth.ts` | Authentication service | cloud database | PIN auth, session management |
| `sync-buffer.ts` | Data synchronization buffer | cloud database | Queue management, conflict detection |
| `real-time-sync.ts` | Real-time synchronization | cloud database, WebSocket | Live updates, optimistic updates |
| `conflict-resolution-log.ts` | Conflict tracking | cloud database | Conflict logging, resolution history |

### Integration Services
| Service | Purpose | Dependencies | Key Functions |
|---------|---------|--------------|---------------|
| `google-calendar.ts` | Google Calendar integration | google-calendar-client | Event CRUD, sync, duplicate prevention |
| `microsoft-calendar.ts` | Microsoft Calendar integration | microsoft-calendar-client | Event CRUD, sync |
| `google-drive.ts` | Google Drive integration | Google Drive API | File upload, sync, sharing |
| `onedrive.ts` | OneDrive integration | Microsoft Graph API | File upload, sync, sharing |
| `google-tasks.ts` | Google Tasks integration | Google Tasks API | Task CRUD, sync |

### Utility Services
| Service | Purpose | Dependencies | Key Functions |
|---------|---------|--------------|---------------|
| `user-management.ts` | Multi-user account management | auth service | Role management, permissions |
| `device-management.ts` | Device registration | cloud database | Device auth, cross-device sync |
| `backup-versioning.ts` | Data backup and versioning | cloud storage | Automated backups, version control |
| `security-compliance.ts` | Security and compliance | encryption libraries | Data encryption, audit logging |
| `rate-limiter.ts` | API rate limiting | - | Request throttling, quota management |

---

## Data Flow & Dependencies

### Authentication Flow
```
PinLoginScreen → AuthContext → auth.ts → shared-cloud-database.ts
                     ↓
              Global App State
                     ↓
            Protected Components
```

### Data Synchronization Flow
```
User Action → Component → Hook (use-cloud-database) → shared-cloud-database.ts
                                        ↓
                              sync-buffer.ts → real-time-sync.ts
                                        ↓
                              Cloud Database/Storage
```

### Calendar Integration Flow
```
AppointmentForm → google-calendar.ts → google-calendar-client.ts → Google Calendar API
                       ↓
              google-calendar-mapper.ts → shared-cloud-database.ts
```

### File Management Flow
```
FileUpload → enhanced-google-drive.ts → Google Drive API
                    ↓
           FileAttachmentManager → shared-cloud-database.ts
```

---

## Key File Relationships

### Core Dependencies
1. **shared-cloud-database.ts** - Central dependency for all data operations
2. **AuthContext.tsx** - Global authentication state provider
3. **use-cloud-database.tsx** - Primary data access hook
4. **types.ts** - Shared TypeScript definitions

### Component Hierarchies
```
App Layout (layout.tsx)
├── AuthContext Provider
├── ThemeProvider
├── Dashboard (main page)
│   ├── CustomerTable
│   ├── AppointmentList
│   ├── TaskList
│   └── SyncManager
└── Modal Components
    ├── CustomerDetailModal
    ├── ConflictResolutionDialog
    └── ProfilePictureModal
```

### Service Dependencies
```
Components → Hooks → Services → External APIs
    ↓         ↓        ↓           ↓
  UI Logic  State   Business   Third-party
           Management Logic    Integration
```

---

## Integration Points

### Google Services Integration
- **Authentication**: `google-oauth.ts` → OAuth 2.0 flow
- **Calendar**: `google-calendar.ts` → Calendar API v3
- **Drive**: `google-drive.ts` → Drive API v3
- **Tasks**: `google-tasks.ts` → Tasks API v1

### Microsoft Services Integration
- **Authentication**: `microsoft-oauth.ts` → Azure AD OAuth
- **Calendar**: `microsoft-calendar.ts` → Graph API
- **OneDrive**: `onedrive.ts` → Graph API

### Cloud Database Integration
- **Primary**: `shared-cloud-database.ts` → Firebase/Custom backend
- **Backup**: `backup-versioning.ts` → Cloud storage
- **Sync**: `real-time-sync.ts` → WebSocket/Server-Sent Events

---

## Testing Infrastructure

### Test Files Location
```
src/
├── components/__tests__/
│   └── google-calendar-sync.test.tsx
├── hooks/__tests__/
│   └── use-data-sync.test.tsx
├── services/__tests__/
│   ├── google-calendar.test.ts
│   ├── google-calendar.extended.test.ts
│   └── google-calendar.test.ts.new
cypress/
├── e2e/
│   ├── google-calendar.cy.ts
│   └── google-calendar-duplicate-prevention.cy.ts
```

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: Jest for service layer
- **E2E Tests**: Cypress for full user workflows
- **API Tests**: Mock implementations for external services

---

## Configuration Files

### Root Level Configuration
| File | Purpose | Key Settings |
|------|---------|-------------|
| `package.json` | Dependencies and scripts | Next.js, Electron, testing frameworks |
| `next.config.js` | Next.js configuration | Static export, environment variables |
| `tailwind.config.ts` | Tailwind CSS configuration | Custom theme, colors, fonts |
| `tsconfig.json` | TypeScript configuration | Strict mode, path mapping |
| `electron.js` | Electron main process | Window management, IPC |
| `.env.example` | Environment variables template | API keys, endpoints |

### Development Configuration
| File | Purpose | Key Settings |
|------|---------|-------------|
| `jest.config.js` | Jest testing configuration | Test environment, coverage |
| `cypress.config.ts` | Cypress E2E configuration | Test specs, browser settings |
| `.eslintrc.json` | ESLint configuration | Code quality rules |
| `components.json` | shadcn/ui configuration | UI component settings |

---

## Key Architectural Patterns

### 1. Cloud-First Data Architecture
- All data operations go through `shared-cloud-database.ts`
- Local IndexedDB serves as cache only
- Mandatory cloud synchronization for multi-user scenarios

### 2. Service Layer Pattern
- Business logic separated into service files
- Components interact with services through custom hooks
- Clear separation of concerns

### 3. Context-Based State Management
- Authentication state managed globally via AuthContext
- Theme and UI state managed via providers
- Local component state for UI-specific data

### 4. Integration Abstraction
- External APIs wrapped in service layers
- Consistent interfaces for Google/Microsoft services
- Error handling and rate limiting built-in

### 5. Component Composition
- Reusable UI components in `/ui` directory
- Business logic components compose UI components
- Clear props interfaces and TypeScript typing

---

**Note**: This cache document serves as a comprehensive reference for understanding the FinCRuM codebase structure, relationships, and architecture without needing to examine individual files. It should be updated when significant architectural changes are made to the project.

**Last Updated**: December 2024  
**Version**: 1.0.0