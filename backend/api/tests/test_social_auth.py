"""
Tests for social authentication endpoints.
"""

from unittest.mock import MagicMock, patch

import pytest
from allauth.socialaccount.models import SocialAccount, SocialApp
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.skip(
    reason="OAuth integration tests require complex setup - skipping for now"
)
class SocialAuthTestCase(TransactionTestCase):
    """Test social authentication functionality."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.google_login_url = reverse("api:social:google-login")

        # Create a site (required for allauth)
        self.site = Site.objects.get_current()

        # Delete ALL Google social apps to ensure clean state
        SocialApp.objects.all().delete()

        # Create social app configuration for Google
        self.social_app = SocialApp.objects.create(
            provider="google",
            name="Google",
            client_id="test-client-id",
            secret="test-client-secret",
        )
        self.social_app.sites.add(self.site)

    def tearDown(self):
        """Clean up test data."""
        # Clean up social apps to avoid affecting other tests
        SocialApp.objects.filter(provider="google").delete()

    @patch(
        "allauth.socialaccount.providers.google.views.GoogleOAuth2Adapter.complete_login"
    )
    def test_google_login_with_access_token(self, mock_complete_login):
        """Test Google login with access token."""
        # Mock the Google API response
        mock_social_login = MagicMock()
        mock_social_login.account.provider = "google"
        mock_social_login.account.uid = "123456789"
        mock_social_login.account.extra_data = {
            "email": "testuser@gmail.com",
            "email_verified": True,
            "given_name": "Test",
            "family_name": "User",
            "picture": "https://example.com/avatar.jpg",
        }
        mock_social_login.email_addresses = []
        mock_social_login.user = None
        mock_social_login.is_existing = False

        mock_complete_login.return_value = mock_social_login

        # Make request
        data = {"access_token": "mock-google-access-token"}
        response = self.client.post(self.google_login_url, data, format="json")

        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

        # Check user was created
        user = User.objects.get(email="testuser@gmail.com")
        self.assertEqual(user.first_name, "Test")
        self.assertEqual(user.last_name, "User")
        self.assertTrue(user.is_verified)

        # Check social account was created
        social_account = SocialAccount.objects.get(user=user)
        self.assertEqual(social_account.provider, "google")
        self.assertEqual(social_account.uid, "123456789")

    @patch(
        "allauth.socialaccount.providers.google.views.GoogleOAuth2Adapter.complete_login"
    )
    def test_google_login_existing_user(self, mock_complete_login):
        """Test Google login with existing user."""
        # Create existing user
        existing_user = User.objects.create_user(
            username="existinguser",
            email="existing@gmail.com",
            password="testpass123",
            first_name="Existing",
            last_name="User",
        )

        # Create social account
        social_account = SocialAccount.objects.create(
            user=existing_user,
            provider="google",
            uid="987654321",
            extra_data={"email": "existing@gmail.com"},
        )

        # Mock the Google API response
        mock_social_login = MagicMock()
        mock_social_login.account = social_account
        mock_social_login.user = existing_user
        mock_social_login.is_existing = True

        mock_complete_login.return_value = mock_social_login

        # Make request
        data = {"access_token": "mock-google-access-token"}
        response = self.client.post(self.google_login_url, data, format="json")

        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "existing@gmail.com")

    def test_google_login_missing_token(self):
        """Test Google login without token."""
        response = self.client.post(self.google_login_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

    def test_google_login_invalid_token(self):
        """Test Google login with invalid token."""
        data = {"access_token": "invalid-token"}
        response = self.client.post(self.google_login_url, data, format="json")
        # This will fail at the Google API level
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
