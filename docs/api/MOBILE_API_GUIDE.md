# Mobile API Integration Guide

Complete guide for integrating with the Nutrition AI mobile-optimized API endpoints.

## Overview

The mobile API endpoints are specifically designed for mobile applications with features like:

- Offline support and data synchronization
- Batch operations for efficiency
- Reduced payload sizes
- Optimized response times
- Device-specific caching strategies

**Base URL:** `https://your-domain.com/api/v1/mobile/`

## Authentication

All mobile endpoints require JWT authentication:

```http
Authorization: Bearer <access_token>
```

## Core Mobile Endpoints

### 1. Data Synchronization

#### Full Sync

**POST** `/mobile/sync/`

Synchronize all user data between mobile app and server.

**Use Case:** App startup, major version updates, or after extended offline usage.

**Request Schema:**

```json
{
  "device_info": {
    "device_id": "string (required, max 255 chars)",
    "platform": "ios|android|web",
    "app_version": "string (semantic version)",
    "os_version": "string",
    "device_name": "string (optional)"
  },
  "last_sync": "ISO 8601 datetime (optional)",
  "sync_type": "full|incremental|force",
  "data": {
    "meals": [
      {
        "local_id": "string (required)",
        "name": "string",
        "consumed_at": "ISO 8601 datetime",
        "meal_type": "breakfast|lunch|dinner|snack",
        "image_path": "string (local file path)",
        "total_calories": "number (optional)",
        "meal_items": [
          {
            "local_id": "string",
            "food_item_name": "string",
            "quantity": "number",
            "unit": "string",
            "calories": "number"
          }
        ],
        "created_at": "ISO 8601 datetime",
        "updated_at": "ISO 8601 datetime",
        "is_deleted": "boolean (default: false)"
      }
    ],
    "favorites": ["meal_local_id1", "meal_local_id2"],
    "user_preferences": {
      "daily_calorie_goal": "number",
      "daily_protein_goal": "number",
      "meal_reminder_times": ["HH:MM", "HH:MM"],
      "notification_preferences": {}
    },
    "device_tokens": [
      {
        "token": "string (push notification token)",
        "platform": "ios|android",
        "is_active": "boolean"
      }
    ]
  }
}
```

**Response (200):**

```json
{
  "sync_id": "string (UUID)",
  "status": "completed|partial|failed",
  "sync_timestamp": "ISO 8601 datetime",
  "conflicts": [
    {
      "type": "meal|preference|favorite",
      "local_id": "string",
      "server_id": "number|null",
      "conflict_reason": "concurrent_modification|version_mismatch",
      "local_data": {},
      "server_data": {},
      "resolution": "use_server|use_local|manual_required"
    }
  ],
  "updated_mappings": {
    "meals": [
      {
        "local_id": "meal_123",
        "server_id": 456,
        "status": "created|updated|deleted|conflict"
      }
    ]
  },
  "server_data": {
    "meals": [
      {
        "id": 789,
        "name": "Server Meal",
        "consumed_at": "2024-01-20T12:30:00Z",
        "total_calories": 450,
        "meal_items": [],
        "created_at": "2024-01-20T12:35:00Z",
        "updated_at": "2024-01-20T12:35:00Z"
      }
    ],
    "notifications": [
      {
        "id": "notif_123",
        "title": "Goal Achieved!",
        "message": "Great progress today",
        "type": "goal_achieved",
        "priority": "medium",
        "created_at": "2024-01-20T15:00:00Z",
        "read_at": null,
        "data": {}
      }
    ],
    "user_profile": {
      "daily_calorie_goal": 2200,
      "is_premium": false,
      "subscription_expires_at": null
    }
  },
  "next_sync_recommended": "ISO 8601 datetime",
  "cache_invalidation": ["meals", "notifications"]
}
```

#### Incremental Sync

For regular background synchronization:

**Request:**

```json
{
  "device_info": {
    "device_id": "ABC123-DEF456",
    "platform": "ios"
  },
  "last_sync": "2024-01-20T10:00:00Z",
  "sync_type": "incremental",
  "data": {
    "meals": [], // Only new/modified meals since last_sync
    "favorites": [] // Only changes since last_sync
  }
}
```

### 2. Batch Operations

#### Batch Request

**POST** `/mobile/batch/`

Execute multiple API operations in a single request to reduce network overhead.

**Request Schema:**

