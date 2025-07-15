# API Reference - Nutrition AI Backend (Simplified)

Complete reference for all API endpoints with request/response schemas for the simplified backend architecture.

**Base URL:** `https://your-domain.com/api/v1/` (production) or `http://127.0.0.1:8000/api/v1/` (development)

**Authentication:** JWT Bearer tokens required for most endpoints.

## Backend Simplification Note

This API reference reflects the simplified backend structure with 10 core models:
- User, UserProfile, FoodItem, Meal, MealItem, MealAnalysis
- Notification, DeviceToken, SubscriptionPlan, Subscription, Payment

**Removed Features**: FavoriteMeal, PaymentMethod, Invoice, SyncLog, PushNotification, DietaryRestriction, 2FA, SMS, Firebase, and malware scanning have been removed for simplicity.

## Table of Contents

1. [Health Checks](#health-checks)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [AI Analysis](#ai-analysis)
5. [Meals Management](#meals-management)
6. [Notifications](#notifications)
7. [Mobile Optimized](#mobile-optimized)
8. [Subscriptions](#subscriptions)
9. [Webhook Endpoints](#webhook-endpoints)

---

## Health Checks

### API Health Check

**GET** `/api/health/`

Check the overall health of the API.

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2025-07-15T10:30:00.000Z",
    "version": "1.0.0",
    "environment": "development"
}
```

### Service Health Check

**GET** `/api/health/services/`

Check the health of individual services.

**Response:**
```json
{
    "status": "healthy",
    "services": {
        "database": "healthy",
        "cache": "healthy",
        "gemini_ai": "healthy"
    },
    "timestamp": "2025-07-15T10:30:00.000Z"
}
```

### Readiness Check

**GET** `/api/ready/`

Check if the API is ready to serve requests.

### Liveness Check

**GET** `/api/live/`

Check if the API is running.

---

## Authentication

### Register User

**POST** `/auth/registration/`

Register a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password1": "securepassword123",
  "password2": "securepassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_premium": false
  }
}
```

### Login

**POST** `/auth/login/`

Authenticate user and get access tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_premium": false
  }
}
```

### Refresh Token

**POST** `/auth/token/refresh/`

Get new access token using refresh token.

**Request:**

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Logout

**POST** `/auth/logout/`

Logout user and blacklist refresh token.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200):**

```json
{
  "detail": "Successfully logged out."
}
```

### Password Reset

**POST** `/auth/password/reset/`

Request password reset email.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "detail": "Password reset e-mail has been sent."
}
```

---

## User Management

### List Users (Admin Only)

**GET** `/users/`

Get paginated list of all users.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

- `page` (integer): Page number
- `page_size` (integer): Items per page (max 100)
- `search` (string): Search in email, name
- `is_premium` (boolean): Filter by premium status

**Response (200):**

```json
{
  "count": 150,
  "next": "http://api.example.com/users/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_premium": false,
      "date_joined": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-20T14:15:00Z",
      "profile": {
        "avatar": null,
        "phone_number": "+1234567890"
      }
    }
  ]
}
```

### Search Users (Admin Only)

**GET** `/users/search/`

Search users by email or name.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

- `q` (string, required): Search query
- `limit` (integer): Max results (default 20)

**Response (200):**

```json
{
  "results": [
    {
      "id": 1,
      "email": "john@example.com",
      "full_name": "John Doe",
      "avatar": null,
      "is_premium": false
    }
  ],
  "total": 1
}
```

### Get User Details (Admin Only)

**GET** `/users/{id}/`

Get detailed information about a specific user.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_premium": false,
  "is_active": true,
  "date_joined": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-20T14:15:00Z",
  "profile": {
    "phone_number": "+1234567890",
    "avatar": null,
    "gender": "M",
    "height": 175.5,
    "weight": 70.2,
    "activity_level": "moderately_active",
    "daily_calorie_goal": 2200,
    "daily_protein_goal": 150,
    "daily_carbs_goal": 275,
    "daily_fat_goal": 73,
    "dietary_restrictions": ["vegetarian"],
    "receive_email_notifications": true,
    "receive_push_notifications": true,
    "receive_sms_notifications": false
  }
}
```

### Update User (Admin Only)

**PUT/PATCH** `/users/{id}/`

Update user information.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "first_name": "John",
  "last_name": "Smith",
  "is_premium": true
}
```

**Response (200):** Returns updated user object.

### Delete User (Admin Only)

**DELETE** `/users/{id}/`

Soft delete a user account.

**Headers:** `Authorization: Bearer <access_token>`

**Response (204):** No content.

### Get User Profile

**GET** `/users/{id}/profile/`

Get user's profile information. Users can only access their own profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "phone_number": "+1234567890",
  "avatar": "https://example.com/avatars/user1.jpg",
  "gender": "M",
  "height": 175.5,
  "weight": 70.2,
  "activity_level": "moderately_active",
  "daily_calorie_goal": 2200,
  "daily_protein_goal": 150,
  "daily_carbs_goal": 275,
  "daily_fat_goal": 73,
  "dietary_restrictions": ["vegetarian", "gluten_free"],
  "notification_preferences": {
    "meal_reminders": true,
    "goal_achievements": true,
    "weekly_reports": true
  }
}
```

### Get User Meals

**GET** `/users/{id}/meals/`

Get user's meal history with pagination.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

- `page` (integer): Page number
- `page_size` (integer): Items per page
- `date_from` (date): Filter from date (YYYY-MM-DD)
- `date_to` (date): Filter to date (YYYY-MM-DD)

**Response (200):**

```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Breakfast Bowl",
      "image": "https://example.com/meals/1.jpg",
      "consumed_at": "2024-01-20T08:30:00Z",
      "total_calories": 450,
      "total_protein": 25.5,
      "total_carbs": 35.2,
      "total_fat": 18.3,
      "meal_items": [
        {
          "food_item": "Oatmeal",
          "quantity": 100,
          "unit": "g",
          "calories": 350
        }
      ]
    }
  ]
}
```

### Get User Statistics

**GET** `/users/{id}/statistics/`

Get user's nutrition and activity statistics.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

- `period` (string): `week`, `month`, `year` (default: `month`)

**Response (200):**

```json
{
  "period": "month",
  "total_meals": 85,
  "average_daily_calories": 2150,
  "average_daily_protein": 145,
  "average_daily_carbs": 265,
  "average_daily_fat": 68,
  "goal_adherence": {
    "calories": 95.5,
    "protein": 96.7,
    "carbs": 96.4,
    "fat": 93.2
  },
  "favorite_meals": 12,
  "streak_days": 15,
  "most_common_meal_time": "08:30",
  "weekly_trend": {
    "calories": [2100, 2200, 2050, 2300, 2150, 2100, 2250],
    "meals": [3, 4, 3, 4, 3, 3, 4]
  }
}
```

---

## AI Analysis

### Basic Food Image Analysis

**POST** `/ai/analyze/`

Analyze a food image using Google Gemini Vision API and create a meal with nutritional information.

**Request (multipart/form-data):**
- `image` (file, required): Food image (JPG, PNG, WebP, max 10MB)
- `meal_type` (string, optional): "breakfast", "lunch", "dinner", "snack", "other"
- `location_name` (string, optional): Location name for context
- `latitude` (float, optional): Latitude for location context
- `longitude` (float, optional): Longitude for location context

**Response (200):**
```json
{
    "meal": {
        "id": "uuid",
        "name": "Grilled Chicken Salad",
        "meal_type": "lunch",
        "consumed_at": "2025-07-15T12:00:00Z",
        "total_calories": 350,
        "location_name": "Home Kitchen",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "meal_items": [
            {
                "id": "uuid",
                "food_item_name": "Grilled Chicken Breast",
                "quantity": 150,
                "unit": "g",
                "calories": 231,
                "protein": 43.5,
                "carbohydrates": 0,
                "fat": 5.0
            },
            {
                "id": "uuid",
                "food_item_name": "Mixed Greens",
                "quantity": 100,
                "unit": "g",
                "calories": 20,
                "protein": 2.0,
                "carbohydrates": 4.0,
                "fat": 0.3
            }
        ]
    },
    "analysis": {
        "confidence_overall": 85,
        "confidence_ingredients": 90,
        "confidence_portions": 80,
        "analysis_context": {
            "location": "Home Kitchen",
            "time": "2025-07-15T12:00:00Z",
            "lighting": "good",
            "image_quality": "high"
        }
    }
}
```

### Progressive Food Analysis

**POST** `/ai/progressive-analyze/`

Start a progressive analysis that continues until target confidence is reached.

**Request (multipart/form-data):**
- `image` (file, required): Food image
- `meal_type` (string, optional): Meal type
- `target_confidence` (int, optional): Target confidence level (default: 80)

**Response (202):**
```json
{
    "session_id": "progressive_session_uuid",
    "status": "processing",
    "progress": {
        "current_step": 1,
        "total_steps": 3,
        "current_confidence": 65,
        "target_confidence": 80
    }
}
```

### Get Progressive Analysis Status

**GET** `/ai/progressive-status/{session_id}/`

Check the status of a progressive analysis session.

**Response (200):**
```json
{
    "session_id": "progressive_session_uuid",
    "status": "completed",
    "progress": {
        "current_step": 3,
        "total_steps": 3,
        "current_confidence": 87,
        "target_confidence": 80
    },
    "meal": {
        "id": "uuid",
        "name": "Analyzed Meal",
        "meal_items": [...]
    },
    "analysis": {
        "confidence_overall": 87,
        "confidence_ingredients": 90,
        "confidence_portions": 85
    }
}
```

### Confidence Routing Analysis

**POST** `/ai/confidence-analyze/`

Analyze food image with confidence-based routing to different AI models.

**Request (multipart/form-data):**
- `image` (file, required): Food image
- `meal_type` (string, optional): Meal type
- `confidence_threshold` (int, optional): Minimum confidence threshold

**Response (200):**
```json
{
    "meal": {...},
    "analysis": {
        "confidence_overall": 92,
        "routing_decision": "high_confidence_model",
        "model_used": "gemini-pro-vision",
        "fallback_used": false
    }
}
```

### Recalculate Nutrition

**POST** `/ai/recalculate/`

Recalculate nutritional information for a meal with updated ingredients.

**Request:**
```json
{
    "meal_id": "uuid",
    "meal_items": [
        {
            "food_item_name": "Chicken Breast",
            "quantity": 200,
            "unit": "g"
        }
    ]
}
```

**Response (200):**
```json
{
    "meal": {
        "id": "uuid",
        "total_calories": 462,
        "total_macros": {
            "protein": 87.0,
            "carbohydrates": 0,
            "fat": 10.0
        },
        "meal_items": [...]
    }
}
```

### Get Progressive Analysis Statistics

**GET** `/ai/progressive-stats/`

Get statistics about progressive analysis performance.

**Response (200):**
```json
{
    "total_sessions": 156,
    "average_confidence_improvement": 23.5,
    "average_steps_to_target": 2.3,
    "success_rate": 94.2
}
```

### Get Confidence Routing Statistics

**GET** `/ai/confidence-stats/`

Get statistics about confidence routing performance.

**Response (200):**
```json
{
    "total_analyses": 1250,
    "routing_distribution": {
        "high_confidence": 68.2,
        "medium_confidence": 25.8,
        "low_confidence": 6.0
    },
    "average_confidence": 82.3
}
```

### Get Cache Statistics (Admin Only)

**GET** `/ai/cache-stats/`

Get AI analysis cache statistics.

**Response (200):**
```json
{
    "cache_hit_rate": 34.2,
    "total_cached_analyses": 428,
    "cache_size_mb": 156.7,
    "average_response_time_ms": 1250
}
```

### Clear AI Cache (Admin Only)

**POST** `/ai/clear-cache/`

Clear the AI analysis cache.

**Response (200):**
```json
{
    "message": "Cache cleared successfully",
    "items_cleared": 428
}
```

---

## Meals Management

### Create Meal

**POST** `/meals/`

Create a new meal manually or from analysis results.

**Request:**
```json
{
    "name": "Breakfast Bowl",
    "meal_type": "breakfast",
    "consumed_at": "2025-07-15T08:00:00Z",
    "notes": "Healthy breakfast",
    "meal_items": [
        {
            "food_item_name": "Oatmeal",
            "quantity": 100,
            "unit": "g"
        },
        {
            "food_item_name": "Banana",
            "quantity": 1,
            "unit": "medium"
        }
    ]
}
```

**Response (201):**
```json
{
    "id": "uuid",
    "name": "Breakfast Bowl",
    "meal_type": "breakfast",
    "consumed_at": "2025-07-15T08:00:00Z",
    "total_calories": 285,
    "total_macros": {
        "protein": 6.5,
        "carbohydrates": 58.2,
        "fat": 3.1
    },
    "meal_items": [...]
}
```

### Get All Meals

**GET** `/meals/`

Get all meals for the authenticated user.

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page (max 100)
- `meal_type` (string): Filter by meal type
- `start_date` (date): Filter meals after this date
- `end_date` (date): Filter meals before this date

**Response (200):**
```json
{
    "count": 150,
    "next": "http://api.example.com/meals/?page=2",
    "previous": null,
    "results": [
        {
            "id": "uuid",
            "name": "Lunch Salad",
            "meal_type": "lunch",
            "consumed_at": "2025-07-15T12:00:00Z",
            "total_calories": 350,
            "items_count": 3,
            "is_favorite": false,
            "image": "http://example.com/media/meals/image.jpg"
        }
    ]
}
```

### Get Meal Details

**GET** `/meals/{meal_id}/`

Get detailed information about a specific meal.

**Response (200):**
```json
{
    "id": "uuid",
    "name": "Dinner Plate",
    "meal_type": "dinner",
    "consumed_at": "2025-07-15T19:00:00Z",
    "image": "http://example.com/media/meals/image.jpg",
    "notes": "Delicious dinner",
    "location_name": "Restaurant",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "total_calories": 650,
    "total_macros": {
        "protein": 45.2,
        "carbohydrates": 52.8,
        "fat": 28.3,
        "fiber": 8.5,
        "sugar": 12.1,
        "sodium": 890.5
    },
    "meal_items": [
        {
            "id": "uuid",
            "food_item_name": "Grilled Salmon",
            "quantity": 200,
            "unit": "g",
            "calories": 412,
            "protein": 38.4,
            "carbohydrates": 0,
            "fat": 27.8,
            "custom_name": "Atlantic Salmon",
            "notes": "Well cooked"
        }
    ],
    "is_favorite": false,
    "favorite_id": null,
    "created_at": "2025-07-15T19:00:00Z",
    "updated_at": "2025-07-15T19:00:00Z"
}
```

### Update Meal

**PUT** `/meals/{meal_id}/`

Update an existing meal.

**Request:**
```json
{
    "name": "Updated Meal Name",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T13:00:00Z",
    "notes": "Updated notes"
}
```

**Response (200):**
```json
{
    "id": "uuid",
    "name": "Updated Meal Name",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T13:00:00Z",
    "notes": "Updated notes",
    "total_calories": 350,
    "updated_at": "2025-07-15T13:15:00Z"
}
```

### Delete Meal

**DELETE** `/meals/{meal_id}/`

Delete a meal.

**Response (204):** No content

### Duplicate Meal

**POST** `/meals/{meal_id}/duplicate/`

Create a copy of an existing meal.

**Request:**
```json
{
    "name": "Duplicated Meal",
    "consumed_at": "2025-07-15T14:00:00Z"
}
```

**Response (201):**
```json
{
    "id": "new_uuid",
    "name": "Duplicated Meal",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T14:00:00Z",
    "meal_items": [...],
    "total_calories": 350
}
```

### Get Meal Statistics

**GET** `/meals/statistics/`

Get meal statistics for the authenticated user.

**Response (200):**
```json
{
    "total_meals": 145,
    "total_calories": 185250,
    "average_calories_per_meal": 1278.6,
    "favorite_meal_type": "lunch",
    "meals_by_type": {
        "breakfast": 48,
        "lunch": 52,
        "dinner": 38,
        "snack": 7
    },
    "average_macros": {
        "protein": 45.2,
        "carbohydrates": 156.8,
        "fat": 52.3
    },
    "meals_this_week": 12,
    "meals_this_month": 48,
    "most_active_meal_time": "12:30"
}
```

---

## Notifications

### List Notifications

**GET** `/notifications/`

Get user's notifications with pagination.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

- `page` (integer): Page number
- `page_size` (integer): Items per page
- `status` (string): `pending`, `sent`, `read`
- `type` (string): Notification type filter
- `priority` (string): `low`, `medium`, `high`

**Response (200):**

```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "goal_achieved",
      "title": "Daily Calorie Goal Achieved! 🎯",
      "message": "Great job! You've reached 98% of your daily calorie goal.",
      "status": "sent",
      "priority": "medium",
      "channel": "in_app",
      "created_at": "2024-01-20T15:30:00Z",
      "read_at": null,
      "data": {
        "goal_type": "calories",
        "achieved_percentage": 98.5
      }
    }
  ]
}
```

### Get Notification Details

**GET** `/notifications/{id}/`

Get detailed information about a specific notification.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "goal_achieved",
  "title": "Daily Calorie Goal Achieved! 🎯",
  "message": "Great job! You've reached 98% of your daily calorie goal.",
  "status": "sent",
  "priority": "medium",
  "channel": "in_app",
  "created_at": "2024-01-20T15:30:00Z",
  "read_at": null,
  "sent_at": "2024-01-20T15:30:00Z",
  "data": {
    "goal_type": "calories",
    "achieved_percentage": 98.5,
    "goal_value": 2200,
    "achieved_value": 2167
  }
}
```

