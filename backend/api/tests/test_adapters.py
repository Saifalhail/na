"""
Tests for custom django-allauth adapters.
"""

from unittest.mock import Mock, patch

from allauth.account.models import EmailConfirmation
from allauth.socialaccount import providers
from allauth.socialaccount.models import SocialAccount, SocialLogin
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase, override_settings

from api.adapters import AccountAdapter, SocialAccountAdapter
from api.models import UserProfile
from api.tests.factories import UserFactory

User = get_user_model()


class AccountAdapterTestCase(TestCase):
    """Test cases for AccountAdapter."""

    def setUp(self):
        self.adapter = AccountAdapter()
        self.factory = RequestFactory()
        self.user = UserFactory()

    def test_get_email_confirmation_url_default(self):
        """Test email confirmation URL generation with default settings."""
        request = self.factory.get("/")

        # Mock EmailConfirmation
        email_confirmation = Mock()
        email_confirmation.key = "test-confirmation-key"

        url = self.adapter.get_email_confirmation_url(request, email_confirmation)

        expected_url = "http://localhost:8081/auth/verify-email/test-confirmation-key"
        self.assertEqual(url, expected_url)

    @override_settings(FRONTEND_URL="https://myapp.com")
    def test_get_email_confirmation_url_custom_frontend(self):
        """Test email confirmation URL generation with custom frontend URL."""
        request = self.factory.get("/")

        # Mock EmailConfirmation
        email_confirmation = Mock()
        email_confirmation.key = "test-key-123"

        url = self.adapter.get_email_confirmation_url(request, email_confirmation)

        expected_url = "https://myapp.com/auth/verify-email/test-key-123"
        self.assertEqual(url, expected_url)

    def test_get_password_reset_url_default(self):
        """Test password reset URL generation with default settings."""
        request = self.factory.get("/")
        token = "reset-token-123"

        url = self.adapter.get_password_reset_url(request, self.user, token)

        expected_url = "http://localhost:8081/auth/reset-password/reset-token-123"
        self.assertEqual(url, expected_url)

    @override_settings(FRONTEND_URL="https://myapp.com")
    def test_get_password_reset_url_custom_frontend(self):
        """Test password reset URL generation with custom frontend URL."""
        request = self.factory.get("/")
        token = "reset-token-456"

        url = self.adapter.get_password_reset_url(request, self.user, token)

        expected_url = "https://myapp.com/auth/reset-password/reset-token-456"
        self.assertEqual(url, expected_url)

    def test_save_user_with_form_data(self):
        """Test saving user with form data."""
        request = self.factory.post("/")
        user = User(email="newuser@example.com", username="newuser")

        # Mock form with cleaned_data
        form = Mock()
        form.cleaned_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "newuser@example.com",
        }

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, user, form, commit=True)

        self.assertEqual(saved_user.first_name, "John")
        self.assertEqual(saved_user.last_name, "Doe")
        self.assertTrue(hasattr(saved_user, "profile"))

    def test_save_user_without_form_data(self):
        """Test saving user without form data."""
        request = self.factory.post("/")
        user = User(email="newuser2@example.com", username="newuser2")

        # Mock form without cleaned_data
        form = Mock()
        del form.cleaned_data  # Remove cleaned_data attribute

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, user, form, commit=True)

        self.assertEqual(saved_user.first_name, "")
        self.assertEqual(saved_user.last_name, "")
        self.assertTrue(hasattr(saved_user, "profile"))

    def test_save_user_no_commit(self):
        """Test saving user without commit."""
        request = self.factory.post("/")
        user = User(email="newuser3@example.com", username="newuser3")
        form = Mock()
        form.cleaned_data = {"first_name": "Jane", "last_name": "Smith"}

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, user, form, commit=False)

        self.assertEqual(saved_user.first_name, "Jane")
        self.assertEqual(saved_user.last_name, "Smith")
        # Profile should not be created when commit=False
        self.assertFalse(hasattr(saved_user, "profile"))

    def test_save_user_existing_profile(self):
        """Test saving user with existing profile."""
        request = self.factory.post("/")
        user = UserFactory()  # Create user
        # Create profile for the user
        profile = UserProfile.objects.create(user=user)
        form = Mock()
        form.cleaned_data = {"first_name": "Updated", "last_name": "Name"}

        initial_profile_count = UserProfile.objects.count()

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, user, form, commit=True)

        # Should not create a new profile
        self.assertEqual(UserProfile.objects.count(), initial_profile_count)
        self.assertEqual(saved_user.first_name, "Updated")
        self.assertEqual(saved_user.last_name, "Name")

    @override_settings(ACCOUNT_ALLOW_REGISTRATION=True)
    def test_is_open_for_signup_allowed(self):
        """Test signup is open when allowed in settings."""
        request = self.factory.get("/")

        result = self.adapter.is_open_for_signup(request)

        self.assertTrue(result)

    @override_settings(ACCOUNT_ALLOW_REGISTRATION=False)
    def test_is_open_for_signup_disallowed(self):
        """Test signup is closed when disallowed in settings."""
        request = self.factory.get("/")

        result = self.adapter.is_open_for_signup(request)

        self.assertFalse(result)

    def test_is_open_for_signup_default(self):
        """Test signup default behavior when setting not specified."""
        request = self.factory.get("/")

        # Remove setting if it exists
        if hasattr(settings, "ACCOUNT_ALLOW_REGISTRATION"):
            delattr(settings, "ACCOUNT_ALLOW_REGISTRATION")

        result = self.adapter.is_open_for_signup(request)

        self.assertTrue(result)  # Default should be True