```json
{
  "operations": [
    {
      "id": "op_1", // Client-generated operation ID
      "type": "create_meal",
      "data": {
        "name": "Breakfast Bowl",
        "consumed_at": "2024-01-20T08:30:00Z",
        "meal_items": []
      }
    },
    {
      "id": "op_2",
      "type": "update_profile",
      "data": {
        "daily_calorie_goal": 2300
      }
    },
    {
      "id": "op_3",
      "type": "mark_notifications_read",
      "data": {
        "notification_ids": ["notif_123", "notif_456"]
      }
    },
    {
      "id": "op_4",
      "type": "add_favorite",
      "data": {
        "meal_id": 789
      }
    },
    {
      "id": "op_5",
      "type": "upload_image",
      "data": {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
        "purpose": "meal_analysis"
      }
    }
  ],
  "transaction": true, // If true, all operations succeed or all fail
  "timeout": 30 // Timeout in seconds (max 60)
}
```

**Supported Operation Types:**

- `create_meal`
- `update_meal`
- `delete_meal`
- `add_favorite`
- `remove_favorite`
- `update_profile`
- `mark_notifications_read`
- `upload_image`
- `analyze_image`
- `create_device_token`
- `update_device_token`

**Response (200):**

```json
{
  "batch_id": "batch_550e8400",
  "total_operations": 5,
  "successful_operations": 4,
  "failed_operations": 1,
  "execution_time": 1.25, // seconds
  "results": [
    {
      "operation_id": "op_1",
      "status": "success",
      "execution_time": 0.15,
      "data": {
        "meal_id": 123,
        "name": "Breakfast Bowl",
        "created_at": "2024-01-20T08:35:00Z"
      }
    },
    {
      "operation_id": "op_2",
      "status": "success",
      "execution_time": 0.08,
      "data": {
        "updated_fields": ["daily_calorie_goal"],
        "new_value": 2300
      }
    },
    {
      "operation_id": "op_3",
      "status": "success",
      "execution_time": 0.12,
      "data": {
        "updated_count": 2,
        "notification_ids": ["notif_123", "notif_456"]
      }
    },
    {
      "operation_id": "op_4",
      "status": "success",
      "execution_time": 0.09,
      "data": {
        "meal_id": 789,
        "is_favorite": true
      }
    },
    {
      "operation_id": "op_5",
      "status": "error",
      "execution_time": 0.05,
      "error": {
        "code": "file_too_large",
        "message": "Image file exceeds maximum size limit",
        "details": {
          "max_size": "10MB",
          "received_size": "12MB"
        }
      }
    }
  ]
}
```

### 3. Quick Dashboard Stats

#### Get Dashboard Data

**GET** `/mobile/stats/`

Get optimized dashboard data for mobile apps.

**Query Parameters:**

- `include` (string): Comma-separated list of data to include
  - `today` (default)
  - `week`
  - `achievements`
  - `reminders`
  - `quick_actions`

**Response (200):**

```json
{
  "today": {
    "date": "2024-01-20",
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
    "meals_planned": 4,
    "water_intake": {
      "consumed": 1.5,
      "goal": 2.5,
      "unit": "liters"
    },
    "streak_days": 15,
    "next_meal_time": "19:00"
  },
  "week": {
    "week_start": "2024-01-15",
    "average_calories": 2050,
    "days_on_track": 5,
    "total_meals": 21,
    "best_day": {
      "date": "2024-01-18",
      "calories_percentage": 98.5
    },
    "trend": "improving" // improving|declining|stable
  },
  "achievements": [
    {
      "id": "streak_15",
      "type": "streak_milestone",
      "title": "15-Day Streak! 🔥",
      "description": "You've logged meals for 15 consecutive days",
      "icon": "🔥",
      "unlocked_at": "2024-01-20T00:00:00Z",
      "points": 150,
      "is_new": true
    }
  ],
  "reminders": [
    {
      "type": "meal_reminder",
      "title": "Time for dinner!",
      "time": "19:00",
      "enabled": true
    },
    {
      "type": "goal_check",
      "title": "You're close to your protein goal",
      "description": "Add 25g more protein to reach your daily goal",
      "action": "suggest_foods"
    }
  ],
  "quick_actions": [
    {
      "type": "analyze_meal",
      "title": "Analyze Food",
      "icon": "camera",
      "enabled": true
    },
    {
      "type": "log_water",
      "title": "Log Water",
      "icon": "water",
      "quick_amounts": [250, 500, 750] // ml
    },
    {
      "type": "view_progress",
      "title": "View Progress",
      "icon": "chart"
    }
  ]
}
```

### 4. Offline Queue Management

#### Get Offline Queue Status

**GET** `/mobile/queue/`

Get status of pending offline operations.

**Response (200):**

