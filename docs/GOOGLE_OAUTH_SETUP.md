# Google OAuth Setup Guide

## Overview
This guide explains how to configure Google OAuth for the Nutrition AI app authentication system.

## Quick Fix for "Error 400: invalid_request"

If you're seeing this error with a redirect_uri like `exp://192.168.250.63:8081`, follow these steps:

1. **Copy the exact redirect URI from the error message** (e.g., `exp://192.168.250.63:8081`)
2. **Add it to Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **APIs & Services > Credentials**
   - Click on your OAuth 2.0 Client ID
   - Add the exact redirect URI from the error to **Authorized redirect URIs**
   - Save the changes

3. **Wait 5 minutes** for Google to propagate the changes
4. **Try signing in again**

**Note:** The exp:// URLs change based on your network configuration. You may need to add multiple exp:// URLs for different development environments.

## Prerequisites
- Google Cloud Platform account
- Access to Google Cloud Console
- Project deployed and accessible

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API for newer projects)

### 1.2 Create OAuth 2.0 Credentials
1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Web application** as application type
4. Configure the following:

#### **Authorized JavaScript Origins:**
```
http://localhost:8081
http://127.0.0.1:8081
https://yourdomain.com
```

#### **Authorized Redirect URIs:**
```
# Production URIs
bitesight://
bitesight://oauth
https://auth.expo.io/@your-expo-username/bitesight
https://yourdomain.com/auth/google/callback

# Development URIs (add ALL that apply to your setup)
exp://localhost:8081
exp://127.0.0.1:8081
exp://localhost:19000
exp://127.0.0.1:19000

# Add your specific development IPs (check error messages)
exp://192.168.1.100:8081  # Replace with your actual IP
exp://192.168.250.63:8081  # Example from error
exp://10.0.2.2:8081        # Android emulator
exp://172.25.29.233:8081   # WSL network

# Backend callback URLs
http://localhost:8000/auth/social/google/
http://127.0.0.1:8000/auth/social/google/
```

**Important Notes:**
- The `exp://` URLs are for Expo development and change based on your network
- To find your current redirect URI, check the console logs when attempting to sign in
- You may need to add new exp:// URLs each time your IP changes
- For a more stable development experience, consider using ngrok or a similar tunneling service

### 1.3 Get Client Credentials
After creating the OAuth client, you'll get:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `xxxxx`

## Step 2: Backend Configuration

### 2.1 Update Environment Variables
Edit `backend/.env`:

```env
# OAuth2 Settings
GOOGLE_OAUTH_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-actual-client-secret
```

### 2.2 Verify Django Settings
The Django settings in `core/settings/base.py` should already be configured:

```python
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": os.getenv("GOOGLE_OAUTH_CLIENT_ID", ""),
            "secret": os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
            "key": "",
        },
        "SCOPE": [
            "profile",
            "email",
        ],
        "AUTH_PARAMS": {
            "access_type": "online",
        },
    }
}
```

## Step 3: Frontend Configuration

### 3.1 Update Environment Variables
Edit `frontend/.env`:

```env
# OAuth Configuration
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=true
```

### 3.2 Verify Expo Configuration
Check that `frontend/app.json` includes:

```json
{
  "expo": {
    "scheme": "bitesight",
    "extra": {
      "googleOAuthClientId": "$EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
      "enableSocialAuth": "$EXPO_PUBLIC_ENABLE_SOCIAL_AUTH"
    }
  }
}
```

## Step 4: Testing

### 4.1 Test Authentication Flow
1. Start the backend server: `./start.sh backend`
2. Start the frontend: `./start.sh frontend`
3. Test Google sign-in from the login screen

### 4.2 Verify API Endpoints
Test that the social auth endpoint works:

```bash
curl -X POST http://localhost:8000/api/v1/auth/social/google/ \
  -H "Content-Type: application/json" \
  -d '{"access_token": "test_token"}'
```

## Step 5: Production Deployment

### 5.1 Update Redirect URIs
Add your production domains to the Google OAuth configuration:

```
https://api.yourapp.com/auth/google/callback
https://yourapp.com/auth/google/callback
```

### 5.2 Environment Variables
Set production environment variables:

```bash
# Backend
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# Frontend
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-client-id
EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=true
```

## Firebase Service Account Setup (Optional)

If you need Firebase Admin SDK features (push notifications, etc.), you can configure Firebase:

### Firebase Configuration
1. Your Firebase service account is already stored in `backend/firebase-service-account.json`
2. Project ID: `nutritionalapp-2136b`
3. The file is automatically excluded from git for security

### Environment Variables
```env
# Firebase Service Account (for Firebase Admin SDK)
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
FIREBASE_PROJECT_ID=nutritionalapp-2136b
```

**Important:** Firebase service account credentials are different from OAuth2 credentials. Firebase is for server-side operations, OAuth2 is for user authentication.

## Troubleshooting

### Common Issues

#### "redirect_uri_mismatch" or "Error 400: invalid_request"
- **Most common cause:** The exp:// redirect URI isn't added to Google Console
- **Solution:** Copy the exact redirect URI from the error and add it to Google Console
- Ensure redirect URIs in Google Cloud Console match exactly (including trailing slashes)
- Check that `scheme` in `app.json` is correct (should be "bitesight")
- In development, Expo generates dynamic redirect URIs based on your IP address
- You may need to add multiple exp:// URIs for different networks (home, office, etc.)

#### "invalid_client" Error
- Check that Client ID is correct in both backend and frontend
- Verify Client Secret is set in backend environment
- Ensure Google+ API is enabled

#### Rate Limiting Issues
- The rate limits have been increased to 10-15 requests/minute
- Premium users get 20-30 requests/minute
- Contact support if limits are still too low

#### "blocked" Error During Signup
- This was caused by missing OAuth configuration
- Follow this guide to set up proper credentials
- Ensure both backend and frontend have correct Client ID

### Debug Mode
Enable debug logging in development:

```javascript
// In SocialLoginButton.tsx
if (__DEV__) {
  console.log('🔑 [OAUTH] Client ID:', googleOAuthClientId ? '***' + googleOAuthClientId.slice(-4) : 'NOT_SET');
  console.log('🌐 [OAUTH] Redirect URI:', redirectUri);
}
```

## Security Notes

1. **Never commit real credentials to version control**
2. **Use environment variables for all sensitive data**
3. **Rotate secrets regularly**
4. **Monitor OAuth usage in Google Cloud Console**
5. **Set up proper CORS and CSP headers**

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with a simple curl command first
4. Contact the development team with specific error messages

---

**Note**: This setup replaces the previous Firebase authentication system. The app now uses a simplified authentication flow with Django allauth + Google OAuth only.