# API Reference - Part 2
*Continuation of API_REFERENCE.md*

## Payments & Subscriptions

### List Subscription Plans
**GET** `/payments/plans/`

Get available subscription plans.

**Response (200):**
```json
{
  "plans": [
    {
      "id": 1,
      "name": "Basic",
      "description": "Essential nutrition tracking",
      "price": 0.00,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Basic meal tracking",
        "Nutrition analysis",
        "Progress tracking"
      ],
      "is_active": true,
      "stripe_price_id": null
    },
    {
      "id": 2,
      "name": "Premium",
      "description": "Advanced features and insights",
      "price": 9.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Unlimited meal tracking",
        "Advanced AI analysis",
        "Custom goals",
        "Priority support",
        "Export data"
      ],
      "is_active": true,
      "stripe_price_id": "price_1234567890"
    }
  ]
}
```

### Get Current Subscription
**GET** `/payments/subscription/`

Get user's current subscription details.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "id": 123,
  "plan": {
    "name": "Premium",
    "price": 9.99,
    "currency": "USD",
    "interval": "month"
  },
  "status": "active",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "cancel_at_period_end": false,
  "stripe_subscription_id": "sub_1234567890",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Create Subscription
**POST** `/payments/subscription/`

Create a new subscription.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "plan_id": 2,
  "payment_method_id": "pm_1234567890"
}
```

**Response (201):**
```json
{
  "subscription": {
    "id": 123,
    "status": "active",
    "plan": {
      "name": "Premium",
      "price": 9.99
    }
  },
  "client_secret": "pi_1234567890_secret_abc123",
  "requires_action": false
}
```

### Cancel Subscription
**DELETE** `/payments/subscription/`

Cancel user's subscription.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "cancel_at_period_end": true,
  "cancellation_reason": "Too expensive"
}
```

**Response (200):**
```json
{
  "message": "Subscription will be cancelled at the end of the current period",
  "cancel_at_period_end": true,
  "current_period_end": "2024-02-01T00:00:00Z"
}
```

### List Payment Methods
**GET** `/payments/methods/`

Get user's saved payment methods.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "payment_methods": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      },
      "is_default": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Add Payment Method
**POST** `/payments/methods/`

Add a new payment method.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "payment_method_id": "pm_1234567890",
  "set_as_default": true
}
```

**Response (201):**
```json
{
  "id": "pm_1234567890",
  "type": "card",
  "card": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2025
  },
  "is_default": true
}
```

### Delete Payment Method
**DELETE** `/payments/methods/{id}/`

Remove a payment method.

**Headers:** `Authorization: Bearer <access_token>`

**Response (204):** No content.

### Payment History
**GET** `/payments/history/`

Get user's payment history.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (integer): Page number
- `page_size` (integer): Items per page

**Response (200):**
```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 456,
      "amount": 9.99,
      "currency": "USD",
      "status": "succeeded",
      "description": "Premium subscription - January 2024",
      "payment_date": "2024-01-01T00:00:00Z",
      "stripe_payment_intent_id": "pi_1234567890",
      "invoice_url": "https://pay.stripe.com/invoice/acct_123/invst_456"
    }
  ]
}
```

---

## Mobile Optimized

### Sync Data
**POST** `/mobile/sync/`

Sync mobile app data with server.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "device_info": {
    "device_id": "ABC123-DEF456",
    "platform": "ios",
    "app_version": "1.2.0",
    "os_version": "17.2"
  },
  "last_sync": "2024-01-20T10:00:00Z",
  "data": {
    "meals": [
      {
        "local_id": "meal_123",
        "name": "Breakfast",
        "consumed_at": "2024-01-20T08:30:00Z",
        "meal_items": []
      }
    ],
    "favorites": ["meal_456", "meal_789"]
  }
}
```

**Response (200):**
```json
{
  "sync_id": "sync_550e8400",
  "status": "completed",
  "conflicts": [],
  "updated_data": {
    "meals": [
      {
        "local_id": "meal_123",
        "server_id": 789,
        "status": "created"
      }
    ]
  },
  "server_data": {
    "meals": [],
    "notifications": [
      {
        "id": "notif_123",
        "title": "Daily Goal Achieved",
        "created_at": "2024-01-20T15:00:00Z"
      }
    ]
  },
  "last_sync": "2024-01-20T15:30:00Z"
}
```

### Batch Operations
**POST** `/mobile/batch/`

