# Postman API Testing Guide

This guide provides comprehensive instructions for testing the Nutrition AI API endpoints using Postman.

## Getting Started

### Importing the Collection
1. Generate the Postman collection:
   ```bash
   python manage.py generate_postman_collection --output nutrition-ai.postman_collection.json
   ```
2. Open Postman and click "Import"
3. Select the generated `nutrition-ai.postman_collection.json` file
4. The collection will be imported with all endpoints and example requests

### Base URL Configuration
- Development: `http://localhost:8000`
- Production: `https://api.nutritionai.com` (update in collection variables)
- API Base Path: `/api/v1/`

### API Documentation
- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- OpenAPI Schema: `http://localhost:8000/api/schema/`

## Authentication

The API uses JWT (JSON Web Token) authentication. Most endpoints require authentication.

### Setting up Authentication in Postman

1. **Collection Variables**: The collection includes these variables:
   - `base_url`: The API base URL
   - `access_token`: JWT access token (auto-populated on login)
   - `refresh_token`: JWT refresh token (auto-populated on login)

2. **Authorization**: The collection is pre-configured to use Bearer token authentication. The token is automatically included in requests that require authentication.

## API Endpoints

### Health Check Endpoints (No Authentication Required)

#### 1. Health Check
**GET** `/api/health/`

Basic health check to verify the API is running.

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2025-01-09T12:00:00Z",
    "version": "1.0.0",
    "environment": "development"
}
```

#### 2. Readiness Check
**GET** `/api/ready/`

Checks if all services (database, cache, storage, AI) are ready.

**Response:**
```json
{
    "status": "ready",
    "timestamp": "2025-01-09T12:00:00Z",
    "checks": {
        "database": {"healthy": true, "response_time_ms": 5},
        "cache": {"healthy": true, "response_time_ms": 2},
        "storage": {"healthy": true, "media_root": "/path/to/media"},
        "gemini_api": {"healthy": true, "api_key_configured": true}
    }
}
```

### Authentication Endpoints

#### 1. User Registration
**POST** `/api/v1/auth/register/`

Creates a new user account and sends email verification.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "StrongPass123!",
    "password_confirm": "StrongPass123!",
    "first_name": "John",
    "last_name": "Doe",
    "account_type": "free",
    "terms_accepted": true,
    "marketing_consent": false
}
```

**Success Response (201):**
```json
{
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "account_type": "free"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### 2. Email Verification
**POST** `/api/v1/auth/verify-email/`

Verifies user email with token from email.

**Request Body:**
```json
{
    "token": "verification-token-from-email"
}
```

**Success Response (200):**
```json
{
    "message": "Email verified successfully",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### 3. User Login
**POST** `/api/v1/auth/login/`

Authenticates user and returns JWT tokens.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "StrongPass123!"
}
```

**Success Response (200):**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Rate Limiting:** Maximum 5 login attempts per minute per IP address.

#### 4. Token Refresh
**POST** `/api/v1/auth/refresh/`

Gets new access token using refresh token.

**Request Body:**
```json
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Success Response (200):**
```json
{
    "access": "new-access-token",
    "refresh": "new-refresh-token"
}
```

**Note:** Refresh tokens are rotated on each use for security.

#### 5. User Logout
**POST** `/api/v1/auth/logout/` 🔒

Blacklists the refresh token.

**Request Body:**
```json
{
    "refresh": "current-refresh-token"
}
```

**Success Response (200):**
```json
{
    "message": "Logged out successfully"
}
```

#### 6. Password Reset Request
**POST** `/api/v1/auth/password/reset/`

