"""
Stripe payment service for handling subscription and payment processing.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

import stripe
from django.conf import settings
from django.utils import timezone

from api.exceptions.custom_exceptions import PaymentError
from api.models import (Payment, Subscription, SubscriptionPlan, User)

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")


class StripeService:
    """
    Service for handling Stripe payment operations.
    """

    def __init__(self):
        if not stripe.api_key:
            logger.warning("Stripe API key not configured")

    def create_customer(self, user: User) -> str:
        """
        Create a Stripe customer for the user.

        Args:
            user: The user to create a customer for

        Returns:
            str: Stripe customer ID
        """
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.get_full_name(),
                metadata={
                    "user_id": str(user.id),
                    "username": user.username,
                },
            )
            logger.info(f"Created Stripe customer {customer.id} for user {user.email}")
            return customer.id

        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer for user {user.email}: {e}")
            raise PaymentError(f"Failed to create customer: {e}")

    def get_or_create_customer(self, user: User) -> str:
        """
        Get existing Stripe customer or create a new one.

        Args:
            user: The user to get/create customer for

        Returns:
            str: Stripe customer ID
        """
        # Check if user has an active subscription with customer ID
        active_subscription = user.subscriptions.filter(
            status__in=["active", "trialing"], stripe_customer_id__isnull=False
        ).first()

        if active_subscription and active_subscription.stripe_customer_id:
            return active_subscription.stripe_customer_id

        # Create new customer
        return self.create_customer(user)

    def create_subscription(
        self,
        user: User,
        plan: SubscriptionPlan,
        payment_method_id: str = None,
        trial_days: int = None,
    ) -> Subscription:
        """
        Create a new subscription for the user.

        Args:
            user: The user to create subscription for
            plan: The subscription plan
            payment_method_id: Stripe payment method ID (optional for trials)
            trial_days: Number of trial days (optional)

        Returns:
            Subscription: The created subscription
        """
        try:
            # Get or create Stripe customer
            customer_id = self.get_or_create_customer(user)

            # Prepare subscription data
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": plan.stripe_price_id}],
                "metadata": {
                    "user_id": str(user.id),
                    "plan_id": str(plan.id),
                },
            }

            # Add payment method if provided
            if payment_method_id:
                subscription_data["default_payment_method"] = payment_method_id

            # Add trial period if specified
            if trial_days:
                trial_end = timezone.now() + timedelta(days=trial_days)
                subscription_data["trial_end"] = int(trial_end.timestamp())

            # Create Stripe subscription
            stripe_subscription = stripe.Subscription.create(**subscription_data)

            # Create local subscription record
            subscription = Subscription.objects.create(
                user=user,
                plan=plan,
                stripe_subscription_id=stripe_subscription.id,
                stripe_customer_id=customer_id,
                status=stripe_subscription.status,
                trial_start=(
                    datetime.fromtimestamp(stripe_subscription.trial_start)
                    if stripe_subscription.trial_start
                    else None
                ),
                trial_end=(
                    datetime.fromtimestamp(stripe_subscription.trial_end)
                    if stripe_subscription.trial_end
                    else None
                ),
                current_period_start=datetime.fromtimestamp(
                    stripe_subscription.current_period_start
                ),
                current_period_end=datetime.fromtimestamp(
                    stripe_subscription.current_period_end
                ),
                ai_analyses_reset_date=timezone.now().replace(day=1)
                + timedelta(days=32),
            )

            # Update user account type
            user.account_type = plan.plan_type
            user.save(update_fields=["account_type"])

            # Update user profile premium status
            if hasattr(user, "profile"):
                user.profile.is_premium = plan.plan_type in ["premium", "professional"]
                user.profile.save(update_fields=["is_premium"])

            logger.info(f"Created subscription {subscription.id} for user {user.email}")
            return subscription

        except stripe.error.StripeError as e:
            logger.error(f"Failed to create subscription for user {user.email}: {e}")
            raise PaymentError(f"Failed to create subscription: {e}")

    def cancel_subscription(
        self, subscription: Subscription, at_period_end: bool = True
    ) -> Subscription:
        """
        Cancel a subscription.

        Args:
            subscription: The subscription to cancel
            at_period_end: Whether to cancel at period end or immediately

        Returns:
            Subscription: The updated subscription
        """
        try:
            if at_period_end:
                # Cancel at period end
                stripe_subscription = stripe.Subscription.modify(
                    subscription.stripe_subscription_id, cancel_at_period_end=True
                )
                subscription.cancel_at_period_end = True
                subscription.status = stripe_subscription.status
            else:
                # Cancel immediately
                stripe_subscription = stripe.Subscription.delete(
                    subscription.stripe_subscription_id
                )
                subscription.status = "canceled"
                subscription.canceled_at = timezone.now()

                # Update user account type to free
                subscription.user.account_type = "free"
                subscription.user.save(update_fields=["account_type"])

                # Update user profile premium status
                if hasattr(subscription.user, "profile"):
                    subscription.user.profile.is_premium = False
                    subscription.user.profile.save(update_fields=["is_premium"])

            subscription.save()
            logger.info(f"Canceled subscription {subscription.id}")
            return subscription

        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription.id}: {e}")
            raise PaymentError(f"Failed to cancel subscription: {e}")

    # PaymentMethod model has been removed in backend simplification
    # def add_payment_method(self, user: User, payment_method_id: str) -> PaymentMethod:
    #     """
    #     Add a payment method for the user.
    #
    #     Args:
    #         user: The user to add payment method for
    #         payment_method_id: Stripe payment method ID
    #
    #     Returns:
    #         PaymentMethod: The created payment method
    #     """
    #     try:
    #         # Get or create customer
    #         customer_id = self.get_or_create_customer(user)
    #
    #         # Attach payment method to customer
    #         stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
    #
    #         # Get payment method details
    #         stripe_pm = stripe.PaymentMethod.retrieve(payment_method_id)
    #
    #         # Create local payment method record
    #         payment_method = PaymentMethod.objects.create(
    #             user=user,
    #             stripe_payment_method_id=payment_method_id,
    #             payment_type=stripe_pm.type,
    #             card_brand=stripe_pm.card.brand if stripe_pm.card else "",
    #             card_last4=stripe_pm.card.last4 if stripe_pm.card else "",
    #             card_exp_month=stripe_pm.card.exp_month if stripe_pm.card else None,
    #             card_exp_year=stripe_pm.card.exp_year if stripe_pm.card else None,
    #             is_default=not user.payment_methods.exists(),  # First payment method is default
    #         )
    #
    #         logger.info(
    #             f"Added payment method {payment_method.id} for user {user.email}"
    #         )
    #         return payment_method
    #
    #     except stripe.error.StripeError as e:
    #         logger.error(f"Failed to add payment method for user {user.email}: {e}")
    #         raise PaymentError(f"Failed to add payment method: {e}")

    # PaymentMethod model has been removed in backend simplification
    # def remove_payment_method(self, payment_method: PaymentMethod) -> None:
    #     """
    #     Remove a payment method.
    #
    #     Args:
    #         payment_method: The payment method to remove
    #     """
    #     try:
    #         # Detach from Stripe
    #         stripe.PaymentMethod.detach(payment_method.stripe_payment_method_id)
    #
    #         # Delete local record
    #         payment_method.delete()
    #
    #         logger.info(f"Removed payment method {payment_method.id}")
    #
    #     except stripe.error.StripeError as e:
    #         logger.error(f"Failed to remove payment method {payment_method.id}: {e}")
    #         raise PaymentError(f"Failed to remove payment method: {e}")

    def process_webhook(self, event_data: Dict[str, Any]) -> None:
        """
        Process Stripe webhook events.

        Args:
            event_data: The webhook event data
        """
        event_type = event_data.get("type")
        event_object = event_data.get("data", {}).get("object", {})

        logger.info(f"Processing Stripe webhook: {event_type}")

        try:
            if event_type == "invoice.payment_succeeded":
                self._handle_invoice_payment_succeeded(event_object)
            elif event_type == "invoice.payment_failed":
                self._handle_invoice_payment_failed(event_object)
            elif event_type == "customer.subscription.updated":
                self._handle_subscription_updated(event_object)
            elif event_type == "customer.subscription.deleted":
                self._handle_subscription_deleted(event_object)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")

        except Exception as e:
            logger.error(f"Error processing webhook {event_type}: {e}")
            raise

    def _handle_invoice_payment_succeeded(self, invoice_data: Dict[str, Any]) -> None:
        """Handle successful invoice payment."""
        subscription_id = invoice_data.get("subscription")
        if not subscription_id:
            return

        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=subscription_id
            )

            # Create payment record
            Payment.objects.create(
                user=subscription.user,
                subscription=subscription,
                stripe_invoice_id=invoice_data.get("id"),
                amount=Decimal(invoice_data.get("amount_paid", 0))
                / 100,  # Convert from cents
                currency=invoice_data.get("currency", "usd").upper(),
                status="succeeded",
                description=f"Payment for {subscription.plan.name}",
            )

            # Update subscription status
            subscription.status = "active"
            subscription.save(update_fields=["status"])

            logger.info(
                f"Processed successful payment for subscription {subscription.id}"
            )

        except Subscription.DoesNotExist:
            logger.warning(f"Subscription not found for Stripe ID: {subscription_id}")

    def _handle_invoice_payment_failed(self, invoice_data: Dict[str, Any]) -> None:
        """Handle failed invoice payment."""
        subscription_id = invoice_data.get("subscription")
        if not subscription_id:
            return

        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=subscription_id
            )

            # Create failed payment record
            Payment.objects.create(
                user=subscription.user,
                subscription=subscription,
                stripe_invoice_id=invoice_data.get("id"),
                amount=Decimal(invoice_data.get("amount_due", 0))
                / 100,  # Convert from cents
                currency=invoice_data.get("currency", "usd").upper(),
                status="failed",
                description=f"Failed payment for {subscription.plan.name}",
                failure_reason=invoice_data.get("last_payment_error", {}).get(
                    "message", "Payment failed"
                ),
            )

            # Update subscription status
            subscription.status = "past_due"
            subscription.save(update_fields=["status"])

            logger.warning(
                f"Processed failed payment for subscription {subscription.id}"
            )

        except Subscription.DoesNotExist:
            logger.warning(f"Subscription not found for Stripe ID: {subscription_id}")

    def _handle_subscription_updated(self, subscription_data: Dict[str, Any]) -> None:
        """Handle subscription updates."""
        stripe_subscription_id = subscription_data.get("id")
        if not stripe_subscription_id:
            return

        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=stripe_subscription_id
            )

            # Update subscription fields
            subscription.status = subscription_data.get("status", subscription.status)
            subscription.current_period_start = (
                datetime.fromtimestamp(subscription_data.get("current_period_start"))
                if subscription_data.get("current_period_start")
                else subscription.current_period_start
            )
            subscription.current_period_end = (
                datetime.fromtimestamp(subscription_data.get("current_period_end"))
                if subscription_data.get("current_period_end")
                else subscription.current_period_end
            )
            subscription.cancel_at_period_end = subscription_data.get(
                "cancel_at_period_end", False
            )

            if subscription_data.get("canceled_at"):
                subscription.canceled_at = datetime.fromtimestamp(
                    subscription_data.get("canceled_at")
                )

            subscription.save()

            logger.info(f"Updated subscription {subscription.id} from webhook")

        except Subscription.DoesNotExist:
            logger.warning(
                f"Subscription not found for Stripe ID: {stripe_subscription_id}"
            )

    def _handle_subscription_deleted(self, subscription_data: Dict[str, Any]) -> None:
        """Handle subscription deletion."""
        stripe_subscription_id = subscription_data.get("id")
        if not stripe_subscription_id:
            return

        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=stripe_subscription_id
            )

            # Update subscription status
            subscription.status = "canceled"
            subscription.canceled_at = timezone.now()
            subscription.save()

            # Update user account type to free
            subscription.user.account_type = "free"
            subscription.user.save(update_fields=["account_type"])

            # Update user profile premium status
            if hasattr(subscription.user, "profile"):
                subscription.user.profile.is_premium = False
                subscription.user.profile.save(update_fields=["is_premium"])

            logger.info(f"Canceled subscription {subscription.id} from webhook")

        except Subscription.DoesNotExist:
            logger.warning(
                f"Subscription not found for Stripe ID: {stripe_subscription_id}"
            )


# Global instance
stripe_service = StripeService()