class SocialAccountAdapterTestCase(TestCase):
    """Test cases for SocialAccountAdapter."""

    def setUp(self):
        self.adapter = SocialAccountAdapter()
        self.factory = RequestFactory()
        self.user = UserFactory()

    def _create_mock_sociallogin(
        self, provider="google", is_existing=False, extra_data=None
    ):
        """Helper to create mock SocialLogin."""
        if extra_data is None:
            extra_data = {
                "email": "social@example.com",
                "email_verified": True,
                "given_name": "Social",
                "family_name": "User",
                "picture": "https://example.com/avatar.jpg",
            }

        sociallogin = Mock(spec=SocialLogin)
        sociallogin.is_existing = is_existing

        # Mock account
        account = Mock(spec=SocialAccount)
        account.provider = provider
        account.extra_data = extra_data
        sociallogin.account = account

        return sociallogin

    def test_pre_social_login_existing_user(self):
        """Test pre_social_login with existing user."""
        request = self.factory.get("/")
        sociallogin = self._create_mock_sociallogin(is_existing=True)

        # Should not modify anything for existing users
        result = self.adapter.pre_social_login(request, sociallogin)

        self.assertIsNone(result)

    def test_pre_social_login_google_new_user(self):
        """Test pre_social_login with new Google user."""
        request = self.factory.get("/")
        sociallogin = self._create_mock_sociallogin(
            provider="google", is_existing=False
        )

        self.adapter.pre_social_login(request, sociallogin)

        # Should mark email as verified for Google
        self.assertTrue(sociallogin.account.extra_data["email_verified"])

    def test_pre_social_login_other_provider(self):
        """Test pre_social_login with non-Google provider."""
        request = self.factory.get("/")
        extra_data = {"email": "fb@example.com"}
        sociallogin = self._create_mock_sociallogin(
            provider="facebook", is_existing=False, extra_data=extra_data
        )

        self.adapter.pre_social_login(request, sociallogin)

        # Should not modify email verification for non-Google providers
        self.assertNotIn("email_verified", sociallogin.account.extra_data)

    def test_save_user_with_complete_data(self):
        """Test saving user from social login with complete data."""
        request = self.factory.post("/")
        sociallogin = self._create_mock_sociallogin()

        # Create a new user
        user = User(email="social@example.com", username="socialuser")

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, sociallogin)

        self.assertEqual(saved_user.first_name, "Social")
        self.assertEqual(saved_user.last_name, "User")
        self.assertTrue(hasattr(saved_user, "profile"))
        self.assertEqual(
            saved_user.profile.social_avatar_url, "https://example.com/avatar.jpg"
        )

    def test_save_user_partial_data(self):
        """Test saving user from social login with partial data."""
        request = self.factory.post("/")
        extra_data = {
            "email": "partial@example.com",
            "given_name": "Only",
            # Missing family_name and picture
        }
        sociallogin = self._create_mock_sociallogin(extra_data=extra_data)

        user = User(email="partial@example.com", username="partialuser")

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, sociallogin)

        self.assertEqual(saved_user.first_name, "Only")
        self.assertEqual(saved_user.last_name, "")  # Should remain empty
        self.assertTrue(hasattr(saved_user, "profile"))
        # social_avatar_url should not be set
        self.assertEqual(saved_user.profile.social_avatar_url, "")

    def test_save_user_existing_profile(self):
        """Test saving user with existing profile."""
        request = self.factory.post("/")
        sociallogin = self._create_mock_sociallogin()

        # Use existing user with profile
        user = UserFactory()
        # Create profile for the user
        profile = UserProfile.objects.create(user=user)
        initial_profile_count = UserProfile.objects.count()

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, sociallogin)

        # Should not create new profile
        self.assertEqual(UserProfile.objects.count(), initial_profile_count)
        self.assertEqual(
            saved_user.profile.social_avatar_url, "https://example.com/avatar.jpg"
        )

    def test_save_user_no_profile_attribute(self):
        """Test saving user without profile attribute initially."""
        request = self.factory.post("/")
        sociallogin = self._create_mock_sociallogin()

        # Create user without profile
        user = User(email="noprofile@example.com", username="noprofile")
        user.save()

        with patch.object(
            self.adapter.__class__.__bases__[0], "save_user"
        ) as mock_super:
            mock_super.return_value = user

            saved_user = self.adapter.save_user(request, sociallogin)

        # Should create new profile
        self.assertTrue(hasattr(saved_user, "profile"))
        self.assertEqual(saved_user.first_name, "Social")
        self.assertEqual(saved_user.last_name, "User")

    def test_is_auto_signup_allowed_verified_email(self):
        """Test auto signup allowed for verified email."""
        request = self.factory.get("/")
        extra_data = {"email": "verified@example.com", "email_verified": True}
        sociallogin = self._create_mock_sociallogin(extra_data=extra_data)

        result = self.adapter.is_auto_signup_allowed(request, sociallogin)

        self.assertTrue(result)

    def test_is_auto_signup_allowed_unverified_email(self):
        """Test auto signup not allowed for unverified email."""
        request = self.factory.get("/")
        extra_data = {"email": "unverified@example.com", "email_verified": False}
        sociallogin = self._create_mock_sociallogin(extra_data=extra_data)

        result = self.adapter.is_auto_signup_allowed(request, sociallogin)

        self.assertFalse(result)

    def test_is_auto_signup_allowed_no_email(self):
        """Test auto signup not allowed without email."""
        request = self.factory.get("/")
        extra_data = {
            "email_verified": True
            # No email field
        }
        sociallogin = self._create_mock_sociallogin(extra_data=extra_data)

        result = self.adapter.is_auto_signup_allowed(request, sociallogin)

        self.assertFalse(result)

    def test_is_auto_signup_allowed_empty_email(self):
        """Test auto signup not allowed for empty email."""
        request = self.factory.get("/")
        extra_data = {"email": "", "email_verified": True}
        sociallogin = self._create_mock_sociallogin(extra_data=extra_data)

        result = self.adapter.is_auto_signup_allowed(request, sociallogin)

        self.assertFalse(result)

    def test_populate_user_google_provider(self):
        """Test populate_user for Google provider."""
        request = self.factory.get("/")
        sociallogin = self._create_mock_sociallogin(provider="google")
        data = {"email": "google@example.com"}

        user = User()

        with patch.object(
            self.adapter.__class__.__bases__[0], "populate_user"
        ) as mock_super:
            mock_super.return_value = user

            populated_user = self.adapter.populate_user(request, sociallogin, data)

        self.assertTrue(populated_user.is_verified)

    def test_populate_user_other_provider(self):
        """Test populate_user for non-Google provider."""
        request = self.factory.get("/")
        sociallogin = self._create_mock_sociallogin(provider="facebook")
        data = {"email": "facebook@example.com"}

        user = User()
        user.is_verified = False

        with patch.object(
            self.adapter.__class__.__bases__[0], "populate_user"
        ) as mock_super:
            mock_super.return_value = user

            populated_user = self.adapter.populate_user(request, sociallogin, data)

        # Should not modify is_verified for non-Google providers
        self.assertFalse(populated_user.is_verified)
