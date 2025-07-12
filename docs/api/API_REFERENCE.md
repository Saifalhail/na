# API Reference - Nutrition AI Backend

Complete reference for all API endpoints with request/response schemas.

**Base URL:** `https://your-domain.com/api/v1/` (production) or `http://127.0.0.1:8000/api/v1/` (development)

**Authentication:** JWT Bearer tokens required for most endpoints.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Meals & Analysis](#meals--analysis)
4. [Notifications](#notifications)
5. [Payments & Subscriptions](#payments--subscriptions)
6. [Mobile Optimized](#mobile-optimized)
7. [Admin & Analytics](#admin--analytics)
8. [WebSocket Endpoints](#websocket-endpoints)
9. [Webhook Endpoints](#webhook-endpoints)

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

## Meals & Analysis

### Analyze Food Image
**POST** `/ai/analyze/`

Analyze a food image and get nutritional information.

**Headers:** 
- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Request (Form Data):**
- `image` (file): Food image (JPEG, PNG, WebP, HEIF)
- `meal_type` (string, optional): `breakfast`, `lunch`, `dinner`, `snack`
- `cuisine_type` (string, optional): e.g., `italian`, `chinese`, `mexican`
- `context` (JSON string, optional): Additional context data

**Response (200):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "analysis_complete": true,
  "overall_progress": 100,
  "final_result": {
    "items": [
      {
        "name": "Grilled Chicken Breast",
        "quantity": 150,
        "unit": "g",
        "confidence": 92.5,
        "calories": 231,
        "protein": 43.5,
        "carbohydrates": 0,
        "fat": 5.0,
        "fiber": 0,
        "sugar": 0,
        "sodium": 74
      },
      {
        "name": "Brown Rice",
        "quantity": 100,
        "unit": "g",
        "confidence": 88.2,
        "calories": 111,
        "protein": 2.6,
        "carbohydrates": 23,
        "fat": 0.9,
        "fiber": 1.8,
        "sugar": 0.4,
        "sodium": 5
      }
    ],
    "total_nutrition": {
      "calories": 342,
      "protein": 46.1,
      "carbohydrates": 23,
      "fat": 5.9,
      "fiber": 1.8,
      "sugar": 0.4,
      "sodium": 79
    },
    "dietary_flags": ["high_protein", "low_carb"],
    "allergens": [],
    "cuisine_detected": "american",
    "meal_type_detected": "lunch"
  }
}
```

### Get Analysis Progress
**GET** `/ai/analyze/{session_id}/`

Get progress of an ongoing analysis.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "overall_progress": 75,
  "current_stage": "nutritional_analysis",
  "status": "processing",
  "stages": {
    "image_preprocessing": {"status": "completed", "progress": 100},
    "food_detection": {"status": "completed", "progress": 100},
    "portion_estimation": {"status": "completed", "progress": 100},
    "nutritional_analysis": {"status": "processing", "progress": 75},
    "result_compilation": {"status": "pending", "progress": 0}
  }
}
```

### Create Meal from Analysis
**POST** `/meals/`

Create a new meal from analysis results.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "name": "Lunch - Chicken & Rice",
  "image": "path/to/uploaded/image.jpg",
  "meal_type": "lunch",
  "consumed_at": "2024-01-20T12:30:00Z",
  "analysis_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "meal_items": [
    {
      "food_item_name": "Grilled Chicken Breast",
      "quantity": 150,
      "unit": "g",
      "calories": 231,
      "protein": 43.5,
      "carbohydrates": 0,
      "fat": 5.0
    }
  ]
}
```

**Response (201):**
```json
{
  "id": 123,
  "name": "Lunch - Chicken & Rice",
  "image": "https://example.com/meals/123.jpg",
  "meal_type": "lunch",
  "consumed_at": "2024-01-20T12:30:00Z",
  "total_calories": 342,
  "total_protein": 46.1,
  "total_carbs": 23,
  "total_fat": 5.9,
  "created_at": "2024-01-20T12:35:00Z",
  "meal_items": [
    {
      "id": 456,
      "food_item": "Grilled Chicken Breast",
      "quantity": 150,
      "unit": "g",
      "calories": 231,
      "protein": 43.5,
      "carbohydrates": 0,
      "fat": 5.0
    }
  ]
}
```

### List Meals
**GET** `/meals/`

Get user's meals with filtering and pagination.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (integer): Page number
- `page_size` (integer): Items per page
- `meal_type` (string): Filter by meal type
- `date` (date): Filter by specific date
- `date_from` (date): Filter from date
- `date_to` (date): Filter to date
- `search` (string): Search in meal names

**Response (200):**
```json
{
  "count": 45,
  "next": "http://api.example.com/meals/?page=2",
  "previous": null,
  "results": [
    {
      "id": 123,
      "name": "Breakfast Bowl",
      "image": "https://example.com/meals/123.jpg",
      "meal_type": "breakfast",
      "consumed_at": "2024-01-20T08:30:00Z",
      "total_calories": 450,
      "is_favorite": false
    }
  ]
}
```

### Get Meal Details
**GET** `/meals/{id}/`

Get detailed information about a specific meal.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "id": 123,
  "name": "Breakfast Bowl",
  "image": "https://example.com/meals/123.jpg",
  "meal_type": "breakfast",
  "consumed_at": "2024-01-20T08:30:00Z",
  "total_calories": 450,
  "total_protein": 25.5,
  "total_carbs": 35.2,
  "total_fat": 18.3,
  "total_fiber": 8.2,
  "total_sugar": 12.1,
  "total_sodium": 245,
  "is_favorite": true,
  "created_at": "2024-01-20T08:35:00Z",
  "updated_at": "2024-01-20T08:35:00Z",
  "meal_items": [
    {
      "id": 456,
      "food_item": "Oatmeal",
      "quantity": 100,
      "unit": "g",
      "calories": 350,
      "protein": 10.5,
      "carbohydrates": 58.2,
      "fat": 6.3,
      "fiber": 8.2,
      "sugar": 1.1,
      "sodium": 245
    }
  ]
}
```

### Update Meal
**PUT/PATCH** `/meals/{id}/`

Update meal information.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "name": "Updated Breakfast Bowl",
  "meal_type": "breakfast",
  "consumed_at": "2024-01-20T09:00:00Z"
}
```

**Response (200):** Returns updated meal object.

### Delete Meal
**DELETE** `/meals/{id}/`

Delete a meal.

**Headers:** `Authorization: Bearer <access_token>`

**Response (204):** No content.

### Add/Remove Favorite
**POST** `/meals/{id}/favorite/`
**DELETE** `/meals/{id}/favorite/`

Add or remove meal from favorites.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "is_favorite": true,
  "message": "Meal added to favorites"
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

*[Continued in next part due to length limits...]*