```json
{
  "queue_status": "syncing|idle|error",
  "pending_operations": [
    {
      "id": "op_offline_123",
      "type": "create_meal",
      "created_at": "2024-01-20T10:00:00Z",
      "retry_count": 2,
      "last_error": "network_timeout",
      "data": {
        "name": "Offline Meal",
        "consumed_at": "2024-01-20T10:00:00Z"
      }
    }
  ],
  "total_pending": 1,
  "estimated_sync_time": 15, // seconds
  "last_successful_sync": "2024-01-20T09:45:00Z"
}
```

#### Process Offline Queue

**POST** `/mobile/queue/`

Process pending offline operations.

**Request:**

```json
{
  "operations": [
    {
      "id": "op_offline_123",
      "type": "create_meal",
      "timestamp": "2024-01-20T10:00:00Z",
      "data": {
        "name": "Offline Meal",
        "consumed_at": "2024-01-20T10:00:00Z",
        "meal_items": []
      }
    }
  ],
  "clear_queue_on_success": true
}
```

**Response (200):**

```json
{
  "processed": [
    {
      "id": "op_offline_123",
      "status": "success",
      "result": {
        "meal_id": 456,
        "created_at": "2024-01-20T15:30:00Z"
      }
    }
  ],
  "failed": [],
  "queue_cleared": true,
  "total_processed": 1
}
```

### 5. Image Upload & Analysis

#### Upload Image for Analysis

**POST** `/mobile/analyze/`

Upload and analyze food images with mobile optimizations.

**Headers:**

- `Content-Type: multipart/form-data`
- `X-Device-Resolution: 1920x1080` (optional)
- `X-Network-Type: wifi|cellular` (optional)

**Request (Form Data):**

- `image` (file): Image file (JPEG, PNG, WebP, HEIF)
- `compression_quality` (string): `low|medium|high` (default: medium)
- `priority` (string): `normal|high` (default: normal)
- `context` (JSON string): Analysis context

**Context Schema:**

```json
{
  "meal_type": "breakfast|lunch|dinner|snack",
  "cuisine_type": "italian|chinese|mexican|american|other",
  "portion_size": "small|medium|large",
  "dining_location": "home|restaurant|work|other",
  "time_of_day": "morning|afternoon|evening|night",
  "user_preferences": {
    "dietary_restrictions": ["vegetarian", "gluten_free"],
    "allergies": ["nuts", "shellfish"]
  },
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006
  }
}
```

**Response (202):**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimated_completion": "2024-01-20T15:32:00Z",
  "websocket_url": "ws://your-domain.com/ws/analysis/",
  "polling_url": "/api/v1/ai/analyze/550e8400-e29b-41d4-a716-446655440000/",
  "image_url": "https://your-domain.com/uploads/analysis/session_123.jpg"
}
```

### 6. Device & Push Notification Management

#### Register Device Token

**POST** `/mobile/device/register/`

Register device for push notifications.

**Request:**

```json
{
  "device_id": "ABC123-DEF456",
  "platform": "ios|android",
  "token": "push_notification_token_here",
  "device_name": "John's iPhone",
  "app_version": "1.2.0",
  "os_version": "17.2",
  "is_active": true
}
```

**Response (201):**

```json
{
  "device_id": "ABC123-DEF456",
  "status": "registered",
  "token_updated": true,
  "created_at": "2024-01-20T15:30:00Z"
}
```

#### Update Device Token

**PUT** `/mobile/device/{device_id}/`

Update device information or token.

**Request:**

```json
{
  "token": "new_push_notification_token",
  "app_version": "1.2.1",
  "is_active": true
}
```

**Response (200):**

```json
{
  "device_id": "ABC123-DEF456",
  "status": "updated",
  "last_updated": "2024-01-20T15:30:00Z"
}
```

## Error Handling

### Mobile-Specific Error Codes

```json
{
  "error": "sync_conflict",
  "message": "Data conflicts detected during synchronization",
  "details": {
    "conflicts": [
      {
        "type": "meal",
        "local_id": "meal_123",
        "server_id": 456,
        "conflict_reason": "concurrent_modification"
      }
    ],
    "resolution_required": true
  }
}
```

```json
{
  "error": "offline_queue_full",
  "message": "Offline operation queue is full",
  "details": {
    "max_queue_size": 100,
    "current_queue_size": 100,
    "suggested_action": "sync_and_retry"
  }
}
```

```json
{
  "error": "device_not_registered",
  "message": "Device must be registered before performing this operation",
  "details": {
    "registration_endpoint": "/mobile/device/register/"
  }
}
```

## Best Practices

### 1. Offline Support Strategy

```javascript
// Example: Implementing offline queue
class OfflineManager {
  constructor() {
    this.queue = [];
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
  }

