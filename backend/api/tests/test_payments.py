"""
Comprehensive test suite for payment system functionality.

Tests subscription creation, management, Stripe integration, and webhook handling.
"""

import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    Payment, PaymentMethod, Subscription, SubscriptionPlan, User, UserProfile
)
from api.services.stripe_service import StripeService

User = get_user_model()


class PaymentModelsTestCase(TestCase):
    """Test payment-related model functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=Decimal('9.99'),
            price_yearly=Decimal('99.99'),
            features={'ai_analysis': True, 'unlimited_meals': True},
            is_active=True
        )
    
    def test_subscription_plan_creation(self):
        """Test subscription plan model creation and validation."""
        self.assertEqual(self.plan.name, 'Premium Plan')
        self.assertEqual(self.plan.price_monthly, Decimal('9.99'))
        self.assertTrue(self.plan.is_active)
        self.assertIn('ai_analysis', self.plan.features)
    
    def test_subscription_creation(self):
        """Test subscription model creation."""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            stripe_subscription_id='sub_test123'
        )
        
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.plan, self.plan)
        self.assertEqual(subscription.status, 'active')
        self.assertIsNotNone(subscription.stripe_subscription_id)
    
    def test_payment_method_creation(self):
        """Test payment method model creation."""
        payment_method = PaymentMethod.objects.create(
            user=self.user,
            stripe_payment_method_id='pm_test123',
            card_brand='visa',
            card_last4='4242',
            card_exp_month=12,
            card_exp_year=2025,
            is_default=True
        )
        
        self.assertEqual(payment_method.user, self.user)
        self.assertEqual(payment_method.card_brand, 'visa')
        self.assertEqual(payment_method.card_last4, '4242')
        self.assertTrue(payment_method.is_default)
    
    def test_payment_creation(self):
        """Test payment record creation."""
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('9.99'),
            currency='usd',
            status='succeeded',
            stripe_payment_intent_id='pi_test123',
            description='Premium subscription payment'
        )
        
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.amount, Decimal('9.99'))
        self.assertEqual(payment.status, 'succeeded')
        self.assertEqual(payment.currency, 'usd')


@override_settings(STRIPE_PUBLISHABLE_KEY='pk_test_123', STRIPE_SECRET_KEY='sk_test_123')
class PaymentViewsTestCase(APITestCase):
    """Test payment-related API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=Decimal('9.99'),
            price_yearly=Decimal('99.99'),
            features={'ai_analysis': True},
            is_active=True
        )
    
    def test_subscription_plans_list(self):
        """Test listing available subscription plans."""
        url = reverse('subscription-plan-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Premium Plan')
        self.assertEqual(str(response.data[0]['price_monthly']), '9.99')
    
    @patch('api.services.stripe_service.stripe.Subscription.create')
    @patch('api.services.stripe_service.stripe.PaymentMethod.attach')
    def test_create_subscription_success(self, mock_attach, mock_create):
        """Test successful subscription creation."""
        # Mock Stripe responses
        mock_create.return_value = Mock(
            id='sub_test123',
            status='active',
            current_period_start=1234567890,
            current_period_end=1237159890,
            latest_invoice=Mock(
                payment_intent=Mock(
                    status='succeeded',
                    client_secret='pi_test_client_secret'
                )
            )
        )
        mock_attach.return_value = Mock()
        
        url = reverse('create-subscription')
        data = {
            'plan_id': self.plan.id,
            'payment_method_id': 'pm_test123',
            'billing_cycle': 'monthly'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('subscription', response.data)
        self.assertEqual(response.data['subscription']['status'], 'active')
        
        # Verify database records
        subscription = Subscription.objects.get(user=self.user)
        self.assertEqual(subscription.plan, self.plan)
        self.assertEqual(subscription.status, 'active')
    
    def test_create_subscription_missing_plan(self):
        """Test subscription creation with missing plan."""
        url = reverse('create-subscription')
        data = {
            'payment_method_id': 'pm_test123',
            'billing_cycle': 'monthly'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('plan_id', response.data)
    
    @patch('api.services.stripe_service.stripe.Subscription.cancel')
    def test_cancel_subscription(self, mock_cancel):
        """Test subscription cancellation."""
        # Create subscription
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            stripe_subscription_id='sub_test123'
        )
        
        mock_cancel.return_value = Mock(status='canceled')
        
        url = reverse('cancel-subscription', kwargs={'subscription_id': subscription.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription is canceled
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'canceled')
    
    @patch('api.services.stripe_service.stripe.PaymentMethod.create')
    def test_add_payment_method(self, mock_create):
        """Test adding a new payment method."""
        mock_create.return_value = Mock(
            id='pm_test123',
            card=Mock(
                brand='visa',
                last4='4242',
                exp_month=12,
                exp_year=2025
            )
        )
        
        url = reverse('add-payment-method')
        data = {
            'token': 'tok_visa',
            'set_as_default': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('payment_method', response.data)
        
        # Verify database record
        payment_method = PaymentMethod.objects.get(user=self.user)
        self.assertEqual(payment_method.card_brand, 'visa')
        self.assertEqual(payment_method.card_last4, '4242')
        self.assertTrue(payment_method.is_default)
    
    def test_payment_history(self):
        """Test retrieving payment history."""
        # Create payment records
        Payment.objects.create(
            user=self.user,
            amount=Decimal('9.99'),
            currency='usd',
            status='succeeded',
            stripe_payment_intent_id='pi_test1',
            description='Premium subscription'
        )
        Payment.objects.create(
            user=self.user,
            amount=Decimal('9.99'),
            currency='usd',
            status='succeeded',
            stripe_payment_intent_id='pi_test2',
            description='Premium subscription'
        )
        
        url = reverse('payment-history')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(str(response.data['results'][0]['amount']), '9.99')
    
    def test_current_subscription(self):
        """Test retrieving current subscription."""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            stripe_subscription_id='sub_test123'
        )
        
        url = reverse('current-subscription')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], subscription.id)
        self.assertEqual(response.data['status'], 'active')
        self.assertEqual(response.data['plan']['name'], 'Premium Plan')


