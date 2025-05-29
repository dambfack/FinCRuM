# Google OAuth Troubleshooting Guide

## Common Issues and Solutions

### 1. "invalid_grant" Error

This error typically occurs when:
- The authorization code has expired (codes expire after 10 minutes)
- The authorization code has already been used
- There's a mismatch in OAuth configuration

**Solutions:**

#### A. Check Environment Variables
Ensure your `.env.local` file contains:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:9002/auth/callback/google
```

#### B. Verify Google Cloud Console Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Check your OAuth 2.0 Client ID settings:
   - **Authorized JavaScript origins**: `http://localhost:9002`
   - **Authorized redirect URIs**: `http://localhost:9002/auth/callback/google`

#### C. Clear Browser Data
1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Clear localStorage: Open DevTools > Application > Local Storage > Clear All

#### D. Enable Required APIs
Ensure these APIs are enabled in Google Cloud Console:
- Google Calendar API
- Google Drive API
- Google+ API (for user info)

### 2. "redirect_uri_mismatch" Error

**Solution:**
The redirect URI in your Google Cloud Console must exactly match the one in your environment variables.

### 3. "invalid_client" Error

**Solution:**
Double-check your Client ID and Client Secret in the environment variables.

### 4. "invalid_request" - Conflict params: approval_prompt and prompt

**Problem:**
Google OAuth doesn't allow both `approval_prompt` and `prompt` parameters in the same request.

**Solution:**
Use only the `prompt` parameter (modern approach):
```javascript
// Correct (implemented)
client.generateAuthUrl({
  prompt: 'consent',
  // ... other params
});

// Incorrect - causes conflict
client.generateAuthUrl({
  prompt: 'consent',
  approval_prompt: 'force' // Remove this
});
```

## Error 400: invalid_request

**Error Message:** "Conflict params: approval_prompt and prompt"

**Cause:** Using both `approval_prompt` and `prompt` parameters in the OAuth authorization request, which is not allowed.

**Solution:**
1. Remove the deprecated `approval_prompt: 'force'` parameter
2. Use only the modern `prompt: 'consent'` parameter
3. The fix has been implemented in `src/services/google-oauth.ts`

**Technical Details:**
- `approval_prompt` is deprecated in favor of `prompt`
- Using both parameters simultaneously causes a conflict
- Modern OAuth implementations should use `prompt: 'consent'` for forcing fresh consent

## Duplicate Authorization Code Processing

**Issue:** Authorization codes being processed multiple times, leading to "invalid_grant" errors.

**Causes:**
1. React StrictMode causing double execution of useEffect
2. Component remounting during development
3. User refreshing the callback page
4. Network issues causing duplicate requests

**Solutions Implemented:**
1. **Client-side protection** in `src/app/auth/callback/google/page.tsx`:
   - useRef to prevent multiple executions within the same component instance
   - localStorage tracking to prevent processing the same code across component remounts
   - Automatic cleanup after 5 minutes

2. **Server-side protection** in `src/app/actions/google-auth-actions.ts`:
   - Set-based tracking of processed authorization codes
   - Immediate rejection of duplicate codes
   - Automatic cleanup after 5 minutes
   - Error handling that allows retry on genuine failures

**Prevention Tips:**
- Don't refresh the OAuth callback page
- Ensure stable network connection during authentication
- Clear browser cache if experiencing persistent issues

### 5. Token Revocation Issues

**Updated Implementation:**
The token revocation now uses the correct Google endpoint format:
```javascript
// Correct format (implemented)
fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' })

// Instead of the old format
fetch('https://oauth2.googleapis.com/revoke', { 
  method: 'POST', 
  body: `token=${token}` 
})
```

## Duplicate Calendar Events Issue

### Problem
Duplicate events being created in Google Calendar when creating reminders or appointments.

### Root Cause
- Incorrect data access pattern: accessing `result.event.id` instead of `result.data.event.id`
- Redundant `syncCalendar()` calls after individual calendar actions

### Solution
```javascript
// WRONG - causes duplicates
if (result.success && result.event?.id) {
  newReminder.googleCalendarEventId = result.event.id;
}

// CORRECT - prevents duplicates
if (result.success && result.data?.event?.id) {
  newReminder.googleCalendarEventId = result.data.event.id;
}

// Remove redundant sync calls
// syncCalendar(); // Remove this line
```

### Prevention
1. Always access calendar event data via `result.data.event.id`
2. Handle token updates via `result.data.newTokens`
3. Avoid calling `syncCalendar()` after individual calendar actions
4. Add proper error handling for failed calendar operations

### Testing
```bash
# Run calendar sync tests
npm test google-calendar-sync.test.tsx

# Test in development
1. Create a reminder with Google Calendar sync enabled
2. Check Google Calendar - should see only one event
3. Update the reminder - should update existing event, not create new one
4. Delete the reminder - should remove the calendar event
```

## Testing and Debugging

### Enable Debug Logging
```javascript
// In your Google OAuth service
const DEBUG = true;

if (DEBUG) {
  console.log('OAuth request:', requestData);
  console.log('OAuth response:', responseData);
  console.log('Calendar sync result:', result);
}
```

### Test OAuth Flow
1. Clear all browser storage
2. Initiate OAuth flow
3. Check network tab for request/response details
4. Verify token storage and expiration
5. Test calendar event creation/update/deletion

### Calendar Sync Testing Checklist
1. **Create Event Test**
   - Create reminder/appointment with calendar sync
   - Verify single event appears in Google Calendar
   - Check `googleCalendarEventId` is stored correctly

2. **Update Event Test**
   - Modify existing reminder/appointment
   - Verify calendar event is updated, not duplicated
   - Check event details match the updated data

3. **Error Handling Test**
   - Test with invalid/expired tokens
   - Test with network connectivity issues
   - Verify graceful fallback (item saved without calendar sync)

4. **Token Refresh Test**
   - Test with expired access token
   - Verify automatic token refresh
   - Check new tokens are stored properly

### Common Debug Steps
1. Check browser console for errors
2. Verify network requests in DevTools
3. Test with different Google accounts
4. Clear cookies and local storage
5. Test in incognito mode
6. Check Google Calendar directly for duplicate events
7. Verify `result.data` structure in calendar responses

## Testing Steps

1. **Restart the development server** after changing environment variables
2. **Clear all browser data** including localStorage
3. **Try authentication in incognito mode**
4. **Check browser console** for detailed error messages
5. **Verify network requests** in DevTools Network tab

## Debug Information

The application now provides enhanced debugging:
- Authorization code length and preview
- Environment variable configuration status
- Detailed error messages for common OAuth issues
- Token exchange success confirmation

## Production Considerations

1. **HTTPS Required**: Google OAuth requires HTTPS in production
2. **Domain Verification**: Verify your domain in Google Cloud Console
3. **Environment Variables**: Use secure environment variable management
4. **Error Handling**: Implement proper user-facing error messages

## Getting Help

If issues persist:
1. Check the browser console for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure Google Cloud Console configuration matches your setup
4. Try the authentication flow in a clean browser environment