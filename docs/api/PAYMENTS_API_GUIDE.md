# Payments & Subscriptions API Guide

Complete guide for integrating with the Nutrition AI payments and subscription system powered by Stripe.

## Overview

The payments API provides:

- Subscription management for premium features
- Payment method storage and management
- Invoice generation and history
- Webhook handling for real-time updates
- Comprehensive billing analytics

**Base URL:** `https://your-domain.com/api/v1/payments/`

## Authentication

All payment endpoints require authenticated users:

```http
Authorization: Bearer <access_token>
```

## Subscription Plans

### List Available Plans

**GET** `/payments/plans/`

Get all available subscription plans.

**Response (200):**

```json
{
  "plans": [
    {
      "id": 1,
      "name": "Free",
      "description": "Basic nutrition tracking for everyone",
      "price": 0.0,
      "currency": "USD",
      "interval": "month",
      "interval_count": 1,
      "trial_period_days": 0,
      "features": [
        "Basic meal tracking",
        "AI nutrition analysis (10/month)",
        "Progress tracking",
        "Basic reports"
      ],
      "limits": {
        "ai_analyses_per_month": 10,
        "meal_history_months": 3,
        "export_formats": ["csv"]
      },
      "is_active": true,
      "is_popular": false,
      "stripe_price_id": null,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Premium",
      "description": "Advanced features for serious nutrition tracking",
      "price": 9.99,
      "currency": "USD",
      "interval": "month",
      "interval_count": 1,
      "trial_period_days": 14,
      "features": [
        "Unlimited meal tracking",
        "Unlimited AI analysis",
        "Advanced nutrition insights",
        "Custom goals and targets",
        "Detailed progress analytics",
        "Priority customer support",
        "Data export (CSV, PDF, JSON)",
        "API access",
        "Advanced meal planning"
      ],
      "limits": {
        "ai_analyses_per_month": -1, // unlimited
        "meal_history_months": -1, // unlimited
        "export_formats": ["csv", "pdf", "json", "excel"]
      },
      "is_active": true,
      "is_popular": true,
      "stripe_price_id": "price_1234567890",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 3,
      "name": "Premium Annual",
      "description": "Premium features with annual billing (2 months free)",
      "price": 99.99,
      "currency": "USD",
      "interval": "year",
      "interval_count": 1,
      "trial_period_days": 14,
      "features": [
        "All Premium features",
        "2 months free (20% savings)",
        "Priority feature requests",
        "Beta access to new features"
      ],
      "limits": {
        "ai_analyses_per_month": -1,
        "meal_history_months": -1,
        "export_formats": ["csv", "pdf", "json", "excel"]
      },
      "is_active": true,
      "is_popular": false,
      "stripe_price_id": "price_annual_1234567890",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Plan Details

**GET** `/payments/plans/{id}/`

Get detailed information about a specific plan.

**Response (200):**

```json
{
  "id": 2,
  "name": "Premium",
  "description": "Advanced features for serious nutrition tracking",
  "price": 9.99,
  "currency": "USD",
  "interval": "month",
  "interval_count": 1,
  "trial_period_days": 14,
  "features": [...],
  "limits": {...},
  "feature_comparison": {
    "ai_analyses": {
      "free": 10,
      "premium": "unlimited"
    },
    "meal_history": {
      "free": "3 months",
      "premium": "unlimited"
    },
    "export_options": {
      "free": ["csv"],
      "premium": ["csv", "pdf", "json", "excel"]
    },
    "customer_support": {
      "free": "community",
      "premium": "priority"
    }
  },
  "pricing_details": {
    "setup_fee": 0.00,
    "tax_included": false,
    "refund_policy": "14-day money-back guarantee",
    "billing_cycle": "Billed monthly, cancel anytime",
    "proration": true
  }
}
```

## Current Subscription

### Get User's Subscription

**GET** `/payments/subscription/`

Get current subscription details for the authenticated user.

**Response (200) - Active Subscription:**

```json
{
  "id": 123,
  "status": "active",
  "plan": {
    "id": 2,
    "name": "Premium",
    "price": 9.99,
    "currency": "USD",
    "interval": "month"
  },
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "trial_start": "2024-01-01T00:00:00Z",
  "trial_end": "2024-01-15T00:00:00Z",
  "cancel_at_period_end": false,
  "canceled_at": null,
  "ended_at": null,
  "usage_stats": {
    "ai_analyses_used": 45,
    "ai_analyses_limit": -1,
    "current_period_start": "2024-01-01T00:00:00Z"
  },
  "billing_info": {
    "next_billing_date": "2024-02-01T00:00:00Z",
    "next_billing_amount": 9.99,
    "proration_amount": 0.0,
    "tax_amount": 0.0
  },
  "stripe_subscription_id": "sub_1234567890",
  "stripe_customer_id": "cus_1234567890",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Response (200) - No Subscription:**

```json
{
  "id": null,
  "status": "inactive",
  "plan": {
    "id": 1,
    "name": "Free",
    "price": 0.0
  },
  "usage_stats": {
    "ai_analyses_used": 8,
    "ai_analyses_limit": 10,
    "current_period_start": "2024-01-01T00:00:00Z"
  },
  "upgrade_available": true,
  "recommended_plan": {
    "id": 2,
    "name": "Premium",
    "trial_available": true
  }
}
```

### Create Subscription

**POST** `/payments/subscription/`

Create a new subscription for the user.

**Request:**

```json
{
  "plan_id": 2,
  "payment_method_id": "pm_1234567890", // Stripe payment method ID
  "trial_from_plan": true, // Use plan's default trial period
  "promotional_code": "WELCOME20", // Optional promo code
  "billing_address": {
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  }
}
```

**Response (201) - Success:**

```json
{
  "subscription": {
    "id": 123,
    "status": "active",
    "plan": {
      "id": 2,
      "name": "Premium",
      "price": 9.99
    },
    "current_period_start": "2024-01-20T15:30:00Z",
    "current_period_end": "2024-02-20T15:30:00Z",
    "trial_end": "2024-02-03T15:30:00Z"
  },
  "payment_intent": {
    "id": "pi_1234567890",
    "status": "succeeded",
    "amount": 999, // Amount in cents
    "currency": "usd"
  },
  "invoice": {
    "id": "in_1234567890",
    "invoice_url": "https://pay.stripe.com/invoice/acct_123/invst_456",
    "invoice_pdf": "https://pay.stripe.com/invoice/acct_123/invst_456/pdf"
  }
}
```

**Response (402) - Payment Required:**

```json
{
  "error": "payment_required",
  "message": "Additional authentication required",
  "payment_intent": {
    "id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abc123",
    "status": "requires_action",
    "next_action": {
      "type": "use_stripe_sdk"
    }
  }
}
```

### Update Subscription

**PUT** `/payments/subscription/`

Update existing subscription (change plan, payment method, etc.).

**Request:**

```json
{
  "plan_id": 3, // Change to annual plan
  "proration_behavior": "create_prorations", // always_invoice|create_prorations|none
  "billing_cycle_anchor": "unchanged" // unchanged|now
}
```

**Response (200):**

```json
{
  "subscription": {
    "id": 123,
    "status": "active",
    "plan": {
      "id": 3,
      "name": "Premium Annual",
      "price": 99.99
    },
    "proration_details": {
      "credit_amount": 6.66, // Unused portion of current plan
      "charge_amount": 99.99,
      "net_amount": 93.33
    }
  },
  "invoice": {
    "id": "in_upgrade_1234567890",
    "amount_due": 9333, // Amount in cents
    "invoice_url": "https://pay.stripe.com/invoice/..."
  }
}
```

### Cancel Subscription

**DELETE** `/payments/subscription/`

Cancel the user's subscription.

**Request:**

```json
{
  "cancel_at_period_end": true, // Cancel at period end or immediately
  "cancellation_reason": "too_expensive", // Optional: too_expensive|missing_features|switching_service|other
  "feedback": "The app is great but I need to cut expenses right now" // Optional feedback
}
```

**Response (200):**

```json
{
  "subscription": {
    "id": 123,
    "status": "active", // Still active until period end
    "cancel_at_period_end": true,
    "canceled_at": "2024-01-20T15:30:00Z",
    "current_period_end": "2024-02-01T00:00:00Z"
  },
  "message": "Subscription will be cancelled on February 1, 2024",
  "access_until": "2024-02-01T00:00:00Z",
  "refund_info": {
    "eligible_for_refund": false,
    "refund_amount": 0.0,
    "refund_reason": "cancellation_after_trial"
  }
}
```

### Reactivate Subscription

**POST** `/payments/subscription/reactivate/`

Reactivate a cancelled subscription (before it ends).

**Response (200):**

```json
{
  "subscription": {
    "id": 123,
    "status": "active",
    "cancel_at_period_end": false,
    "canceled_at": null
  },
  "message": "Subscription has been reactivated"
}
```

## Payment Methods

### List Payment Methods

**GET** `/payments/methods/`

Get user's saved payment methods.

**Response (200):**

```json
{
  "payment_methods": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "card": {
        "brand": "visa",
        "country": "US",
        "exp_month": 12,
        "exp_year": 2025,
        "fingerprint": "abcd1234",
        "funding": "credit",
        "last4": "4242"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "address": {
          "city": "New York",
          "country": "US",
          "line1": "123 Main St",
          "postal_code": "10001",
          "state": "NY"
        }
      },
      "is_default": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "has_default_payment_method": true
}
```

### Add Payment Method

**POST** `/payments/methods/`

Add a new payment method to the user's account.

**Request:**

```json
{
  "payment_method_id": "pm_1234567890", // Created via Stripe.js on frontend
  "set_as_default": true,
  "billing_details": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    }
  }
}
```

**Response (201):**

```json
{
  "payment_method": {
    "id": "pm_1234567890",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025
    },
    "is_default": true
  },
  "message": "Payment method added successfully"
}
```

### Update Payment Method

**PUT** `/payments/methods/{id}/`

Update payment method details.

**Request:**

```json
{
  "set_as_default": true,
  "billing_details": {
    "name": "John Smith",
    "address": {
      "line1": "456 Oak Ave",
      "city": "Boston",
      "state": "MA",
      "postal_code": "02101",
      "country": "US"
    }
  }
}
```

**Response (200):**

```json
{
  "payment_method": {
    "id": "pm_1234567890",
    "billing_details": {
      "name": "John Smith",
      "address": {...}
    },
    "is_default": true
  },
  "message": "Payment method updated successfully"
}
```

### Delete Payment Method

**DELETE** `/payments/methods/{id}/`

Remove a payment method from the user's account.

**Response (204):** No content.

**Error Response (400) - Cannot Delete Default:**

```json
{
  "error": "cannot_delete_default",
  "message": "Cannot delete the default payment method. Please set another payment method as default first."
}
```

## Payment History & Invoices

### Get Payment History

**GET** `/payments/history/`

Get user's payment and invoice history.

**Query Parameters:**

- `page` (integer): Page number
- `page_size` (integer): Items per page (max 100)
- `status` (string): Filter by status (`succeeded`, `pending`, `failed`)
- `date_from` (date): Filter from date (YYYY-MM-DD)
- `date_to` (date): Filter to date (YYYY-MM-DD)

**Response (200):**

```json
{
  "count": 24,
  "next": "https://api.example.com/payments/history/?page=2",
  "previous": null,
  "results": [
    {
      "id": 456,
      "type": "payment",
      "amount": 9.99,
      "currency": "USD",
      "status": "succeeded",
      "description": "Premium subscription - January 2024",
      "payment_date": "2024-01-01T00:00:00Z",
      "payment_method": {
        "type": "card",
        "card": {
          "brand": "visa",
          "last4": "4242"
        }
      },
      "invoice": {
        "id": "in_1234567890",
        "number": "NAI-0001",
        "invoice_url": "https://pay.stripe.com/invoice/acct_123/invst_456",
        "invoice_pdf": "https://pay.stripe.com/invoice/acct_123/invst_456/pdf"
      },
      "stripe_payment_intent_id": "pi_1234567890",
      "refunded": false,
      "refund_amount": 0.0
    },
    {
      "id": 455,
      "type": "refund",
      "amount": -9.99,
      "currency": "USD",
      "status": "succeeded",
      "description": "Refund for Premium subscription",
      "payment_date": "2023-12-28T00:00:00Z",
      "original_payment_id": 450,
      "stripe_refund_id": "re_1234567890",
      "refund_reason": "requested_by_customer"
    }
  ],
  "summary": {
    "total_amount": 119.88,
    "total_payments": 13,
    "total_refunds": 1,
    "currency": "USD"
  }
}
```

### Get Invoice Details

**GET** `/payments/invoices/{id}/`

Get detailed information about a specific invoice.

**Response (200):**

```json
{
  "id": "in_1234567890",
  "number": "NAI-0001",
  "status": "paid",
  "amount_due": 999, // Amount in cents
  "amount_paid": 999,
  "amount_remaining": 0,
  "currency": "usd",
  "description": "Premium subscription - January 2024",
  "invoice_date": "2024-01-01T00:00:00Z",
  "due_date": "2024-01-01T00:00:00Z",
  "paid_at": "2024-01-01T00:05:00Z",
  "customer_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    }
  },
  "line_items": [
    {
      "description": "Premium subscription",
      "quantity": 1,
      "unit_amount": 999,
      "amount": 999,
      "period": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-02-01T00:00:00Z"
      },
      "proration": false
    }
  ],
  "subtotal": 999,
  "tax": 0,
  "total": 999,
  "payment_method": {
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242"
    }
  },
  "urls": {
    "hosted_invoice_url": "https://pay.stripe.com/invoice/acct_123/invst_456",
    "invoice_pdf": "https://pay.stripe.com/invoice/acct_123/invst_456/pdf"
  },
  "stripe_invoice_id": "in_1234567890"
}
```

### Download Invoice

**GET** `/payments/invoices/{id}/download/`

Download invoice as PDF.

**Query Parameters:**

- `format` (string): `pdf` (default) or `html`

**Response (200):**

- Content-Type: `application/pdf` or `text/html`
- Content-Disposition: `attachment; filename="invoice-NAI-0001.pdf"`

## Usage Analytics

### Get Usage Statistics

**GET** `/payments/usage/`

Get detailed usage statistics for the current billing period.

**Query Parameters:**

- `period` (string): `current` (default), `previous`, `all_time`

**Response (200):**

```json
{
  "billing_period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-02-01T00:00:00Z",
    "days_remaining": 12
  },
  "subscription": {
    "plan": "Premium",
    "status": "active"
  },
  "usage": {
    "ai_analyses": {
      "used": 45,
      "limit": -1, // unlimited
      "percentage": null,
      "breakdown": {
        "food_recognition": 40,
        "nutrition_analysis": 45,
        "portion_estimation": 45
      }
    },
    "api_requests": {
      "used": 1250,
      "limit": 10000,
      "percentage": 12.5,
      "breakdown": {
        "meals": 800,
        "analysis": 300,
        "sync": 150
      }
    },
    "data_export": {
      "used": 3,
      "limit": 50,
      "percentage": 6.0,
      "formats_used": ["csv", "pdf"]
    },
    "support_requests": {
      "used": 2,
      "limit": -1, // unlimited for premium
      "average_response_time": "4 hours"
    }
  },
  "compared_to_previous": {
    "ai_analyses": {
      "change": 15,
      "percentage_change": 50.0,
      "trend": "increasing"
    }
  },
  "projections": {
    "ai_analyses_month_end": 52,
    "overage_risk": "low"
  }
}
```

## Promotional Codes & Discounts

### Validate Promotional Code

**POST** `/payments/promocodes/validate/`

Validate a promotional code before applying it.

**Request:**

```json
{
  "code": "WELCOME20",
  "plan_id": 2 // Optional: specific plan to apply to
}
```

**Response (200) - Valid Code:**

```json
{
  "valid": true,
  "code": "WELCOME20",
  "discount": {
    "type": "percentage", // percentage|fixed_amount
    "value": 20,
    "currency": "USD",
    "duration": "once", // once|repeating|forever
    "duration_in_months": null
  },
  "applicable_plans": [2, 3],
  "restrictions": {
    "first_time_customers_only": true,
    "expires_at": "2024-12-31T23:59:59Z",
    "max_redemptions": 1000,
    "redemptions_remaining": 743
  },
  "preview": {
    "original_price": 9.99,
    "discounted_price": 7.99,
    "savings": 2.0
  }
}
```

**Response (400) - Invalid Code:**

```json
{
  "valid": false,
  "error": "code_expired",
  "message": "This promotional code has expired"
}
```

### Apply Promotional Code

**POST** `/payments/promocodes/apply/`

Apply a promotional code to the user's subscription.

**Request:**

```json
{
  "code": "WELCOME20",
  "subscription_id": 123 // Optional: defaults to current subscription
}
```

**Response (200):**

```json
{
  "applied": true,
  "code": "WELCOME20",
  "discount_applied": {
    "type": "percentage",
    "value": 20,
    "amount_saved": 2.0
  },
  "next_invoice_preview": {
    "amount_due": 7.99,
    "discount_amount": 2.0,
    "total": 7.99
  }
}
```

## Webhooks

### Stripe Webhook Endpoint

**POST** `/webhooks/stripe/`

Webhook endpoint for Stripe events.

**Supported Events:**

- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `payment_method.attached`
- `payment_method.detached`

**Event Processing:**

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "invoice.payment_succeeded",
  "created": 1642694400,
  "data": {
    "object": {
      "id": "in_1234567890",
      "amount_paid": 999,
      "currency": "usd",
      "customer": "cus_1234567890",
      "subscription": "sub_1234567890"
    }
  }
}
```

## Error Codes

### Payment-Specific Errors

```json
{
  "error": "card_declined",
  "message": "Your card was declined",
  "decline_code": "generic_decline",
  "suggested_actions": [
    "Try a different payment method",
    "Contact your bank",
    "Check your card details"
  ]
}
```

```json
{
  "error": "subscription_limit_exceeded",
  "message": "You have reached the maximum number of active subscriptions",
  "details": {
    "current_subscriptions": 1,
    "max_allowed": 1
  }
}
```

```json
{
  "error": "plan_not_available",
  "message": "The selected plan is no longer available",
  "suggested_plans": [{ "id": 2, "name": "Premium", "price": 9.99 }]
}
```

## Integration Examples

### Frontend Integration (React)

```javascript
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_...");

