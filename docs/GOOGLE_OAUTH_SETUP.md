# Google OAuth Setup Guide

## Overview
This guide explains how to configure Google OAuth for the Nutrition AI app authentication system.

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
bitesight://
bitesight://oauth
https://auth.expo.io/@anonymous/bitesight
exp://localhost:8081
exp://127.0.0.1:8081
exp://172.18.223.214:8081
http://172.18.223.214:8000/auth/social/google/
http://localhost:8081/auth/google/callback
https://yourdomain.com/auth/google/callback
```

**Important Notes:**
- Use your actual project ID instead of `nutritionalapp-2136b` if different
- The `exp://` URLs are for Expo development
- Replace `172.18.223.214` with your actual development IP if different

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

#### "redirect_uri_mismatch" Error
- Ensure redirect URIs in Google Cloud Console match exactly
- Check that `scheme` in `app.json` is correct
- Verify frontend callback URL configuration

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