# Finsculpt CRM

This project can be run as a NextJS application or locally as a desktop application.

This CRM app features data backup and synchronization with both OneDrive and Google Drive. Users can manually resolve conflicts during synchronization to ensure data integrity.

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
