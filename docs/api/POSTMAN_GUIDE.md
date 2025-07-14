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
    "database": { "healthy": true, "response_time_ms": 5 },
    "cache": { "healthy": true, "response_time_ms": 2 },
    "storage": { "healthy": true, "media_root": "/path/to/media" },
    "gemini_api": { "healthy": true, "api_key_configured": true }
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

### Two-Factor Authentication (2FA) Endpoints

#### 1. Check 2FA Status

**GET** `/api/v1/auth/2fa/status/` 🔒

Checks if 2FA is enabled for the current user.

**Success Response (200):**

```json
{
  "two_factor_enabled": true,
  "has_backup_codes": true,
  "backup_codes_remaining": 8,
  "devices": [
    {
      "id": 1,
      "name": "Authenticator App",
      "confirmed": true,
      "created_at": "2025-01-09T10:00:00Z"
    }
  ]
}
```

#### 2. Enable 2FA

**POST** `/api/v1/auth/2fa/enable/` 🔒

Initiates 2FA setup process and returns secret key.

**Request Body:**

```json
{
  "device_name": "My Authenticator App"
}
```

**Success Response (200):**

```json
{
  "secret_key": "ABCDEFGHIJKLMNOP",
  "device_name": "My Authenticator App",
  "device_id": 1,
  "backup_codes": ["12345678", "87654321", "11223344"],
  "message": "2FA setup initiated. Please verify with your authenticator app."
}
```

#### 3. Get QR Code

**GET** `/api/v1/auth/2fa/qr-code/` 🔒

Gets QR code for setting up 2FA in authenticator app.

**Query Parameters:**

- `device_id`: ID of the TOTP device

**Success Response (200):**

```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### 4. Verify 2FA Setup

**POST** `/api/v1/auth/2fa/verify/` 🔒

Verifies TOTP code and completes 2FA setup.

**Request Body:**

```json
{
  "device_id": 1,
  "token": "123456"
}
```

**Success Response (200):**

```json
{
  "message": "Two-factor authentication enabled successfully",
  "two_factor_enabled": true,
  "backup_codes": ["12345678", "87654321"]
}
```

#### 5. Complete 2FA Login

**POST** `/api/v1/auth/2fa/complete/` 🔒

Completes login process after 2FA verification.

**Request Body:**

```json
{
  "token": "123456"
}
```

**Success Response (200):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### 6. Disable 2FA

**POST** `/api/v1/auth/2fa/disable/` 🔒

Disables 2FA for the current user.

**Request Body:**

```json
{
  "password": "CurrentPassword123!"
}
```

**Success Response (200):**

```json
{
  "message": "Two-factor authentication disabled successfully",
  "two_factor_enabled": false
}
```

#### 7. Generate New Backup Codes

**POST** `/api/v1/auth/2fa/backup-codes/` 🔒

Generates new backup codes for 2FA.

**Success Response (200):**

```json
{
  "backup_codes": ["12345678", "87654321", "11223344", "44332211"],
  "message": "New backup codes generated successfully"
}
```

### Social Authentication Endpoints

#### 1. Google OAuth Login

**POST** `/api/v1/auth/social/google/`

Authenticate with Google OAuth2 token.

**Request Body:**

```json
{
  "access_token": "google-oauth-access-token"
}
```

**Success Response (200):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "first_name": "John",
    "last_name": "Doe",
    "social_avatar_url": "https://lh3.googleusercontent.com/..."
  }
}
```

### Notification Endpoints

#### 1. List Notifications

**GET** `/api/v1/notifications/` 🔒

Lists all notifications for the authenticated user.

**Query Parameters:**

- `status`: Filter by status (pending, sent, read, failed, archived)
- `type`: Filter by type (meal_reminder, daily_summary, weekly_report, etc.)
- `priority`: Filter by priority (low, medium, high, urgent)
- `ordering`: Sort by field (e.g., -created_at, priority, type)

**Success Response (200):**

```json
{
  "count": 25,
  "next": "http://localhost:8000/api/v1/notifications/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "type": "meal_reminder",
      "title": "Time to log your meal!",
      "message": "Don't forget to log your meal to track your nutrition goals.",
      "status": "pending",
      "priority": "medium",
      "created_at": "2025-01-09T12:00:00Z",
      "read_at": null
    }
  ]
}
```

#### 2. Get Notification Details

**GET** `/api/v1/notifications/{id}/` 🔒

