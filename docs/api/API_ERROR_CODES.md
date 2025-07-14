# API Error Codes and Responses

This document provides a comprehensive list of all error codes and standardized error responses used in the Nutrition AI API.

## Error Response Format

All API errors follow a consistent JSON format:

```json
{
  "error": "Error message",
  "error_code": "ERROR_CODE_CONSTANT",
  "details": {
    "field_name": ["Field-specific error message"]
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Error Response Fields

- **error**: Human-readable error message
- **error_code**: Machine-readable error code constant
- **details**: Optional object containing field-specific validation errors
- **timestamp**: ISO 8601 timestamp when the error occurred
- **request_id**: Unique identifier for the request (for debugging)

## HTTP Status Codes

### 400 Bad Request

Used when the request is malformed or contains invalid data.

### 401 Unauthorized

Used when authentication is required but not provided or invalid.

### 403 Forbidden

Used when the user is authenticated but lacks permission for the requested action.

### 404 Not Found

Used when the requested resource cannot be found.

### 422 Unprocessable Entity

Used when the request is well-formed but contains semantic errors.

### 429 Too Many Requests

Used when rate limiting is triggered.

### 500 Internal Server Error

Used for unexpected server errors.

### 502 Bad Gateway

Used when external service dependencies are unavailable.

### 503 Service Unavailable

Used when the service is temporarily unavailable.

## Error Code Categories

### General Errors (1000-1999)

| Error Code               | HTTP Status | Description                                 |
| ------------------------ | ----------- | ------------------------------------------- |
| `INVALID_REQUEST`        | 400         | Request format is invalid or malformed      |
| `MISSING_REQUIRED_FIELD` | 400         | Required field is missing from request      |
| `INVALID_FIELD_VALUE`    | 400         | Field contains invalid value or format      |
| `RESOURCE_NOT_FOUND`     | 404         | Requested resource does not exist           |
| `METHOD_NOT_ALLOWED`     | 405         | HTTP method not supported for this endpoint |
| `RATE_LIMIT_EXCEEDED`    | 429         | Too many requests in time window            |
| `INTERNAL_SERVER_ERROR`  | 500         | Unexpected server error occurred            |
| `SERVICE_UNAVAILABLE`    | 503         | Service temporarily unavailable             |

### Authentication Errors (2000-2999)

| Error Code                 | HTTP Status | Description                           |
| -------------------------- | ----------- | ------------------------------------- |
| `AUTHENTICATION_REQUIRED`  | 401         | Authentication credentials required   |
| `INVALID_CREDENTIALS`      | 401         | Invalid username/password combination |
| `TOKEN_EXPIRED`            | 401         | JWT token has expired                 |
| `TOKEN_INVALID`            | 401         | JWT token is malformed or invalid     |
| `TOKEN_MISSING`            | 401         | Authorization token not provided      |
| `REFRESH_TOKEN_EXPIRED`    | 401         | Refresh token has expired             |
| `REFRESH_TOKEN_INVALID`    | 401         | Refresh token is invalid              |
| `ACCOUNT_DISABLED`         | 403         | User account has been disabled        |
| `INSUFFICIENT_PERMISSIONS` | 403         | User lacks required permissions       |

### Image Analysis Errors (3000-3999)

| Error Code               | HTTP Status | Description                           |
| ------------------------ | ----------- | ------------------------------------- |
| `IMAGE_REQUIRED`         | 400         | Image file is required for analysis   |
| `IMAGE_FORMAT_INVALID`   | 400         | Image format not supported            |
| `IMAGE_SIZE_TOO_LARGE`   | 400         | Image file size exceeds maximum limit |
| `IMAGE_SIZE_TOO_SMALL`   | 400         | Image resolution too low for analysis |
| `IMAGE_CORRUPTED`        | 400         | Image file is corrupted or unreadable |
| `NO_FOOD_DETECTED`       | 422         | No food items detected in image       |
| `ANALYSIS_FAILED`        | 500         | AI analysis service failed            |
| `AI_SERVICE_UNAVAILABLE` | 502         | External AI service unavailable       |
| `AI_QUOTA_EXCEEDED`      | 429         | AI service quota exceeded             |
| `GEMINI_API_ERROR`       | 502         | Google Gemini API returned error      |

### Nutrition Data Errors (4000-4999)

| Error Code                 | HTTP Status | Description                       |
| -------------------------- | ----------- | --------------------------------- |
| `NUTRITION_DATA_NOT_FOUND` | 404         | Nutrition data entry not found    |
| `INVALID_SERVING_SIZE`     | 400         | Serving size value is invalid     |
| `INGREDIENT_NOT_FOUND`     | 404         | Specified ingredient not found    |
| `INVALID_INGREDIENT_DATA`  | 400         | Ingredient data format is invalid |
| `RECALCULATION_FAILED`     | 500         | Nutrition recalculation failed    |
| `INSUFFICIENT_DATA`        | 422         | Insufficient data for calculation |

### File Upload Errors (5000-5999)

| Error Code               | HTTP Status | Description                     |
| ------------------------ | ----------- | ------------------------------- |
| `FILE_UPLOAD_FAILED`     | 400         | File upload process failed      |
| `FILE_TYPE_NOT_ALLOWED`  | 400         | File type not permitted         |
| `FILE_SIZE_EXCEEDED`     | 400         | File size exceeds maximum limit |
| `STORAGE_QUOTA_EXCEEDED` | 507         | Storage quota exceeded          |
| `STORAGE_SERVICE_ERROR`  | 500         | File storage service error      |

### Validation Errors (6000-6999)

| Error Code            | HTTP Status | Description                        |
| --------------------- | ----------- | ---------------------------------- |
| `VALIDATION_ERROR`    | 400         | General validation error           |
| `EMAIL_INVALID`       | 400         | Email format is invalid            |
| `PASSWORD_TOO_WEAK`   | 400         | Password doesn't meet requirements |
| `USERNAME_TAKEN`      | 400         | Username already exists            |
| `EMAIL_TAKEN`         | 400         | Email already registered           |
| `PHONE_INVALID`       | 400         | Phone number format invalid        |
| `DATE_INVALID`        | 400         | Date format or value invalid       |
| `NUMBER_OUT_OF_RANGE` | 400         | Numeric value outside valid range  |

## Example Error Responses

### Validation Error Example

```json
{
  "error": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "email": ["Email format is invalid"],
    "password": ["Password must be at least 8 characters"]
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Image Analysis Error Example

```json
{
  "error": "No food items detected in the provided image",
  "error_code": "NO_FOOD_DETECTED",
  "details": {
    "suggestion": "Please ensure the image clearly shows food items with good lighting"
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Authentication Error Example

```json
{
  "error": "JWT token has expired",
  "error_code": "TOKEN_EXPIRED",
  "details": {
    "expired_at": "2025-01-10T09:30:00Z",
    "action": "Please refresh your token or login again"
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Rate Limiting Error Example

```json
{
  "error": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "1 hour",
    "retry_after": 3600
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "request_id": "req_123456789"
}
```

## Error Handling Best Practices

### For API Consumers

1. **Always check the HTTP status code** before parsing the response
2. **Use the error_code field** for programmatic error handling
3. **Display the error message** to users when appropriate
4. **Log the request_id** for debugging and support purposes
5. **Handle rate limiting** by respecting retry_after values
6. **Implement exponential backoff** for retrying failed requests

### For Frontend Applications

1. **Graceful degradation** when services are unavailable
2. **User-friendly error messages** instead of raw API errors
3. **Retry mechanisms** for transient errors
4. **Offline mode** when possible
5. **Error reporting** to help improve the service

## Changelog

- **v1.0.0** (2025-01-10): Initial error code specification
- More versions will be added as the API evolves