Sends password reset email.

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
    "message": "If an account exists with this email, a password reset link has been sent."
}
```

#### 7. Password Reset Confirm
**POST** `/api/v1/auth/password/reset/confirm/`

Resets password with token from email.

**Request Body:**
```json
{
    "token": "reset-token-from-email",
    "password": "NewStrongPass123!",
    "password_confirm": "NewStrongPass123!"
}
```

**Success Response (200):**
```json
{
    "message": "Password reset successfully"
}
```

#### 8. Change Password
**POST** `/api/v1/auth/password/change/` 🔒

Changes password for authenticated user.

**Request Body:**
```json
{
    "current_password": "CurrentPass123!",
    "new_password": "NewStrongPass123!",
    "new_password_confirm": "NewStrongPass123!"
}
```

**Success Response (200):**
```json
{
    "message": "Password changed successfully"
}
```

### User Profile Endpoints

#### 1. Get Profile
**GET** `/api/v1/auth/profile/` 🔒

Gets current user's profile information.

**Success Response (200):**
```json
{
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "account_type": "free",
    "is_verified": true,
    "date_joined": "2025-01-09T10:00:00Z",
    "date_of_birth": "1990-01-01",
    "gender": "M",
    "height": 180,
    "weight": 75,
    "activity_level": "moderately_active",
    "dietary_goal": "maintain",
    "dietary_restrictions": [],
    "target_calories": 2500,
    "target_protein": 150,
    "target_carbs": 300,
    "target_fat": 80,
    "timezone": "UTC",
    "preferred_units": "metric",
    "marketing_consent": false,
    "bmi": 23.1,
    "bmr": 1750,
    "tdee": 2500
}
```

#### 2. Update Profile
**PATCH** `/api/v1/auth/profile/` 🔒

Updates current user's profile information.

**Request Body (partial update):**
```json
{
    "first_name": "Jane",
    "height": 175,
    "weight": 70,
    "activity_level": "very_active",
    "dietary_goal": "lose"
}
```

### Food Analysis Endpoints

#### 1. Analyze Food Image
**POST** `/api/v1/analysis/image/` 🔒

Analyzes a food image and returns nutritional information.

**Request:**
- Method: POST
- Headers: 
  - `Authorization: Bearer {access_token}`
- Body: form-data
  - `image` (file): The food image to analyze

**Success Response (200):**
```json
{
    "id": 1,
    "meal_id": 123,
    "total_calories": 450.00,
    "total_protein": 25.50,
    "total_carbohydrates": 38.20,
    "total_fat": 18.75,
    "foods": [
        {
            "name": "Grilled Chicken Breast",
            "quantity": 150,
            "unit": "g",
            "calories": 247.50,
            "protein": 46.50,
            "carbohydrates": 0.00,
            "fat": 5.40,
            "confidence": 0.92
        },
        {
            "name": "Brown Rice",
            "quantity": 100,
            "unit": "g",
            "calories": 112.00,
            "protein": 2.60,
            "carbohydrates": 23.50,
            "fat": 0.90,
            "confidence": 0.88
        }
    ],
    "analysis_time_ms": 1250,
    "ai_provider": "gemini",
    "created_at": "2025-01-09T12:30:00Z"
}
```

**Rate Limiting:** Maximum 10 image analyses per minute per user.

#### 2. Recalculate Nutrition
**POST** `/api/v1/analysis/recalculate/` 🔒

Recalculates nutritional information based on ingredient modifications.

**Request Body:**
```json
{
    "meal_id": 123,
    "ingredients": [
        {
            "name": "Chicken breast",
            "quantity": 200,
            "unit": "g"
        },
        {
            "name": "Quinoa",
            "quantity": 150,
            "unit": "g"
        },
        {
            "name": "Olive oil",
            "quantity": 1,
            "unit": "tbsp"
        }
    ]
}
```

**Success Response (200):**
```json
{
    "success": true,
    "meal_id": 123,
    "total_calories": 615.0,
    "total_protein": 56.5,
    "total_carbohydrates": 57.5,
    "total_fat": 16.1,
    "ingredients": [
        {
            "name": "Chicken breast",
            "quantity": 200,
            "unit": "g",
            "calories": 330.0,
            "protein": 62.0,
            "carbohydrates": 0.0,
            "fat": 7.2
        },
        {
            "name": "Quinoa",
            "quantity": 150,
            "unit": "g",
            "calories": 180.0,
            "protein": 6.0,
            "carbohydrates": 32.0,
            "fat": 2.8
        },
        {
            "name": "Olive oil",
            "quantity": 1,
            "unit": "tbsp",
            "calories": 119.0,
            "protein": 0.0,
            "carbohydrates": 0.0,
            "fat": 13.5
        }
    ],
    "updated_at": "2025-01-09T12:35:00Z"
}
```

## Error Responses

All endpoints return consistent error responses:

### Validation Error (400)
```json
{
    "error": "Validation failed",
    "message": "Email address is already in use",
    "code": "validation_error",
    "errors": {
        "email": ["This email is already registered"]
    },
    "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Authentication Error (401)
```json
{
    "error": "Authentication required",
    "message": "Authentication credentials were not provided",
    "code": "not_authenticated",
    "correlation_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Permission Error (403)
```json
{
    "error": "Permission denied",
    "message": "You do not have permission to perform this action",
    "code": "permission_denied",
    "correlation_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

### Not Found Error (404)
```json
{
    "error": "Resource not found",
    "message": "The requested resource was not found",
    "code": "not_found",
    "correlation_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

### Rate Limit Error (429)
```json
{
    "error": "Rate limit exceeded",
    "message": "Maximum 5 requests per minute allowed",
    "code": "rate_limit_exceeded",
    "retry_after": 42,
    "correlation_id": "550e8400-e29b-41d4-a716-446655440004"
}
```

### Server Error (500)
```json
{
    "error": "Internal server error",
    "message": "An unexpected error occurred. Please try again later.",
    "code": "internal_error",
    "error_id": "550e8400-e29b-41d4-a716-446655440005"
}
```

## Rate Limiting

Different endpoints have different rate limits:

| Endpoint | Rate Limit | Window |
|----------|------------|---------|
| Login | 5 requests | 1 minute |
| Register | 3 requests | 1 minute |
| Password Reset | 3 requests | 1 minute |
| Image Analysis | 10 requests | 1 minute |
| General API | 60 requests | 1 minute |

## Testing Tips

### 1. Authentication Flow
1. Register a new user
2. Check console/email for verification link
3. Verify email with token
4. Login to get JWT tokens
5. Use access token for authenticated requests
6. Refresh token when access token expires (15 minutes)

### 2. Token Management
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Refresh tokens are rotated on each use
- Store tokens securely in Postman environment variables

### 3. Image Upload Testing
- Use clear, well-lit food images
- Supported formats: JPEG, PNG, WebP, HEIC
- Maximum file size: 10MB
- Multiple food items in one image are supported

### 4. Error Handling
- All responses include a correlation ID for debugging
- Check response headers for deprecation warnings
- Monitor rate limit headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### 5. Development vs Production
- Development uses console email backend (emails print to console)
- Production requires proper SMTP configuration
- Mock data is returned if Gemini API is not configured

## Security Headers

All responses include security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your frontend URL is in `CORS_ALLOWED_ORIGINS`
   - Include credentials in requests if needed
   - Check that preflight requests are handled

2. **Token Expired**
   - Use the refresh endpoint to get new tokens
   - Implement automatic token refresh in your client

3. **Image Analysis Fails**
   - Verify Gemini API key is configured
   - Check image format and size
   - Ensure image contains food items

4. **Email Not Received**
   - Check Django console in development
   - Verify SMTP settings in production
   - Check spam folder

### Debug Mode

In development, you can enable debug mode to get more detailed error messages:
1. Set `DEBUG=True` in `.env`
2. Errors will include stack traces
3. Database queries will be logged

## Environment Variables

Key environment variables for API functionality:

```bash
# Django Settings
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (if using PostgreSQL)
DB_NAME=nutritiondb
DB_USER=dbuser
DB_PASSWORD=dbpass
DB_HOST=localhost
DB_PORT=5432

# Email (for production)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# AI Service
GEMINI_API_KEY=your-gemini-api-key

# Frontend
FRONTEND_URL=http://localhost:8081

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

## API Changelog

### Version 1.0.0 (Current)
- Initial release with authentication system
- Food image analysis with Gemini Vision
- User profile management
- JWT-based authentication with refresh token rotation
- Comprehensive error handling and logging
- Rate limiting and security middleware

### Upcoming Features
- Meal history and tracking
- Favorite meals
- Nutritional goals and progress tracking
- Social sharing features
- Barcode scanning
- Recipe management

---

For more information, see the [API Documentation](http://localhost:8000/api/docs/) or contact support at api@nutritionai.com.