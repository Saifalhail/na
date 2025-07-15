# Simplified API Guide - Core Endpoints

Quick reference for essential Nutrition AI API endpoints after backend simplification.

## Overview

This guide covers the 10 core endpoints you'll use most frequently. For complete documentation, see [API_REFERENCE.md](./API_REFERENCE.md).

**Base URL**: `http://127.0.0.1:8000/api/v1/` (dev) | `https://api.nutritionai.com/api/v1/` (prod)

## Core Models

The simplified backend focuses on these 10 essential models:
- **User, UserProfile** - Authentication and user data
- **FoodItem, Meal, MealItem** - Food and meal tracking
- **MealAnalysis** - AI analysis results
- **Notification, DeviceToken** - Push notifications
- **SubscriptionPlan, Subscription, Payment** - Premium features

## Authentication

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**: Returns `access_token` and `refresh_token`

### Refresh Token
```http
POST /auth/refresh/
Content-Type: application/json

{
  "refresh": "your_refresh_token"
}
```

## Image Analysis (AI)

### Analyze Food Image
```http
POST /ai/analyze/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

image: <food_image_file>
meal_type: "lunch"
location_name: "Kitchen"
latitude: 40.7128
longitude: -74.0060
```

**Response**: Returns complete meal with nutritional analysis

### Progressive Analysis
```http
POST /ai/progressive-analyze/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

image: <food_image_file>
meal_type: "dinner"
target_confidence: 85
```

**Response**: Returns `session_id` for tracking progress

### Check Analysis Status
```http
GET /ai/progressive-status/{session_id}/
Authorization: Bearer <access_token>
```

## Meal Management

### Create Meal
```http
POST /meals/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Breakfast Bowl",
  "meal_type": "breakfast",
  "consumed_at": "2025-07-15T08:30:00Z",
  "meal_items": [
    {
      "food_item_name": "Oatmeal",
      "quantity": 100,
      "unit": "g"
    }
  ]
}
```

### List User Meals
```http
GET /meals/?page=1&meal_type=breakfast&date=2025-07-15
Authorization: Bearer <access_token>
```

### Get Meal Details
```http
GET /meals/{meal_id}/
Authorization: Bearer <access_token>
```

### Update Meal
```http
PUT /meals/{meal_id}/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Meal Name",
  "meal_type": "lunch"
}
```

### Delete Meal
```http
DELETE /meals/{meal_id}/
Authorization: Bearer <access_token>
```

### Duplicate Meal
```http
POST /meals/{meal_id}/duplicate/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Duplicated Meal",
  "consumed_at": "2025-07-15T14:00:00Z"
}
```

## User Management

### Get Profile
```http
GET /users/profile/
Authorization: Bearer <access_token>
```

### Update Profile
```http
PUT /users/profile/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "height": 175,
  "weight": 70,
  "activity_level": "moderately_active",
  "goal": "maintain"
}
```

### Get User Stats
```http
GET /users/{user_id}/stats/
Authorization: Bearer <access_token>
```

## Mobile Features

### Register Device
```http
POST /mobile/register-device/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "token": "ExponentPushToken[xxx]",
  "platform": "android",
  "device_id": "unique-device-id",
  "device_name": "User's Phone"
}
```

### Get Dashboard Data
```http
GET /mobile/dashboard/
Authorization: Bearer <access_token>
```

## Notifications

### List Notifications
```http
GET /notifications/
Authorization: Bearer <access_token>
```

### Mark as Read
```http
POST /notifications/{notification_id}/read/
Authorization: Bearer <access_token>
```

## Health Checks

### API Health
```http
GET /api/health/
```

### Service Health
```http
GET /api/health/services/
```

## Error Handling

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `413` - Image too large (max 10MB)
- `500` - Server Error

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

## Rate Limits

- **Authentication**: 30 requests/minute
- **Image Analysis**: 10 requests/minute
- **Other endpoints**: 100 requests/minute

## Image Upload Guidelines

### Supported Formats
- JPG, PNG, WebP
- Max file size: 10MB
- Recommended: Clear, well-lit food photos

### Best Practices
1. Use good lighting
2. Center food in frame
3. Avoid cluttered backgrounds
4. Include size references (hand, utensil)
5. Multiple angles for complex dishes

## Quick Start Examples

### Full Workflow Example
```bash
# 1. Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# 2. Analyze food image
curl -X POST http://127.0.0.1:8000/api/v1/ai/analyze/ \
  -H "Authorization: Bearer <access_token>" \
  -F "image=@food_photo.jpg" \
  -F "meal_type=lunch"

# 3. Get user meals
curl -X GET http://127.0.0.1:8000/api/v1/meals/ \
  -H "Authorization: Bearer <access_token>"

# 4. Update profile
curl -X PUT http://127.0.0.1:8000/api/v1/users/profile/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"height": 175, "weight": 70}'
```

## Testing Tools

- **Postman**: Use [ENHANCED_POSTMAN_GUIDE.md](./ENHANCED_POSTMAN_GUIDE.md)
- **Collection**: Import [POSTMAN_COLLECTION.json](./POSTMAN_COLLECTION.json)
- **Environment**: Use [POSTMAN_ENVIRONMENT.json](./POSTMAN_ENVIRONMENT.json)

## Related Documentation

- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [ENHANCED_POSTMAN_GUIDE.md](./ENHANCED_POSTMAN_GUIDE.md) - Postman testing guide
- [MOBILE_API_GUIDE.md](./MOBILE_API_GUIDE.md) - Mobile-specific endpoints
- [FRONTEND_API_INTEGRATION.md](./FRONTEND_API_INTEGRATION.md) - Frontend integration examples

---

*Last Updated: July 15, 2025*
*Version: 1.0.0*