# Enhanced Postman Testing Guide - Nutrition AI API

Complete guide for testing the Nutrition AI API endpoints using Postman, with special focus on image upload and AI analysis testing.

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [Environment Configuration](#environment-configuration)
3. [Authentication Setup](#authentication-setup)
4. [Core Endpoints Testing](#core-endpoints-testing)
5. [Image Upload & AI Analysis Testing](#image-upload--ai-analysis-testing)
6. [Advanced Testing Scenarios](#advanced-testing-scenarios)
7. [Automated Testing Scripts](#automated-testing-scripts)
8. [Error Handling & Troubleshooting](#error-handling--troubleshooting)

---

## Quick Setup

### 1. Import Collection

Download and import the Postman collection:
- **Collection File**: `/docs/api/POSTMAN_COLLECTION.json`
- **Import Method**: File > Import > Upload Files
- **Environment**: Import the environment variables file

### 2. Base URLs

| Environment | Base URL | Description |
|-------------|----------|-------------|
| Development | `http://127.0.0.1:8000` | Local development server |
| Production  | `https://api.nutritionai.com` | Production API server |

### 3. Essential Documentation

- **Swagger UI**: `{{baseUrl}}/api/docs/`
- **ReDoc**: `{{baseUrl}}/api/redoc/`
- **OpenAPI Schema**: `{{baseUrl}}/api/schema/`

---

## Environment Configuration

### Environment Variables

Set up these variables in your Postman environment:

| Variable | Value (Dev) | Value (Prod) | Description |
|----------|-------------|--------------|-------------|
| `baseUrl` | `http://127.0.0.1:8000` | `https://api.nutritionai.com` | Base API URL |
| `apiVersion` | `v1` | `v1` | API version |
| `apiBaseUrl` | `{{baseUrl}}/api/{{apiVersion}}` | `{{baseUrl}}/api/{{apiVersion}}` | Full API base URL |
| `accessToken` | `{{accessToken}}` | `{{accessToken}}` | JWT access token |
| `refreshToken` | `{{refreshToken}}` | `{{refreshToken}}` | JWT refresh token |
| `userId` | `{{userId}}` | `{{userId}}` | Current user ID |
| `testImage` | `test-meal.jpg` | `test-meal.jpg` | Test image filename |

### Pre-request Scripts

Add this to your collection's pre-request script for automatic token management:

```javascript
// Auto-refresh token if expired
const accessToken = pm.environment.get('accessToken');
const refreshToken = pm.environment.get('refreshToken');

if (!accessToken && refreshToken) {
    // Refresh token logic
    pm.sendRequest({
        url: pm.environment.get('apiBaseUrl') + '/auth/refresh/',
        method: 'POST',
        header: {
            'Content-Type': 'application/json',
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                'refresh': refreshToken
            })
        }
    }, function (err, response) {
        if (response.code === 200) {
            const jsonData = response.json();
            pm.environment.set('accessToken', jsonData.access);
            if (jsonData.refresh) {
                pm.environment.set('refreshToken', jsonData.refresh);
            }
        }
    });
}
```

---

## Authentication Setup

### 1. User Registration

**Endpoint**: `POST {{apiBaseUrl}}/auth/registration/`

**Request Body**:
```json
{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User",
    "terms_accepted": true,
    "marketing_consent": false
}
```

**Test Script**:
```javascript
pm.test("User registration successful", function () {
    pm.response.to.have.status(201);
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
    pm.expect(jsonData.user).to.have.property('email');
    pm.environment.set('userId', jsonData.user.id);
});
```

### 2. User Login

**Endpoint**: `POST {{apiBaseUrl}}/auth/login/`

**Request Body**:
```json
{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
}
```

**Test Script**:
```javascript
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('access_token');
    pm.expect(jsonData).to.have.property('refresh_token');
    
    // Store tokens
    pm.environment.set('accessToken', jsonData.access_token);
    pm.environment.set('refreshToken', jsonData.refresh_token);
    pm.environment.set('userId', jsonData.user.id);
});
```

### 3. Token Refresh

**Endpoint**: `POST {{apiBaseUrl}}/auth/refresh/`

**Request Body**:
```json
{
    "refresh": "{{refreshToken}}"
}
```

---

## Core Endpoints Testing

### Health Check

**Endpoint**: `GET {{baseUrl}}/api/health/`

**Expected Response**:
```json
{
    "status": "healthy",
    "timestamp": "2025-07-15T10:00:00.000Z",
    "version": "1.0.0"
}
```

### User Profile

**Endpoint**: `GET {{apiBaseUrl}}/users/profile/`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Test Script**:
```javascript
pm.test("Profile retrieved successfully", function () {
    pm.response.to.have.status(200);
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('email');
    pm.expect(jsonData).to.have.property('first_name');
    pm.expect(jsonData).to.have.property('last_name');
});
```

### Meal Creation

**Endpoint**: `POST {{apiBaseUrl}}/meals/`

**Headers**:
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Request Body**:
```json
{
    "name": "Test Meal",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T12:00:00.000Z",
    "notes": "Created via Postman testing",
    "meal_items": [
        {
            "food_item_name": "Chicken Breast",
            "quantity": 150,
            "unit": "g"
        }
    ]
}
```

---

## Image Upload & AI Analysis Testing

### Prerequisites

1. **Test Images**: Prepare test images of food in your file system
2. **Image Formats**: Support JPG, PNG, WebP (max 10MB)
3. **Image Quality**: Use clear, well-lit food photos for best results

### 1. Basic Image Analysis

**Endpoint**: `POST {{apiBaseUrl}}/ai/analyze/`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Request Body** (form-data):
```
Key: image
Type: File
Value: [Select your food image file]

Key: meal_type
Type: Text
Value: lunch

Key: location_name
Type: Text
Value: Test Location

Key: latitude
Type: Text
Value: 40.7128

Key: longitude
Type: Text
Value: -74.0060
```

**Test Script**:
```javascript
pm.test("Image analysis successful", function () {
    pm.response.to.have.status(200);
    const jsonData = pm.response.json();
    
    // Verify response structure
    pm.expect(jsonData).to.have.property('meal');
    pm.expect(jsonData).to.have.property('analysis');
    pm.expect(jsonData.meal).to.have.property('name');
    pm.expect(jsonData.meal).to.have.property('meal_items');
    pm.expect(jsonData.analysis).to.have.property('confidence_overall');
    
    // Store meal ID for further testing
    pm.environment.set('testMealId', jsonData.meal.id);
    
    // Verify meal items
    pm.expect(jsonData.meal.meal_items).to.be.an('array');
    pm.expect(jsonData.meal.meal_items.length).to.be.greaterThan(0);
    
    // Verify nutritional data
    jsonData.meal.meal_items.forEach(item => {
        pm.expect(item).to.have.property('food_item_name');
        pm.expect(item).to.have.property('quantity');
        pm.expect(item).to.have.property('calories');
    });
});
```

### 2. Progressive Image Analysis

**Endpoint**: `POST {{apiBaseUrl}}/ai/progressive-analyze/`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Request Body** (form-data):
```
Key: image
Type: File
Value: [Select your food image file]

Key: meal_type
Type: Text
Value: dinner

Key: target_confidence
Type: Text
Value: 85
```

**Test Script**:
```javascript
pm.test("Progressive analysis initiated", function () {
    pm.response.to.have.status(202);
    const jsonData = pm.response.json();
    
    pm.expect(jsonData).to.have.property('session_id');
    pm.expect(jsonData).to.have.property('status');
    pm.expect(jsonData.status).to.equal('processing');
    
    // Store session ID for status checking
    pm.environment.set('progressiveSessionId', jsonData.session_id);
});
```

### 3. Check Progressive Analysis Status

**Endpoint**: `GET {{apiBaseUrl}}/ai/progressive-status/{{progressiveSessionId}}/`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Test Script**:
```javascript
pm.test("Progressive analysis status check", function () {
    pm.response.to.have.status(200);
    const jsonData = pm.response.json();
    
    pm.expect(jsonData).to.have.property('status');
    pm.expect(jsonData).to.have.property('session_id');
    pm.expect(jsonData).to.have.property('progress');
    
    if (jsonData.status === 'completed') {
        pm.expect(jsonData).to.have.property('meal');
        pm.expect(jsonData).to.have.property('analysis');
        pm.environment.set('progressiveMealId', jsonData.meal.id);
    }
});
```

### 4. Confidence Routing Analysis

**Endpoint**: `POST {{apiBaseUrl}}/ai/confidence-analyze/`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Request Body** (form-data):
```
Key: image
Type: File
Value: [Select your food image file]

Key: meal_type
Type: Text
Value: breakfast

Key: confidence_threshold
Type: Text
Value: 75
```

---

## Advanced Testing Scenarios

### 1. Meal Management Workflow

**Test Flow**:
1. Create meal → Get meal ID
2. Update meal → Verify changes
3. Get meal details → Verify data
4. Delete meal → Confirm deletion

### 2. Notification Testing

**Subscribe to Push Notifications**:
```javascript
// POST {{apiBaseUrl}}/mobile/register-device/
{
    "token": "ExponentPushToken[test-token]",
    "platform": "android",
    "device_id": "test-device-001",
    "device_name": "Test Device"
}
```

**Send Test Notification**:
```javascript
// POST {{apiBaseUrl}}/mobile/test-notification/
{
    "device_id": "test-device-001",
    "title": "Test Notification",
    "message": "This is a test notification"
}
```

### 3. Error Handling Tests

**Invalid Image Format**:
```javascript
pm.test("Invalid image format handled", function () {
    pm.response.to.have.status(400);
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('error');
    pm.expect(jsonData.error).to.include('Invalid image format');
});
```

**Missing Authorization**:
```javascript
pm.test("Unauthorized access handled", function () {
    pm.response.to.have.status(401);
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('detail');
    pm.expect(jsonData.detail).to.include('Authentication');
});
```

---

## Automated Testing Scripts

### Collection-Level Pre-request Script

```javascript
// Auto-authentication for all requests
const accessToken = pm.environment.get('accessToken');
const refreshToken = pm.environment.get('refreshToken');

if (!accessToken && refreshToken) {
    // Auto-refresh logic (see Authentication Setup)
}

// Common headers
pm.request.headers.add({
    key: 'User-Agent',
    value: 'PostmanTestClient/1.0'
});
```

### Collection-Level Test Script

```javascript
// Common response validation
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

pm.test("Response has correct Content-Type", function () {
    pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');
});

// Log response for debugging
console.log('Response:', pm.response.json());
```

---

## Error Handling & Troubleshooting

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request body format and required fields |
| 401 | Unauthorized | Verify access token is valid and not expired |
| 403 | Forbidden | Check user permissions for the resource |
| 404 | Not Found | Verify endpoint URL and resource existence |
| 413 | Payload Too Large | Reduce image file size (max 10MB) |
| 422 | Validation Error | Check field validation requirements |
| 500 | Server Error | Contact API support team |

### Image Upload Troubleshooting

**Problem**: Image upload fails with 400 error
**Solution**: 
- Verify image format (JPG, PNG, WebP)
- Check file size (max 10MB)
- Ensure proper form-data format
- Verify required fields are included

**Problem**: AI analysis returns low confidence
**Solution**:
- Use clearer, well-lit images
- Ensure food items are clearly visible
- Try progressive analysis with lower confidence threshold
- Check image resolution and quality

### Network Issues

**Problem**: Connection timeout
**Solution**:
- Check network connectivity
- Verify base URL is correct
- Increase timeout settings in Postman
- Try different network or VPN

### Authentication Issues

**Problem**: Token expired errors
**Solution**:
- Implement auto-refresh in pre-request script
- Check token expiration time
- Re-authenticate if refresh fails
- Verify token format and encoding

---

## Best Practices

1. **Environment Management**: Use separate environments for dev/staging/prod
2. **Token Security**: Never commit tokens to version control
3. **Image Selection**: Use diverse, high-quality food images for testing
4. **Error Logging**: Enable console logging for debugging
5. **Test Automation**: Use Newman for CI/CD integration
6. **Performance Testing**: Monitor response times and set reasonable limits
7. **Data Cleanup**: Clean up test data after testing sessions

---

## Newman CLI Integration

Run collection via command line:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run POSTMAN_COLLECTION.json \
  -e POSTMAN_ENVIRONMENT.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Run specific folder
newman run POSTMAN_COLLECTION.json \
  -e POSTMAN_ENVIRONMENT.json \
  --folder "AI Analysis Tests"
```

---

## Support & Resources

- **API Documentation**: `/docs/api/API_REFERENCE.md`
- **Frontend Integration**: `/docs/api/FRONTEND_API_INTEGRATION.md`
- **Mobile Development**: `/docs/api/MOBILE_API_GUIDE.md`
- **Issue Reporting**: Create issues in the project repository
- **Community Support**: Join our developer Discord/Slack

---

*Last Updated: July 15, 2025*
*Version: 1.0.0*