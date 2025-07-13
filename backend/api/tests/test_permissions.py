"""
Tests for custom DRF permissions.
"""

from datetime import timedelta
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from django.utils import timezone
from rest_framework import permissions
from rest_framework.test import APIRequestFactory

from api.permissions import (CanAccessAIFeatures, CanModifyMeal,
                             IsOwnerOrReadOnly, IsOwnerPermission,
                             IsPremiumUser)
from api.tests.factories import MealFactory, UserFactory, UserProfileFactory

User = get_user_model()


class IsOwnerPermissionTestCase(TestCase):
    """Test cases for IsOwnerPermission."""

    def setUp(self):
        self.permission = IsOwnerPermission()
        self.factory = APIRequestFactory()
        self.user = UserFactory()
        self.other_user = UserFactory()

    def test_has_permission_authenticated_user(self):
        """Test permission granted for authenticated user."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertTrue(result)

    def test_has_permission_unauthenticated_user(self):
        """Test permission denied for unauthenticated user."""
        request = self.factory.get("/")
        request.user = None
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_anonymous_user(self):
        """Test permission denied for anonymous user."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/")
        request.user = AnonymousUser()
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_object_permission_owner_user_attribute(self):
        """Test object permission for owner with 'user' attribute."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Mock object with user attribute
        obj = Mock()
        obj.user = self.user

        result = self.permission.has_object_permission(request, view, obj)

        self.assertTrue(result)

    def test_has_object_permission_non_owner_user_attribute(self):
        """Test object permission denied for non-owner with 'user' attribute."""
        request = self.factory.get("/")
        request.user = self.other_user
        view = Mock()

        # Mock object with different user
        obj = Mock()
        obj.user = self.user

        result = self.permission.has_object_permission(request, view, obj)

        self.assertFalse(result)

    def test_has_object_permission_owner_created_by_attribute(self):
        """Test object permission for owner with 'created_by' attribute."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Mock object with created_by attribute
        obj = Mock()
        obj.created_by = self.user
        # Ensure no 'user' attribute
        if hasattr(obj, "user"):
            delattr(obj, "user")

        result = self.permission.has_object_permission(request, view, obj)

        self.assertTrue(result)

    def test_has_object_permission_owner_owner_attribute(self):
        """Test object permission for owner with 'owner' attribute."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Mock object with owner attribute
        obj = Mock()
        obj.owner = self.user
        # Ensure no 'user' or 'created_by' attributes
        if hasattr(obj, "user"):
            delattr(obj, "user")
        if hasattr(obj, "created_by"):
            delattr(obj, "created_by")

        result = self.permission.has_object_permission(request, view, obj)

        self.assertTrue(result)

    def test_has_object_permission_no_user_relation(self):
        """Test object permission denied when no user relation found."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Mock object without user relationships
        obj = Mock()
        if hasattr(obj, "user"):
            delattr(obj, "user")
        if hasattr(obj, "created_by"):
            delattr(obj, "created_by")
        if hasattr(obj, "owner"):
            delattr(obj, "owner")

        result = self.permission.has_object_permission(request, view, obj)

        self.assertFalse(result)


