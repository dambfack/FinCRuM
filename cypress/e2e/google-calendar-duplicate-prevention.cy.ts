describe('Google Calendar Duplicate Prevention', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Mock Google OAuth tokens
    cy.window().then((win) => {
      win.localStorage.setItem('google_access_token', 'mock_access_token');
      win.localStorage.setItem('google_refresh_token', 'mock_refresh_token');
    });

    // Intercept Google Calendar API calls
    cy.intercept('POST', '**/calendar/v3/calendars/primary/events', {
      statusCode: 200,
      body: {
        id: 'mock_calendar_event_id',
        summary: 'Test Event',
        start: { dateTime: '2024-12-31T10:00:00Z' },
        end: { dateTime: '2024-12-31T11:00:00Z' }
      }
    }).as('createCalendarEvent');

    cy.intercept('PUT', '**/calendar/v3/calendars/primary/events/*', {
      statusCode: 200,
      body: {
        id: 'mock_calendar_event_id',
        summary: 'Updated Test Event',
        start: { dateTime: '2024-12-31T10:00:00Z' },
        end: { dateTime: '2024-12-31T11:00:00Z' }
      }
    }).as('updateCalendarEvent');

    cy.intercept('DELETE', '**/calendar/v3/calendars/primary/events/*', {
      statusCode: 204
    }).as('deleteCalendarEvent');
  });

  describe('Reminder Form Calendar Sync', () => {
    it('should create single calendar event when creating reminder', () => {
      // Navigate to reminders section
      cy.get('[data-testid="reminders-tab"]').click();
      
      // Open reminder form
      cy.get('[data-testid="add-reminder-button"]').click();
      
      // Fill reminder form
      cy.get('input[name="title"]').type('Test Reminder');
      cy.get('textarea[name="description"]').type('Test reminder description');
      cy.get('input[name="date"]').type('2024-12-31');
      cy.get('input[name="time"]').type('10:00');
      
      // Enable Google Calendar sync
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Verify only one calendar API call was made
      cy.wait('@createCalendarEvent').then((interception) => {
        expect(interception.request.body).to.include({
          summary: 'Test Reminder'
        });
      });
      
      // Verify no additional calendar calls
      cy.get('@createCalendarEvent.all').should('have.length', 1);
      
      // Verify reminder was created with calendar event ID
      cy.get('[data-testid="reminder-list"]')
        .should('contain', 'Test Reminder')
        .and('contain', 'Synced with Google Calendar');
    });

    it('should update existing calendar event when editing reminder', () => {
      // Create a reminder first
      cy.get('[data-testid="reminders-tab"]').click();
      cy.get('[data-testid="add-reminder-button"]').click();
      cy.get('input[name="title"]').type('Original Reminder');
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      cy.get('button[type="submit"]').click();
      cy.wait('@createCalendarEvent');
      
      // Edit the reminder
      cy.get('[data-testid="edit-reminder-button"]').first().click();
      cy.get('input[name="title"]').clear().type('Updated Reminder');
      cy.get('button[type="submit"]').click();
      
      // Verify update API call was made
      cy.wait('@updateCalendarEvent').then((interception) => {
        expect(interception.request.body).to.include({
          summary: 'Updated Reminder'
        });
      });
      
      // Verify no new calendar event was created
      cy.get('@createCalendarEvent.all').should('have.length', 1);
      cy.get('@updateCalendarEvent.all').should('have.length', 1);
    });
  });

  describe('Appointment Form Calendar Sync', () => {
    it('should create single calendar event when creating appointment', () => {
      // Navigate to appointments section
      cy.get('[data-testid="appointments-tab"]').click();
      
      // Open appointment form
      cy.get('[data-testid="add-appointment-button"]').click();
      
      // Fill appointment form
      cy.get('input[name="title"]').type('Test Appointment');
      cy.get('textarea[name="description"]').type('Test appointment description');
      cy.get('input[name="date"]').type('2024-12-31');
      cy.get('input[name="startTime"]').type('10:00');
      cy.get('input[name="endTime"]').type('11:00');
      
      // Enable Google Calendar sync
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Verify only one calendar API call was made
      cy.wait('@createCalendarEvent').then((interception) => {
        expect(interception.request.body).to.include({
          summary: 'Test Appointment'
        });
      });
      
      // Verify no additional calendar calls
      cy.get('@createCalendarEvent.all').should('have.length', 1);
      
      // Verify appointment was created with calendar event ID
      cy.get('[data-testid="appointment-list"]')
        .should('contain', 'Test Appointment')
        .and('contain', 'Synced with Google Calendar');
    });
  });

  describe('Error Handling', () => {
    it('should handle calendar API failures gracefully', () => {
      // Mock calendar API failure
      cy.intercept('POST', '**/calendar/v3/calendars/primary/events', {
        statusCode: 401,
        body: { error: 'Unauthorized' }
      }).as('failedCalendarEvent');
      
      // Create reminder with calendar sync
      cy.get('[data-testid="reminders-tab"]').click();
      cy.get('[data-testid="add-reminder-button"]').click();
      cy.get('input[name="title"]').type('Test Reminder');
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      cy.get('button[type="submit"]').click();
      
      // Verify error handling
      cy.wait('@failedCalendarEvent');
      
      // Should show error toast
      cy.get('[data-testid="toast"]')
        .should('contain', 'Calendar Sync Failed');
      
      // Reminder should still be created without calendar sync
      cy.get('[data-testid="reminder-list"]')
        .should('contain', 'Test Reminder')
        .and('not.contain', 'Synced with Google Calendar');
    });

    it('should handle missing tokens gracefully', () => {
      // Clear tokens
      cy.window().then((win) => {
        win.localStorage.removeItem('google_access_token');
        win.localStorage.removeItem('google_refresh_token');
      });
      
      // Try to create reminder with calendar sync
      cy.get('[data-testid="reminders-tab"]').click();
      cy.get('[data-testid="add-reminder-button"]').click();
      cy.get('input[name="title"]').type('Test Reminder');
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      cy.get('button[type="submit"]').click();
      
      // Should show error about missing tokens
      cy.get('[data-testid="toast"]')
        .should('contain', 'Calendar Sync Failed')
        .and('contain', 'No valid Google tokens found');
      
      // Reminder should still be created
      cy.get('[data-testid="reminder-list"]')
        .should('contain', 'Test Reminder');
    });
  });

  describe('Token Management', () => {
    it('should update tokens when provided in calendar response', () => {
      // Mock calendar response with new tokens
      cy.intercept('POST', '**/calendar/v3/calendars/primary/events', {
        statusCode: 200,
        body: {
          id: 'mock_calendar_event_id',
          summary: 'Test Event',
          newTokens: {
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token'
          }
        }
      }).as('createCalendarEventWithTokens');
      
      // Create reminder
      cy.get('[data-testid="reminders-tab"]').click();
      cy.get('[data-testid="add-reminder-button"]').click();
      cy.get('input[name="title"]').type('Test Reminder');
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      cy.get('button[type="submit"]').click();
      
      cy.wait('@createCalendarEventWithTokens');
      
      // Verify tokens were updated
      cy.window().then((win) => {
        expect(win.localStorage.getItem('google_access_token')).to.equal('new_access_token');
        expect(win.localStorage.getItem('google_refresh_token')).to.equal('new_refresh_token');
      });
    });
  });

  describe('Bulk Sync Prevention', () => {
    it('should not trigger bulk sync after individual calendar actions', () => {
      // Mock bulk sync endpoint
      cy.intercept('POST', '/api/sync-calendar', {
        statusCode: 200,
        body: { success: true }
      }).as('bulkSync');
      
      // Create reminder with calendar sync
      cy.get('[data-testid="reminders-tab"]').click();
      cy.get('[data-testid="add-reminder-button"]').click();
      cy.get('input[name="title"]').type('Test Reminder');
      cy.get('input[name="syncWithGoogleCalendar"]').check();
      cy.get('button[type="submit"]').click();
      
      cy.wait('@createCalendarEvent');
      
      // Verify bulk sync was not called
      cy.get('@bulkSync.all').should('have.length', 0);
    });
  });
});