# FinCRuM - Financial Customer Relationship Management

[![Tests](https://img.shields.io/badge/tests-62%2F62%20passing-brightgreen)](./test-results)
[![Test Suites](https://img.shields.io/badge/test%20suites-6%2F6%20passing-brightgreen)](./test-results)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop%20%7C%20Mobile-blue)](#platforms)

A comprehensive multi-platform CRM solution that can be run as a Next.js web application, Electron desktop application, or React Native mobile app.

This CRM app features robust data backup and synchronization with both OneDrive and Google Drive, with intelligent conflict resolution to ensure data integrity.

## Features


*   **Contact Management:**
    *   Manually add, edit, and delete contacts.
    *   Bulk upload contacts from Excel files.
*   **Task Management:**
    *   Create tasks, set reminders, and schedule appointments.
*   **Data Management:**
    * Ability to create events, add tasks and reminders to Google Calendar.



*   **Data Backup**: The application automatically backs up data to either OneDrive or Google Drive.
*   **Data Synchronization**: Users can synchronize data between their local application and their cloud storage.
*   **Manual Conflict Resolution**: If data conflicts occur during synchronization, the user can resolve them manually.

## Installation and Running
### Prerequisites

Make sure you have Node.js and npm installed on your machine. You will also need to have access to OneDrive or Google Drive account to utilize cloud backup and sync.

### Web Application

1.  Navigate to the root of the project directory in your terminal.
2.  Run `npm install` to install the project dependencies.
3. Run `npm run dev`

### Local Desktop Application (Electron)

To build and run this application locally as a desktop application using Electron:

1.  **Create `electron.js`:**
    *   Create a file named `electron.js` in the root of your project. This file will contain the main Electron process logic. An example file can be found in the repo root.

2.  **Install dependencies:**




To get started, take a look at src/app/page.tsx.

## Platforms

### 🌐 Web Application (Next.js)
- Modern React-based web interface
- Server-side rendering for optimal performance
- Progressive Web App (PWA) capabilities

### 🖥️ Desktop Application (Electron)
- Native desktop experience
- Cross-platform compatibility (Windows, macOS, Linux)
- Offline functionality with local data storage

### 📱 Mobile Application (React Native)
- Native mobile experience for iOS and Android
- Located in `fincrm-android/` directory
- Shared business logic with web platform

## Project Status

### ✅ Test Coverage
- **Total Tests**: 62/62 passing
- **Test Suites**: 6/6 passing
- **Execution Time**: ~122 seconds
- **Coverage Areas**: Components, Hooks, Services, Utilities

### 🧪 Test Suites
| Suite | Tests | Status | Coverage |
|-------|-------|--------|---------|
| Google Calendar Extended | 15 | ✅ Passing | Comprehensive |
| Google Calendar Basic | 2 | ✅ Passing | Core functionality |
| Google Calendar Sync | 8 | ✅ Passing | Integration flows |
| Error Boundary | 12 | ✅ Passing | Error handling |
| Data Sync Hook | 6 | ✅ Passing | State management |
| Logger Service | 19 | ✅ Passing | Logging infrastructure |

### 🔧 Recent Improvements
- ✅ **TypeScript Compilation**: Resolved all TypeScript errors across the codebase
- ✅ **SSR Compatibility**: Fixed server-side rendering issues with browser API access
- ✅ **Build Process**: Achieved successful production builds with zero errors
- ✅ **Browser API Safety**: Added proper environment checks for window, navigator, screen, and Intl objects
- ✅ **Authentication Callbacks**: Fixed SSR errors in Google and Microsoft OAuth callback pages
- ✅ **Sync Services**: Enhanced sync buffer and device management with SSR compatibility
- ✅ Resolved all test suite conflicts
- ✅ Implemented comprehensive error boundaries
- ✅ Enhanced logging infrastructure
- ✅ Fixed Google Calendar integration issues
- ✅ Optimized multi-platform test architecture

## Development

### Testing
```bash
# Run all web tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="Google Calendar"

# Run React Native tests (from fincrm-android directory)
cd fincrm-android && npm test
```

### Quality Assurance
- **Linting**: ESLint with TypeScript support
- **Type Checking**: Strict TypeScript configuration
- **Testing**: Jest with comprehensive test coverage
- **Code Quality**: Automated quality gates in CI/CD

## Documentation

- 📋 [Code Quality Enhancement Recommendations](./CODE_QUALITY_ENHANCEMENT_RECOMMENDATIONS.md)
- 📝 [Memory Bank](./MEMORY_BANK.md) - Development history and debugging notes
- 🏗️ [Architecture Reports](./docs/reports/) - Comprehensive technical documentation
- 🐛 [Bug Reports](./BUGS_AND_FIXES_REPORT.md) - Known issues and resolutions

## Contributing

1. **Setup**: Follow installation instructions above
2. **Testing**: Ensure all tests pass before submitting PR
3. **Code Quality**: Follow TypeScript best practices
4. **Documentation**: Update relevant documentation for new features

For detailed contribution guidelines, see [Code Quality Enhancement Recommendations](./CODE_QUALITY_ENHANCEMENT_RECOMMENDATIONS.md).

---

*Last Updated: December 2024 | Status: All systems operational ✅*
