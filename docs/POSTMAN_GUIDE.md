# Postman API Testing Guide

This guide provides instructions for testing the Nutrition AI API endpoints using Postman.

## Base URL
- Development: `http://127.0.0.1:8000`
- API Base Path: `/api/v1/`

## API Documentation
- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`
- OpenAPI Schema: `http://127.0.0.1:8000/api/schema/`

## Endpoints

### 1. Analyze Image
**POST** `/api/v1/analyze-image/`

Analyzes a food image and returns nutritional information.

**Request:**
- Method: POST
- Headers: None required (authentication not implemented yet)
- Body: form-data
  - `image` (file): The food image to analyze

**Example Response:**
```json
{
    "id": 1,
    "calories": 450.00,
    "protein": 25.50,
    "carbohydrates": 38.20,
    "fat": 18.75,
    "fiber": 5.20,
    "sugar": 8.30,
    "sodium": 680.00,
    "serving_size": "1 plate",
    "servings_per_recipe": 1.0,
    "ingredients": [
        {
            "name": "Chicken breast",
            "quantity": 150.0,
            "unit": "grams",
            "calories": 247.50
        },
        {
            "name": "Brown rice",
            "quantity": 100.0,
            "unit": "grams",
            "calories": 112.00
        }
    ],
    "created_at": "2025-01-10T10:30:00Z"
}
```

### 2. Recalculate Nutrition (Without Image)
**POST** `/api/v1/recalculate/`

Calculates nutritional information based on a list of ingredients.

**Request:**
- Method: POST
- Headers: 
  - `Content-Type: application/json`
- Body: JSON
```json
{
    "ingredients": [
        {
            "name": "Chicken breast",
            "quantity": 200,
            "unit": "grams"
        },
        {
            "name": "Quinoa",
            "quantity": 150,
            "unit": "grams"
        }
    ]
}
```

**Example Response:**
```json
{
    "success": true,
    "data": {
        "total_calories": 585.0,
        "total_protein": 54.5,
        "total_carbohydrates": 55.5,
        "total_fat": 8.1,
        "ingredients": [
            {
                "name": "Chicken breast",
                "quantity": 200,
                "unit": "grams",
                "calories": 330.0,
                "protein": 62.0,
                "carbohydrates": 0.0,
                "fat": 7.2
            },
            {
                "name": "Quinoa",
                "quantity": 150,
                "unit": "grams",
                "calories": 180.0,
                "protein": 6.0,
                "carbohydrates": 32.0,
                "fat": 2.8
            }
        ]
    }
}
```

### 3. Get Nutrition Data Details
**GET** `/api/v1/nutrition/{id}/`

Retrieves details of a specific nutrition analysis.

**Request:**
- Method: GET
- URL Parameters:
  - `id`: The ID of the nutrition data entry

**Example Response:**
```json
{
    "id": 1,
    "image": "http://127.0.0.1:8000/media/nutrition_images/food_image.jpg",
    "calories": 450.00,
    "protein": 25.50,
    "carbohydrates": 38.20,
    "fat": 18.75,
    "fiber": 5.20,
    "sugar": 8.30,
    "sodium": 680.00,
    "serving_size": "1 plate",
    "servings_per_recipe": 1.0,
    "ingredients": [...],
    "created_at": "2025-01-10T10:30:00Z",
    "updated_at": "2025-01-10T10:30:00Z"
}
```

### 4. Recalculate for Different Servings
**POST** `/api/v1/nutrition/{id}/recalculate/`

Recalculates nutrition values for a different number of servings.

**Request:**
- Method: POST
- URL Parameters:
  - `id`: The ID of the nutrition data entry
- Headers:
  - `Content-Type: application/json`
- Body: JSON
```json
{
    "servings": 2.5
}
```

**Example Response:**
```json
{
    "calories": 1125.0,
    "protein": 63.75,
    "carbohydrates": 95.5,
    "fat": 46.88,
    "fiber": 13.0,
    "sugar": 20.75,
    "sodium": 1700.0,
    "servings": 2.5
}
```

### 5. List Ingredients
**GET** `/api/v1/nutrition/{nutrition_data_id}/ingredients/`

Lists all ingredients for a specific nutrition analysis.

**Request:**
- Method: GET
- URL Parameters:
  - `nutrition_data_id`: The ID of the nutrition data entry

**Example Response:**
```json
[
    {
        "id": 1,
        "name": "Chicken breast",
        "quantity": 150.0,
        "unit": "grams",
        "calories": 247.50,
        "protein": 46.50,
        "carbohydrates": 0.00,
        "fat": 5.40
    },
    {
        "id": 2,
        "name": "Brown rice",
        "quantity": 100.0,
        "unit": "grams",
        "calories": 112.00,
        "protein": 2.60,
        "carbohydrates": 23.50,
        "fat": 0.90
    }
]
```

## Testing Tips

1. **Image Upload Testing:**
   - Use clear, well-lit food images for best results
   - Supported formats: JPEG, PNG
   - Maximum file size: 10MB (configurable)

2. **Mock Data:**
   - If Gemini API is not configured, the API returns mock data
   - Mock response always returns the same nutritional values

3. **Error Handling:**
   - All endpoints return consistent error responses
   - Error format:
   ```json
   {
       "error": "Error message here",
       "details": {...}  // Optional additional details
   }
   ```

4. **CORS:**
   - Default allowed origin: `http://localhost:3000`
   - Configure additional origins in `.env` file

## Deprecation Warnings

When using deprecated endpoints or features, you'll receive deprecation headers in the response:

```
Deprecated: true
X-API-Deprecation-Version: v2.0.0
X-API-Deprecation-Date: 2025-07-01
X-API-Deprecation-Alternative: POST /api/v2/analyze/
X-API-Deprecation-Reason: Replaced with improved analysis endpoint
Sunset: Tue, 01 Jul 2025 00:00:00 GMT
Link: </api/docs/>; rel="documentation", </docs/API_CHANGELOG.md>; rel="deprecation"
```

**Important:** Always check the [API Changelog](./API_CHANGELOG.md) for deprecation notices and migration guides.

## Common Issues

1. **Image Analysis Fails:**
   - Check that Gemini API key is properly configured
   - Ensure image is in supported format
   - Verify image file is not corrupted

2. **CORS Errors:**
   - Make sure your frontend URL is in CORS_ALLOWED_ORIGINS
   - Check that credentials are included if needed

3. **500 Internal Server Error:**
   - Check Django logs for detailed error messages
   - Verify database connection
   - Ensure all required environment variables are set

## Environment Variables

Required environment variables for full functionality:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `SECRET_KEY`: Django secret key (auto-generated for development)
- `DEBUG`: Set to `False` in production
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins