# 📋 FinCRuM - Unified Technical Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Core Features](#core-features)
4. [Technology Stack](#technology-stack)
5. [System Architecture](#system-architecture)
6. [Project Structure](#project-structure)
7. [Key Components](#key-components)
8. [Development Infrastructure](#development-infrastructure)
9. [Cloud-First Implementation](#cloud-first-implementation)
10. [Style Guidelines](#style-guidelines)
11. [Configuration Files](#configuration-files)
12. [Recent Updates](#recent-updates)

---

## Executive Summary

FinCRuM is a comprehensive Financial Credit Risk Management application built as a local desktop application using Electron. The application features cloud-first architecture with mandatory cloud synchronization for multi-user PIN authentication and data sharing across devices. It provides tools for managing financial data, customer relationships, and risk assessment in a secure and efficient manner.

## Project Overview

FinCRuM is a Customer Relationship Management (CRM) system that combines the power of desktop applications with cloud-based synchronization. The application is designed to run locally while maintaining seamless data synchronization across multiple devices and users.

### Key Characteristics
- **Local-First**: Runs as a desktop application for optimal performance
- **Cloud-Enabled**: Mandatory cloud synchronization for data sharing
- **Multi-User**: Support for admin, partner, and employee accounts
- **Cross-Platform**: Built with Electron for Windows, macOS, and Linux
- **Secure**: PIN-based authentication with role-based access control

## Core Features

### Data Management
- **Data Import**: Enable users to upload Excel files (.xlsx, .xls) and CSV files, parsing the data into a usable format for the application
- **Data Grid View**: Display the imported data in a tabular format with advanced filtering and sorting
- **Dashboard**: Display a dashboard with summary statistics and key metrics
- **Export Capabilities**: Export data to various formats (CSV, Excel, PDF)

### Synchronization & Backup
- **Local Data Backup**: Run locally, and back up data into OneDrive and Google Drive personal accounts
- **Daily Data Sync**: Sync data every day automatically
- **Manual Conflict Resolution**: Manual prompt for conflict resolution during data sync
- **Real-time Sync**: Real-time change notifications and optimistic updates

### User Management
- **Multi-User Authentication**: Cloud-stored PIN management with role-based access
- **Account Types**: Admin/Partner/Employee with different permission levels
- **Device Management**: Device registration and authorization workflow
- **Cross-Device Access**: Account synchronization across multiple devices

### Integration Capabilities
- **Calendar Integration**: Google Calendar and Microsoft Calendar support
- **Cloud Storage**: Google Drive and OneDrive integration
- **File Management**: Comprehensive file upload and attachment system
- **Third-Party APIs**: Extensible API integration framework

## Technology Stack

### Frontend Technologies
- **Framework**: Next.js 15.2.3 with TypeScript
- **UI Library**: React 18 with modern hooks
- **UI Components**: Radix UI Primitives with custom styling
- **State Management**: React Context API, React Query
- **Styling**: Tailwind CSS with custom theming
- **Charts**: ApexCharts and Recharts for data visualization
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Custom auth with PIN-based login

### Backend & Desktop
- **Desktop Framework**: Electron for cross-platform desktop apps
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Authentication**: Custom JWT-based authentication
- **Data Storage**: IndexedDB with WebSQL fallback
- **Data Sync**: Custom synchronization service

### Development Tools
- **Package Manager**: npm
- **Bundler**: Turbopack (via Next.js)
- **Linting**: ESLint with TypeScript support
- **Type Checking**: TypeScript with strict mode
- **Testing Framework**: Jest with React Testing Library
- **E2E Testing**: Cypress for end-to-end testing
- **CI/CD**: GitHub Actions pipeline

### External Integrations
- **Google APIs**: Calendar, Drive, OAuth
- **Microsoft Graph**: Calendar, OneDrive, OAuth
- **Cloud Storage**: Google Drive and OneDrive
- **Authentication**: OAuth 2.0 providers

## System Architecture

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
│  │ Local Auth  │  │ Data Sync   │  │  Calendar Integration   │ │
│  │  (PIN/Bio)  │  │ (Optional)  │  │  (Google/Microsoft)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ IndexedDB   │  │ File System │  │   Cloud Backup          │ │
│  │ (Primary)   │  │ (Exports)   │  │ (Google Drive/OneDrive) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Optional Services                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Local AI    │  │ File Export │  │  External APIs          │ │
│  │ (Optional)  │  │ (CSV/Excel) │  │ (Calendar Services)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core System Components

1. **Desktop Application Layer**
   - Electron-based desktop app with Next.js frontend
   - Cross-platform compatibility (Windows, macOS, Linux)
   - Native OS integration and file system access

2. **Frontend Application Layer**
   - Next.js with App Router for modern routing
   - React components with TypeScript
   - Responsive design with Tailwind CSS
   - Real-time UI updates and notifications

3. **Core Services Layer**
   - Authentication System (PIN-based, multi-user)
   - Cloud Database Services (shared-cloud-database)
   - Calendar Integration Services
   - File Management Services
   - AI Integration Services

4. **Data Management Layer**
   - Local Data Storage (IndexedDB primary)
   - Cloud Data Synchronization
   - Conflict Resolution System
   - Data Import/Export capabilities

5. **External Integration Layer**
   - Google Workspace (Calendar, Drive)
   - Microsoft 365 (Calendar, OneDrive)
   - OAuth Authentication Providers
   - Third-party API integrations

## Project Structure

```
FinCRuM/
├── backend/                 # Python backend services
│   ├── app.py              # Main FastAPI/Flask application
│   └── requirements.txt     # Python dependencies
│
├── docs/                   # Documentation
│   ├── CODEBASE_REPORT.md   # Codebase documentation
│   ├── blueprint.md         # Project blueprint/design
│   └── reports/            # Detailed reports
│       ├── UNIFIED_TECHNICAL_DOCUMENTATION.md
│       ├── UNIFIED_SETUP_AND_IMPLEMENTATION_GUIDE.md
│       └── UNIFIED_BUGS_AND_FIXES_REPORT.md
│
├── public/                 # Static assets
│   ├── favicon.ico         # Application favicon
│   └── fonts/              # Custom fonts
│
├── scripts/               # Build and utility scripts
│
├── src/                   # Main source code
│   ├── ai/                  # AI/ML related code
│   │   ├── ai-instance.ts     # AI service instance
│   │   └── dev.ts             # Development utilities
│   │
│   ├── app/                 # Next.js App Router pages
│   │   ├── actions/           # Server actions
│   │   ├── add-customer/      # Customer addition form
│   │   ├── auth/              # Authentication pages
│   │   ├── customers/         # Customer management
│   │   ├── data-grid/         # Data grid view
│   │   ├── export-data/       # Data export
│   │   ├── import/            # Data import
│   │   ├── test-calendar/     # Calendar testing
│   │   ├── users/             # User management
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   │
│   ├── components/          # Reusable UI components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── AppointmentForm.tsx
│   │   ├── CustomerTable.tsx
│   │   ├── Dashboard.tsx
│   │   ├── PinLoginScreen.tsx
│   │   ├── SyncManager.tsx
│   │   └── ThemeSwitcher.tsx
│   │
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx     # Authentication state
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── use-cloud-database.tsx
│   │   ├── use-data-sync.tsx
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── lib/                 # Utilities
│   │   ├── indexeddb.ts        # IndexedDB wrapper
│   │   ├── types.ts            # TypeScript types
│   │   └── utils.ts            # Helper functions
│   │
│   └── services/            # API services
│       ├── auth.ts             # Authentication
│       ├── shared-cloud-database.ts # Cloud database
│       ├── google-calendar.ts  # Google Calendar
│       ├── microsoft-calendar.ts # Microsoft Calendar
│       ├── google-drive.ts     # Google Drive
│       └── onedrive.ts         # OneDrive integration
│
├── .env.example              # Environment variables template
├── .eslintrc.json             # ESLint config
├── electron.js                # Electron main process
├── next.config.js             # Next.js config
├── package.json               # NPM package config
├── tailwind.config.ts         # Tailwind CSS config
└── tsconfig.json              # TypeScript config
```

## Key Components

### Frontend Components

#### Core UI Components
- **Dashboard.tsx**: Main application dashboard with metrics and overview
- **CustomerTable.tsx**: Data grid for customer management
- **AppointmentForm.tsx**: Form for creating and editing appointments
- **TaskList.tsx**: Task management interface
- **ReminderList.tsx**: Reminder and notification system

#### Authentication Components
- **PinLoginScreen.tsx**: PIN-based authentication interface
- **SetPinScreen.tsx**: PIN setup and configuration
- **AuthContext.tsx**: Authentication state management

#### Data Management Components
- **SyncManager.tsx**: Data synchronization interface
- **FileUpload.tsx**: File upload and import functionality
- **ConflictResolutionDialog.tsx**: Manual conflict resolution
- **CloudSyncStatus.tsx**: Sync status indicators

#### Utility Components
- **ThemeSwitcher.tsx**: Theme toggle functionality
- **NotificationBell.tsx**: Notification system
- **HelpGuide.tsx**: In-app help and documentation

### Backend Services

#### Core Services
- **shared-cloud-database.ts**: Cloud-first database service
- **auth.ts**: Authentication and authorization
- **sync-buffer.ts**: Data synchronization buffer
- **conflict-resolution-log.ts**: Conflict tracking and resolution

#### Integration Services
- **google-calendar.ts**: Google Calendar integration
- **microsoft-calendar.ts**: Microsoft Calendar integration
- **google-drive.ts**: Google Drive file management
- **onedrive.ts**: OneDrive file management
- **firebase.ts**: Firebase integration (optional)

#### Utility Services
- **device-management.ts**: Device registration and management
- **user-management.ts**: Multi-user account management
- **backup-versioning.ts**: Data backup and versioning
- **security-compliance.ts**: Security and compliance features

### Custom Hooks

- **use-cloud-database.tsx**: Cloud database operations
- **use-data-sync.tsx**: Data synchronization logic
- **use-mobile.tsx**: Responsive design helpers
- **use-toast.ts**: Notification and toast management

## Development Infrastructure

### Testing Framework
- **Jest Configuration**: Comprehensive Jest setup with TypeScript support
- **React Testing Library**: Component testing utilities
- **Cypress**: End-to-end testing framework
- **Mock Service Workers**: API testing with mock implementations
- **Code Coverage**: Test coverage reporting and thresholds

### Build System
- **Next.js Build**: Optimized production builds
- **Electron Builder**: Desktop application packaging
- **Turbopack**: Fast development bundling
- **TypeScript Compilation**: Type checking and compilation

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Test Results Reporting**: Automated test result artifacts
- **Code Quality Checks**: ESLint and TypeScript validation
- **Security Scanning**: Dependency vulnerability checks

## Cloud-First Implementation

### Implementation Status: 100% Complete

The application has been fully transformed from a local-first to a cloud-first architecture with the following completed phases:

#### Phase 1: Core Database Service Transformation ✅
- Database service migration from local to cloud-first
- Hook system overhaul (useLocalDatabase → useCloudDatabase)
- Mandatory cloud sync for all operations

#### Phase 2: Component Integration Updates ✅
- All components updated to use cloud database
- Utility functions migrated to cloud-first approach
- Removed references to old local database service

#### Phase 3: Multi-User Authentication System ✅
- Cloud-stored PIN management
- Admin/Partner/Employee account creation
- Role-based access control implementation
- PIN-based account switching

#### Phase 4: Cross-Device Synchronization ✅
- Device registration and identification system
- Real-time data sync with conflict resolution
- Optimistic updates with rollback capability
- Sync status indicators

#### Phase 5: Cloud Storage Integration Enhancement ✅
- Enhanced Google Drive and OneDrive integration
- Multi-user shared access optimization
- Automatic failover between cloud providers
- Unified cloud storage interface

#### Phase 6: Security and Compliance ✅
- End-to-end encryption for sensitive data
- Comprehensive audit logging
- Data access tracking and compliance reporting
- Secure PIN storage and validation

#### Phase 7: Testing and Deployment ✅
- Multi-user testing scenarios
- Cross-device synchronization validation
- Performance testing under load
- Migration guide and rollback procedures

## Style Guidelines

### Color Scheme
- **Primary Color**: Neutral white or light gray for background
- **Secondary Color**: Darker gray for text and borders to ensure readability
- **Accent Color**: Teal (#008080) for interactive elements and highlights
- **Success**: Green tones for positive actions and confirmations
- **Warning**: Orange/yellow tones for cautions and warnings
- **Error**: Red tones for errors and critical actions

### Layout Principles
- **Clean Layout**: Well-spaced layout with clear sections for data display
- **Consistent Spacing**: Uniform padding and margins throughout
- **Clear Hierarchy**: Distinct visual hierarchy for different content types
- **Responsive Design**: Adaptive layout for different screen sizes

### UI Elements
- **Icons**: Simple, consistent icons for common actions (upload, download, edit)
- **Buttons**: Clear call-to-action buttons with appropriate sizing
- **Forms**: Well-organized forms with proper validation feedback
- **Tables**: Clean data tables with sorting and filtering capabilities

### Typography
- **Primary Font**: Inter for body text and UI elements
- **Secondary Font**: Montserrat for headings and emphasis
- **Font Weights**: 300 (light), 400 (regular), 700 (bold), 900 (black)
- **Responsive Sizing**: Scalable font sizes for different screen sizes

## Configuration Files

### 1. package.json
- Main project configuration and dependency management
- Scripts for development, building, testing, and deployment
- Electron and Next.js specific configurations

### 2. next.config.js
- Next.js framework configuration
- Webpack and build optimization settings
- Environment variable handling
- Static export configuration

### 3. tailwind.config.ts
- Tailwind CSS framework configuration
- Custom theme definitions and color schemes
- Plugin configurations and extensions
- Responsive breakpoint definitions

### 4. .env.example
- Template for environment variables
- API endpoints and authentication keys
- Feature flags and configuration options
- Development and production settings

### 5. electron.js
- Electron main process configuration
- Native window management and IPC communication
- Security settings and permissions
- Auto-updater and application lifecycle

### 6. tsconfig.json
- TypeScript compiler configuration
- Path mapping and module resolution
- Strict type checking settings
- Build output configuration

## Recent Updates (May 2024)

### Latest Improvements
- Enhanced cloud database integration with real-time synchronization
- Improved conflict resolution mechanisms
- Advanced backup and versioning system
- Comprehensive testing infrastructure
- Enhanced security and compliance features

### Testing Infrastructure Improvements

1. **Jest Configuration**
   - Added comprehensive Jest setup with TypeScript support
   - Configured test environment for React components
   - Set up code coverage reporting
   - Added support for custom matchers and test utilities

2. **Google Calendar Service Tests**
   - Added extended test suite for Google Calendar integration
   - Implemented mock implementations for Google APIs
   - Added test coverage for authentication flows
   - Included tests for event management (create, update, delete, list)

3. **Type Safety**
   - Added TypeScript type definitions for Jest
   - Improved type safety in test files
   - Resolved type conflicts with mock implementations

4. **Test Utilities**
   - Created custom test utilities and matchers
   - Set up test environment configuration
   - Added support for testing React components

5. **CI/CD Integration**
   - Configured test results reporting
   - Set up test coverage thresholds
   - Added test result artifacts

### Cloud Database Integration
- Completed migration to cloud-first architecture
- Implemented multi-user authentication system
- Enhanced real-time synchronization capabilities
- Added comprehensive conflict resolution system

### Security Enhancements
- Implemented end-to-end encryption
- Added comprehensive audit logging
- Enhanced PIN-based authentication
- Improved data access controls

## API Documentation

### 1. Authentication API

#### Login
```typescript
// src/services/auth.ts
interface LoginCredentials {
  username: string;
  pin: string;
}

async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return response.json();
}
```

#### Session Management
```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Implementation...
};
```

### 2. Data API

#### Fetch Customers
```typescript
// src/services/api.ts
interface Customer {
  id: string;
  name: string;
  email: string;
  // ... other fields
}

async function fetchCustomers(params?: Record<string, any>): Promise<Customer[]> {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  const response = await fetch(`/api/customers${query}`);
  if (!response.ok) throw new Error('Failed to fetch customers');
  return response.json();
}
```

#### Create/Update Customer
```typescript
// src/services/api.ts
async function saveCustomer(customer: Omit<Customer, 'id'> & { id?: string }) {
  const method = customer.id ? 'PUT' : 'POST';
  const url = customer.id ? `/api/customers/${customer.id}` : '/api/customers';
  
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to ${customer.id ? 'update' : 'create'} customer`);
  }
  
  return response.json();
}
```

### 3. Sync API

#### Sync Data
```typescript
// src/services/sync.ts
interface SyncOptions {
  force?: boolean;
  silent?: boolean;
}

async function syncData(options: SyncOptions = {}): Promise<SyncResult> {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  
  if (!response.ok) {
    throw new Error('Sync failed');
  }
  
  return response.json();
}
```

## Key Components Implementation

### 1. Dashboard Component

```typescript
// src/components/Dashboard.tsx
interface DashboardProps {
  // Props definition
}

export default function Dashboard({}: DashboardProps) {
  // State management
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  
  // Data fetching
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customers, tasks, appointments] = await Promise.all([
          fetchCustomers({ limit: 5 }),
          fetchTasks({ status: 'pending' }),
          fetchAppointments({ upcoming: true })
        ]);
        // Update state...
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    
    loadData();
  }, []);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <StatsOverview stats={stats} />
      <div className="grid gap-6 md:grid-cols-2">
        <RecentCustomers customers={recentCustomers} />
        <UpcomingTasks tasks={pendingTasks} />
      </div>
    </div>
  );
}
```

### 2. Data Synchronization Hook

```typescript
// src/hooks/use-data-sync.tsx
export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const syncData = useCallback(async (options: SyncOptions = {}) => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const result = await syncDataService.sync({
        force: options.force,
        silent: options.silent
      });
      
      setLastSync(new Date());
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sync failed'));
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return {
    isSyncing,
    lastSync,
    error,
    syncData,
  };
}
```

### 3. Form Handling with Validation

```typescript
// src/components/CustomerForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  // ... other fields
});

type CustomerFormData = z.infer<typeof customerSchema>;

export function CustomerForm({ initialData, onSubmit }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || {},
  });

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name.message}</span>}
      </div>
      
      {/* Other form fields */}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Customer'}
      </button>
    </form>
  );
}
```

## Security Considerations
- Client-side data encryption
- Secure PIN storage using hashing
- Input validation and sanitization
- Rate limiting on authentication endpoints
- Secure HTTP headers

## Future Improvements
- Implement comprehensive test coverage
- Add end-to-end testing
- Enhance offline capabilities
- Implement server-side rendering for better SEO
- Add audit logging
- Implement backup and restore functionality

---

*This unified technical documentation serves as the comprehensive reference for the FinCRuM application's architecture, implementation, and development guidelines.*
*Generated on: 2025-05-22*
*Version: 0.1.0*