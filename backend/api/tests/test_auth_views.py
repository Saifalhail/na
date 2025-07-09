"""
Test cases for authentication views.
"""
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json

from api.tests.factories import UserFactory, UserProfileFactory

User = get_user_model()


class AuthenticationViewsTest(TestCase):
    """Test authentication endpoints."""
    
    def setUp(self):
        """Set up test client and data."""
        self.client = APIClient()
        self.register_url = reverse('api:register')
        self.login_url = reverse('api:login')
        self.logout_url = reverse('api:logout')
        self.refresh_url = reverse('api:refresh')
        self.profile_url = reverse('api:profile')
        
        # Clear cache before each test
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def test_user_registration_success(self):
        """Test successful user registration."""
        data = {
            'email': 'newuser@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'User',
            'terms_accepted': True,
            'marketing_consent': False
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('email', response.data)
        self.assertEqual(response.data['email'], 'newuser@example.com')
        
        # Check user was created
        user = User.objects.get(email='newuser@example.com')
        self.assertFalse(user.is_verified)
        self.assertEqual(user.account_type, 'free')
        
        # Check profile was created
        self.assertTrue(hasattr(user, 'profile'))
        self.assertFalse(user.profile.marketing_consent)
    
    def test_user_registration_weak_password(self):
        """Test registration with weak password."""
        data = {
            'email': 'weak@example.com',
            'password': 'weak',
            'password_confirm': 'weak',
            'first_name': 'Weak',
            'last_name': 'Password',
            'terms_accepted': True
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data['errors'])
    
    def test_user_registration_password_mismatch(self):
        """Test registration with mismatched passwords."""
        data = {
            'email': 'mismatch@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'DifferentPass123!',
            'first_name': 'Mismatch',
            'last_name': 'User',
            'terms_accepted': True
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data['errors'])
    
    def test_user_registration_duplicate_email(self):
        """Test registration with existing email."""
        # Create existing user
        UserFactory(email='existing@example.com')
        
        data = {
            'email': 'existing@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'Duplicate',
            'last_name': 'User',
            'terms_accepted': True
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data['errors'])
    
    def test_user_registration_terms_not_accepted(self):
        """Test registration without accepting terms."""
        data = {
            'email': 'noterms@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'No',
            'last_name': 'Terms',
            'terms_accepted': False
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('terms_accepted', response.data['errors'])
    
    def test_user_login_success(self):
        """Test successful login."""
        # Create verified user
        user = UserFactory(email='login@example.com', is_verified=True)
        user.set_password('TestPass123!')
        user.save()
        
        data = {
            'email': 'login@example.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_user_login_unverified_email(self):
        """Test login with unverified email."""
        # Create unverified user
        user = UserFactory(email='unverified@example.com', is_verified=False)
        user.set_password('TestPass123!')
        user.save()
        
        data = {
            'email': 'unverified@example.com',
            'password': 'TestPass123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('verified', response.data['message'].lower())
    
    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'WrongPass123!'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_login_rate_limiting(self):
        """Test login rate limiting."""
        data = {
            'email': 'ratelimit@example.com',
            'password': 'WrongPass123!'
        }
        
        # Make 6 failed login attempts (limit is 5)
        for i in range(6):
            response = self.client.post(self.login_url, data, format='json')
        
        # The 6th attempt should be rate limited
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('too many', response.data['message'].lower())
    
    def test_token_refresh_success(self):
        """Test successful token refresh."""
        # Create user and get tokens
        user = UserFactory(is_verified=True)
        refresh = RefreshToken.for_user(user)
        
        data = {
            'refresh': str(refresh)
        }
        
        response = self.client.post(self.refresh_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        # New refresh token should be different (rotation)
        self.assertNotEqual(str(refresh), response.data['refresh'])
    
    def test_token_refresh_invalid_token(self):
        """Test refresh with invalid token."""
        data = {
            'refresh': 'invalid-token'
        }
        
        response = self.client.post(self.refresh_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_logout_success(self):
        """Test successful logout."""
        # Create user and authenticate
        user = UserFactory(is_verified=True)
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        data = {
            'refresh': str(refresh)
        }
        
        response = self.client.post(self.logout_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to use the refresh token again - should fail
        response = self.client.post(self.refresh_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_profile_get(self):
        """Test getting user profile."""
        # Create user with profile
        profile = UserProfileFactory()
        user = profile.user
        
        # Authenticate
        self.client.force_authenticate(user=user)
        
        response = self.client.get(self.profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertIn('height', response.data)
        self.assertIn('weight', response.data)
        self.assertIn('bmi', response.data)
    
    def test_user_profile_update(self):
        """Test updating user profile."""
        # Create user with profile
        profile = UserProfileFactory()
        user = profile.user
        
        # Authenticate
        self.client.force_authenticate(user=user)
        
        data = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'height': 180,
            'weight': 75,
            'activity_level': 'moderately_active'
        }
        
        response = self.client.patch(self.profile_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check updates
        user.refresh_from_db()
        profile.refresh_from_db()
        
        self.assertEqual(user.first_name, 'Updated')
        self.assertEqual(user.last_name, 'Name')
        self.assertEqual(profile.height, 180)
        self.assertEqual(profile.weight, 75)
        self.assertEqual(profile.activity_level, 'moderately_active')
    
    def test_user_profile_unauthenticated(self):
        """Test accessing profile without authentication."""
        response = self.client.get(self.profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_password_change_success(self):
        """Test successful password change."""
        # Create user
        user = UserFactory()
        user.set_password('OldPass123!')
        user.save()
        
        # Authenticate
        self.client.force_authenticate(user=user)
        
        data = {
            'current_password': 'OldPass123!',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }
        
        url = reverse('api:password-change')
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check new password works
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewPass123!'))
    
    def test_password_change_wrong_current(self):
        """Test password change with wrong current password."""
        # Create user
        user = UserFactory()
        user.set_password('CurrentPass123!')
        user.save()
        
        # Authenticate
        self.client.force_authenticate(user=user)
        
        data = {
            'current_password': 'WrongPass123!',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }
        
        url = reverse('api:password-change')
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_password', response.data['errors'])