### Mark Notification as Read

**POST** `/notifications/{id}/read/`

Mark a notification as read.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "read",
  "read_at": "2024-01-20T16:00:00Z"
}
```

### Mark All Notifications as Read

**POST** `/notifications/mark-all-read/`

Mark all user's notifications as read.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "updated_count": 15,
  "message": "All notifications marked as read"
}
```

### Get Notification Statistics

**GET** `/notifications/stats/`

Get user's notification statistics.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "total_count": 125,
  "unread_count": 8,
  "read_count": 117,
  "by_type": {
    "goal_achieved": 25,
    "meal_reminder": 45,
    "weekly_summary": 12,
    "streak_milestone": 3
  },
  "by_priority": {
    "low": 85,
    "medium": 35,
    "high": 5
  }
}
```

### Get Notification Preferences

**GET** `/notifications/preferences/`

Get user's notification preferences.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "receive_email_notifications": true,
  "receive_push_notifications": true,
  "receive_sms_notifications": false,
  "email_daily_summary": true,
  "email_weekly_report": true,
  "email_tips": false,
  "meal_reminder_times": ["08:00", "12:30", "19:00"],
  "notification_preferences": {
    "goal_achievements": true,
    "streak_milestones": true,
    "meal_reminders": true,
    "weekly_reports": true,
    "tips_and_insights": false
  }
}
```

### Update Notification Preferences

**PUT/PATCH** `/notifications/preferences/`

Update user's notification preferences.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "receive_email_notifications": true,
  "receive_push_notifications": true,
  "receive_sms_notifications": true,
  "meal_reminder_times": ["08:00", "13:00", "19:30"],
  "notification_preferences": {
    "goal_achievements": true,
    "meal_reminders": false
  }
}
```

**Response (200):**

```json
{
  "message": "Notification preferences updated successfully",
  "preferences": {
    "receive_email_notifications": true,
    "receive_push_notifications": true,
    "receive_sms_notifications": true,
    "meal_reminder_times": ["08:00", "13:00", "19:30"]
  }
}
```

---

_[Continued in next part due to length limits...]_
