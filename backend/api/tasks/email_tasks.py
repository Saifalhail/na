"""
Celery tasks for email notifications.
"""

import logging

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from api.models import Notification

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_email_notification(self, notification_id):
    """
    Send an email notification.

    Args:
        notification_id: ID of the Notification object
    """
    try:
        notification = Notification.objects.get(id=notification_id)

        # Check if already sent
        if notification.status == "sent":
            logger.warning(f"Notification {notification_id} already sent")
            return

        # Check if user wants email notifications
        if not notification.user.profile.receive_email_notifications:
            notification.mark_as_failed("User has disabled email notifications")
            return

        # Prepare email context
        context = {
            "user": notification.user,
            "title": notification.title,
            "message": notification.message,
            "data": notification.data,
            "site_name": getattr(settings, "SITE_NAME", "Nutrition AI"),
            "site_url": getattr(settings, "FRONTEND_URL", "https://nutritionai.com"),
        }

        # Determine template based on notification type
        template_map = {
            "meal_reminder": "emails/meal_reminder",
            "daily_summary": "emails/daily_summary",
            "weekly_report": "emails/weekly_report",
            "goal_achieved": "emails/goal_achieved",
            "streak_milestone": "emails/streak_milestone",
            "system": "emails/system_notification",
            "tips": "emails/nutrition_tips",
        }

        template_base = template_map.get(
            notification.type, "emails/generic_notification"
        )

        # Render email templates
        html_message = render_to_string(f"{template_base}.html", context)
        text_message = render_to_string(f"{template_base}.txt", context)

        # Send email
        send_mail(
            subject=notification.title,
            message=text_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.user.email],
            fail_silently=False,
        )

        # Mark as sent
        notification.mark_as_sent()
        logger.info(
            f"Email notification {notification_id} sent to {notification.user.email}"
        )

    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")

    except Exception as e:
        logger.error(f"Failed to send email notification {notification_id}: {str(e)}")

        # Retry with exponential backoff
        try:
            notification = Notification.objects.get(id=notification_id)
            notification.mark_as_failed(str(e))

            if notification.retry_count < self.max_retries:
                raise self.retry(
                    countdown=60 * (2**notification.retry_count)
                )  # Exponential backoff
        except Notification.DoesNotExist:
            pass


@shared_task
def send_welcome_email(user_id):
    """
    Send welcome email to new user.

    Args:
        user_id: ID of the User object
    """
    try:
        user = User.objects.get(id=user_id)

        context = {
            "user": user,
            "site_name": getattr(settings, "SITE_NAME", "Nutrition AI"),
            "site_url": getattr(settings, "FRONTEND_URL", "https://nutritionai.com"),
            "support_email": getattr(
                settings, "SUPPORT_EMAIL", "support@nutritionai.com"
            ),
        }

        html_message = render_to_string("emails/welcome.html", context)
        text_message = render_to_string("emails/welcome.txt", context)

        send_mail(
            subject=f"Welcome to {context['site_name']}!",
            message=text_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        logger.info(f"Welcome email sent to {user.email}")

    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")

    except Exception as e:
        logger.error(f"Failed to send welcome email to user {user_id}: {str(e)}")


@shared_task
def send_password_reset_email(user_id, reset_token):
    """
    Send password reset email.

    Args:
        user_id: ID of the User object
        reset_token: Password reset token
    """
    try:
        user = User.objects.get(id=user_id)

        context = {
            "user": user,
            "reset_token": reset_token,
            "reset_url": f"{getattr(settings, 'FRONTEND_URL', '')}/auth/reset-password?token={reset_token}",
            "site_name": getattr(settings, "SITE_NAME", "Nutrition AI"),
            "expiry_hours": 24,
        }

        html_message = render_to_string("emails/reset_password.html", context)
        text_message = render_to_string("emails/reset_password.txt", context)

        send_mail(
            subject=f"Reset your {context['site_name']} password",
            message=text_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        logger.info(f"Password reset email sent to {user.email}")

    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")

    except Exception as e:
        logger.error(f"Failed to send password reset email to user {user_id}: {str(e)}")
