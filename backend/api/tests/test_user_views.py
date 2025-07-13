from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from api.factories import (FoodItemFactory, MealFactory, UserFactory,
                           UserProfileFactory)
from api.models import FavoriteMeal, FoodItem, Meal, MealItem, UserProfile

User = get_user_model()


class UserViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create admin user
        self.admin_user = UserFactory(is_staff=True, is_superuser=True)
        self.admin_profile = UserProfileFactory(user=self.admin_user)

        # Create regular users
        self.user1 = UserFactory(
            first_name="John", last_name="Doe", email="john@example.com"
        )
        self.profile1 = UserProfileFactory(user=self.user1)

        self.user2 = UserFactory(
            first_name="Jane", last_name="Smith", email="jane@example.com"
        )
        self.profile2 = UserProfileFactory(user=self.user2)

        # Create some meals for user1
        self.meal1 = MealFactory(user=self.user1)
        self.meal2 = MealFactory(user=self.user1)
        self.meal3 = MealFactory(
            user=self.user1, consumed_at=timezone.now() - timedelta(days=10)
        )

        # Create a favorite meal
        FavoriteMeal.objects.create(user=self.user1, meal=self.meal2)

    def test_user_list_requires_admin(self):
        """Test that user list requires admin permissions"""
        # Unauthenticated
        response = self.client.get(reverse("api:users:user-list"), follow=True)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Regular user
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse("api:users:user-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse("api:users:user-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)  # admin + 2 users

    def test_user_list_filtering(self):
        """Test user list filtering options"""
        self.client.force_authenticate(user=self.admin_user)

        # Filter by active status
        self.user2.is_active = False
        self.user2.save()

        response = self.client.get(
            reverse("api:users:user-list"), {"is_active": "true"}
        )
        self.assertEqual(len(response.data["results"]), 2)

        response = self.client.get(
            reverse("api:users:user-list"), {"is_active": "false"}
        )
        self.assertEqual(len(response.data["results"]), 1)

        # Filter by account type
        self.user1.account_type = "premium"
        self.user1.save()

        response = self.client.get(
            reverse("api:users:user-list"), {"account_type": "premium"}
        )
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "john@example.com")

    def test_user_detail_view(self):
        """Test user detail view"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse("api:users:user-detail", kwargs={"pk": self.user1.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "john@example.com")
        self.assertEqual(response.data["full_name"], "John Doe")
        self.assertIn("account_type", response.data)
        self.assertIn("is_verified", response.data)

    def test_user_update(self):
        """Test user update"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse("api:users:user-detail", kwargs={"pk": self.user1.pk})
        data = {
            "first_name": "Jonathan",
            "last_name": "Doe Jr.",
            "is_active": True,
            "is_staff": False,
        }

        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user1.refresh_from_db()
        self.assertEqual(self.user1.first_name, "Jonathan")
        self.assertEqual(self.user1.last_name, "Doe Jr.")

    def test_cannot_deactivate_self(self):
        """Test that users cannot deactivate themselves"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse("api:users:user-detail", kwargs={"pk": self.admin_user.pk})
        data = {"is_active": False}

        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot deactivate your own account", response.data[0])

    def test_user_soft_delete(self):
        """Test user soft delete (deactivation)"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse("api:users:user-detail", kwargs={"pk": self.user1.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.user1.refresh_from_db()
        self.assertFalse(self.user1.is_active)

    def test_cannot_delete_self(self):
        """Test that users cannot delete themselves"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse("api:users:user-detail", kwargs={"pk": self.admin_user.pk})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot delete your own account", response.data["error"])

    def test_user_profile_detail(self):
        """Test user profile detail view"""
        # Owner can view their own profile
        self.client.force_authenticate(user=self.user1)

        url = reverse("api:users:user-profile", kwargs={"pk": self.user1.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "john@example.com")
        self.assertIn("dietary_restrictions_display", response.data)
        self.assertIn("bmi", response.data)
        self.assertIn("is_premium", response.data)

        # Cannot view other user's profile
        url = reverse("api:users:user-profile", kwargs={"pk": self.user2.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can view any profile
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_meals_view(self):
        """Test user meals view"""
        # Owner can view their own meals
        self.client.force_authenticate(user=self.user1)

        url = reverse("api:users:user-meals", kwargs={"pk": self.user1.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)

        # Cannot view other user's meals
        url = reverse("api:users:user-meals", kwargs={"pk": self.user2.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_statistics_view(self):
        """Test user statistics view"""
        self.client.force_authenticate(user=self.user1)

        url = reverse("api:users:user-statistics", kwargs={"pk": self.user1.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertEqual(data["total_meals"], 3)
        # Don't check exact calories since we're not setting them in the factory
        self.assertIn("total_calories", data)
        self.assertIn("avg_calories_per_meal", data)
        self.assertEqual(data["favorite_meals_count"], 1)
        self.assertEqual(data["meals_this_week"], 2)  # 2 recent meals
        self.assertIn("most_common_meal_type", data)
        self.assertIn("nutritional_summary", data)
        self.assertIn("meal_type_distribution", data)

    def test_user_search(self):
        """Test user search functionality"""
        self.client.force_authenticate(user=self.admin_user)

        # Search by name
        url = reverse("api:users:user-search")
        response = self.client.get(url, {"q": "John"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "john@example.com")

        # Search by email
        response = self.client.get(url, {"q": "jane@"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "jane@example.com")

        # Filter by staff status
        response = self.client.get(url, {"is_staff": "true"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.admin_user.id)

        # Test ordering
        response = self.client.get(url, {"ordering": "email"})
        emails = [user["email"] for user in response.data["results"]]
        self.assertEqual(emails, sorted(emails))
