# Generated manually to add missing mobile push notification models

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_add_payment_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="DeviceToken",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("token", models.TextField()),
                (
                    "platform",
                    models.CharField(
                        choices=[
                            ("ios", "iOS"),
                            ("android", "Android"),
                            ("web", "Web"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "device_id",
                    models.CharField(
                        default="unknown_device",
                        max_length=255,
                        help_text="Unique device identifier",
                    ),
                ),
                (
                    "device_name",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "device_model",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("app_version", models.CharField(blank=True, max_length=50, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("last_used", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="device_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "platform"], name="idx_device_user_platform"
                    ),
                    models.Index(fields=["token"], name="idx_device_token"),
                    models.Index(fields=["device_id"], name="idx_device_device_id"),
                    models.Index(fields=["is_active"], name="idx_device_is_active"),
                ],
            },
        ),
        migrations.CreateModel(
            name="PushNotification",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField()),
                ("data", models.JSONField(blank=True, default=dict)),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("meal_reminder", "Meal Reminder"),
                            ("goal_achieved", "Goal Achieved"),
                            ("streak_milestone", "Streak Milestone"),
                            ("weekly_summary", "Weekly Summary"),
                            ("general", "General"),
                        ],
                        default="general",
                        max_length=50,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("sent", "Sent"),
                            ("failed", "Failed"),
                            ("delivered", "Delivered"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "device_token",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="api.devicetoken",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="push_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "status"], name="idx_push_user_status"
                    ),
                ],
            },
        ),
    ]
