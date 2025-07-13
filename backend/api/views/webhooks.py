"""
Webhook views for handling external service callbacks.
"""

import hashlib
import hmac
import logging

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from twilio.request_validator import RequestValidator

from api.tasks.sms_tasks import check_sms_delivery_status

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class TwilioStatusWebhookView(View):
    """
    Handle Twilio SMS status webhook callbacks.

    Twilio sends POST requests to this endpoint when SMS status changes.
    """

    def post(self, request, *args, **kwargs):
        """
        Process Twilio status callback.

        Expected fields:
        - MessageSid: Unique message identifier
        - MessageStatus: Status of the message (delivered, failed, etc.)
        - ErrorCode: Error code if failed
        - ErrorMessage: Error message if failed
        """
        # Validate the request is from Twilio
        if not self._validate_twilio_request(request):
            logger.warning("Invalid Twilio webhook request received")
            return HttpResponseBadRequest("Invalid request signature")

        # Extract message data
        message_sid = request.POST.get("MessageSid")
        message_status = request.POST.get("MessageStatus")
        error_code = request.POST.get("ErrorCode")
        error_message = request.POST.get("ErrorMessage")

        if not message_sid:
            return HttpResponseBadRequest("Missing MessageSid")

        logger.info(
            f"Received Twilio status callback for {message_sid}: {message_status}"
        )

        # Process the status update asynchronously
        check_sms_delivery_status.delay(message_sid)

        # Return 200 OK to Twilio
        return HttpResponse(status=200)

    def _validate_twilio_request(self, request):
        """
        Validate that the request came from Twilio.

        Args:
            request: Django HttpRequest object

        Returns:
            True if valid, False otherwise
        """
        # Get Twilio auth token
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
        if not auth_token:
            logger.error("TWILIO_AUTH_TOKEN not configured")
            return False

        # Get the request URL
        # In production, ensure this uses HTTPS
        request_url = request.build_absolute_uri()

        # Get the signature from headers
        signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")

        if not signature:
            logger.warning("Missing X-Twilio-Signature header")
            return False

        # Create validator
        validator = RequestValidator(auth_token)

        # Validate the request
        # For POST requests, we need to pass the POST data
        is_valid = validator.validate(request_url, request.POST, signature)

        return is_valid


class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events.

    This is a placeholder for Stripe webhook handling.
    """

    authentication_classes = []
    permission_classes = []

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        """
        Process Stripe webhook events.
        """
        # Get webhook secret
        webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
        if not webhook_secret:
            logger.error("STRIPE_WEBHOOK_SECRET not configured")
            return Response(
                {"error": "Webhook secret not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Get the signature from headers
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
        if not sig_header:
            logger.warning("Missing Stripe-Signature header")
            return Response(
                {"error": "Missing signature"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate Stripe webhook signature
        try:
            import stripe

            stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY")

            # Construct the event object
            event = stripe.Webhook.construct_event(
                request.body, sig_header, webhook_secret
            )

            logger.info(f"Validated Stripe webhook event: {event['type']}")

            # Process different event types
            event_type = event["type"]

            if event_type == "payment_intent.succeeded":
                self._handle_payment_success(event["data"]["object"])
            elif event_type == "payment_intent.payment_failed":
                self._handle_payment_failure(event["data"]["object"])
            elif event_type == "invoice.payment_succeeded":
                self._handle_subscription_payment(event["data"]["object"])
            elif event_type == "customer.subscription.deleted":
                self._handle_subscription_cancelled(event["data"]["object"])
            else:
                logger.info(f"Unhandled Stripe event type: {event_type}")

            return Response({"status": "processed"}, status=status.HTTP_200_OK)

        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid Stripe webhook signature")
            return Response(
                {"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error processing Stripe webhook: {str(e)}")
            return Response(
                {"error": "Webhook processing failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_payment_success(self, payment_intent):
        """Handle successful payment."""
        logger.info(f"Payment succeeded: {payment_intent.get('id')}")
        # TODO: Update order status, send confirmation email

    def _handle_payment_failure(self, payment_intent):
        """Handle failed payment."""
        logger.warning(f"Payment failed: {payment_intent.get('id')}")
        # TODO: Update order status, notify user

    def _handle_subscription_payment(self, invoice):
        """Handle subscription payment."""
        logger.info(f"Subscription payment succeeded: {invoice.get('id')}")
        # TODO: Update subscription status

    def _handle_subscription_cancelled(self, subscription):
        """Handle subscription cancellation."""
        logger.info(f"Subscription cancelled: {subscription.get('id')}")
        # TODO: Update user subscription status