Retrieves detailed information about a specific notification.

**Success Response (200):**

```json
{
  "id": 1,
  "type": "daily_summary",
  "title": "Your Daily Nutrition Summary",
  "message": "You logged 3 meals today with 2150 calories.",
  "status": "sent",
  "channel": "email",
  "priority": "medium",
  "data": {
    "date": "2025-01-09",
    "total_calories": 2150,
    "total_protein": 120,
    "meal_count": 3,
    "calorie_goal": 2200
  },
  "scheduled_for": null,
  "sent_at": "2025-01-09T20:00:00Z",
  "read_at": null,
  "created_at": "2025-01-09T20:00:00Z",
  "updated_at": "2025-01-09T20:00:00Z"
}
```

#### 3. Mark Notifications as Read

**POST** `/api/v1/notifications/mark_as_read/` 🔒

Marks specific notifications as read.

**Request Body:**

```json
{
  "notification_ids": [1, 2, 3]
}
```

**Success Response (200):**

```json
{
  "message": "3 notifications marked as read",
  "updated_count": 3
}
```

#### 4. Mark All Notifications as Read

**POST** `/api/v1/notifications/mark_all_as_read/` 🔒

Marks all user's notifications as read.

**Success Response (200):**

```json
{
  "message": "All 15 notifications marked as read",
  "updated_count": 15
}
```

#### 5. Get Notification Statistics

**GET** `/api/v1/notifications/stats/` 🔒

Gets notification statistics for the user.

**Success Response (200):**

```json
{
  "total_notifications": 50,
  "unread_count": 5,
  "read_count": 45,
  "by_type": {
    "meal_reminder": 20,
    "daily_summary": 15,
    "goal_achieved": 8,
    "system": 2
  },
  "by_priority": {
    "low": 10,
    "medium": 35,
    "high": 5
  },
  "recent_notifications": [
    {
      "id": 1,
      "type": "meal_reminder",
      "title": "Time to log your meal!",
      "message": "Don't forget to log your meal to track your nutrition goals.",
      "status": "pending",
      "priority": "medium",
      "created_at": "2025-01-09T12:00:00Z",
      "read_at": null
    }
  ]
}
```

#### 6. Get Unread Notifications

**GET** `/api/v1/notifications/unread/` 🔒

Gets all unread notifications for the user.

**Success Response (200):**

```json
[
  {
    "id": 1,
    "type": "meal_reminder",
    "title": "Time to log your meal!",
    "message": "Don't forget to log your meal to track your nutrition goals.",
    "status": "pending",
    "priority": "medium",
    "created_at": "2025-01-09T12:00:00Z",
    "read_at": null
  }
]
```

#### 7. Delete Old Notifications

**DELETE** `/api/v1/notifications/clear_old/` 🔒

Deletes old read notifications (older than 30 days).

**Success Response (200):**

```json
{
  "message": "25 old notifications deleted",
  "deleted_count": 25
}
```

### Notification Preferences

#### 1. Get Notification Preferences

**GET** `/api/v1/notifications/preferences/` 🔒

Gets current notification preferences for the user.

**Success Response (200):**

```json
{
  "receive_email_notifications": true,
  "receive_push_notifications": true,
  "receive_sms_notifications": false,
  "email_daily_summary": true,
  "email_weekly_report": true,
  "email_tips": true,
  "meal_reminder_times": ["08:00", "12:00", "18:00"],
  "notification_preferences": {
    "goal_achieved": {
      "email": true,
      "push": true,
      "in_app": true
    },
    "streak_milestone": {
      "email": true,
      "push": true,
      "in_app": true
    }
  }
}
```

#### 2. Update Notification Preferences

**PATCH** `/api/v1/notifications/preferences/` 🔒

Updates notification preferences for the user.

**Request Body:**

```json
{
  "receive_email_notifications": false,
  "email_daily_summary": false,
  "meal_reminder_times": ["08:30", "12:30", "19:00"],
  "notification_preferences": {
    "goal_achieved": {
      "email": false,
      "push": true,
      "in_app": true
    }
  }
}
```

**Success Response (200):**

