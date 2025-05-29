# Microsoft Graph API Setup Guide

This guide will help you set up Microsoft Graph API integration for calendar sync and OneDrive functionality in the FinCRuM application.

## Prerequisites

- Azure account (free tier is sufficient)
- Admin access to create Azure app registrations
- Node.js development environment

## Step 1: Azure App Registration

### 1.1 Create a New App Registration

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `FinCRuM Calendar Sync` (or your preferred name)
   - **Supported account types**: Select based on your needs:
     - **Single tenant**: Only your organization
     - **Multi-tenant**: Any organization
     - **Personal accounts**: Include personal Microsoft accounts
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `http://localhost:9002/auth/callback/microsoft`
5. Click **Register**

### 1.2 Note Important Values

After registration, note these values from the **Overview** page:
- **Application (client) ID** - This is your `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** - This is your `MICROSOFT_TENANT_ID`

## Step 2: Configure API Permissions

### 2.1 Add Microsoft Graph Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `Calendars.ReadWrite` - Read and write user calendars
   - `Files.ReadWrite` - Read and write user files (OneDrive)
   - `User.Read` - Read user profile
   - `offline_access` - Maintain access to data

### 2.2 Grant Admin Consent (if required)

If your organization requires admin consent:
1. Click **Grant admin consent for [Your Organization]**
2. Confirm the consent

## Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `FinCRuM App Secret`
4. Choose expiration (24 months recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately - this is your `MICROSOFT_CLIENT_SECRET`

## Step 4: Environment Configuration

### 4.1 Update .env.local

Add the following environment variables to your `.env.local` file:

```env
# Microsoft Graph API Configuration
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_application_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:9002/auth/callback/microsoft
MICROSOFT_TENANT_ID=your_tenant_id_here
```

### 4.2 Replace Placeholder Values

Replace the placeholder values with your actual Azure app registration details:
- `your_application_client_id_here` → Application (client) ID from Step 1.2
- `your_client_secret_here` → Client secret from Step 3
- `your_tenant_id_here` → Directory (tenant) ID from Step 1.2

## Step 5: Test the Integration

### 5.1 Start the Development Server

```bash
npm run dev
```

### 5.2 Test Microsoft Authentication

1. Navigate to `http://localhost:9002`
2. Go to the Dashboard
3. Look for the "Connect Microsoft Calendar" button
4. Click it to test the OAuth flow
5. You should be redirected to Microsoft login
6. After successful authentication, you'll be redirected back to the dashboard

### 5.3 Test Calendar Sync

1. Create a new task, reminder, or appointment
2. The system should automatically sync to your Microsoft Calendar
3. Check your Microsoft Calendar to verify the event was created

## Step 6: Production Configuration

### 6.1 Update Redirect URI for Production

When deploying to production:
1. Go back to your Azure app registration
2. Update the redirect URI to your production domain:
   - `https://yourdomain.com/auth/callback/microsoft`
3. Update the `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI` environment variable

### 6.2 Security Considerations

- Never commit `.env.local` to version control
- Use secure environment variable management in production
- Regularly rotate client secrets
- Monitor API usage and permissions

## Troubleshooting

### Common Issues

#### 1. "AADSTS50011: The reply URL specified in the request does not match"
- **Solution**: Ensure the redirect URI in Azure matches exactly with your environment variable
- Check for trailing slashes, http vs https, and port numbers

#### 2. "AADSTS65001: The user or administrator has not consented"
- **Solution**: Grant admin consent in Azure portal or have users consent individually

#### 3. "Invalid client secret"
- **Solution**: Verify the client secret is correct and hasn't expired
- Generate a new client secret if needed

#### 4. "Insufficient privileges to complete the operation"
- **Solution**: Ensure all required API permissions are granted
- Check if admin consent is required for your organization

### Debug Mode

To enable debug logging:
1. Open browser developer tools
2. Check the Console tab for detailed error messages
3. Network tab shows API requests and responses

### Testing Endpoints

You can test the Microsoft Graph API directly:
- Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer
- Use your access token to test API calls

## Additional Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [Azure App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph Permissions Reference](https://docs.microsoft.com/en-us/graph/permissions-reference)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure Azure app registration is configured properly
4. Check browser console for error messages

---

**Note**: This integration is already implemented in the codebase. This guide only covers the Azure configuration and environment setup required to make it work.