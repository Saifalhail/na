# Core Endpoint Test Scripts

Test scripts for validating all core endpoints in the simplified Nutrition AI backend.

## Overview

This document provides test scripts for manually or automatically testing all core endpoints after the backend simplification.

**Base URL**: `http://127.0.0.1:8000/api/v1/`

## Test Setup

### Prerequisites

1. Backend server running on `http://127.0.0.1:8000`
2. Valid test user credentials
3. Test image file for AI analysis
4. Command-line tool (curl) or API client

### Test Environment Variables

```bash
export API_BASE_URL="http://127.0.0.1:8000/api/v1"
export TEST_EMAIL="testuser@example.com"
export TEST_PASSWORD="SecurePass123!"
export TEST_IMAGE_PATH="./test_food_image.jpg"
```

## 1. Health Check Tests

### API Health Check

```bash
# Test basic health endpoint
curl -X GET "${API_BASE_URL%/api/v1}/api/health/" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with health status

### Service Health Check

```bash
# Test service health endpoint
curl -X GET "${API_BASE_URL%/api/v1}/api/health/services/" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with service status

## 2. Authentication Tests

### User Registration

```bash
# Register new user
curl -X POST "${API_BASE_URL}/auth/registration/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'",
    "password_confirm": "'${TEST_PASSWORD}'",
    "first_name": "Test",
    "last_name": "User",
    "terms_accepted": true
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 201 Created with user data

### User Login

```bash
# Login user and capture tokens
RESPONSE=$(curl -X POST "${API_BASE_URL}/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'"
  }' \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract tokens (requires jq)
export ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
export REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refresh_token')
export USER_ID=$(echo "$RESPONSE" | jq -r '.user.id')

echo "Access Token: $ACCESS_TOKEN"
echo "User ID: $USER_ID"
```

**Expected Response**: 200 OK with tokens and user data

### Token Refresh

```bash
# Refresh access token
curl -X POST "${API_BASE_URL}/auth/refresh/" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "'${REFRESH_TOKEN}'"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with new access token

## 3. User Management Tests

### Get User Profile

```bash
# Get current user profile
curl -X GET "${API_BASE_URL}/users/profile/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with user profile data

### Update User Profile

```bash
# Update user profile
curl -X PUT "${API_BASE_URL}/users/profile/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Updated",
    "last_name": "User",
    "height": 175,
    "weight": 70,
    "activity_level": "moderately_active",
    "goal": "maintain"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with updated profile

### Get User Stats

```bash
# Get user statistics
curl -X GET "${API_BASE_URL}/users/${USER_ID}/stats/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with user stats

## 4. AI Analysis Tests

### Basic Image Analysis

```bash
# Analyze food image
curl -X POST "${API_BASE_URL}/ai/analyze/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "image=@${TEST_IMAGE_PATH}" \
  -F "meal_type=lunch" \
  -F "location_name=Test Location" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with meal analysis data

### Progressive Analysis

```bash
# Start progressive analysis
PROG_RESPONSE=$(curl -X POST "${API_BASE_URL}/ai/progressive-analyze/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "image=@${TEST_IMAGE_PATH}" \
  -F "meal_type=dinner" \
  -F "target_confidence=85" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract session ID
export SESSION_ID=$(echo "$PROG_RESPONSE" | jq -r '.session_id')
echo "Session ID: $SESSION_ID"
```

**Expected Response**: 202 Accepted with session ID

### Check Progressive Analysis Status

```bash
# Check analysis status
curl -X GET "${API_BASE_URL}/ai/progressive-status/${SESSION_ID}/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with analysis status

### Recalculate Nutrition

```bash
# Recalculate nutrition for a meal
curl -X POST "${API_BASE_URL}/ai/recalculate/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "meal_id": 1,
    "meal_items": [
      {
        "food_item_name": "Chicken Breast",
        "quantity": 200,
        "unit": "g"
      }
    ]
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with recalculated nutrition

## 5. Meal Management Tests

### Create Meal

```bash
# Create new meal
MEAL_RESPONSE=$(curl -X POST "${API_BASE_URL}/meals/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Meal",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T12:00:00Z",
    "notes": "Created via test script",
    "meal_items": [
      {
        "food_item_name": "Chicken Breast",
        "quantity": 150,
        "unit": "g"
      }
    ]
  }' \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract meal ID
export MEAL_ID=$(echo "$MEAL_RESPONSE" | jq -r '.id')
echo "Meal ID: $MEAL_ID"
```

**Expected Response**: 201 Created with meal data

### Get All Meals

```bash
# List all meals
curl -X GET "${API_BASE_URL}/meals/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with meals list

### Get Meal Details

```bash
# Get specific meal details
curl -X GET "${API_BASE_URL}/meals/${MEAL_ID}/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with meal details

### Update Meal

```bash
# Update meal
curl -X PUT "${API_BASE_URL}/meals/${MEAL_ID}/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Meal",
    "meal_type": "dinner",
    "consumed_at": "2025-07-15T18:00:00Z",
    "notes": "Updated via test script"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with updated meal

### Duplicate Meal

```bash
# Duplicate meal
curl -X POST "${API_BASE_URL}/meals/${MEAL_ID}/duplicate/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicated Meal",
    "consumed_at": "2025-07-15T14:00:00Z"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 201 Created with duplicated meal

### Delete Meal

