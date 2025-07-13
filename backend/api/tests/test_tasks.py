"""
Tests for Celery background tasks.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, call, patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from api.models import FoodItem, Meal, MealItem, Notification
from api.tasks.email_tasks import (send_email_notification,
                                   send_password_reset_email,
                                   send_welcome_email)
from api.tasks.notification_tasks import (check_and_notify_achievements,
                                          cleanup_old_notifications,
                                          send_daily_nutrition_summary,
                                          send_meal_reminders,
                                          send_weekly_progress_report)
from api.tests.factories import (FoodItemFactory, MealFactory, MealItemFactory,
                                 NotificationFactory, UserFactory,
                                 UserProfileFactory)

User = get_user_model()


class SendEmailNotificationTestCase(TestCase):
    """Test cases for send_email_notification task."""

    def setUp(self):
        self.user = UserFactory()
        self.user.profile.receive_email_notifications = True
        self.user.profile.save()

    @patch("api.tasks.email_tasks.send_mail")
    @patch("api.tasks.email_tasks.render_to_string")
    @patch("api.tasks.email_tasks.logger")
    def test_send_email_notification_success(
        self, mock_logger, mock_render, mock_send_mail
    ):
        """Test successful email notification sending."""
        notification = NotificationFactory(user=self.user, type="meal_reminder")

        mock_render.side_effect = ["<html>test</html>", "test text"]
        mock_send_mail.return_value = True

        # Create mock task for retry testing
        mock_task = Mock()
        mock_task.max_retries = 3

        send_email_notification(mock_task, notification.id)

        # Check email was sent
        mock_send_mail.assert_called_once()
        call_args = mock_send_mail.call_args
        self.assertEqual(call_args[1]["subject"], notification.title)
        self.assertEqual(call_args[1]["recipient_list"], [self.user.email])

        # Check notification marked as sent
        notification.refresh_from_db()
        self.assertEqual(notification.status, "sent")

        mock_logger.info.assert_called_once()

    def test_send_email_notification_not_found(self):
        """Test handling of non-existent notification."""
        with patch("api.tasks.email_tasks.logger") as mock_logger:
            mock_task = Mock()
            send_email_notification(mock_task, 99999)

            mock_logger.error.assert_called_once_with("Notification 99999 not found")

    def test_send_email_notification_already_sent(self):
        """Test handling of already sent notification."""
        notification = NotificationFactory(user=self.user, status="sent")

        with patch("api.tasks.email_tasks.logger") as mock_logger:
            mock_task = Mock()
            send_email_notification(mock_task, notification.id)

            mock_logger.warning.assert_called_once()
            self.assertIn("already sent", mock_logger.warning.call_args[0][0])

    def test_send_email_notification_user_disabled_emails(self):
        """Test handling when user has disabled email notifications."""
        self.user.profile.receive_email_notifications = False
        self.user.profile.save()

        notification = NotificationFactory(user=self.user)

        mock_task = Mock()
        send_email_notification(mock_task, notification.id)

        notification.refresh_from_db()
        self.assertEqual(notification.status, "failed")

    @patch("api.tasks.email_tasks.send_mail")
    @patch("api.tasks.email_tasks.render_to_string")
    def test_send_email_notification_template_selection(
        self, mock_render, mock_send_mail
    ):
        """Test correct template selection based on notification type."""
        notification = NotificationFactory(user=self.user, type="daily_summary")

        mock_render.side_effect = ["<html>test</html>", "test text"]
        mock_send_mail.return_value = True

        mock_task = Mock()
        mock_task.max_retries = 3
        send_email_notification(mock_task, notification.id)

        # Check correct template was used
        template_calls = mock_render.call_args_list
        self.assertIn("emails/daily_summary.html", template_calls[0][0][0])
        self.assertIn("emails/daily_summary.txt", template_calls[1][0][0])

    @patch("api.tasks.email_tasks.send_mail")
    def test_send_email_notification_retry_on_failure(self):
        """Test retry mechanism on email sending failure."""
        notification = NotificationFactory(user=self.user)

        mock_send_mail.side_effect = Exception("SMTP Error")

        mock_task = Mock()
        mock_task.max_retries = 3
        mock_task.retry = Mock(side_effect=Exception("Retry called"))

        with patch("api.tasks.email_tasks.logger") as mock_logger:
            with self.assertRaises(Exception):
                send_email_notification(mock_task, notification.id)

            # Check notification marked as failed
            notification.refresh_from_db()
            self.assertEqual(notification.status, "failed")

            # Check retry was called
            mock_task.retry.assert_called_once()
            mock_logger.error.assert_called()


class SendWelcomeEmailTestCase(TestCase):
    """Test cases for send_welcome_email task."""

    def setUp(self):
        self.user = UserFactory()

    @patch("api.tasks.email_tasks.send_mail")
    @patch("api.tasks.email_tasks.render_to_string")
    @patch("api.tasks.email_tasks.logger")
    def test_send_welcome_email_success(self, mock_logger, mock_render, mock_send_mail):
        """Test successful welcome email sending."""
        mock_render.side_effect = ["<html>welcome</html>", "welcome text"]
        mock_send_mail.return_value = True

        send_welcome_email(self.user.id)

        mock_send_mail.assert_called_once()
        call_args = mock_send_mail.call_args
        self.assertIn("Welcome", call_args[1]["subject"])
        self.assertEqual(call_args[1]["recipient_list"], [self.user.email])

        mock_logger.info.assert_called_once()

    def test_send_welcome_email_user_not_found(self):
        """Test handling of non-existent user."""
        with patch("api.tasks.email_tasks.logger") as mock_logger:
            send_welcome_email(99999)

            mock_logger.error.assert_called_once()
            self.assertIn("User 99999 not found", mock_logger.error.call_args[0][0])

    @patch("api.tasks.email_tasks.send_mail")
    def test_send_welcome_email_failure(self, mock_send_mail):
        """Test handling of email sending failure."""
        mock_send_mail.side_effect = Exception("SMTP Error")

        with patch("api.tasks.email_tasks.logger") as mock_logger:
            send_welcome_email(self.user.id)

            mock_logger.error.assert_called_once()
            self.assertIn(
                "Failed to send welcome email", mock_logger.error.call_args[0][0]
            )


class SendPasswordResetEmailTestCase(TestCase):
    """Test cases for send_password_reset_email task."""

    def setUp(self):
        self.user = UserFactory()
        self.reset_token = "test-reset-token-123"

    @patch("api.tasks.email_tasks.send_mail")
    @patch("api.tasks.email_tasks.render_to_string")
    @patch("api.tasks.email_tasks.logger")
    def test_send_password_reset_email_success(
        self, mock_logger, mock_render, mock_send_mail
    ):
        """Test successful password reset email sending."""
        mock_render.side_effect = ["<html>reset</html>", "reset text"]
        mock_send_mail.return_value = True

        send_password_reset_email(self.user.id, self.reset_token)

        mock_send_mail.assert_called_once()
        call_args = mock_send_mail.call_args
        self.assertIn("Reset your", call_args[1]["subject"])
        self.assertEqual(call_args[1]["recipient_list"], [self.user.email])

        # Check context includes reset token
        template_calls = mock_render.call_args_list
        context = template_calls[0][0][1]
        self.assertEqual(context["reset_token"], self.reset_token)
        self.assertIn(self.reset_token, context["reset_url"])

        mock_logger.info.assert_called_once()


class SendDailyNutritionSummaryTestCase(TestCase):
    """Test cases for send_daily_nutrition_summary task."""

    def setUp(self):
        self.user = UserFactory()
        self.user.profile.email_daily_summary = True
        self.user.profile.receive_email_notifications = True
        self.user.profile.save()

    @patch("api.tasks.notification_tasks.send_email_notification")
    @patch("api.tasks.notification_tasks.logger")
    def test_send_daily_nutrition_summary_with_meals(
        self, mock_logger, mock_send_email
    ):
        """Test daily summary with logged meals."""
        # Create meals for today
        now = timezone.now()
        food_item = FoodItemFactory(calories_per_100g=200, protein_per_100g=10)
        meal = MealFactory(user=self.user, consumed_at=now)
        MealItemFactory(
            meal=meal, food_item=food_item, quantity=150, calories=300, protein=15
        )

        send_daily_nutrition_summary()

        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user, type="daily_summary"
        ).first()

        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, "Your Daily Nutrition Summary")
        self.assertEqual(notification.data["meal_count"], 1)
        self.assertEqual(notification.data["total_calories"], 300.0)

        # Check email task was queued
        mock_send_email.delay.assert_called_once_with(notification.id)
        mock_logger.info.assert_called_once()

    def test_send_daily_nutrition_summary_no_meals(self):
        """Test daily summary with no logged meals."""
        with patch("api.tasks.notification_tasks.logger") as mock_logger:
            send_daily_nutrition_summary()

            # No notification should be created
            notifications = Notification.objects.filter(
                user=self.user, type="daily_summary"
            )

            self.assertEqual(notifications.count(), 0)
            mock_logger.info.assert_not_called()

    def test_send_daily_nutrition_summary_user_disabled(self):
        """Test daily summary with user who disabled summaries."""
        self.user.profile.email_daily_summary = False
        self.user.profile.save()

        # Create meal
        food_item = FoodItemFactory()
        meal = MealFactory(user=self.user)
        MealItemFactory(meal=meal, food_item=food_item)

        send_daily_nutrition_summary()

        # No notification should be created
        notifications = Notification.objects.filter(
            user=self.user, type="daily_summary"
        )

        self.assertEqual(notifications.count(), 0)


class SendWeeklyProgressReportTestCase(TestCase):
    """Test cases for send_weekly_progress_report task."""

    def setUp(self):
        self.user = UserFactory()
        self.user.profile.email_weekly_report = True
        self.user.profile.receive_email_notifications = True
        self.user.profile.daily_calorie_goal = 2000
        self.user.profile.save()

    @patch("api.tasks.notification_tasks.send_email_notification")
    @patch("api.tasks.notification_tasks.logger")
    def test_send_weekly_progress_report_with_meals(self, mock_logger, mock_send_email):
        """Test weekly report with logged meals."""
        # Create meals for the past week
        now = timezone.now()
        food_item = FoodItemFactory(calories_per_100g=200)

        for i in range(5):  # 5 days with meals
            meal_date = now - timedelta(days=i)
            meal = MealFactory(user=self.user, consumed_at=meal_date)
            MealItemFactory(meal=meal, food_item=food_item, calories=400)

        send_weekly_progress_report()

        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user, type="weekly_report"
        ).first()

        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, "Your Weekly Nutrition Report")
        self.assertEqual(notification.data["meal_count"], 5)
        self.assertEqual(notification.data["days_logged"], 5)
        self.assertEqual(
            notification.data["total_calories"], 2000.0
        )  # 5 meals × 400 calories

        # Check goal adherence calculation
        expected_adherence = (2000 / (2000 * 7)) * 100  # About 14.3%
        self.assertAlmostEqual(
            notification.data["goal_adherence"], expected_adherence, places=1
        )

        mock_send_email.delay.assert_called_once_with(notification.id)
        mock_logger.info.assert_called_once()


class SendMealRemindersTestCase(TestCase):
    """Test cases for send_meal_reminders task."""

    def setUp(self):
        self.user = UserFactory()
        self.user.profile.receive_push_notifications = True
        self.user.profile.meal_reminder_times = ["12:00", "18:30"]
        self.user.profile.save()

    @patch("api.tasks.notification_tasks.timezone")
    @patch("api.tasks.notification_tasks.logger")
    def test_send_meal_reminders_at_reminder_time(self, mock_logger, mock_timezone):
        """Test sending reminder at configured time."""
        # Mock current time to match reminder time
        mock_now = timezone.now().replace(
            hour=12, minute=2
        )  # Within 5 minutes of 12:00
        mock_timezone.now.return_value = mock_now

        send_meal_reminders()

        # Check notification was created
        notification = Notification.objects.filter(
            user=self.user, type="meal_reminder"
        ).first()

        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, "Time to log your meal!")
        self.assertEqual(notification.data["reminder_time"], "12:00")

        mock_logger.info.assert_called_once()

    @patch("api.tasks.notification_tasks.timezone")
    def test_send_meal_reminders_recent_meal_logged(self, mock_timezone):
        """Test no reminder when user logged recent meal."""
        # Mock current time to match reminder time
        mock_now = timezone.now().replace(hour=12, minute=0)
        mock_timezone.now.return_value = mock_now

        # Create recent meal
        recent_meal = MealFactory(
            user=self.user, consumed_at=mock_now - timedelta(hours=1)
        )

        send_meal_reminders()

        # No notification should be created
        notifications = Notification.objects.filter(
            user=self.user, type="meal_reminder"
        )

        self.assertEqual(notifications.count(), 0)

    @patch("api.tasks.notification_tasks.timezone")
    def test_send_meal_reminders_not_reminder_time(self, mock_timezone):
        """Test no reminder when not at reminder time."""
        # Mock current time to not match any reminder time
        mock_now = timezone.now().replace(hour=15, minute=30)
        mock_timezone.now.return_value = mock_now

        send_meal_reminders()

        # No notification should be created
        notifications = Notification.objects.filter(
            user=self.user, type="meal_reminder"
        )

        self.assertEqual(notifications.count(), 0)


class CheckAndNotifyAchievementsTestCase(TestCase):
    """Test cases for check_and_notify_achievements task."""

    def setUp(self):
        self.user = UserFactory()
        self.user.profile.daily_calorie_goal = 2000
        self.user.profile.save()

    @patch("api.tasks.notification_tasks.logger")
    def test_check_daily_calorie_goal_achievement(self, mock_logger):
        """Test notification for daily calorie goal achievement."""
        # Create meals totaling close to daily goal
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        food_item = FoodItemFactory(calories_per_100g=200)
        meal = MealFactory(
            user=self.user, consumed_at=today_start + timedelta(hours=12)
        )
        MealItemFactory(meal=meal, food_item=food_item, calories=1950)  # 97.5% of goal

        check_and_notify_achievements(self.user.id)

        # Check achievement notification was created
        notification = Notification.objects.filter(
            user=self.user, type="goal_achieved"
        ).first()

        self.assertIsNotNone(notification)
        self.assertIn("Daily Calorie Goal Achieved", notification.title)
        self.assertEqual(notification.data["goal_type"], "daily_calories")
        self.assertAlmostEqual(notification.data["percentage"], 97.5, places=1)

        mock_logger.info.assert_called_once()

    @patch("api.tasks.notification_tasks.logger")
    def test_check_streak_milestone_achievement(self, mock_logger):
        """Test notification for streak milestone."""
        # Create meals for consecutive days to hit 7-day streak
        now = timezone.now()

        for i in range(7):
            meal_date = now - timedelta(days=i)
            meal = MealFactory(user=self.user, consumed_at=meal_date)
            MealItemFactory(meal=meal)

        check_and_notify_achievements(self.user.id)

        # Check streak notification was created
        notification = Notification.objects.filter(
            user=self.user, type="streak_milestone"
        ).first()

        self.assertIsNotNone(notification)
        self.assertIn("7-Day Streak", notification.title)
        self.assertEqual(notification.data["milestone"], 7)
        self.assertEqual(notification.data["streak_days"], 7)

        mock_logger.info.assert_called_once()

    def test_check_achievements_user_not_found(self):
        """Test handling of non-existent user."""
        with patch("api.tasks.notification_tasks.logger") as mock_logger:
            check_and_notify_achievements(99999)

            mock_logger.error.assert_called_once()
            self.assertIn("User 99999 not found", mock_logger.error.call_args[0][0])

    def test_check_achievements_no_duplicate_notifications(self):
        """Test that duplicate achievement notifications are not created."""
        # Create achievement first time
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        food_item = FoodItemFactory()
        meal = MealFactory(
            user=self.user, consumed_at=today_start + timedelta(hours=12)
        )
        MealItemFactory(meal=meal, food_item=food_item, calories=2000)  # Exactly goal

        # Run twice
        check_and_notify_achievements(self.user.id)
        check_and_notify_achievements(self.user.id)

        # Should only have one notification
        notifications = Notification.objects.filter(
            user=self.user, type="goal_achieved"
        )

        self.assertEqual(notifications.count(), 1)


class CleanupOldNotificationsTestCase(TestCase):
    """Test cases for cleanup_old_notifications task."""

    def setUp(self):
        self.user = UserFactory()

    @patch("api.tasks.notification_tasks.logger")
    def test_cleanup_old_notifications_delete_read(self, mock_logger):
        """Test deletion of old read notifications."""
        # Create old read notification
        old_date = timezone.now() - timedelta(days=35)
        with patch("django.utils.timezone.now", return_value=old_date):
            old_notification = NotificationFactory(user=self.user, status="read")

        # Create recent notification
        recent_notification = NotificationFactory(user=self.user, status="read")

        cleanup_old_notifications()

        # Old notification should be deleted
        self.assertFalse(Notification.objects.filter(id=old_notification.id).exists())

        # Recent notification should remain
        self.assertTrue(Notification.objects.filter(id=recent_notification.id).exists())

        mock_logger.info.assert_any_call("Deleted 1 old read notifications")

    @patch("api.tasks.notification_tasks.logger")
    def test_cleanup_old_notifications_archive_sent(self, mock_logger):
        """Test archiving of old sent notifications."""
        # Create old sent notification
        old_date = timezone.now() - timedelta(days=35)
        with patch("django.utils.timezone.now", return_value=old_date):
            old_notification = NotificationFactory(user=self.user, status="sent")

        cleanup_old_notifications()

        # Notification should be archived
        old_notification.refresh_from_db()
        self.assertEqual(old_notification.status, "archived")

        mock_logger.info.assert_any_call("Archived 1 old sent notifications")

    def test_cleanup_preserves_recent_notifications(self):
        """Test that recent notifications are preserved."""
        # Create recent notifications
        recent_read = NotificationFactory(user=self.user, status="read")
        recent_sent = NotificationFactory(user=self.user, status="sent")
        recent_pending = NotificationFactory(user=self.user, status="pending")

        cleanup_old_notifications()

        # All recent notifications should be preserved
        self.assertTrue(Notification.objects.filter(id=recent_read.id).exists())
        self.assertTrue(Notification.objects.filter(id=recent_sent.id).exists())
        self.assertTrue(Notification.objects.filter(id=recent_pending.id).exists())

        # Check statuses haven't changed
        recent_read.refresh_from_db()
        recent_sent.refresh_from_db()
        recent_pending.refresh_from_db()

        self.assertEqual(recent_read.status, "read")
        self.assertEqual(recent_sent.status, "sent")
        self.assertEqual(recent_pending.status, "pending")