Perform multiple operations in a single request.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "operations": [
    {
      "type": "create_meal",
      "data": {
        "name": "Lunch",
        "consumed_at": "2024-01-20T12:30:00Z",
        "meal_items": []
      }
    },
    {
      "type": "update_preferences",
      "data": {
        "daily_calorie_goal": 2200
      }
    },
    {
      "type": "mark_notifications_read",
      "data": {
        "notification_ids": ["notif_123", "notif_456"]
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "operation": 0,
      "status": "success",
      "data": {
        "meal_id": 123,
        "name": "Lunch"
      }
    },
    {
      "operation": 1,
      "status": "success",
      "data": {
        "updated_fields": ["daily_calorie_goal"]
      }
    },
    {
      "operation": 2,
      "status": "success",
      "data": {
        "updated_count": 2
      }
    }
  ],
  "total_operations": 3,
  "successful_operations": 3,
  "failed_operations": 0
}
```

### Quick Stats
**GET** `/mobile/stats/`

Get quick statistics for mobile dashboard.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "today": {
    "calories": 1850,
    "calories_goal": 2200,
    "calories_percentage": 84.1,
    "protein": 125,
    "protein_goal": 150,
    "meals_logged": 3,
    "water_intake": 1.5,
    "steps": 8500
  },
  "week": {
    "average_calories": 2050,
    "days_on_track": 5,
    "total_meals": 21,
    "streak_days": 15
  },
  "achievements": [
    {
      "type": "streak_milestone",
      "title": "15-Day Streak! 🔥",
      "unlocked_at": "2024-01-20T00:00:00Z"
    }
  ],
  "next_meal_reminder": "19:00"
}
```

### Offline Queue
**GET** `/mobile/queue/`

Get pending operations from offline queue.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "pending_operations": [
    {
      "id": "op_123",
      "type": "create_meal",
      "created_at": "2024-01-20T10:00:00Z",
      "retry_count": 0,
      "data": {}
    }
  ],
  "total_pending": 1
}
```

**POST** `/mobile/queue/`

Process offline queue operations.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "operations": [
    {
      "id": "op_123",
      "type": "create_meal",
      "data": {
        "name": "Offline Meal",
        "consumed_at": "2024-01-20T10:00:00Z"
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "processed": [
    {
      "id": "op_123",
      "status": "success",
      "result": {
        "meal_id": 456
      }
    }
  ],
  "failed": [],
  "total_processed": 1
}
```

---

## Admin & Analytics

### API Usage Statistics (Admin Only)
**GET** `/admin/stats/api-usage/`

Get API usage statistics.

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `period` (string): `day`, `week`, `month` (default: `day`)
- `endpoint` (string): Filter by specific endpoint

**Response (200):**
```json
{
  "period": "day",
  "total_requests": 15420,
  "unique_users": 1250,
  "success_rate": 99.2,
  "average_response_time": 145,
  "by_endpoint": {
    "/api/v1/meals/": {
      "requests": 5420,
      "avg_response_time": 120,
      "error_rate": 0.5
    },
    "/api/v1/ai/analyze/": {
      "requests": 2150,
      "avg_response_time": 2500,
      "error_rate": 1.2
    }
  },
  "by_status_code": {
    "200": 14850,
    "201": 420,
    "400": 85,
    "401": 35,
    "500": 30
  },
  "peak_hours": [
    {"hour": 12, "requests": 1850},
    {"hour": 19, "requests": 2100}
  ]
}
```

### User Analytics (Admin Only)
**GET** `/admin/stats/users/`

Get user analytics and insights.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "total_users": 12500,
  "active_users_30d": 8750,
  "new_users_30d": 450,
  "premium_users": 1250,
  "premium_conversion_rate": 14.3,
  "retention_rates": {
    "day_1": 85.2,
    "day_7": 62.8,
    "day_30": 42.1
  },
  "user_engagement": {
    "daily_active_users": 3500,
    "average_session_duration": 280,
    "meals_per_user": 15.7,
    "features_usage": {
      "ai_analysis": 78.5,
      "manual_entry": 92.1,
      "goal_tracking": 68.3
    }
  },
  "geographic_distribution": {
    "US": 45.2,
    "CA": 12.8,
    "UK": 8.5,
    "AU": 6.2,
    "other": 27.3
  }
}
```

### System Health (Admin Only)
**GET** `/admin/health/`

Get system health metrics.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T15:30:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 15,
      "connections": 12
    },
    "redis": {
      "status": "healthy",
      "memory_usage": 45.2,
      "connected_clients": 8
    },
    "celery": {
      "status": "healthy",
      "active_tasks": 5,
      "pending_tasks": 2,
      "failed_tasks_24h": 1
    },
    "ai_service": {
      "status": "healthy",
      "response_time": 1250,
      "requests_per_minute": 45
    }
  },
  "performance": {
    "cpu_usage": 35.2,
    "memory_usage": 68.7,
    "disk_usage": 42.1,
    "network_io": {
      "incoming": "125 MB/s",
      "outgoing": "89 MB/s"
    }
  },
  "alerts": []
}
```

