# API Documentation - Nutrition AI

Complete API reference for the Nutrition AI backend service.

## Quick Start

- **Base URL**: `http://127.0.0.1:8000/api/v1/` (development)
- **Authentication**: JWT Bearer tokens
- **Content-Type**: `application/json`
- **Interactive Docs**: `http://127.0.0.1:8000/api/docs/`

## Documentation Structure

| File | Purpose |
|------|---------|
| `POSTMAN_GUIDE.md` | Complete Postman collection and testing guide |
| `API_INTEGRATION.md` | Integration patterns and best practices |
| `API_CHANGELOG.md` | Version history and breaking changes |
| `API_ERROR_CODES.md` | Error codes and troubleshooting |
| `API_REFERENCE.md` | Complete endpoint reference |

## Authentication

All API requests (except registration and login) require authentication:

```http
Authorization: Bearer <access_token>
```

### Get Access Token

```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

## Core Endpoints

### Authentication
- `POST /auth/register/` - User registration
- `POST /auth/login/` - User login
- `POST /auth/logout/` - User logout
- `POST /auth/refresh/` - Refresh access token
- `POST /auth/password/reset/` - Password reset

### AI Analysis
- `POST /ai/analyze/` - Analyze food image
- `POST /ai/recalculate/` - Recalculate nutrition

### Meals
- `GET /meals/` - List user meals
- `POST /meals/` - Create new meal
- `GET /meals/{id}/` - Get meal details
- `PUT /meals/{id}/` - Update meal
- `DELETE /meals/{id}/` - Delete meal

### User Profile
- `GET /auth/profile/` - Get user profile
- `PUT /auth/profile/` - Update user profile

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/auth/login/` | 5 requests/minute |
| `/ai/analyze/` | 10 requests/minute |
| `/ai/recalculate/` | 20 requests/minute |
| General API | 100 requests/minute |

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["This field is required."]
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Examples

### Analyze Food Image

```http
POST /api/v1/ai/analyze/
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "image": <file>,
  "context": {
    "meal_type": "lunch",
    "cuisine": "italian"
  }
}
```

Response:
```json
{
  "data": {
    "analysis_id": "abc123",
    "food_items": [
      {
        "name": "Spaghetti Carbonara",
        "quantity": 1,
        "unit": "serving",
        "nutrition": {
          "calories": 450,
          "protein": 18,
          "carbohydrates": 55,
          "fat": 16
        }
      }
    ],
    "total_nutrition": {
      "calories": 450,
      "protein": 18,
      "carbohydrates": 55,
      "fat": 16
    },
    "confidence": 0.85
  }
}
```

### Create Meal

```http
POST /api/v1/meals/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Healthy Lunch",
  "meal_type": "lunch",
  "meal_items": [
    {
      "food_item_name": "Grilled Chicken",
      "quantity": 150,
      "unit": "grams"
    },
    {
      "food_item_name": "Brown Rice",
      "quantity": 1,
      "unit": "cup"
    }
  ]
}
```

## Testing

### Postman Collection

Import the Postman collection from `POSTMAN_GUIDE.md` for complete API testing.

### cURL Examples

```bash
# Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Get meals
curl -X GET http://127.0.0.1:8000/api/v1/meals/ \
  -H "Authorization: Bearer <token>"
```

## SDKs and Libraries

### JavaScript/TypeScript

```typescript
import { NutritionAIClient } from './api-client';

const client = new NutritionAIClient({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  apiKey: 'your-token'
});

// Analyze image
const result = await client.ai.analyzeImage(imageFile, {
  meal_type: 'lunch'
});
```

### Python

```python
from nutrition_ai_client import NutritionAI

client = NutritionAI(
    base_url='http://127.0.0.1:8000/api/v1',
    api_key='your-token'
)

# Create meal
meal = client.meals.create({
    'name': 'Breakfast',
    'meal_type': 'breakfast',
    'meal_items': [...]
})
```

## Support

- **Interactive Docs**: http://127.0.0.1:8000/api/docs/
- **Error Codes**: See `API_ERROR_CODES.md`
- **Integration Guide**: See `API_INTEGRATION.md`
- **Troubleshooting**: See `../guides/TROUBLESHOOTING.md`