class IsOwnerOrReadOnlyTestCase(TestCase):
    """Test cases for IsOwnerOrReadOnly."""

    def setUp(self):
        self.permission = IsOwnerOrReadOnly()
        self.factory = APIRequestFactory()
        self.user = UserFactory()
        self.other_user = UserFactory()

    def test_has_permission_authenticated_user(self):
        """Test permission granted for authenticated user."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertTrue(result)

    def test_has_permission_unauthenticated_user(self):
        """Test permission denied for unauthenticated user."""
        request = self.factory.get("/")
        request.user = None
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_object_permission_read_operation(self):
        """Test object permission allowed for read operations."""
        request = self.factory.get("/")
        request.user = self.other_user
        view = Mock()

        # Mock object owned by different user
        obj = Mock()
        obj.user = self.user

        result = self.permission.has_object_permission(request, view, obj)

        self.assertTrue(result)

    def test_has_object_permission_write_operation_owner(self):
        """Test object permission allowed for write operations by owner."""
        request = self.factory.put("/")
        request.user = self.user
        view = Mock()

        # Mock object owned by same user
        obj = Mock()
        obj.user = self.user

        result = self.permission.has_object_permission(request, view, obj)

        self.assertTrue(result)

    def test_has_object_permission_write_operation_non_owner(self):
        """Test object permission denied for write operations by non-owner."""
        request = self.factory.put("/")
        request.user = self.other_user
        view = Mock()

        # Mock object owned by different user
        obj = Mock()
        obj.user = self.user

        result = self.permission.has_object_permission(request, view, obj)

        self.assertFalse(result)

    def test_has_object_permission_write_operation_created_by(self):
        """Test object permission for write operations with 'created_by' attribute."""
        request = self.factory.post("/")
        request.user = self.user
        view = Mock()

        # Mock object with created_by attribute
        obj = Mock()
        obj.created_by = self.user
        # Ensure no 'user' attribute
        if hasattr(obj, "user"):
            delattr(obj, "user")

        result = self.permission.has_object_permission(request, view, obj)

        self.assertTrue(result)

    def test_has_object_permission_write_operation_no_relation(self):
        """Test object permission denied for write operations with no user relation."""
        request = self.factory.delete("/")
        request.user = self.user
        view = Mock()

        # Mock object without user relationships
        obj = Mock()
        if hasattr(obj, "user"):
            delattr(obj, "user")
        if hasattr(obj, "created_by"):
            delattr(obj, "created_by")

        result = self.permission.has_object_permission(request, view, obj)

        self.assertFalse(result)


class IsPremiumUserTestCase(TestCase):
    """Test cases for IsPremiumUser."""

    def setUp(self):
        self.permission = IsPremiumUser()
        self.factory = APIRequestFactory()
        self.user = UserFactory()

    def test_has_permission_unauthenticated_user(self):
        """Test permission denied for unauthenticated user."""
        request = self.factory.get("/")
        request.user = None
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_anonymous_user(self):
        """Test permission denied for anonymous user."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/")
        request.user = AnonymousUser()
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_premium_user(self):
        """Test permission granted for premium user."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Create premium profile
        from api.models import UserProfile

        profile = UserProfile.objects.create(user=self.user, is_premium=True)

        result = self.permission.has_permission(request, view)

        self.assertTrue(result)

    def test_has_permission_non_premium_user(self):
        """Test permission denied for non-premium user."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Create non-premium profile
        from api.models import UserProfile

        profile = UserProfile.objects.create(user=self.user, is_premium=False)

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_user_without_profile(self):
        """Test permission denied for user without profile."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Ensure user has no profile
        if hasattr(self.user, "profile"):
            delattr(self.user, "profile")

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_profile_without_is_premium_attribute(self):
        """Test permission denied for profile without is_premium attribute."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Create profile (will have is_premium=False by default)
        from api.models import UserProfile

        profile = UserProfile.objects.create(user=self.user)
        # Verify default is False
        self.assertFalse(profile.is_premium)

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)


class CanAccessAIFeaturesTestCase(TestCase):
    """Test cases for CanAccessAIFeatures."""

    def setUp(self):
        self.permission = CanAccessAIFeatures()
        self.factory = APIRequestFactory()
        self.user = UserFactory()

    def test_has_permission_unauthenticated_user(self):
        """Test permission denied for unauthenticated user."""
        request = self.factory.get("/")
        request.user = None
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_anonymous_user(self):
        """Test permission denied for anonymous user."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/")
        request.user = AnonymousUser()
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertFalse(result)

    def test_has_permission_authenticated_user(self):
        """Test permission granted for authenticated user (current implementation)."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        result = self.permission.has_permission(request, view)

        self.assertTrue(result)

    def test_permission_message(self):
        """Test custom permission message."""
        expected_message = "AI features require a premium subscription or you've exceeded your daily limit."

        self.assertEqual(self.permission.message, expected_message)