---

## WebSocket Endpoints

### Progressive Analysis Updates
**WebSocket** `ws://your-domain.com/ws/analysis/`

Real-time updates for progressive food analysis.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/analysis/');
ws.onopen = function() {
    console.log('Connected to analysis updates');
};
```

**Message Types:**

1. **Connection Established:**
```json
{
  "type": "connection_established",
  "message": "Connected to progressive analysis updates",
  "user_id": 123,
  "group": "user_123_analysis"
}
```

2. **Analysis Progress:**
```json
{
  "type": "analysis_progress",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "overall_progress": 75,
  "current_stage": "nutritional_analysis",
  "status": "processing",
  "stages": {
    "image_preprocessing": {"status": "completed", "progress": 100},
    "food_detection": {"status": "completed", "progress": 100},
    "portion_estimation": {"status": "completed", "progress": 100},
    "nutritional_analysis": {"status": "processing", "progress": 75}
  },
  "timestamp": "2024-01-20T15:30:00Z"
}
```

3. **Analysis Complete:**
```json
{
  "type": "analysis_progress",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "overall_progress": 100,
  "status": "completed",
  "final_result": {
    "items": [...],
    "total_nutrition": {...}
  }
}
```

### Notifications WebSocket
**WebSocket** `ws://your-domain.com/ws/notifications/`

Real-time notifications for users.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/notifications/');
```

**Message Types:**

1. **New Notification:**
```json
{
  "type": "new_notification",
  "notification": {
    "id": "notif_123",
    "title": "Goal Achieved!",
    "message": "You've reached your daily calorie goal",
    "priority": "medium"
  },
  "timestamp": "2024-01-20T15:30:00Z"
}
```

2. **Mark Notification Read (Send):**
```json
{
  "type": "mark_read",
  "notification_id": "notif_123"
}
```

3. **Notification Marked Read (Receive):**
```json
{
  "type": "notification_marked_read",
  "notification_id": "notif_123",
  "success": true
}
```

4. **Mark All Read (Send):**
```json
{
  "type": "mark_all_read"
}
```

5. **Ping/Pong:**
```json
// Send
{"type": "ping", "timestamp": "2024-01-20T15:30:00Z"}

// Receive
{"type": "pong", "timestamp": "2024-01-20T15:30:00Z"}
```

---

## Webhook Endpoints

### Twilio SMS Status
**POST** `/webhooks/twilio/status/`

Webhook for Twilio SMS delivery status updates.

**Request (from Twilio):**
```
MessageSid=SM1234567890
MessageStatus=delivered
ErrorCode=
ErrorMessage=
```

**Response (200):** Empty response.

### Stripe Webhook
**POST** `/webhooks/stripe/`

Webhook for Stripe payment events.

**Headers:** `Stripe-Signature: <signature>`

**Request (from Stripe):**
```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "id": "in_1234567890",
      "amount_paid": 999,
      "currency": "usd",
      "customer": "cus_1234567890"
    }
  }
}
```

**Response (200):**
```json
{
  "status": "received"
}
```

---

## Error Responses

All endpoints may return these common error responses:

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "email": ["This field is required."],
    "password": ["This field may not be blank."]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "authentication_failed",
  "message": "Invalid authentication credentials"
}
```

### 403 Forbidden
```json
{
  "error": "permission_denied",
  "message": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "The requested resource was not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "rate_limit_exceeded",
  "message": "Request rate limit exceeded",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_server_error",
  "message": "An unexpected error occurred",
  "request_id": "req_1234567890"
}
```

---

## Rate Limits

- **Anonymous users:** 100 requests per hour
- **Authenticated users:** 1000 requests per hour
- **Premium users:** 5000 requests per hour
- **AI Analysis:** 50 requests per hour (free), 500 requests per hour (premium)

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

---

## SDKs and Integration

- **JavaScript/TypeScript:** Official SDK available
- **React Native:** Optimized SDK with offline support
- **Python:** Community SDK
- **Postman Collection:** Available for testing

For the latest SDK documentation and downloads, visit: https://docs.your-domain.com/sdks/