```json
{
  "message": "Notification preferences updated successfully",
  "preferences": {
    "receive_email_notifications": false,
    "receive_push_notifications": true,
    "receive_sms_notifications": false,
    "email_daily_summary": false,
    "email_weekly_report": true,
    "email_tips": true,
    "meal_reminder_times": ["08:30", "12:30", "19:00"],
    "notification_preferences": {
      "goal_achieved": {
        "email": false,
        "push": true,
        "in_app": true
      }
    }
  }
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
  "total_calories": 450.0,
  "total_protein": 25.5,
  "total_carbohydrates": 38.2,
  "total_fat": 18.75,
  "foods": [
    {
      "name": "Grilled Chicken Breast",
      "quantity": 150,
      "unit": "g",
      "calories": 247.5,
      "protein": 46.5,
      "carbohydrates": 0.0,
      "fat": 5.4,
      "confidence": 0.92
    },
    {
      "name": "Brown Rice",
      "quantity": 100,
      "unit": "g",
      "calories": 112.0,
      "protein": 2.6,
      "carbohydrates": 23.5,
      "fat": 0.9,
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

### Meal Management Endpoints

#### 1. List Meals

**GET** `/api/v1/meals/` 🔒

Lists all meals for the authenticated user with filtering and search options.

**Query Parameters:**

- `search`: Search in meal name, notes, or food items
- `meal_type`: Filter by meal type (breakfast, lunch, dinner, snack, other)
- `start_date`: Filter meals after this date (ISO format)
- `end_date`: Filter meals before this date (ISO format)
- `min_calories`: Filter meals with at least this many calories
- `max_calories`: Filter meals with at most this many calories
- `favorites_only`: Set to "true" to show only favorited meals
- `ordering`: Sort by field (e.g., -consumed_at, name, created_at)
- `page`: Page number for pagination
- `page_size`: Number of results per page (default: 20)

**Success Response (200):**

```json
{
  "count": 50,
  "next": "http://localhost:8000/api/v1/meals/?page=2",
  "previous": null,
  "results": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Healthy Breakfast",
      "meal_type": "breakfast",
      "consumed_at": "2025-01-09T08:30:00Z",
      "total_calories": 450,
      "items_count": 3,
      "is_favorite": true,
      "image": null,
      "created_at": "2025-01-09T08:35:00Z"
    }
  ]
}
```

#### 2. Create Meal

**POST** `/api/v1/meals/` 🔒

Creates a new meal with optional meal items.

**Request Body:**

```json
{
  "name": "Healthy Lunch",
  "meal_type": "lunch",
  "consumed_at": "2025-01-09T12:30:00Z",
  "notes": "Post-workout meal",
  "location_name": "Home",
  "meal_items": [
    {
      "food_item_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "quantity": 150,
      "unit": "g",
      "custom_name": "Grilled Chicken"
    },
    {
      "food_item_name": "Brown Rice",
      "quantity": 100,
      "unit": "g"
    }
  ]
}
```

**Success Response (201):**

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "user": "user123",
  "name": "Healthy Lunch",
  "meal_type": "lunch",
  "consumed_at": "2025-01-09T12:30:00Z",
  "image": null,
  "notes": "Post-workout meal",
  "location_name": "Home",
  "latitude": null,
  "longitude": null,
  "meal_items": [
    {
      "id": 1,
      "food_item": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Chicken Breast",
        "calories": 165.0,
        "protein": 31.0,
        "carbohydrates": 0.0,
        "fat": 3.6
      },
      "quantity": 150.0,
      "unit": "g",
      "calories": 247.5,
      "protein": 46.5,
      "custom_name": "Grilled Chicken"
    }
  ],
  "total_calories": 415.5,
  "total_macros": {
    "protein": 51.4,
    "carbohydrates": 23.5,
    "fat": 4.5
  },
  "is_favorite": false,
  "favorite_id": null,
  "created_at": "2025-01-09T12:35:00Z",
  "updated_at": "2025-01-09T12:35:00Z"
}
```

#### 3. Get Meal Details

**GET** `/api/v1/meals/{meal_id}/` 🔒

Retrieves detailed information about a specific meal.

**Success Response (200):**
Returns same format as Create Meal response.

#### 4. Update Meal

**PATCH** `/api/v1/meals/{meal_id}/` 🔒

Updates meal information. Can update meal fields and replace all meal items.

**Request Body:**

```json
{
  "name": "Updated Lunch",
  "notes": "Added extra vegetables"
}
```

#### 5. Delete Meal

**DELETE** `/api/v1/meals/{meal_id}/` 🔒

Deletes a meal and all its associated meal items.