class CanModifyMealTestCase(TestCase):
    """Test cases for CanModifyMeal."""

    def setUp(self):
        self.permission = CanModifyMeal()
        self.factory = APIRequestFactory()
        self.user = UserFactory()
        self.other_user = UserFactory()

    def test_has_object_permission_non_owner(self):
        """Test permission denied for non-owner."""
        request = self.factory.put("/")
        request.user = self.other_user
        view = Mock()

        # Mock meal owned by different user
        meal = Mock()
        meal.user = self.user

        result = self.permission.has_object_permission(request, view, meal)

        self.assertFalse(result)

    def test_has_object_permission_read_operation_owner(self):
        """Test permission granted for read operations by owner."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Mock recent meal
        meal = Mock()
        meal.user = self.user
        meal.created_at = timezone.now() - timedelta(days=15)

        result = self.permission.has_object_permission(request, view, meal)

        self.assertTrue(result)

    def test_has_object_permission_read_operation_old_meal(self):
        """Test permission granted for read operations even on old meals."""
        request = self.factory.get("/")
        request.user = self.user
        view = Mock()

        # Mock old meal
        meal = Mock()
        meal.user = self.user
        meal.created_at = timezone.now() - timedelta(days=45)

        result = self.permission.has_object_permission(request, view, meal)

        self.assertTrue(result)

    def test_has_object_permission_write_operation_recent_meal(self):
        """Test permission granted for write operations on recent meals."""
        request = self.factory.put("/")
        request.user = self.user
        view = Mock()

        # Mock recent meal
        meal = Mock()
        meal.user = self.user
        meal.created_at = timezone.now() - timedelta(days=10)

        result = self.permission.has_object_permission(request, view, meal)

        self.assertTrue(result)

    def test_has_object_permission_write_operation_old_meal(self):
        """Test permission denied for write operations on old meals."""
        request = self.factory.put("/")
        request.user = self.user
        view = Mock()

        # Mock old meal (more than 30 days)
        meal = Mock()
        meal.user = self.user
        meal.created_at = timezone.now() - timedelta(days=35)

        result = self.permission.has_object_permission(request, view, meal)

        self.assertFalse(result)

    def test_has_object_permission_write_operation_edge_case(self):
        """Test permission for meal exactly at 30-day boundary."""
        request = self.factory.delete("/")
        request.user = self.user
        view = Mock()

        # Mock meal exactly 30 days old
        meal = Mock()
        meal.user = self.user
        meal.created_at = timezone.now() - timedelta(days=30)

        result = self.permission.has_object_permission(request, view, meal)

        self.assertTrue(result)  # Should be allowed (>= age_limit)

    def test_permission_message(self):
        """Test custom permission message."""
        expected_message = "Cannot modify meals older than 30 days."

        self.assertEqual(self.permission.message, expected_message)

    def test_has_object_permission_various_http_methods(self):
        """Test permission for various HTTP methods."""
        meal = Mock()
        meal.user = self.user
        meal.created_at = timezone.now() - timedelta(days=35)  # Old meal
        view = Mock()

        # Safe methods should be allowed
        for method in ["GET", "HEAD", "OPTIONS"]:
            request = getattr(self.factory, method.lower())("/")
            request.user = self.user

            result = self.permission.has_object_permission(request, view, meal)
            self.assertTrue(result, f"Method {method} should be allowed for old meals")

        # Unsafe methods should be denied for old meals
        for method in ["POST", "PUT", "PATCH", "DELETE"]:
            request = getattr(self.factory, method.lower())("/")
            request.user = self.user

            result = self.permission.has_object_permission(request, view, meal)
            self.assertFalse(result, f"Method {method} should be denied for old meals")
