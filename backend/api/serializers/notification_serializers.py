"""
Serializers for notification management.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from api.models import Notification

User = get_user_model()


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    """

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "status",
            "channel",
            "priority",
            "data",
            "scheduled_for",
            "sent_at",
            "read_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "sent_at", "created_at", "updated_at"]


class NotificationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing notifications.
    """

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "status",
            "priority",
            "created_at",
            "read_at",
        ]


class NotificationPreferencesSerializer(serializers.Serializer):
    """
    Serializer for notification preferences.
    """

    receive_email_notifications = serializers.BooleanField(default=True)
    receive_push_notifications = serializers.BooleanField(default=True)
    receive_sms_notifications = serializers.BooleanField(default=False)

    # Email preferences
    email_daily_summary = serializers.BooleanField(default=True)
    email_weekly_report = serializers.BooleanField(default=True)
    email_tips = serializers.BooleanField(default=True)

    # Reminder preferences
    meal_reminder_times = serializers.ListField(
        child=serializers.CharField(max_length=5),
        default=list,
        help_text='Times for meal reminders (e.g., ["08:00", "12:00", "18:00"])',
    )

    # In-app notification preferences
    notification_preferences = serializers.JSONField(
        default=dict, help_text="Detailed preferences for different notification types"
    )

    def validate_meal_reminder_times(self, value):
        """
        Validate meal reminder times format.
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Meal reminder times must be a list")

        for time_str in value:
            if not isinstance(time_str, str):
                raise serializers.ValidationError("Each reminder time must be a string")

            try:
                # Validate time format (HH:MM)
                hour, minute = map(int, time_str.split(":"))
                if not (0 <= hour <= 23 and 0 <= minute <= 59):
                    raise ValueError()
            except (ValueError, IndexError):
                raise serializers.ValidationError(
                    f"Invalid time format: {time_str}. Use HH:MM format (e.g., '08:30')"
                )

        return value

    def update(self, instance, validated_data):
        """
        Update user profile with notification preferences.
        """
        profile = instance.profile

        # Update profile fields
        for field, value in validated_data.items():
            if hasattr(profile, field):
                setattr(profile, field, value)

        profile.save()
        return instance


class MarkAsReadSerializer(serializers.Serializer):
    """
    Serializer for marking notifications as read.
    """

    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        help_text="List of notification IDs to mark as read",
    )


class NotificationStatsSerializer(serializers.Serializer):
    """
    Serializer for notification statistics.
    """

    total_notifications = serializers.IntegerField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    by_type = serializers.DictField(read_only=True)
    by_priority = serializers.DictField(read_only=True)
    recent_notifications = NotificationListSerializer(many=True, read_only=True)


class CreateNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for creating notifications (admin use).
    """

    class Meta:
        model = Notification
        fields = [
            "type",
            "title",
            "message",
            "channel",
            "priority",
            "data",
            "scheduled_for",
        ]

    def validate_data(self, value):
        """
        Ensure data is a valid JSON object.
        """
        if value is None:
            return {}

        if not isinstance(value, dict):
            raise serializers.ValidationError("Data must be a JSON object")

        return value
