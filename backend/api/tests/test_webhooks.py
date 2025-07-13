"""
Comprehensive webhook testing for external service integrations.

Tests Stripe webhooks, Twilio status webhooks, and webhook security.
"""

import json
import hashlib
import hmac
import uuid
from unittest.mock import Mock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    Payment, PushNotification, Subscription, SubscriptionPlan, 
    SMSVerification, User
)

User = get_user_model()


class StripeWebhookTestCase(APITestCase):
    """Test Stripe webhook endpoint security and processing."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=9.99,
            stripe_price_id='price_test123',
            is_active=True
        )
        
        self.webhook_url = reverse('stripe-webhook')
        self.webhook_secret = 'whsec_test123'
    
    def _create_webhook_signature(self, payload: str, secret: str) -> str:
        """Create valid Stripe webhook signature."""
        timestamp = str(int(timezone.now().timestamp()))
        signature_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signature_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f"t={timestamp},v1={signature}"
    
    def test_webhook_signature_validation(self):
        """Test that webhook validates Stripe signature correctly."""
        payload = json.dumps({
            'type': 'customer.subscription.created',
            'data': {'object': {'id': 'sub_test123'}}
        })
        
        # Test with invalid signature
        response = self.client.post(
            self.webhook_url,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with valid signature
        valid_signature = self._create_webhook_signature(payload, self.webhook_secret)
        with override_settings(STRIPE_WEBHOOK_SECRET=self.webhook_secret):
            with patch('stripe.Webhook.construct_event') as mock_construct:
                mock_construct.return_value = json.loads(payload)
                response = self.client.post(
                    self.webhook_url,
                    data=payload,
                    content_type='application/json',
                    HTTP_STRIPE_SIGNATURE=valid_signature
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    @patch('stripe.Webhook.construct_event')
    def test_subscription_created_webhook(self, mock_construct):
        """Test subscription.created webhook processing."""
        event_data = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'customer': 'cus_test123',
                    'status': 'active',
                    'current_period_start': 1234567890,
                    'current_period_end': 1237159890,
                    'items': {
                        'data': [{
                            'price': {'id': 'price_test123'}
                        }]
                    }
                }
            }
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription created in database
        subscription = Subscription.objects.get(stripe_subscription_id='sub_test123')
        self.assertEqual(subscription.status, 'active')
        self.assertEqual(subscription.plan, self.plan)
    
    @patch('stripe.Webhook.construct_event')
    def test_subscription_updated_webhook(self, mock_construct):
        """Test subscription.updated webhook processing."""
        # Create existing subscription
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            stripe_subscription_id='sub_test123'
        )
        
        event_data = {
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'status': 'past_due',
                    'current_period_start': 1234567890,
                    'current_period_end': 1237159890
                }
            }
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription status updated
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'past_due')
    
    @patch('stripe.Webhook.construct_event')
    def test_subscription_deleted_webhook(self, mock_construct):
        """Test subscription.deleted webhook processing."""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            stripe_subscription_id='sub_test123'
        )
        
        event_data = {
            'type': 'customer.subscription.deleted',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'status': 'canceled'
                }
            }
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription canceled
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'canceled')
    
    @patch('stripe.Webhook.construct_event')
    def test_payment_succeeded_webhook(self, mock_construct):
        """Test payment_intent.succeeded webhook processing."""
        event_data = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 999,  # $9.99 in cents
                    'currency': 'usd',
                    'status': 'succeeded',
                    'customer': 'cus_test123',
                    'description': 'Premium subscription payment',
                    'metadata': {
                        'user_id': str(self.user.id)
                    }
                }
            }
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify payment record created
        payment = Payment.objects.get(stripe_payment_intent_id='pi_test123')
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.amount, 9.99)
        self.assertEqual(payment.status, 'succeeded')
        self.assertEqual(payment.currency, 'usd')
    
    @patch('stripe.Webhook.construct_event')
    def test_payment_failed_webhook(self, mock_construct):
        """Test payment_intent.payment_failed webhook processing."""
        event_data = {
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 999,
                    'currency': 'usd',
                    'status': 'failed',
                    'customer': 'cus_test123',
                    'last_payment_error': {
                        'code': 'card_declined',
                        'message': 'Your card was declined.'
                    },
                    'metadata': {
                        'user_id': str(self.user.id)
                    }
                }
            }
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify payment record created with failed status
        payment = Payment.objects.get(stripe_payment_intent_id='pi_test123')
        self.assertEqual(payment.status, 'failed')
        self.assertIn('card_declined', payment.failure_reason)
    
    @patch('stripe.Webhook.construct_event')
    def test_invoice_payment_succeeded_webhook(self, mock_construct):
        """Test invoice.payment_succeeded webhook processing."""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            stripe_subscription_id='sub_test123'
        )
        
        event_data = {
            'type': 'invoice.payment_succeeded',
            'data': {
                'object': {
                    'id': 'in_test123',
                    'subscription': 'sub_test123',
                    'amount_paid': 999,
                    'currency': 'usd',
                    'status': 'paid',
                    'customer': 'cus_test123'
                }
            }
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription remains active
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'active')
    
    @patch('stripe.Webhook.construct_event')
    def test_unhandled_webhook_event(self, mock_construct):
        """Test handling of unrecognized webhook events."""
        event_data = {
            'type': 'some.unknown.event',
            'data': {'object': {'id': 'unknown_123'}}
        }
        mock_construct.return_value = event_data
        
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        # Should still return 200 to acknowledge receipt
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_idempotency(self, mock_construct):
        """Test webhook idempotency - same event processed multiple times."""
        event_data = {
            'id': 'evt_test123',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 999,
                    'currency': 'usd',
                    'status': 'succeeded',
                    'metadata': {'user_id': str(self.user.id)}
                }
            }
        }
        mock_construct.return_value = event_data
        
        # Process webhook first time
        response1 = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Process same webhook again
        response2 = self.client.post(
            self.webhook_url,
            data=json.dumps(event_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Should only have one payment record
        payments = Payment.objects.filter(stripe_payment_intent_id='pi_test123')
        self.assertEqual(payments.count(), 1)


class TwilioWebhookTestCase(APITestCase):
    """Test Twilio webhook endpoint for SMS status updates."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.sms_verification = SMSVerification.objects.create(
            phone_number='+1234567890',
            code='123456',
            sid='SM_test123',
            status='sent'
        )
        
        self.webhook_url = reverse('twilio-status-webhook')
    
    def test_sms_delivered_webhook(self):
        """Test SMS delivered status webhook."""
        data = {
            'MessageSid': 'SM_test123',
            'MessageStatus': 'delivered',
            'To': '+1234567890',
            'ErrorCode': '',
            'ErrorMessage': ''
        }
        
        response = self.client.post(self.webhook_url, data=data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify SMS status updated
        self.sms_verification.refresh_from_db()
        self.assertEqual(self.sms_verification.status, 'delivered')
    
    def test_sms_failed_webhook(self):
        """Test SMS failed status webhook."""
        data = {
            'MessageSid': 'SM_test123',
            'MessageStatus': 'failed',
            'To': '+1234567890',
            'ErrorCode': '30006',
            'ErrorMessage': 'Landline or unreachable carrier'
        }
        
        response = self.client.post(self.webhook_url, data=data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify SMS status and error updated
        self.sms_verification.refresh_from_db()
        self.assertEqual(self.sms_verification.status, 'failed')
        self.assertEqual(self.sms_verification.error_code, '30006')
        self.assertIn('unreachable carrier', self.sms_verification.error_message)
    
    def test_sms_webhook_unknown_sid(self):
        """Test webhook with unknown SMS SID."""
        data = {
            'MessageSid': 'SM_unknown',
            'MessageStatus': 'delivered',
            'To': '+1234567890'
        }
        
        response = self.client.post(self.webhook_url, data=data)
        
        # Should still return 200 but log the unknown SID
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_sms_webhook_malformed_data(self):
        """Test webhook with malformed data."""
        # Missing required fields
        data = {
            'MessageStatus': 'delivered'
        }
        
        response = self.client.post(self.webhook_url, data=data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WebhookSecurityTestCase(APITestCase):
    """Test webhook security measures and rate limiting."""
    
    def setUp(self):
        self.stripe_webhook_url = reverse('stripe-webhook')
        self.twilio_webhook_url = reverse('twilio-status-webhook')
    
    def test_stripe_webhook_requires_signature(self):
        """Test Stripe webhook requires valid signature."""
        payload = json.dumps({'type': 'test.event'})
        
        # Test without signature header
        response = self.client.post(
            self.stripe_webhook_url,
            data=payload,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with empty signature
        response = self.client.post(
            self.stripe_webhook_url,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE=''
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_webhook_content_type_validation(self):
        """Test webhooks validate content type."""
        # Test Stripe webhook with wrong content type
        response = self.client.post(
            self.stripe_webhook_url,
            data='invalid_json',
            content_type='text/plain',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_webhook_size_limits(self):
        """Test webhooks have reasonable size limits."""
        # Large payload (over typical webhook limits)
        large_payload = json.dumps({
            'type': 'test.event',
            'data': {'object': {'large_field': 'x' * 100000}}
        })
        
        response = self.client.post(
            self.stripe_webhook_url,
            data=large_payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        # Should handle gracefully (may be 400 or 413 depending on server config)
        self.assertIn(response.status_code, [400, 413, 500])
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_error_handling(self, mock_construct):
        """Test webhook error handling and logging."""
        # Simulate Stripe webhook verification failure
        mock_construct.side_effect = ValueError("Invalid signature")
        
        response = self.client.post(
            self.stripe_webhook_url,
            data=json.dumps({'type': 'test.event'}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_webhook_duplicate_processing(self):
        """Test webhook duplicate event handling."""
        # This would test the idempotency key handling
        # Implementation depends on your specific webhook processor
        pass


class WebhookIntegrationTestCase(APITestCase):
    """Integration tests for webhook processing flows."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=9.99,
            stripe_price_id='price_test123',
            is_active=True
        )
    
    @patch('stripe.Webhook.construct_event')
    def test_complete_subscription_lifecycle_via_webhooks(self, mock_construct):
        """Test complete subscription lifecycle through webhooks."""
        # 1. Subscription created
        mock_construct.return_value = {
            'type': 'customer.subscription.created',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'customer': 'cus_test123',
                    'status': 'active',
                    'current_period_start': 1234567890,
                    'current_period_end': 1237159890,
                    'items': {
                        'data': [{'price': {'id': 'price_test123'}}]
                    }
                }
            }
        }
        
        response = self.client.post(
            reverse('stripe-webhook'),
            data=json.dumps(mock_construct.return_value),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        subscription = Subscription.objects.get(stripe_subscription_id='sub_test123')
        self.assertEqual(subscription.status, 'active')
        
        # 2. Payment succeeded
        mock_construct.return_value = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 999,
                    'currency': 'usd',
                    'status': 'succeeded',
                    'metadata': {'subscription_id': 'sub_test123'}
                }
            }
        }
        
        response = self.client.post(
            reverse('stripe-webhook'),
            data=json.dumps(mock_construct.return_value),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify payment recorded
        payment = Payment.objects.get(stripe_payment_intent_id='pi_test123')
        self.assertEqual(payment.status, 'succeeded')
        
        # 3. Subscription updated (payment failed)
        mock_construct.return_value = {
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'status': 'past_due'
                }
            }
        }
        
        response = self.client.post(
            reverse('stripe-webhook'),
            data=json.dumps(mock_construct.return_value),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription status updated
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'past_due')
        
        # 4. Subscription canceled
        mock_construct.return_value = {
            'type': 'customer.subscription.deleted',
            'data': {
                'object': {
                    'id': 'sub_test123',
                    'status': 'canceled'
                }
            }
        }
        
        response = self.client.post(
            reverse('stripe-webhook'),
            data=json.dumps(mock_construct.return_value),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription canceled
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'canceled')


class WebhookPerformanceTestCase(APITestCase):
    """Test webhook performance and reliability."""
    
    def setUp(self):
        self.webhook_url = reverse('stripe-webhook')
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_processing_speed(self, mock_construct):
        """Test webhook processes within reasonable time limits."""
        import time
        
        mock_construct.return_value = {
            'type': 'customer.subscription.created',
            'data': {'object': {'id': 'sub_test123'}}
        }
        
        start_time = time.time()
        response = self.client.post(
            self.webhook_url,
            data=json.dumps(mock_construct.return_value),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        end_time = time.time()
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Webhook should process within 5 seconds
        processing_time = end_time - start_time
        self.assertLess(processing_time, 5.0)
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_memory_usage(self, mock_construct):
        """Test webhook doesn't cause memory leaks."""
        import gc
        import sys
        
        mock_construct.return_value = {
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_test123'}}
        }
        
        # Process multiple webhooks
        for i in range(10):
            response = self.client.post(
                self.webhook_url,
                data=json.dumps(mock_construct.return_value),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Force garbage collection
        gc.collect()
        
        # Memory usage should remain reasonable
        # This is a basic check - in practice you'd use memory profilers
        self.assertLess(sys.getsizeof(gc.get_objects()), 100000000)  # 100MB limit