**Success Response (204):** No content

#### 6. Add to Favorites

**POST** `/api/v1/meals/{meal_id}/favorite/` 🔒

Adds a meal to user's favorites for quick access.

**Request Body:**

```json
{
  "name": "My Go-To Breakfast",
  "is_template": true,
  "quick_add_order": 1
}
```

**Success Response (201):**

```json
{
  "id": 123,
  "meal": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "name": "Healthy Breakfast",
    "meal_type": "breakfast",
    "total_calories": 450
  },
  "name": "My Go-To Breakfast",
  "is_template": true,
  "quick_add_order": 1,
  "times_used": 0,
  "last_used": null,
  "created_at": "2025-01-09T12:40:00Z"
}
```

#### 7. Remove from Favorites

**DELETE** `/api/v1/meals/{meal_id}/unfavorite/` 🔒

Removes a meal from favorites.

**Success Response (204):** No content

#### 8. Duplicate Meal

**POST** `/api/v1/meals/{meal_id}/duplicate/` 🔒

Creates a copy of an existing meal with all its items.

**Request Body:**

```json
{
  "name": "Today's Lunch",
  "consumed_at": "2025-01-09T12:00:00Z"
}
```

**Success Response (201):** Returns full meal object like Create Meal

#### 9. Quick Log from Favorite

**POST** `/api/v1/meals/quick_log/` 🔒

Quickly creates a new meal entry from a favorite meal template.

**Request Body:**

```json
{
  "favorite_meal_id": 123,
  "consumed_at": "2025-01-09T08:00:00Z"
}
```

**Success Response (201):** Returns full meal object

#### 10. Get Favorite Meals

**GET** `/api/v1/meals/favorites/` 🔒

Lists all user's favorite meals ordered by quick add order.

**Success Response (200):**

```json
[
  {
    "id": 123,
    "meal": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "name": "Healthy Breakfast",
      "meal_type": "breakfast",
      "total_calories": 450,
      "items_count": 3
    },
    "name": "My Go-To Breakfast",
    "is_template": true,
    "quick_add_order": 1,
    "times_used": 15,
    "last_used": "2025-01-08T08:15:00Z"
  }
]
```

#### 11. Get Meal Statistics

**GET** `/api/v1/meals/statistics/` 🔒

Returns aggregated statistics about user's meals.

**Query Parameters:**

- `period`: Statistics period (week, month, year, all) - default: month

**Success Response (200):**

```json
{
    "total_meals": 150,
    "total_calories": 67500.0,
    "average_calories_per_meal": 450.0,
    "favorite_meal_type": "lunch",
    "meals_by_type": {
        "breakfast": 45,
        "lunch": 50,
        "dinner": 40,
        "snack": 15
    },
    "recent_favorites": [...],
    "average_macros": {
        "protein": 35.5,
        "carbohydrates": 55.2,
        "fat": 18.3,
        "fiber": 8.5
    },
    "meals_this_week": 21,
    "meals_this_month": 90,
    "most_active_meal_time": "12:00 - 13:00"
}
```

#### 12. Find Similar Meals

**GET** `/api/v1/meals/{meal_id}/similar/` 🔒

Finds meals with similar ingredients and meal type.

**Success Response (200):**
Returns array of meal objects (up to 5) similar to List Meals format.

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

| Endpoint         | Rate Limit  | Window   |
| ---------------- | ----------- | -------- |
| Login            | 5 requests  | 1 minute |
| Register         | 3 requests  | 1 minute |
| Password Reset   | 3 requests  | 1 minute |
| 2FA Setup/Verify | 5 requests  | 1 minute |
| Image Analysis   | 10 requests | 1 minute |
| Notifications    | 30 requests | 1 minute |
| General API      | 60 requests | 1 minute |

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
- **Two-Factor Authentication (2FA)** with TOTP support
- **Social Authentication** with Google OAuth2
- **Notification System** with email, push, and in-app notifications
- **Meal Management** with favorites and history tracking
- **Background Tasks** with Celery for notifications and reports
- **Comprehensive Testing** with factory patterns and mocking

### Upcoming Features

- Nutritional goals and progress tracking
- Social sharing features
- Barcode scanning
- Recipe management
- Mobile push notifications
- SMS notifications
- Advanced meal analytics

---

For more information, see the [API Documentation](http://localhost:8000/api/docs/) or contact support at api@nutritionai.com.
