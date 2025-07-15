# Mobile API Integration Guide - Simplified Backend

Complete guide for integrating with the Nutrition AI mobile-optimized API endpoints after backend simplification.

## Overview

The mobile API endpoints are specifically designed for mobile applications with features like:

- Device token management for push notifications
- Optimized dashboard data for mobile screens
- Efficient image upload and analysis
- Mobile-specific error handling
- Streamlined authentication flow

**Base URL:** `http://127.0.0.1:8000/api/v1/mobile/` (dev) | `https://api.nutritionai.com/api/v1/mobile/` (prod)

## Backend Simplification Note

This guide reflects the simplified backend structure with 10 core models:
- **User, UserProfile** - Authentication and user data
- **FoodItem, Meal, MealItem** - Food and meal tracking
- **MealAnalysis** - AI analysis results
- **Notification, DeviceToken** - Push notifications
- **SubscriptionPlan, Subscription, Payment** - Premium features

**Removed Features**: Complex offline sync, batch operations, favorites management, and extensive caching have been removed for simplicity.

## Authentication

All mobile endpoints require JWT authentication:

```http
Authorization: Bearer <access_token>
```

## Core Mobile Endpoints

### 1. Device Registration

#### Register Device

**POST** `/mobile/register-device/`

Register a mobile device for push notifications.

**Request:**

```json
{
  "token": "ExponentPushToken[xxx]",
  "platform": "ios|android",
  "device_id": "unique-device-id",
  "device_name": "User's iPhone",
  "app_version": "1.0.0",
  "os_version": "17.2"
}
```

**Response (201):**

```json
{
  "device_id": "unique-device-id",
  "status": "registered",
  "token_updated": true,
  "created_at": "2025-07-15T10:30:00Z"
}
```

#### Update Device Token

**PUT** `/mobile/register-device/`

Update device token (same endpoint as registration).

**Request:**

```json
{
  "token": "ExponentPushToken[new-token]",
  "platform": "ios",
  "device_id": "unique-device-id",
  "device_name": "User's iPhone",
  "app_version": "1.0.1",
  "os_version": "17.3"
}
```

### 2. Dashboard Data

#### Get Dashboard Data

**GET** `/mobile/dashboard/`

Get optimized dashboard data for mobile apps.

**Response (200):**

```json
{
  "today": {
    "date": "2025-07-15",
    "calories": {
      "consumed": 1850,
      "goal": 2200,
      "percentage": 84.1,
      "remaining": 350
    },
    "macros": {
      "protein": { "consumed": 125, "goal": 150, "percentage": 83.3 },
      "carbs": { "consumed": 180, "goal": 275, "percentage": 65.5 },
      "fat": { "consumed": 65, "goal": 73, "percentage": 89.0 }
    },
    "meals_logged": 3,
    "water_intake": {
      "consumed": 1.5,
      "goal": 2.5,
      "unit": "liters"
    },
    "recent_meals": [
      {
        "id": 123,
        "name": "Breakfast Bowl",
        "meal_type": "breakfast",
        "consumed_at": "2025-07-15T08:30:00Z",
        "total_calories": 450,
        "image_url": "https://example.com/meals/123.jpg"
      }
    ]
  },
  "week": {
    "week_start": "2025-07-09",
    "average_calories": 2050,
    "total_meals": 21,
    "best_day": {
      "date": "2025-07-12",
      "calories_percentage": 98.5
    }
  },
  "quick_actions": [
    {
      "type": "analyze_meal",
      "title": "Analyze Food",
      "icon": "camera",
      "enabled": true
    },
    {
      "type": "view_progress",
      "title": "View Progress",
      "icon": "chart"
    }
  ]
}
```

### 3. Push Notifications

#### Test Push Notification

**POST** `/mobile/test-notification/`

Send a test push notification to a specific device.

**Request:**

```json
{
  "device_id": "unique-device-id",
  "title": "Test Notification",
  "message": "This is a test notification from Nutrition AI"
}
```

**Response (200):**

```json
{
  "status": "sent",
  "device_id": "unique-device-id",
  "sent_at": "2025-07-15T10:30:00Z"
}
```

### 4. Image Analysis

