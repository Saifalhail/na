"""
Tests for SMS notification service.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, override_settings
from twilio.base.exceptions import TwilioRestException

from api.services.sms_service import SMSService, sms_service
from api.models import Notification
from api.factories import UserFactory, NotificationFactory
from api.tasks.sms_tasks import send_sms_notification, check_sms_delivery_status


class SMSServiceTestCase(TestCase):
    """Test SMS service functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.phone_number = '+1234567890'
        self.message = 'Test SMS message'
    
    @override_settings(
        TWILIO_ACCOUNT_SID='test_sid',
        TWILIO_AUTH_TOKEN='test_token',
        TWILIO_FROM_NUMBER='+1987654321'
    )
    @patch('api.services.sms_service.Client')
    def test_sms_service_initialization(self, mock_client):
        """Test SMS service initializes with credentials."""
        service = SMSService()
        
        self.assertTrue(service.enabled)
        self.assertEqual(service.from_number, '+1987654321')
        mock_client.assert_called_once_with('test_sid', 'test_token')
    
    @override_settings(
        TWILIO_ACCOUNT_SID='',
        TWILIO_AUTH_TOKEN='',
        TWILIO_FROM_NUMBER=''
    )
    def test_sms_service_disabled_without_credentials(self):
        """Test SMS service is disabled without credentials."""
        service = SMSService()
        
        self.assertFalse(service.enabled)
        self.assertIsNone(service.client)
    
    def test_validate_phone_number(self):
        """Test phone number validation."""
        service = SMSService()
        
        # Valid numbers
        self.assertTrue(service.validate_phone_number('+1234567890'))
        self.assertTrue(service.validate_phone_number('+12345678901234'))
        
        # Invalid numbers
        self.assertFalse(service.validate_phone_number('1234567890'))  # No +
        self.assertFalse(service.validate_phone_number('+123'))  # Too short
        self.assertFalse(service.validate_phone_number('+1234567890123456'))  # Too long
        self.assertFalse(service.validate_phone_number('+123abc456'))  # Non-digits
        self.assertFalse(service.validate_phone_number(''))  # Empty
        self.assertFalse(service.validate_phone_number(None))  # None
    
    def test_format_phone_number(self):
        """Test phone number formatting."""
        service = SMSService()
        
        # US numbers
        self.assertEqual(service.format_phone_number('2345678901'), '+12345678901')
        self.assertEqual(service.format_phone_number('+12345678901'), '+12345678901')
        
        # International numbers
        self.assertEqual(service.format_phone_number('442012345678'), '+442012345678')
        
        # Invalid numbers
        self.assertIsNone(service.format_phone_number('123'))
        self.assertIsNone(service.format_phone_number(''))
        self.assertIsNone(service.format_phone_number(None))
    
    @override_settings(
        TWILIO_ACCOUNT_SID='test_sid',
        TWILIO_AUTH_TOKEN='test_token',
        TWILIO_FROM_NUMBER='+1987654321'
    )
    @patch('api.services.sms_service.Client')
    def test_send_sms_success(self, mock_client_class):
        """Test successful SMS sending."""
        # Mock Twilio client and message
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_message = Mock()
        mock_message.sid = 'SM123456'
        mock_message.status = 'sent'
        mock_message.to = self.phone_number
        mock_message.from_ = '+1987654321'
        mock_message.price = '-0.0075'
        mock_message.price_unit = 'USD'
        
        mock_client.messages.create.return_value = mock_message
        
        # Create service and send SMS
        service = SMSService()
        result = service.send_sms(self.phone_number, self.message)
        
        # Verify results
        self.assertTrue(result['success'])
        self.assertEqual(result['sid'], 'SM123456')
        self.assertEqual(result['status'], 'sent')
        
        # Verify Twilio was called correctly
        mock_client.messages.create.assert_called_once_with(
            body=self.message,
            from_='+1987654321',
            to=self.phone_number
        )
    
    @override_settings(
        TWILIO_ACCOUNT_SID='test_sid',
        TWILIO_AUTH_TOKEN='test_token',
        TWILIO_FROM_NUMBER='+1987654321'
    )
    @patch('api.services.sms_service.Client')
    def test_send_sms_twilio_error(self, mock_client_class):
        """Test SMS sending with Twilio error."""
        # Mock Twilio client to raise exception
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_client.messages.create.side_effect = TwilioRestException(
            status=400,
            uri='/test',
            msg='Invalid phone number'
        )
        
        # Create service and try to send SMS
        service = SMSService()
        result = service.send_sms(self.phone_number, self.message)
        
        # Verify error result
        self.assertFalse(result['success'])
        self.assertIn('Invalid phone number', result['error'])
        self.assertIsNone(result['sid'])
    
    def test_send_sms_message_too_long(self):
        """Test SMS sending with message too long."""
        service = SMSService()
        service.enabled = True
        
        long_message = 'x' * 1601  # Over 1600 char limit
        result = service.send_sms(self.phone_number, long_message)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'Message too long')
    
    def test_send_sms_service_disabled(self):
        """Test SMS sending when service is disabled."""
        service = SMSService()
        service.enabled = False
        
        result = service.send_sms(self.phone_number, self.message)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'SMS service not configured')