```bash
# Delete meal
curl -X DELETE "${API_BASE_URL}/meals/${MEAL_ID}/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 204 No Content

## 6. Mobile-Specific Tests

### Register Device

```bash
# Register mobile device
curl -X POST "${API_BASE_URL}/mobile/register-device/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[test-token-123]",
    "platform": "android",
    "device_id": "test-device-001",
    "device_name": "Test Device",
    "app_version": "1.0.0",
    "os_version": "12.0"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 201 Created with device info

### Get Dashboard Data

```bash
# Get dashboard data
curl -X GET "${API_BASE_URL}/mobile/dashboard/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with dashboard data

### Test Push Notification

```bash
# Send test notification
curl -X POST "${API_BASE_URL}/mobile/test-notification/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device-001",
    "title": "Test Notification",
    "message": "This is a test notification from the API"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with notification status

## 7. Notification Tests

### Get Notifications

```bash
# Get user notifications
curl -X GET "${API_BASE_URL}/notifications/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with notifications list

### Mark Notification as Read

```bash
# Mark notification as read (requires notification ID)
curl -X POST "${API_BASE_URL}/notifications/1/read/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"
```

**Expected Response**: 200 OK with updated notification

## 8. Automated Test Script

### Complete Test Suite

```bash
#!/bin/bash

# Complete endpoint test suite
API_BASE_URL="http://127.0.0.1:8000/api/v1"
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="SecurePass123!"
TEST_IMAGE_PATH="./test_food_image.jpg"

echo "=== Nutrition AI API Test Suite ==="
echo "Base URL: $API_BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo

# Function to check HTTP status
check_status() {
    if [ $1 -eq $2 ]; then
        echo "✅ PASS: Expected $2, got $1"
        return 0
    else
        echo "❌ FAIL: Expected $2, got $1"
        return 1
    fi
}

# Test health check
echo "1. Testing Health Check..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL%/api/v1}/api/health/")
check_status $HEALTH_STATUS 200

# Test user registration
echo "2. Testing User Registration..."
REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/auth/registration/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'",
    "password_confirm": "'${TEST_PASSWORD}'",
    "first_name": "Test",
    "last_name": "User",
    "terms_accepted": true
  }')
check_status $REG_STATUS 201

# Test login
echo "3. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'"
  }')
LOGIN_STATUS=$?
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
check_status $LOGIN_STATUS 0

# Test profile access
echo "4. Testing Profile Access..."
PROFILE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${API_BASE_URL}/users/profile/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
check_status $PROFILE_STATUS 200

# Test meal creation
echo "5. Testing Meal Creation..."
MEAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/meals/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Meal",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T12:00:00Z",
    "meal_items": [
      {
        "food_item_name": "Chicken Breast",
        "quantity": 150,
        "unit": "g"
      }
    ]
  }')
check_status $MEAL_STATUS 201

# Test image analysis (if image exists)
if [ -f "$TEST_IMAGE_PATH" ]; then
    echo "6. Testing Image Analysis..."
    ANALYSIS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/ai/analyze/" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -F "image=@${TEST_IMAGE_PATH}" \
      -F "meal_type=lunch")
    check_status $ANALYSIS_STATUS 200
else
    echo "6. Skipping Image Analysis (no test image found)"
fi

# Test device registration
echo "7. Testing Device Registration..."
DEVICE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/mobile/register-device/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[test-token-123]",
    "platform": "android",
    "device_id": "test-device-001",
    "device_name": "Test Device",
    "app_version": "1.0.0",
    "os_version": "12.0"
  }')
check_status $DEVICE_STATUS 201

echo
echo "=== Test Suite Complete ==="
```

## 9. Performance Testing

### Load Testing Script

```bash
#!/bin/bash

# Simple load test for key endpoints
API_BASE_URL="http://127.0.0.1:8000/api/v1"
ACCESS_TOKEN="your-access-token"

echo "=== Load Testing ==="

# Test health endpoint
echo "Testing health endpoint (10 concurrent requests)..."
for i in {1..10}; do
    curl -s -o /dev/null -w "%{time_total}\n" "${API_BASE_URL%/api/v1}/api/health/" &
done
wait

# Test authenticated endpoint
echo "Testing profile endpoint (10 concurrent requests)..."
for i in {1..10}; do
    curl -s -o /dev/null -w "%{time_total}\n" -H "Authorization: Bearer ${ACCESS_TOKEN}" "${API_BASE_URL}/users/profile/" &
done
wait

echo "Load test complete"
```

## 10. Error Testing

### Test Error Responses

```bash
# Test 401 Unauthorized
curl -X GET "${API_BASE_URL}/users/profile/" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# Test 400 Bad Request
curl -X POST "${API_BASE_URL}/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}' \
  -w "\nStatus: %{http_code}\n"

# Test 404 Not Found
curl -X GET "${API_BASE_URL}/meals/999999/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nStatus: %{http_code}\n"
```

## Usage Instructions

1. **Setup Environment**: Set the environment variables for your test environment
2. **Prepare Test Data**: Create a test image file for AI analysis tests
3. **Run Individual Tests**: Execute specific test commands as needed
4. **Run Complete Suite**: Use the automated test script for comprehensive testing
5. **Monitor Results**: Check HTTP status codes and response times

## Test Data Requirements

- **Test Image**: JPG/PNG food image (max 10MB) for AI analysis
- **Test User**: Valid email/password combination for authentication
- **Test Environment**: Running backend server with database

## Expected Results

All tests should return the expected HTTP status codes:
- **200**: Successful GET/PUT operations
- **201**: Successful POST operations (creation)
- **204**: Successful DELETE operations
- **401**: Unauthorized access attempts
- **400**: Bad request formatting

---

*Last Updated: July 15, 2025*
*Version: 1.0.0 - Simplified Backend*