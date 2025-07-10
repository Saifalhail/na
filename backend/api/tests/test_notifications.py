"""
Tests for notification functionality.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
import json

from api.models import Notification, UserProfile
from api.factories import UserFactory, UserProfileFactory
from api.tasks.notification_tasks import (
    send_daily_nutrition_summary,
    check_and_notify_achievements,
    cleanup_old_notifications
)

User = get_user_model()


class NotificationModelTest(TestCase):
    """
    Test cases for Notification model.
    """
    
    def setUp(self):
        self.user = UserFactory()
    
    def test_create_notification(self):
        """Test creating a notification."""
        notification = Notification.objects.create(
            user=self.user,
            type='meal_reminder',
            title='Test Notification',
            message='Test message',
            channel='in_app',
            priority='medium'
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.type, 'meal_reminder')
        self.assertEqual(notification.status, 'pending')
        self.assertEqual(notification.channel, 'in_app')
        self.assertEqual(notification.priority, 'medium')
        self.assertIsNotNone(notification.created_at)
    
    def test_mark_as_sent(self):
        """Test marking notification as sent."""
        notification = Notification.objects.create(
            user=self.user,
            type='daily_summary',
            title='Test',
            message='Test',
        )
        
        notification.mark_as_sent()
        
        self.assertEqual(notification.status, 'sent')
        self.assertIsNotNone(notification.sent_at)
    
    def test_mark_as_read(self):
        """Test marking notification as read."""
        notification = Notification.objects.create(
            user=self.user,
            type='daily_summary',
            title='Test',
            message='Test',
        )
        
        notification.mark_as_read()
        
        self.assertEqual(notification.status, 'read')
        self.assertIsNotNone(notification.read_at)
    
    def test_mark_as_failed(self):
        """Test marking notification as failed."""
        notification = Notification.objects.create(
            user=self.user,
            type='daily_summary',
            title='Test',
            message='Test',
        )
        
        error_message = "Email delivery failed"
        notification.mark_as_failed(error_message)
        
        self.assertEqual(notification.status, 'failed')
        self.assertEqual(notification.error_message, error_message)
        self.assertIsNotNone(notification.failed_at)
        self.assertEqual(notification.retry_count, 1)


class NotificationAPITest(APITestCase):
    """
    Test cases for notification API endpoints.
    """
    
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        
        # Create test notifications
        self.notification1 = Notification.objects.create(
            user=self.user,
            type='meal_reminder',
            title='Reminder 1',
            message='Test message 1',
            priority='high'
        )
        
        self.notification2 = Notification.objects.create(
            user=self.user,
            type='daily_summary',
            title='Summary 1',
            message='Test message 2',
            status='read',
            priority='medium'
        )
        
        # Notification for other user
        self.other_notification = Notification.objects.create(
            user=self.other_user,
            type='goal_achieved',
            title='Goal Achieved',
            message='Test message 3',
            priority='high'
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_list_notifications(self):
        """Test listing user's notifications."""
        url = reverse('api:notifications:notifications-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Should only see own notifications
        notification_ids = [n['id'] for n in response.data['results']]
        self.assertIn(self.notification1.id, notification_ids)
        self.assertIn(self.notification2.id, notification_ids)
        self.assertNotIn(self.other_notification.id, notification_ids)
    
    def test_retrieve_notification(self):
        """Test retrieving a single notification."""
        url = reverse('api:notifications:notifications-detail', kwargs={'pk': self.notification1.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.notification1.id)
        self.assertEqual(response.data['title'], 'Reminder 1')
    
    def test_retrieve_other_user_notification(self):
        """Test that users cannot access other users' notifications."""
        url = reverse('api:notifications:notifications-detail', kwargs={'pk': self.other_notification.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_mark_as_read(self):
        """Test marking notifications as read."""
        url = reverse('api:notifications:notifications-mark-as-read')
        data = {
            'notification_ids': [self.notification1.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated_count'], 1)
        
        # Check notification was updated
        self.notification1.refresh_from_db()
        self.assertEqual(self.notification1.status, 'read')
        self.assertIsNotNone(self.notification1.read_at)
    
    def test_mark_all_as_read(self):
        """Test marking all notifications as read."""
        url = reverse('api:notifications:notifications-mark-all-as-read')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated_count'], 1)  # Only one unread notification
        
        # Check notification was updated
        self.notification1.refresh_from_db()
        self.assertEqual(self.notification1.status, 'read')
    
    def test_notification_stats(self):
        """Test getting notification statistics."""
        url = reverse('api:notifications:notifications-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_notifications'], 2)
        self.assertEqual(response.data['unread_count'], 1)
        self.assertEqual(response.data['read_count'], 1)
        self.assertIn('by_type', response.data)
        self.assertIn('by_priority', response.data)
    
    def test_unread_notifications(self):
        """Test getting unread notifications."""
        url = reverse('api:notifications:notifications-unread')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.notification1.id)
    
    def test_notification_preferences(self):
        """Test getting and updating notification preferences."""
        url = reverse('api:notifications:preferences')
        
        # Get current preferences
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update preferences
        data = {
            'receive_email_notifications': False,
            'email_daily_summary': False,
            'meal_reminder_times': ['08:00', '12:00', '18:00']
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check profile was updated
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.receive_email_notifications)
        self.assertFalse(self.user.profile.email_daily_summary)
        self.assertEqual(self.user.profile.meal_reminder_times, ['08:00', '12:00', '18:00'])
    
    def test_invalid_reminder_time_format(self):
        """Test validation of meal reminder time format."""
        url = reverse('api:notifications:preferences')
        data = {
            'meal_reminder_times': ['invalid_time', '25:00', '12:70']
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('meal_reminder_times', response.data)
    
    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access notifications."""
        self.client.force_authenticate(user=None)
        
        url = reverse('api:notifications:notifications-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class NotificationTaskTest(TestCase):
    """
    Test cases for notification tasks.
    """
    
    def setUp(self):
        self.user = UserFactory()
        self.profile = UserProfileFactory(
            user=self.user,
            email_daily_summary=True,
            receive_email_notifications=True
        )
    
    @patch('api.tasks.notification_tasks.send_email_notification.delay')
    def test_daily_summary_task(self, mock_send_email):
        """Test daily nutrition summary task."""
        # Create a meal for today
        from api.models import Meal
        meal = Meal.objects.create(
            user=self.user,
            name='Test Meal',
            consumed_at=timezone.now()
        )
        
        # Run the task
        send_daily_nutrition_summary()
        
        # Check notification was created
        notifications = Notification.objects.filter(
            user=self.user,
            type='daily_summary'
        )
        self.assertEqual(notifications.count(), 1)
        
        notification = notifications.first()
        self.assertEqual(notification.title, 'Your Daily Nutrition Summary')
        self.assertIn('Test Meal', notification.message)  # Meal name in message
        
        # Check email task was called
        mock_send_email.assert_called_once_with(notification.id)
    
    def test_achievement_check_task(self):
        """Test achievement notification task."""
        # Create meals that meet daily calorie goal
        from api.models import Meal
        
        # Set calorie goal
        self.user.profile.daily_calorie_goal = 2000
        self.user.profile.save()
        
        # Create meal that meets goal
        meal = Meal.objects.create(
            user=self.user,
            name='Test Meal',
            total_calories=1950,  # Within 10% of goal
            total_protein=50,
            total_carbs=250,
            total_fat=65,
            consumed_at=timezone.now()
        )
        
        # Run the task
        check_and_notify_achievements(self.user.id)
        
        # Check achievement notification was created
        notifications = Notification.objects.filter(
            user=self.user,
            type='goal_achieved'
        )
        self.assertEqual(notifications.count(), 1)
        
        notification = notifications.first()
        self.assertIn('Daily Calorie Goal Achieved', notification.title)
        self.assertIn('97%', notification.message)  # Achievement percentage
    
    def test_cleanup_old_notifications(self):
        """Test cleanup of old notifications."""
        from datetime import timedelta
        
        # Create old read notification
        old_notification = Notification.objects.create(
            user=self.user,
            type='daily_summary',
            title='Old Notification',
            message='Old message',
            status='read'
        )
        
        # Make it old
        old_date = timezone.now() - timedelta(days=35)
        old_notification.created_at = old_date
        old_notification.save()
        
        # Create recent notification
        recent_notification = Notification.objects.create(
            user=self.user,
            type='daily_summary',
            title='Recent Notification',
            message='Recent message',
            status='read'
        )
        
        # Run cleanup
        cleanup_old_notifications()
        
        # Check old notification was deleted
        self.assertFalse(Notification.objects.filter(id=old_notification.id).exists())
        
        # Check recent notification still exists
        self.assertTrue(Notification.objects.filter(id=recent_notification.id).exists())