class SMSTasksTestCase(TestCase):
    """Test SMS-related Celery tasks."""
    
    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        self.user.profile.phone_number = '+1234567890'
        self.user.profile.receive_sms_notifications = True
        self.user.profile.save()
    
    @patch('api.tasks.sms_tasks.sms_service')
    @patch('api.tasks.sms_tasks.timezone')
    def test_send_sms_notification_success(self, mock_timezone, mock_sms_service):
        """Test successful SMS notification sending."""
        # Create SMS notification
        notification = NotificationFactory(
            user=self.user,
            channel='sms',
            status='pending',
            title='Test Title',
            message='Test message content'
        )
        
        # Mock SMS service
        mock_sms_service.format_phone_number.return_value = '+1234567890'
        mock_sms_service.send_sms.return_value = {
            'success': True,
            'sid': 'SM123456',
            'status': 'sent'
        }
        
        # Mock timezone
        mock_now = Mock()
        mock_timezone.now.return_value = mock_now
        
        # Send notification
        result = send_sms_notification(notification.id)
        
        # Verify results
        self.assertTrue(result['success'])
        self.assertEqual(result['sid'], 'SM123456')
        
        # Verify notification was updated
        notification.refresh_from_db()
        self.assertEqual(notification.status, 'sent')
        self.assertEqual(notification.metadata['sms_sid'], 'SM123456')
        self.assertEqual(notification.sent_at, mock_now)
    
    @patch('api.tasks.sms_tasks.sms_service')
    def test_send_sms_notification_disabled(self, mock_sms_service):
        """Test SMS sending when user has disabled SMS."""
        # Disable SMS for user
        self.user.profile.receive_sms_notifications = False
        self.user.profile.save()
        
        notification = NotificationFactory(
            user=self.user,
            channel='sms',
            status='pending'
        )
        
        result = send_sms_notification(notification.id)
        
        # Verify results
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'SMS notifications disabled for user')
        
        # Verify notification was skipped
        notification.refresh_from_db()
        self.assertEqual(notification.status, 'skipped')
    
    @patch('api.tasks.sms_tasks.sms_service')
    def test_send_sms_notification_no_phone(self, mock_sms_service):
        """Test SMS sending when user has no phone number."""
        # Remove phone number
        self.user.profile.phone_number = ''
        self.user.profile.save()
        
        notification = NotificationFactory(
            user=self.user,
            channel='sms',
            status='pending'
        )
        
        result = send_sms_notification(notification.id)
        
        # Verify results
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'No phone number')
        
        # Verify notification failed
        notification.refresh_from_db()
        self.assertEqual(notification.status, 'failed')
        self.assertEqual(notification.error_message, 'No phone number configured')
    
    @patch('api.tasks.sms_tasks.sms_service')
    def test_send_sms_notification_truncates_long_message(self, mock_sms_service):
        """Test that long messages are truncated for SMS."""
        notification = NotificationFactory(
            user=self.user,
            channel='sms',
            title='Title',
            message='x' * 200  # Long message
        )
        
        mock_sms_service.format_phone_number.return_value = '+1234567890'
        mock_sms_service.send_sms.return_value = {
            'success': True,
            'sid': 'SM123456'
        }
        
        send_sms_notification(notification.id)
        
        # Verify message was truncated
        call_args = mock_sms_service.send_sms.call_args
        sent_message = call_args[1]['message']
        self.assertEqual(len(sent_message), 160)
        self.assertTrue(sent_message.endswith('...'))
    
    def test_send_sms_notification_wrong_channel(self):
        """Test SMS task with non-SMS notification."""
        notification = NotificationFactory(
            user=self.user,
            channel='email',  # Wrong channel
            status='pending'
        )
        
        result = send_sms_notification(notification.id)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'Not an SMS notification')
    
    @patch('api.tasks.sms_tasks.sms_service')
    def test_check_sms_delivery_status(self, mock_sms_service):
        """Test checking SMS delivery status."""
        # Create notification with SMS SID
        notification = NotificationFactory(
            channel='sms',
            metadata={'sms_sid': 'SM123456'}
        )
        
        # Mock status response
        mock_sms_service.get_message_status.return_value = {
            'sid': 'SM123456',
            'status': 'delivered',
            'error_code': None,
            'error_message': None
        }
        
        # Check status
        result = check_sms_delivery_status('SM123456')
        
        # Verify results
        self.assertEqual(result['status'], 'delivered')
        
        # Verify notification was updated
        notification.refresh_from_db()
        self.assertEqual(notification.status, 'delivered')
        self.assertEqual(notification.metadata['sms_status'], 'delivered')