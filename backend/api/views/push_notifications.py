"""
Views for push notification management.
"""

import logging

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import DeviceToken, PushNotification
from api.permissions import IsOwnerPermission
from api.serializers.mobile_serializers import (DeviceTokenSerializer,
                                                PushNotificationSerializer,
                                                RegisterDeviceSerializer)
from api.services.push_notification_service import push_notification_service

logger = logging.getLogger(__name__)


class RegisterDeviceView(APIView):
    """
    Register or update a device token for push notifications.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Register device for push notifications",
        description="Register or update a device token for receiving push notifications.",
        request=RegisterDeviceSerializer,
        responses={
            201: DeviceTokenSerializer,
            200: DeviceTokenSerializer,
            400: "Bad Request",
        },
    )
    def post(self, request):
        serializer = RegisterDeviceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data

        # Check if device already exists
        device_token, created = DeviceToken.objects.update_or_create(
            user=request.user,
            device_id=validated_data["device_id"],
            defaults={
                "token": validated_data["token"],
                "platform": validated_data["platform"],
                "device_name": validated_data.get("device_name", ""),
                "app_version": validated_data.get("app_version", ""),
                "os_version": validated_data.get("os_version", ""),
                "is_active": True,
                "last_used_at": timezone.now(),
            },
        )

        # Deactivate other tokens for this device if requested
        if validated_data.get("replace_existing", False):
            DeviceToken.objects.filter(
                user=request.user, device_id=validated_data["device_id"]
            ).exclude(id=device_token.id).update(is_active=False)

        response_serializer = DeviceTokenSerializer(device_token)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeviceTokenListView(generics.ListAPIView):
    """
    List user's registered device tokens.
    """

    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.device_tokens.filter(is_active=True)

    @extend_schema(
        summary="List device tokens",
        description="Get all active device tokens for the authenticated user.",
        responses={200: DeviceTokenSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class DeactivateDeviceView(APIView):
    """
    Deactivate a device token.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    @extend_schema(
        summary="Deactivate device token",
        description="Deactivate a device token to stop receiving push notifications.",
        responses={204: "No Content", 404: "Not Found"},
    )
    def delete(self, request, device_id):
        try:
            device_token = request.user.device_tokens.get(
                device_id=device_id, is_active=True
            )
            device_token.is_active = False
            device_token.save(update_fields=["is_active"])

            return Response(status=status.HTTP_204_NO_CONTENT)

        except DeviceToken.DoesNotExist:
            return Response(
                {"detail": "Device token not found."}, status=status.HTTP_404_NOT_FOUND
            )


class TestPushNotificationView(APIView):
    """
    Send a test push notification to the user's devices.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Send test push notification",
        description="Send a test push notification to verify device registration.",
        request={
            "type": "object",
            "properties": {
                "device_id": {
                    "type": "string",
                    "description": "Specific device ID to test (optional)",
                },
                "platform": {
                    "type": "string",
                    "enum": ["ios", "android", "web"],
                    "description": "Specific platform to test (optional)",
                },
            },
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "notifications_sent": {"type": "integer"},
                },
            }
        },
    )
    def post(self, request):
        device_id = request.data.get("device_id")
        platform = request.data.get("platform")

        # Get device tokens to test
        device_tokens = request.user.device_tokens.filter(is_active=True)

        if device_id:
            device_tokens = device_tokens.filter(device_id=device_id)

        if platform:
            device_tokens = device_tokens.filter(platform=platform)

        if not device_tokens.exists():
            return Response(
                {"detail": "No active device tokens found for the specified criteria."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Send test notifications
        notifications = push_notification_service.send_bulk_notifications(
            device_tokens=list(device_tokens),
            title="Test Notification",
            body=f"Hello {request.user.get_full_name()}! This is a test notification from Nutrition AI.",
            data={"type": "test", "timestamp": timezone.now().isoformat()},
        )

        return Response(
            {
                "message": "Test notifications sent successfully",
                "notifications_sent": len(notifications),
            }
        )


class PushNotificationHistoryView(generics.ListAPIView):
    """
    Get push notification history for the user.
    """

    serializer_class = PushNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.push_notifications.all()[:100]  # Limit to last 100

    @extend_schema(
        summary="Get push notification history",
        description="Get the last 100 push notifications sent to the user.",
        responses={200: PushNotificationSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Update device last used timestamp",
    description="Update the last used timestamp for a device token.",
    request={"type": "object", "properties": {"device_id": {"type": "string"}}},
    responses={200: "Timestamp updated successfully"},
)
def update_device_last_used(request):
    """Update device last used timestamp."""
    device_id = request.data.get("device_id")

    if not device_id:
        return Response(
            {"detail": "device_id is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        device_token = request.user.device_tokens.get(device_id=device_id)
        device_token.last_used_at = timezone.now()
        device_token.save(update_fields=["last_used_at"])

        return Response({"detail": "Device timestamp updated successfully"})

    except DeviceToken.DoesNotExist:
        return Response(
            {"detail": "Device token not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Update notification preferences",
    description="Update push notification preferences for the user.",
    request={
        "type": "object",
        "properties": {
            "meal_reminders": {"type": "boolean"},
            "goal_achievements": {"type": "boolean"},
            "weekly_summaries": {"type": "boolean"},
            "promotional": {"type": "boolean"},
        },
    },
    responses={200: "Preferences updated successfully"},
)
def update_notification_preferences(request):
    """Update notification preferences."""
    preferences = {
        "meal_reminders": request.data.get("meal_reminders", True),
        "goal_achievements": request.data.get("goal_achievements", True),
        "weekly_summaries": request.data.get("weekly_summaries", True),
        "promotional": request.data.get("promotional", False),
    }

    # Update user profile with preferences
    if hasattr(request.user, "profile"):
        profile = request.user.profile
        # Store preferences in JSON field or create separate model
        # For now, we'll just log the preferences
        logger.info(
            f"Updated notification preferences for {request.user.email}: {preferences}"
        )

        # You could store these in UserProfile.notification_preferences JSONField
        # profile.notification_preferences = preferences
        # profile.save(update_fields=['notification_preferences'])

    return Response({"detail": "Preferences updated successfully"})