// Create subscription
const createSubscription = async (planId, paymentMethodId) => {
  try {
    const response = await fetch("/api/v1/payments/subscription/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        payment_method_id: paymentMethodId,
      }),
    });

    const result = await response.json();

    if (result.payment_intent?.status === "requires_action") {
      // Handle 3D Secure authentication
      const stripe = await stripePromise;
      const { error } = await stripe.confirmCardPayment(
        result.payment_intent.client_secret,
      );

      if (error) {
        throw new Error(error.message);
      }
    }

    return result.subscription;
  } catch (error) {
    console.error("Subscription creation failed:", error);
    throw error;
  }
};

// Add payment method
const addPaymentMethod = async (paymentMethod) => {
  const response = await fetch("/api/v1/payments/methods/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      payment_method_id: paymentMethod.id,
      set_as_default: true,
    }),
  });

  return response.json();
};
```

### Mobile Integration (React Native)

```javascript
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";

// Setup payment sheet
const setupPaymentSheet = async (planId) => {
  const response = await fetch("/api/v1/payments/setup-intent/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan_id: planId }),
  });

  const { client_secret, ephemeral_key, customer_id } = await response.json();

  const { error } = await initPaymentSheet({
    merchantDisplayName: "Nutrition AI",
    customerId: customer_id,
    customerEphemeralKeySecret: ephemeral_key,
    paymentIntentClientSecret: client_secret,
    allowsDelayedPaymentMethods: true,
    defaultBillingDetails: {
      name: "John Doe",
      email: "john@example.com",
    },
  });

  if (error) {
    throw new Error(error.message);
  }
};

// Present payment sheet
const handleSubscription = async () => {
  const { error } = await presentPaymentSheet();

  if (error) {
    console.error("Payment failed:", error.message);
  } else {
    console.log("Payment succeeded");
    // Refresh user subscription status
  }
};
```

For complete integration examples and SDKs, visit: https://docs.your-domain.com/payments/
