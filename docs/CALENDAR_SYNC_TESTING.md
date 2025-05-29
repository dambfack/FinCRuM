# Google Calendar Sync Testing Guide

This guide provides comprehensive testing procedures for the Google Calendar sync functionality, specifically focusing on duplicate event prevention and error handling.

## Overview

The Google Calendar sync feature has been enhanced to prevent duplicate events and improve error handling. This document outlines the testing procedures to validate these improvements.

## Test Files

### Unit Tests
- **File**: `src/components/__tests__/google-calendar-sync.test.tsx`
- **Purpose**: Tests individual component behavior and API interactions
- **Coverage**: ReminderForm, AppointmentForm, error handling, token management

### Integration Tests
- **File**: `cypress/e2e/google-calendar-duplicate-prevention.cy.ts`
- **Purpose**: End-to-end testing of calendar sync workflows
- **Coverage**: Complete user workflows, API interactions, error scenarios

## Running Tests

### Unit Tests
```bash
# Run all tests
npm test

# Run specific calendar sync tests
npm test google-calendar-sync.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Integration Tests
```bash
# Run Cypress tests headlessly
npm run cypress:run

# Open Cypress test runner
npm run cypress:open

# Run specific test file
npx cypress run --spec "cypress/e2e/google-calendar-duplicate-prevention.cy.ts"
```

## Manual Testing Procedures

### 1. Duplicate Prevention Testing

#### Test Case: Create Reminder with Calendar Sync
1. **Setup**:
   - Ensure Google OAuth tokens are configured
   - Open the application in development mode
   - Navigate to the Reminders section

2. **Steps**:
   - Click "Add Reminder"
   - Fill in reminder details:
     - Title: "Test Reminder"
     - Description: "Testing duplicate prevention"
     - Date: Future date
     - Time: Specific time
   - Enable "Sync with Google Calendar" checkbox
   - Click "Add Reminder"

3. **Expected Results**:
   - Reminder is created successfully
   - Only ONE event appears in Google Calendar
   - Reminder shows "Synced with Google Calendar" status
   - No duplicate events are created

4. **Validation**:
   - Check Google Calendar directly
   - Verify `googleCalendarEventId` is stored in the reminder
   - Check browser console for any errors

#### Test Case: Update Existing Reminder
1. **Setup**:
   - Create a reminder with calendar sync (from previous test)

2. **Steps**:
   - Click "Edit" on the existing reminder
   - Modify the title to "Updated Test Reminder"
   - Click "Update Reminder"

3. **Expected Results**:
   - Reminder is updated successfully
   - Google Calendar event is UPDATED (not duplicated)
   - Only ONE event exists in Google Calendar
   - Event details match the updated reminder

### 2. Error Handling Testing

#### Test Case: Invalid/Expired Tokens
1. **Setup**:
   - Clear Google OAuth tokens from localStorage
   - Or set invalid tokens

2. **Steps**:
   - Try to create a reminder with calendar sync enabled

3. **Expected Results**:
   - Error toast appears: "Calendar Sync Failed"
   - Reminder is still created (without calendar sync)
   - No calendar event is created
   - User is informed about the sync failure

#### Test Case: Network Connectivity Issues
1. **Setup**:
   - Use browser dev tools to simulate network issues
   - Or temporarily block Google Calendar API requests

2. **Steps**:
   - Try to create a reminder with calendar sync enabled

3. **Expected Results**:
   - Error toast appears with appropriate message
   - Reminder is created without calendar sync
   - Application remains functional

### 3. Appointment Testing

Repeat the above tests for the Appointment form:
- Create appointment with calendar sync
- Update existing appointment
- Test error scenarios

### 4. Token Management Testing

#### Test Case: Token Refresh
1. **Setup**:
   - Use expired access token with valid refresh token

2. **Steps**:
   - Create reminder with calendar sync

3. **Expected Results**:
   - Tokens are automatically refreshed
   - Calendar event is created successfully
   - New tokens are stored in localStorage

## Debugging and Troubleshooting

### Enable Debug Logging
Add this to your component for detailed logging:

```javascript
const DEBUG_CALENDAR = true;

if (DEBUG_CALENDAR) {
  console.log('Calendar sync attempt:', {
    syncEnabled,
    hasTokens: !!localStorage.getItem('google_access_token'),
    eventData
  });
}
```

### Common Issues and Solutions

#### Issue: Duplicate Events Still Appearing
**Possible Causes**:
- Code still accessing `result.event.id` instead of `result.data.event.id`
- Redundant `syncCalendar()` calls not removed
- Multiple form submissions

**Debug Steps**:
1. Check browser console for API calls
2. Verify the data access pattern in the code
3. Look for multiple POST requests to calendar API

#### Issue: Calendar Sync Failing
**Possible Causes**:
- Invalid or expired tokens
- Network connectivity issues
- Google API quota exceeded
- Incorrect API permissions

**Debug Steps**:
1. Check browser console for error messages
2. Verify tokens in localStorage
3. Test Google Calendar API directly
4. Check Google Cloud Console for API usage

#### Issue: Tests Failing
**Possible Causes**:
- Mock data doesn't match actual API responses
- Test environment setup issues
- Component dependencies not properly mocked

**Debug Steps**:
1. Run tests with `--verbose` flag
2. Check test console output
3. Verify mock implementations
4. Update test data to match current API responses

## Performance Testing

### Load Testing
1. Create multiple reminders/appointments rapidly
2. Monitor API call frequency
3. Verify no duplicate requests are made
4. Check for memory leaks or performance degradation

### Stress Testing
1. Test with large numbers of calendar events
2. Test with slow network connections
3. Test with intermittent connectivity
4. Verify graceful degradation

## Validation Checklist

### Before Release
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing completed for all scenarios
- [ ] No duplicate events created in any test case
- [ ] Error handling works correctly
- [ ] Token management functions properly
- [ ] Performance is acceptable
- [ ] Documentation is updated

### Post-Release Monitoring
- [ ] Monitor error logs for calendar sync failures
- [ ] Check user reports of duplicate events
- [ ] Monitor API usage and quota consumption
- [ ] Verify token refresh mechanisms work in production

## Reporting Issues

When reporting calendar sync issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser console errors
4. Network tab screenshots
5. Google Calendar screenshots (if applicable)
6. User account type (personal vs workspace)
7. Browser and version information

## Continuous Integration

Ensure CI pipeline includes:
1. Unit test execution
2. Integration test execution
3. Code coverage reporting
4. Lint checks for calendar-related code
5. Performance regression testing

This comprehensive testing approach ensures the Google Calendar sync functionality works reliably and prevents duplicate events while maintaining a good user experience.