"""
Views for payment and subscription management.
"""

import logging
from decimal import Decimal

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from api.exceptions.custom_exceptions import PaymentError
from api.models import (Payment, Subscription, SubscriptionPlan)
from api.permissions import IsOwnerPermission
from api.serializers.payment_serializers import (AddPaymentMethodSerializer,
                                                 BillingHistorySerializer,
                                                 CancelSubscriptionSerializer,
                                                 CreateSubscriptionSerializer,
                                                 InvoiceSerializer,
                                                 PaymentMethodSerializer,
                                                 PaymentSerializer,
                                                 SubscriptionPlanSerializer,
                                                 SubscriptionSerializer)
from api.services.stripe_service import stripe_service

logger = logging.getLogger(__name__)


class SubscriptionPlanListView(generics.ListAPIView):
    """
    List all available subscription plans.
    """

    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)

    @extend_schema(
        summary="List subscription plans",
        description="Get all available subscription plans for users to choose from.",
        responses={200: SubscriptionPlanSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class UserSubscriptionListView(generics.ListAPIView):
    """
    List user's subscriptions.
    """

    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.subscriptions.all().select_related("plan")

    @extend_schema(
        summary="List user subscriptions",
        description="Get all subscriptions for the authenticated user.",
        responses={200: SubscriptionSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class CreateSubscriptionView(APIView):
    """
    Create a new subscription for the user.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Create subscription",
        description="Create a new subscription for the authenticated user.",
        request=CreateSubscriptionSerializer,
        responses={201: SubscriptionSerializer, 400: "Bad Request"},
    )
    def post(self, request):
        serializer = CreateSubscriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already has an active subscription
        active_subscription = request.user.subscriptions.filter(
            status__in=["active", "trialing"]
        ).first()

        if active_subscription:
            return Response(
                {"detail": "User already has an active subscription."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = SubscriptionPlan.objects.get(id=serializer.validated_data["plan_id"])

            # Create subscription through Stripe service
            subscription = stripe_service.create_subscription(
                user=request.user,
                plan=plan,
                payment_method_id=serializer.validated_data.get("payment_method_id"),
                trial_days=serializer.validated_data.get("trial_days"),
            )

            response_serializer = SubscriptionSerializer(subscription)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            return Response(
                {"detail": "Failed to create subscription."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SubscriptionDetailView(generics.RetrieveAPIView):
    """
    Get subscription details.
    """

    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    def get_queryset(self):
        return self.request.user.subscriptions.all().select_related("plan")

    @extend_schema(
        summary="Get subscription details",
        description="Get detailed information about a specific subscription.",
        responses={200: SubscriptionSerializer},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class CancelSubscriptionView(APIView):
    """
    Cancel a subscription.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    @extend_schema(
        summary="Cancel subscription",
        description="Cancel a subscription either immediately or at the end of the current period.",
        request=CancelSubscriptionSerializer,
        responses={200: SubscriptionSerializer, 400: "Bad Request", 404: "Not Found"},
    )
    def post(self, request, pk):
        try:
            subscription = request.user.subscriptions.get(id=pk)
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "Subscription not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if subscription.status in ["canceled", "inactive"]:
            return Response(
                {"detail": "Subscription is already canceled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CancelSubscriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            canceled_subscription = stripe_service.cancel_subscription(
                subscription=subscription,
                at_period_end=serializer.validated_data.get(
                    "cancel_at_period_end", True
                ),
            )

            response_serializer = SubscriptionSerializer(canceled_subscription)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentMethodListView(generics.ListAPIView):
    """
    List user's payment methods.
    """

    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.payment_methods.filter(is_active=True)

    @extend_schema(
        summary="List payment methods",
        description="Get all active payment methods for the authenticated user.",
        responses={200: PaymentMethodSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AddPaymentMethodView(APIView):
    """
    Add a new payment method.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Add payment method",
        description="Add a new payment method for the authenticated user.",
        request=AddPaymentMethodSerializer,
        responses={201: PaymentMethodSerializer, 400: "Bad Request"},
    )
    def post(self, request):
        serializer = AddPaymentMethodSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment_method = stripe_service.add_payment_method(
                user=request.user,
                payment_method_id=serializer.validated_data["payment_method_id"],
            )

            # Set as default if requested
            if serializer.validated_data.get("set_as_default", False):
                # Remove default from other methods
                request.user.payment_methods.filter(is_default=True).update(
                    is_default=False
                )
                payment_method.is_default = True
                payment_method.save(update_fields=["is_default"])

            response_serializer = PaymentMethodSerializer(payment_method)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RemovePaymentMethodView(APIView):
    """
    Remove a payment method.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    @extend_schema(
        summary="Remove payment method",
        description="Remove a payment method from the user's account.",
        responses={204: "No Content", 400: "Bad Request", 404: "Not Found"},
    )
    def delete(self, request, pk):
        try:
            payment_method = request.user.payment_methods.get(id=pk)
        except PaymentMethod.DoesNotExist:
            return Response(
                {"detail": "Payment method not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if this is the only payment method for active subscriptions
        active_subscriptions = request.user.subscriptions.filter(
            status__in=["active", "trialing"]
        )

        if (
            active_subscriptions.exists()
            and request.user.payment_methods.filter(is_active=True).count() == 1
        ):
            return Response(
                {
                    "detail": "Cannot remove the only payment method with active subscriptions."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            stripe_service.remove_payment_method(payment_method)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except PaymentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentHistoryView(generics.ListAPIView):
    """
    List user's payment history.
    """

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.payments.all().select_related("subscription__plan")

    @extend_schema(
        summary="List payment history",
        description="Get payment history for the authenticated user.",
        responses={200: PaymentSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class InvoiceListView(generics.ListAPIView):
    """
    List user's invoices.
    """

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.invoices.all().select_related("subscription__plan")

    @extend_schema(
        summary="List invoices",
        description="Get all invoices for the authenticated user.",
        responses={200: InvoiceSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class InvoiceDetailView(generics.RetrieveAPIView):
    """
    Get invoice details.
    """

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    def get_queryset(self):
        return self.request.user.invoices.all().select_related("subscription__plan")

    @extend_schema(
        summary="Get invoice details",
        description="Get detailed information about a specific invoice.",
        responses={200: InvoiceSerializer},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class BillingHistoryView(APIView):
    """
    Get billing history summary.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get billing history summary",
        description="Get a summary of the user's billing history including total spent and payment statistics.",
        responses={200: BillingHistorySerializer},
    )
    def get(self, request):
        user = request.user
        payments = user.payments.filter(status="succeeded")

        # Calculate summary
        total_spent = sum(payment.amount for payment in payments)
        successful_payments = payments.count()
        failed_payments = user.payments.filter(status="failed").count()

        last_payment = payments.order_by("-created_at").first()
        last_payment_date = last_payment.created_at if last_payment else None

        # Get next payment date from active subscription
        active_subscription = user.subscriptions.filter(
            status__in=["active", "trialing"]
        ).first()
        next_payment_date = (
            active_subscription.current_period_end if active_subscription else None
        )

        data = {
            "total_spent": total_spent,
            "successful_payments": successful_payments,
            "failed_payments": failed_payments,
            "last_payment_date": last_payment_date,
            "next_payment_date": next_payment_date,
        }

        serializer = BillingHistorySerializer(data)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
        endpoint_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")

        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        except ValueError:
            logger.error("Invalid payload in Stripe webhook")
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature in Stripe webhook")
            return HttpResponse(status=400)

        try:
            # Process the webhook
            stripe_service.process_webhook(event)
            return HttpResponse(status=200)

        except Exception as e:
            logger.error(f"Error processing Stripe webhook: {e}")
            return HttpResponse(status=500)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Get current user's active subscription",
    description="Get the current active subscription for the authenticated user.",
    responses={200: SubscriptionSerializer, 404: "No active subscription found"},
)
def current_subscription(request):
    """Get current user's active subscription."""
    active_subscription = (
        request.user.subscriptions.filter(status__in=["active", "trialing"])
        .select_related("plan")
        .first()
    )

    if not active_subscription:
        return Response(
            {"detail": "No active subscription found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = SubscriptionSerializer(active_subscription)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Check if user can use AI analysis",
    description="Check if the authenticated user can use AI analysis based on their subscription limits.",
    responses={
        200: {
            "type": "object",
            "properties": {
                "can_use_ai": {"type": "boolean"},
                "analyses_remaining": {"type": "integer"},
                "reset_date": {"type": "string", "format": "date-time"},
            },
        }
    },
)
def ai_usage_check(request):
    """Check if user can use AI analysis."""
    active_subscription = request.user.subscriptions.filter(
        status__in=["active", "trialing"]
    ).first()

    if not active_subscription:
        # Free tier - check against free plan limits
        free_plan = SubscriptionPlan.objects.filter(plan_type="free").first()
        if free_plan:
            # For demo purposes, assume free users get 10 analyses per month
            # In reality, you'd track this in a separate model or use the subscription system
            can_use = True  # Simplified for now
            analyses_remaining = 10  # Simplified for now
        else:
            can_use = False
            analyses_remaining = 0

        return Response(
            {
                "can_use_ai": can_use,
                "analyses_remaining": analyses_remaining,
                "reset_date": None,
            }
        )

    can_use = active_subscription.can_use_ai_analysis()
    analyses_remaining = max(
        0,
        active_subscription.plan.ai_analysis_limit
        - active_subscription.ai_analyses_used,
    )

    if active_subscription.plan.ai_analysis_limit == -1:
        analyses_remaining = -1  # Unlimited

    return Response(
        {
            "can_use_ai": can_use,
            "analyses_remaining": analyses_remaining,
            "reset_date": active_subscription.ai_analyses_reset_date,
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Record AI analysis usage",
    description="Record that the user has used an AI analysis (for tracking subscription limits).",
    responses={200: "Usage recorded successfully"},
)
def record_ai_usage(request):
    """Record AI analysis usage."""
    active_subscription = request.user.subscriptions.filter(
        status__in=["active", "trialing"]
    ).first()

    if active_subscription:
        active_subscription.increment_ai_usage()

    return Response({"detail": "Usage recorded successfully."})
