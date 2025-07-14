"""
URL patterns for payment and subscription endpoints.
"""

from django.urls import path

from api.views.payments import (AddPaymentMethodView, BillingHistoryView,
                                CancelSubscriptionView, CreateSubscriptionView,
                                InvoiceDetailView, InvoiceListView,
                                PaymentHistoryView, PaymentMethodListView,
                                RemovePaymentMethodView, StripeWebhookView,
                                SubscriptionDetailView,
                                SubscriptionPlanListView,
                                UserSubscriptionListView, ai_usage_check,
                                current_subscription, record_ai_usage)

app_name = "payments"

urlpatterns = [
    # Subscription plans
    path("plans/", SubscriptionPlanListView.as_view(), name="subscription-plans"),
    # Subscriptions
    path(
        "subscriptions/", UserSubscriptionListView.as_view(), name="user-subscriptions"
    ),
    path(
        "subscriptions/create/",
        CreateSubscriptionView.as_view(),
        name="create-subscription",
    ),
    path("subscriptions/current/", current_subscription, name="current-subscription"),
    path(
        "subscriptions/<uuid:pk>/",
        SubscriptionDetailView.as_view(),
        name="subscription-detail",
    ),
    path(
        "subscriptions/<uuid:pk>/cancel/",
        CancelSubscriptionView.as_view(),
        name="cancel-subscription",
    ),
    # Payment methods
    path("payment-methods/", PaymentMethodListView.as_view(), name="payment-methods"),
    path(
        "payment-methods/add/",
        AddPaymentMethodView.as_view(),
        name="add-payment-method",
    ),
    path(
        "payment-methods/<uuid:pk>/remove/",
        RemovePaymentMethodView.as_view(),
        name="remove-payment-method",
    ),
    # Billing and payments
    path("payments/", PaymentHistoryView.as_view(), name="payment-history"),
    path("invoices/", InvoiceListView.as_view(), name="invoices"),
    path("invoices/<uuid:pk>/", InvoiceDetailView.as_view(), name="invoice-detail"),
    path("billing/history/", BillingHistoryView.as_view(), name="billing-history"),
    # AI usage tracking
    path("ai/usage-check/", ai_usage_check, name="ai-usage-check"),
    path("ai/record-usage/", record_ai_usage, name="record-ai-usage"),
    # Stripe webhooks
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