Mobile apps can use the standard AI analysis endpoints with optimized image handling:

#### Analyze Food Image

**POST** `/ai/analyze/`

Standard food image analysis endpoint (mobile-optimized).

**Request (Form Data):**

- `image` (file): Food image (JPG, PNG, WebP, max 10MB)
- `meal_type` (string): `breakfast|lunch|dinner|snack`
- `location_name` (string, optional): Location context
- `latitude` (number, optional): GPS latitude
- `longitude` (number, optional): GPS longitude

**Response (200):**

```json
{
  "meal": {
    "id": 123,
    "name": "Analyzed Meal",
    "meal_type": "lunch",
    "consumed_at": "2025-07-15T12:30:00Z",
    "total_calories": 450,
    "total_protein": 25.5,
    "total_carbs": 35.2,
    "total_fat": 18.3,
    "meal_items": [
      {
        "id": 456,
        "food_item_name": "Grilled Chicken",
        "quantity": 150,
        "unit": "g",
        "calories": 231,
        "protein": 43.5,
        "carbohydrates": 0,
        "fat": 5.0
      }
    ]
  },
  "analysis": {
    "confidence_overall": 85.2,
    "processing_time": 2.5,
    "detected_items": 2,
    "analysis_method": "gemini_vision"
  }
}
```

#### Progressive Analysis

**POST** `/ai/progressive-analyze/`

For complex images that need progressive analysis.

**Request (Form Data):**

- `image` (file): Food image
- `meal_type` (string): Meal type
- `target_confidence` (number): Target confidence level (70-95)

**Response (202):**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 0,
  "estimated_completion": "2025-07-15T12:32:00Z"
}
```

#### Check Analysis Status

**GET** `/ai/progressive-status/{session_id}/`

Check the status of a progressive analysis.

**Response (200):**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "meal": {
    "id": 789,
    "name": "Progressive Analysis Result",
    "meal_items": []
  },
  "analysis": {
    "confidence_overall": 88.5,
    "processing_time": 4.2
  }
}
```

## Error Handling

### Mobile-Specific Error Codes

```json
{
  "error": "device_not_registered",
  "message": "Device must be registered before performing this operation",
  "details": {
    "registration_endpoint": "/mobile/register-device/"
  }
}
```

```json
{
  "error": "invalid_push_token",
  "message": "Invalid push notification token format",
  "details": {
    "token_format": "ExponentPushToken[xxx] or FCM token"
  }
}
```

```json
{
  "error": "image_too_large",
  "message": "Image file exceeds maximum size limit",
  "details": {
    "max_size": "10MB",
    "received_size": "12MB"
  }
}
```

```json
{
  "error": "analysis_failed",
  "message": "AI analysis could not process the image",
  "details": {
    "reason": "low_image_quality",
    "suggestions": [
      "Use better lighting",
      "Ensure food is clearly visible",
      "Try a different angle"
    ]
  }
}
```

## Best Practices

### 1. Device Registration

```javascript
// Example: Device registration on app start
class DeviceManager {
  async registerDevice() {
    const deviceInfo = await this.getDeviceInfo();
    const pushToken = await this.getPushToken();

    try {
      const response = await fetch("/api/v1/mobile/register-device/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          token: pushToken,
          platform: Platform.OS,
          device_id: deviceInfo.deviceId,
          device_name: deviceInfo.deviceName,
          app_version: deviceInfo.appVersion,
          os_version: deviceInfo.osVersion,
        }),
      });

      const result = await response.json();
      console.log("Device registered:", result);
    } catch (error) {
      console.error("Device registration failed:", error);
    }
  }
}
```

### 2. Optimized Image Handling

```javascript
// Example: Image compression before upload
class ImageUploader {
  async uploadImage(imageUri, options = {}) {
    // Compress image based on network conditions
    const networkType = await this.getNetworkType();
    const quality = this.getCompressionQuality(networkType);

    const compressedUri = await this.compressImage(imageUri, quality);

    const formData = new FormData();
    formData.append("image", {
      uri: compressedUri,
      type: "image/jpeg",
      name: "food_image.jpg",
    });
    formData.append("meal_type", options.meal_type || "lunch");
    
    if (options.location) {
      formData.append("latitude", options.location.latitude);
      formData.append("longitude", options.location.longitude);
    }

    return fetch("/api/v1/ai/analyze/", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    });
  }

  getCompressionQuality(networkType) {
    switch (networkType) {
      case "wifi":
        return 0.8;
      case "cellular":
        return 0.6;
      default:
        return 0.7;
    }
  }
}
```