class StripeWebhookTestCase(APITestCase):
    """Test Stripe webhook handling."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=Decimal('9.99'),
            features={'ai_analysis': True},
            is_active=True
        )
        
        self.subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            stripe_subscription_id='sub_test123'
        )
    
    @patch('stripe.Webhook.construct_event')
    def test_subscription_updated_webhook(self, mock_construct):
        """Test subscription updated webhook."""
        # Mock webhook event
        mock_event = {
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
        mock_construct.return_value = mock_event
        
        url = reverse('stripe-webhook')
        response = self.client.post(
            url,
            data=json.dumps(mock_event),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify subscription status updated
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'past_due')
    
    @patch('stripe.Webhook.construct_event')
    def test_payment_succeeded_webhook(self, mock_construct):
        """Test payment succeeded webhook."""
        mock_event = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 999,  # $9.99 in cents
                    'currency': 'usd',
                    'status': 'succeeded',
                    'customer': 'cus_test123',
                    'description': 'Premium subscription payment'
                }
            }
        }
        mock_construct.return_value = mock_event
        
        url = reverse('stripe-webhook')
        response = self.client.post(
            url,
            data=json.dumps(mock_event),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify payment record created
        payment = Payment.objects.get(stripe_payment_intent_id='pi_test123')
        self.assertEqual(payment.amount, Decimal('9.99'))
        self.assertEqual(payment.status, 'succeeded')
    
    @patch('stripe.Webhook.construct_event')
    def test_invalid_webhook_signature(self, mock_construct):
        """Test webhook with invalid signature."""
        mock_construct.side_effect = ValueError("Invalid signature")
        
        url = reverse('stripe-webhook')
        response = self.client.post(
            url,
            data=json.dumps({}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class StripeServiceTestCase(TestCase):
    """Test StripeService functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=Decimal('9.99'),
            stripe_price_id='price_test123',
            is_active=True
        )
        
        self.stripe_service = StripeService()
    
    @patch('api.services.stripe_service.stripe.Customer.create')
    def test_create_customer(self, mock_create):
        """Test creating Stripe customer."""
        mock_create.return_value = Mock(id='cus_test123')
        
        customer_id = self.stripe_service.create_customer(
            email=self.user.email,
            name=f"{self.user.first_name} {self.user.last_name}",
            metadata={'user_id': str(self.user.id)}
        )
        
        self.assertEqual(customer_id, 'cus_test123')
        mock_create.assert_called_once()
    
    @patch('api.services.stripe_service.stripe.Subscription.create')
    @patch('api.services.stripe_service.stripe.PaymentMethod.attach')
    def test_create_subscription(self, mock_attach, mock_create):
        """Test creating Stripe subscription."""
        mock_create.return_value = Mock(
            id='sub_test123',
            status='active',
            current_period_start=1234567890,
            current_period_end=1237159890,
            latest_invoice=Mock(
                payment_intent=Mock(
                    status='succeeded',
                    client_secret='pi_test_client_secret'
                )
            )
        )
        mock_attach.return_value = Mock()
        
        result = self.stripe_service.create_subscription(
            customer_id='cus_test123',
            price_id='price_test123',
            payment_method_id='pm_test123'
        )
        
        self.assertEqual(result['subscription_id'], 'sub_test123')
        self.assertEqual(result['status'], 'active')
        self.assertIn('client_secret', result)
    
    @patch('api.services.stripe_service.stripe.Subscription.cancel')
    def test_cancel_subscription(self, mock_cancel):
        """Test canceling Stripe subscription."""
        mock_cancel.return_value = Mock(status='canceled')
        
        result = self.stripe_service.cancel_subscription('sub_test123')
        
        self.assertEqual(result['status'], 'canceled')
        mock_cancel.assert_called_once_with('sub_test123')
    
    @patch('api.services.stripe_service.stripe.PaymentMethod.create')
    def test_create_payment_method(self, mock_create):
        """Test creating payment method."""
        mock_create.return_value = Mock(
            id='pm_test123',
            card=Mock(
                brand='visa',
                last4='4242',
                exp_month=12,
                exp_year=2025
            )
        )
        
        result = self.stripe_service.create_payment_method(
            payment_method_type='card',
            token='tok_visa'
        )
        
        self.assertEqual(result['payment_method_id'], 'pm_test123')
        self.assertEqual(result['card']['brand'], 'visa')
        self.assertEqual(result['card']['last4'], '4242')


