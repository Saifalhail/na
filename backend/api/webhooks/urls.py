"""
URL configuration for webhook endpoints.
"""

from django.urls import path

from api.views.webhooks import StripeWebhookView, TwilioStatusWebhookView

app_name = "webhooks"

urlpatterns = [
    # Twilio webhooks
    path("twilio/status/", TwilioStatusWebhookView.as_view(), name="twilio-status"),
    # Stripe webhooks
    path("stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