### 3. Dashboard Data Caching

```javascript
// Example: Cache dashboard data for offline viewing
class DashboardManager {
  constructor() {
    this.cacheKey = "dashboard_data";
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getDashboardData() {
    // Check cache first
    const cachedData = await this.getCachedData();
    if (cachedData && !this.isCacheExpired(cachedData)) {
      return cachedData.data;
    }

    try {
      const response = await fetch("/api/v1/mobile/dashboard/", {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      
      // Cache the data
      await this.setCachedData(data);
      
      return data;
    } catch (error) {
      // Return cached data if available, even if expired
      if (cachedData) {
        return cachedData.data;
      }
      throw error;
    }
  }

  async setCachedData(data) {
    const cacheItem = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cacheItem));
  }

  async getCachedData() {
    const cached = await AsyncStorage.getItem(this.cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  isCacheExpired(cachedData) {
    return Date.now() - cachedData.timestamp > this.cacheExpiry;
  }
}
```

### 4. Progressive Analysis with Polling

```javascript
// Example: Handle progressive analysis with polling
class ProgressiveAnalyzer {
  async analyzeImage(imageUri, options = {}) {
    // Start progressive analysis
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "food_image.jpg",
    });
    formData.append("meal_type", options.meal_type || "lunch");
    formData.append("target_confidence", options.target_confidence || 80);

    const response = await fetch("/api/v1/ai/progressive-analyze/", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    });

    const result = await response.json();
    
    // Poll for completion
    return this.pollForCompletion(result.session_id);
  }

  async pollForCompletion(sessionId) {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/v1/ai/progressive-status/${sessionId}/`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });

        const status = await response.json();
        
        if (status.status === "completed") {
          return status;
        } else if (status.status === "failed") {
          throw new Error("Analysis failed");
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        throw error;
      }
    }

    throw new Error("Analysis timeout");
  }
}
```

## React Native Integration Examples

### Basic Setup

```javascript
// API client setup
class NutritionAIClient {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const apiClient = new NutritionAIClient(
  'http://127.0.0.1:8000/api/v1',
  'your-access-token'
);
```

### Image Analysis Hook

```javascript
import { useState } from 'react';

export const useImageAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeImage = async (imageUri, mealType = 'lunch') => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food_image.jpg',
      });
      formData.append('meal_type', mealType);

      const response = await fetch('/api/v1/ai/analyze/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return { analyzeImage, loading, error };
};
```

### Push Notification Setup

```javascript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const setupPushNotifications = async () => {
  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('Push notification permissions not granted');
  }

  // Get push token
  const token = await Notifications.getExpoPushTokenAsync();
  
  // Register device
  await fetch('/api/v1/mobile/register-device/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: token.data,
      platform: Platform.OS,
      device_id: await getDeviceId(),
      device_name: await getDeviceName(),
      app_version: Constants.manifest.version,
      os_version: Platform.Version,
    }),
  });
};
```

### Dashboard Data Hook

```javascript
import { useQuery } from 'react-query';

export const useDashboardData = () => {
  return useQuery(
    'dashboardData',
    async () => {
      const response = await fetch('/api/v1/mobile/dashboard/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.json();
    },
    {
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};
```

## Related Documentation

- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [SIMPLIFIED_API_GUIDE.md](./SIMPLIFIED_API_GUIDE.md) - Core endpoints guide
- [ENHANCED_POSTMAN_GUIDE.md](./ENHANCED_POSTMAN_GUIDE.md) - Postman testing guide
- [FRONTEND_API_INTEGRATION.md](./FRONTEND_API_INTEGRATION.md) - Web frontend integration

---

*Last Updated: July 15, 2025*
*Version: 1.0.0 - Simplified Backend*