  async apiCall(endpoint, data) {
    if (this.isOnline) {
      try {
        return await this.makeRequest(endpoint, data);
      } catch (error) {
        if (this.isNetworkError(error)) {
          this.queueOperation(endpoint, data);
        }
        throw error;
      }
    } else {
      this.queueOperation(endpoint, data);
      return { queued: true };
    }
  }

  async syncQueue() {
    if (!this.isOnline || this.queue.length === 0) return;

    const operations = this.queue.splice(0);
    try {
      const response = await fetch("/api/v1/mobile/queue/", {
        method: "POST",
        body: JSON.stringify({ operations }),
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      this.handleSyncResult(result);
    } catch (error) {
      // Re-queue failed operations
      this.queue.unshift(...operations);
    }
  }
}
```

### 2. Efficient Data Synchronization

```javascript
// Example: Incremental sync implementation
class SyncManager {
  async performSync() {
    const lastSync = localStorage.getItem("lastSyncTime");
    const localChanges = this.getLocalChanges(lastSync);

    const syncRequest = {
      device_info: this.getDeviceInfo(),
      last_sync: lastSync,
      sync_type: lastSync ? "incremental" : "full",
      data: localChanges,
    };

    const response = await fetch("/api/v1/mobile/sync/", {
      method: "POST",
      body: JSON.stringify(syncRequest),
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();

    // Handle conflicts
    if (result.conflicts.length > 0) {
      await this.resolveConflicts(result.conflicts);
    }

    // Update local data
    await this.updateLocalData(result.server_data);

    // Store sync timestamp
    localStorage.setItem("lastSyncTime", result.sync_timestamp);
  }
}
```

### 3. Optimized Image Handling

```javascript
// Example: Image compression before upload
class ImageUploader {
  async uploadImage(file, options = {}) {
    // Compress image based on network conditions
    const networkType = this.getNetworkType();
    const quality = this.getCompressionQuality(networkType);

    const compressedFile = await this.compressImage(file, quality);

    const formData = new FormData();
    formData.append("image", compressedFile);
    formData.append("compression_quality", quality);
    formData.append("context", JSON.stringify(options.context));

    return fetch("/api/v1/mobile/analyze/", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "X-Network-Type": networkType,
      },
    });
  }

  getCompressionQuality(networkType) {
    switch (networkType) {
      case "wifi":
        return "high";
      case "cellular-4g":
        return "medium";
      case "cellular-3g":
        return "low";
      default:
        return "medium";
    }
  }
}
```

### 4. Battery-Efficient Background Sync

```javascript
// Example: Background sync with exponential backoff
class BackgroundSyncManager {
  constructor() {
    this.syncInterval = 30000; // 30 seconds
    this.maxInterval = 300000; // 5 minutes
    this.retryCount = 0;
  }

  async startBackgroundSync() {
    const performSync = async () => {
      try {
        await this.syncManager.performSync();
        this.resetSyncInterval();
      } catch (error) {
        this.increaseSyncInterval();
      }

      setTimeout(performSync, this.syncInterval);
    };

    // Start background sync when app comes to foreground
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        performSync();
      }
    });
  }

  resetSyncInterval() {
    this.syncInterval = 30000;
    this.retryCount = 0;
  }

  increaseSyncInterval() {
    this.retryCount++;
    this.syncInterval = Math.min(
      this.syncInterval * Math.pow(2, this.retryCount),
      this.maxInterval,
    );
  }
}
```

## SDK Usage Examples

### React Native Integration

```javascript
import { NutritionAI } from "@nutrition-ai/react-native-sdk";

// Initialize SDK
const nutritionAI = new NutritionAI({
  apiKey: "your-api-key",
  baseUrl: "https://your-domain.com/api/v1/",
  enableOfflineSupport: true,
  enableBackgroundSync: true,
});

// Analyze food image
const analyzeFood = async (imageUri) => {
  try {
    const result = await nutritionAI.analyzeImage(imageUri, {
      context: {
        meal_type: "lunch",
        cuisine_type: "italian",
      },
    });

    return result;
  } catch (error) {
    console.error("Analysis failed:", error);
  }
};

// Sync data
const syncData = async () => {
  try {
    const result = await nutritionAI.sync();
    console.log("Sync completed:", result);
  } catch (error) {
    console.error("Sync failed:", error);
  }
};
```

For complete SDK documentation and examples, visit: https://docs.your-domain.com/mobile-sdk/