class PaymentSecurityTestCase(APITestCase):
    """Test payment security measures."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=Decimal('9.99'),
            is_active=True
        )
    
    def test_unauthorized_access_to_payments(self):
        """Test that unauthorized users cannot access payment data."""
        url = reverse('payment-history')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_cannot_access_other_user_payments(self):
        """Test users cannot access other users' payment data."""
        # Create payment for other user
        Payment.objects.create(
            user=self.other_user,
            amount=Decimal('9.99'),
            currency='usd',
            status='succeeded',
            stripe_payment_intent_id='pi_other_user'
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('payment-history')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_user_cannot_cancel_other_user_subscription(self):
        """Test users cannot cancel other users' subscriptions."""
        subscription = Subscription.objects.create(
            user=self.other_user,
            plan=self.plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            stripe_subscription_id='sub_other_user'
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('cancel-subscription', kwargs={'subscription_id': subscription.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify subscription is still active
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'active')


class PaymentIntegrationTestCase(APITestCase):
    """Integration tests for payment flows."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.plan = SubscriptionPlan.objects.create(
            name='Premium Plan',
            slug='premium',
            price_monthly=Decimal('9.99'),
            features={'ai_analysis': True, 'unlimited_meals': True},
            stripe_price_id='price_test123',
            is_active=True
        )
    
    @patch('api.services.stripe_service.stripe.Customer.create')
    @patch('api.services.stripe_service.stripe.Subscription.create')
    @patch('api.services.stripe_service.stripe.PaymentMethod.attach')
    def test_complete_subscription_flow(self, mock_attach, mock_create_sub, mock_create_cus):
        """Test complete subscription creation flow."""
        # Mock Stripe responses
        mock_create_cus.return_value = Mock(id='cus_test123')
        mock_create_sub.return_value = Mock(
            id='sub_test123',
            status='active',
            current_period_start=1234567890,
            current_period_end=1237159890,
            latest_invoice=Mock(
                payment_intent=Mock(
                    status='succeeded',
                    client_secret='pi_test_client_secret'
                )
            )
        )
        mock_attach.return_value = Mock()
        
        # Create subscription
        url = reverse('create-subscription')
        data = {
            'plan_id': self.plan.id,
            'payment_method_id': 'pm_test123',
            'billing_cycle': 'monthly'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify all records created
        subscription = Subscription.objects.get(user=self.user)
        self.assertEqual(subscription.plan, self.plan)
        self.assertEqual(subscription.status, 'active')
        self.assertEqual(subscription.stripe_subscription_id, 'sub_test123')
        
        # Verify user profile updated
        profile = UserProfile.objects.get(user=self.user)
        self.assertTrue(profile.is_premium)
    
    def test_ai_usage_tracking_for_premium_user(self):
        """Test AI usage tracking for premium subscribers."""
        # Create active subscription
        Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            status='active',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            stripe_subscription_id='sub_test123'
        )
        
        # Update user profile
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.is_premium = True
        profile.save()
        
        # Test AI usage check
        url = reverse('ai-usage-check')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_use_ai'])
        self.assertEqual(response.data['usage_limit'], 'unlimited')