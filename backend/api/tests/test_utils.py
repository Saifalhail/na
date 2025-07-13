"""
Test utilities and helpers for creating test data.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from api.models import (DietaryRestriction, FavoriteMeal, FoodItem, Meal,
                        MealAnalysis, MealItem, NutritionalInfo, UserProfile)

User = get_user_model()


class TestDataBuilder:
    """Helper class for building test data."""

    @staticmethod
    def create_user(**kwargs):
        """Create a test user with sensible defaults."""
        defaults = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User",
        }
        defaults.update(kwargs)

        return User.objects.create_user(**defaults)

    @staticmethod
    def create_user_with_profile(**kwargs):
        """Create a user with a complete profile."""
        profile_data = kwargs.pop("profile_data", {})
        user = TestDataBuilder.create_user(**kwargs)

        profile_defaults = {
            "gender": "M",
            "height": Decimal("180.00"),
            "weight": Decimal("75.00"),
            "activity_level": "moderately_active",
            "measurement_system": "metric",
            "timezone": "UTC",
            "language": "en",
        }
        profile_defaults.update(profile_data)

        profile = UserProfile.objects.create(user=user, **profile_defaults)
        return user, profile

    @staticmethod
    def create_food_item(**kwargs):
        """Create a test food item with sensible nutritional defaults."""
        defaults = {
            "name": f"Test Food {uuid.uuid4().hex[:8]}",
            "calories": Decimal("100.00"),
            "protein": Decimal("5.00"),
            "carbohydrates": Decimal("20.00"),
            "fat": Decimal("2.00"),
            "fiber": Decimal("3.00"),
            "sugar": Decimal("5.00"),
            "sodium": Decimal("100.00"),
            "source": "database",
        }
        defaults.update(kwargs)

        return FoodItem.objects.create(**defaults)

    @staticmethod
    def create_meal(user=None, **kwargs):
        """Create a test meal."""
        if user is None:
            user = TestDataBuilder.create_user()

        defaults = {
            "name": f"Test Meal {uuid.uuid4().hex[:8]}",
            "meal_type": "other",
            "consumed_at": timezone.now(),
        }
        defaults.update(kwargs)

        return Meal.objects.create(user=user, **defaults)

    @staticmethod
    def create_meal_with_items(user=None, items_data=None, **meal_kwargs):
        """Create a meal with meal items."""
        meal = TestDataBuilder.create_meal(user=user, **meal_kwargs)

        if items_data is None:
            # Create default items
            items_data = [
                {
                    "food": TestDataBuilder.create_food_item(name="Apple"),
                    "quantity": Decimal("150"),
                    "unit": "g",
                },
                {
                    "food": TestDataBuilder.create_food_item(name="Banana"),
                    "quantity": Decimal("120"),
                    "unit": "g",
                },
            ]

        meal_items = []
        for item_data in items_data:
            food = item_data.pop("food", TestDataBuilder.create_food_item())
            meal_item = MealItem.objects.create(meal=meal, food_item=food, **item_data)
            meal_items.append(meal_item)

        return meal, meal_items

    @staticmethod
    def create_meal_analysis(meal=None, **kwargs):
        """Create a meal analysis."""
        if meal is None:
            meal = TestDataBuilder.create_meal()

        defaults = {
            "ai_service": "gemini",
            "ai_response": {
                "foods": [
                    {"name": "Apple", "quantity": 150, "unit": "g"},
                    {"name": "Banana", "quantity": 120, "unit": "g"},
                ],
                "total_calories": 250,
            },
            "confidence_score": Decimal("0.92"),
            "analysis_time_ms": 1500,
            "tokens_used": 350,
        }
        defaults.update(kwargs)

        return MealAnalysis.objects.create(meal=meal, **defaults)

    @staticmethod
    def create_dietary_restriction(user=None, **kwargs):
        """Create a dietary restriction."""
        if user is None:
            user = TestDataBuilder.create_user()

        defaults = {
            "name": "Test Restriction",
            "restriction_type": "allergy",
            "severity": "moderate",
        }
        defaults.update(kwargs)

        return DietaryRestriction.objects.create(user=user, **defaults)

    @staticmethod
    def create_favorite_meal(user=None, meal=None, **kwargs):
        """Create a favorite meal."""
        if user is None:
            user = TestDataBuilder.create_user()
        if meal is None:
            meal = TestDataBuilder.create_meal(user=user)

        defaults = {"name": "My Favorite Meal"}
        defaults.update(kwargs)

        return FavoriteMeal.objects.create(user=user, meal=meal, **defaults)

    @staticmethod
    def create_nutritional_info(meal=None, food_item=None, **kwargs):
        """Create detailed nutritional information."""
        defaults = {
            "vitamin_c": Decimal("10.00"),
            "calcium": Decimal("120.00"),
            "iron": Decimal("1.80"),
            "potassium": Decimal("420.00"),
            "source": "USDA Database",
        }
        defaults.update(kwargs)

        if meal:
            return NutritionalInfo.objects.create(meal=meal, **defaults)
        elif food_item:
            return NutritionalInfo.objects.create(food_item=food_item, **defaults)
        else:
            # Create with a default meal
            meal = TestDataBuilder.create_meal()
            return NutritionalInfo.objects.create(meal=meal, **defaults)


class TestMixins:
    """Mixin classes for common test functionality."""

    class AuthenticatedTestCase:
        """Mixin for tests that require authenticated users."""

        def setUp(self):
            """Set up authenticated user."""
            super().setUp()
            self.user = TestDataBuilder.create_user(
                username="authuser", email="auth@example.com"
            )
            self.client.force_login(self.user)

    class FoodDataTestCase:
        """Mixin for tests that require food-related data."""

        def setUp(self):
            """Set up food data."""
            super().setUp()

            # Common food items
            self.apple = TestDataBuilder.create_food_item(
                name="Apple",
                calories=Decimal("52.00"),
                protein=Decimal("0.30"),
                carbohydrates=Decimal("14.00"),
                fat=Decimal("0.20"),
                fiber=Decimal("2.40"),
                sugar=Decimal("10.40"),
            )

            self.chicken = TestDataBuilder.create_food_item(
                name="Chicken Breast",
                calories=Decimal("165.00"),
                protein=Decimal("31.00"),
                carbohydrates=Decimal("0.00"),
                fat=Decimal("3.60"),
            )

            self.rice = TestDataBuilder.create_food_item(
                name="Brown Rice",
                calories=Decimal("216.00"),
                protein=Decimal("5.00"),
                carbohydrates=Decimal("45.00"),
                fat=Decimal("1.80"),
                fiber=Decimal("3.50"),
            )


def assert_decimal_equal(test_case, actual, expected, places=2, msg=None):
    """
    Assert that two Decimal values are equal within a certain number of decimal places.

    Args:
        test_case: The TestCase instance
        actual: The actual Decimal value
        expected: The expected Decimal value
        places: Number of decimal places to check (default: 2)
        msg: Optional message to display on failure
    """
    if actual is None and expected is None:
        return

    if actual is None or expected is None:
        test_case.fail(msg or f"Expected {expected}, got {actual}")

    test_case.assertAlmostEqual(float(actual), float(expected), places=places, msg=msg)


def create_test_image(name="test.jpg", content=b"fake image content"):
    """Create a simple test image file."""
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(name=name, content=content, content_type="image/jpeg")


def create_api_usage_logs(user=None, count=5, endpoint="/api/v1/test/", **kwargs):
    """Create multiple API usage logs for testing."""
    from api.models import APIUsageLog

    logs = []
    for i in range(count):
        log_data = {
            "user": user,
            "endpoint": endpoint,
            "method": "GET",
            "ip_address": f"192.168.1.{100 + i}",
            "response_status_code": 200,
            "response_time_ms": 50 + i * 10,
        }
        log_data.update(kwargs)

        log = APIUsageLog.objects.create(**log_data)
        logs.append(log)

    return logs


def create_meal_plan(user, days=7):
    """Create a meal plan for testing (multiple meals over several days)."""
    meals = []
    meal_types = ["breakfast", "lunch", "dinner", "snack"]

    for day in range(days):
        for meal_type in meal_types[:3]:  # breakfast, lunch, dinner
            meal = TestDataBuilder.create_meal(
                user=user,
                name=f"{meal_type.capitalize()} Day {day + 1}",
                meal_type=meal_type,
                consumed_at=timezone.now() - timezone.timedelta(days=days - day - 1),
            )
            meals.append(meal)

    return meals
