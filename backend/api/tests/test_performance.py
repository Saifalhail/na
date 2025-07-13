"""
Performance benchmarking tests.
"""

import time
from unittest.mock import patch

from django.core.cache import cache
from django.db import connection
from django.db.models import Count
from django.test import TestCase, TransactionTestCase
from django.test.utils import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.factories import (FoodItemFactory, MealFactory, MealItemFactory,
                           UserFactory)
from api.models import Meal, MealItem, Notification


class DatabasePerformanceTest(TransactionTestCase):
    """
    Test database query performance and optimization.
    """

    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        self.food_items = [FoodItemFactory() for _ in range(10)]

        # Create meals with items for performance testing
        self.meals = []
        for i in range(50):
            meal = MealFactory(user=self.user)
            # Add 3-5 items per meal
            for j in range(3 + (i % 3)):
                MealItemFactory(
                    meal=meal, food_item=self.food_items[j % len(self.food_items)]
                )
            self.meals.append(meal)

    def test_meal_list_query_count(self):
        """Test that meal list view doesn't have N+1 query problems."""
        # Reset query log
        connection.queries_log.clear()

        with self.assertNumQueries(3):  # Should be a small, consistent number
            meals = (
                Meal.objects.filter(user=self.user)
                .prefetch_related("meal_items", "favorited_by")
                .annotate(items_count=Count("meal_items", distinct=True))
            )

            # Force evaluation
            list(meals)

    def test_meal_detail_query_count(self):
        """Test that meal detail view is optimized."""
        meal = self.meals[0]

        # Reset query log
        connection.queries_log.clear()

        with self.assertNumQueries(4):  # Should be a small, consistent number
            meal_detail = (
                Meal.objects.prefetch_related("meal_items__food_item", "favorited_by")
                .select_related("analysis")
                .get(id=meal.id)
            )

            # Access related data to trigger queries
            list(meal_detail.meal_items.all())
            if hasattr(meal_detail, "analysis"):
                meal_detail.analysis

    def test_statistics_query_performance(self):
        """Test that statistics calculation is efficient."""
        from django.db.models import Avg, Count, OuterRef, Subquery, Sum

        from api.models import MealItem

        # Reset query log
        connection.queries_log.clear()

        start_time = time.time()

        # This is the optimized query from the statistics endpoint
        meals = Meal.objects.filter(user=self.user)

        meal_calories = (
            MealItem.objects.filter(meal=OuterRef("pk"))
            .values("meal")
            .annotate(total=Sum("calories"))
            .values("total")
        )

        meals_with_calories = meals.annotate(meal_calories=Subquery(meal_calories))

        stats = meals_with_calories.aggregate(
            total_meals=Count("id"),
            total_calories=Sum("meal_calories"),
            avg_calories=Avg("meal_calories"),
        )

        end_time = time.time()

        # Should complete in reasonable time
        self.assertLess(end_time - start_time, 1.0)  # Less than 1 second

        # Should use efficient queries (not too many)
        self.assertLess(len(connection.queries), 10)


class APIPerformanceTest(APITestCase):
    """
    Test API endpoint performance.
    """

    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

        # Create test data
        self.food_items = [FoodItemFactory() for _ in range(5)]
        self.meals = []
        for i in range(20):
            meal = MealFactory(user=self.user)
            for j in range(2):
                MealItemFactory(
                    meal=meal, food_item=self.food_items[j % len(self.food_items)]
                )
            self.meals.append(meal)

    def test_meal_list_response_time(self):
        """Test meal list endpoint response time."""
        url = reverse("api:meals:meal-list")

        start_time = time.time()
        response = self.client.get(url)
        end_time = time.time()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should respond quickly
        self.assertLess(end_time - start_time, 0.5)  # Less than 500ms

        # Check performance headers
        self.assertIn("X-Response-Time", response)
        self.assertIn("X-Query-Count", response)

    def test_meal_statistics_response_time(self):
        """Test meal statistics endpoint response time."""
        url = reverse("api:meals:meal-statistics")

        start_time = time.time()
        response = self.client.get(url)
        end_time = time.time()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should respond quickly even with complex aggregations
        self.assertLess(end_time - start_time, 1.0)  # Less than 1 second

    def test_notification_list_pagination(self):
        """Test notification list pagination performance."""
        # Create many notifications
        notifications = []
        for i in range(100):
            notifications.append(
                Notification(
                    user=self.user,
                    type="meal_reminder",
                    title=f"Notification {i}",
                    message=f"Message {i}",
                )
            )
        Notification.objects.bulk_create(notifications)

        url = reverse("api:notifications:notifications-list")

        start_time = time.time()
        response = self.client.get(url)
        end_time = time.time()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should be paginated (default 20 per page)
        self.assertEqual(len(response.data["results"]), 20)

        # Should respond quickly even with many records
        self.assertLess(end_time - start_time, 0.5)  # Less than 500ms


class CachePerformanceTest(APITestCase):
    """
    Test caching performance improvements.
    """

    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

        # Create test data
        self.food_items = [FoodItemFactory() for _ in range(5)]
        for i in range(10):
            meal = MealFactory(user=self.user)
            for j in range(2):
                MealItemFactory(
                    meal=meal, food_item=self.food_items[j % len(self.food_items)]
                )

    def test_statistics_caching(self):
        """Test that statistics endpoint uses caching effectively."""
        url = reverse("api:meals:meal-statistics")

        # Clear cache
        cache.clear()

        # First request - should hit database
        start_time = time.time()
        response1 = self.client.get(url)
        first_request_time = time.time() - start_time

        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second request - should hit cache
        start_time = time.time()
        response2 = self.client.get(url)
        second_request_time = time.time() - start_time

        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Cached response should be faster
        self.assertLess(second_request_time, first_request_time)

        # Results should be identical
        self.assertEqual(response1.data, response2.data)

    def test_favorites_caching(self):
        """Test that favorites endpoint uses caching effectively."""
        from api.models import FavoriteMeal

        # Create some favorite meals
        for meal in Meal.objects.filter(user=self.user)[:3]:
            FavoriteMeal.objects.create(
                user=self.user, meal=meal, name=f"Favorite {meal.name}"
            )

        url = reverse("api:meals:meal-favorites")

        # Clear cache
        cache.clear()

        # First request
        start_time = time.time()
        response1 = self.client.get(url)
        first_request_time = time.time() - start_time

        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second request - should be cached
        start_time = time.time()
        response2 = self.client.get(url)
        second_request_time = time.time() - start_time

        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Cached response should be faster
        self.assertLess(second_request_time, first_request_time)


class LoadTestCase(TestCase):
    """
    Basic load testing for critical endpoints.
    """

    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()

        # Create significant amount of test data
        self.food_items = [FoodItemFactory() for _ in range(20)]
        self.meals = []

        for i in range(100):  # 100 meals
            meal = MealFactory(user=self.user)
            # 2-4 items per meal
            for j in range(2 + (i % 3)):
                MealItemFactory(
                    meal=meal, food_item=self.food_items[j % len(self.food_items)]
                )
            self.meals.append(meal)

    def test_large_dataset_performance(self):
        """Test performance with larger datasets."""
        from django.db.models import Count

        # Test meal listing with large dataset
        start_time = time.time()

        meals = (
            Meal.objects.filter(user=self.user)
            .prefetch_related("meal_items", "favorited_by")
            .annotate(items_count=Count("meal_items", distinct=True))[:20]
        )  # Paginated

        list(meals)  # Force evaluation

        end_time = time.time()

        # Should still be reasonably fast
        self.assertLess(end_time - start_time, 1.0)  # Less than 1 second

    def test_statistics_with_large_dataset(self):
        """Test statistics calculation with larger dataset."""
        from django.db.models import Avg, Count, OuterRef, Subquery, Sum

        from api.models import MealItem

        start_time = time.time()

        # Run the statistics calculation
        meals = Meal.objects.filter(user=self.user)

        meal_calories = (
            MealItem.objects.filter(meal=OuterRef("pk"))
            .values("meal")
            .annotate(total=Sum("calories"))
            .values("total")
        )

        meals_with_calories = meals.annotate(meal_calories=Subquery(meal_calories))

        stats = meals_with_calories.aggregate(
            total_meals=Count("id"),
            total_calories=Sum("meal_calories"),
            avg_calories=Avg("meal_calories"),
        )

        end_time = time.time()

        # Should complete in reasonable time even with 100 meals
        self.assertLess(end_time - start_time, 2.0)  # Less than 2 seconds

        # Verify results make sense
        self.assertEqual(stats["total_meals"], 100)
        self.assertIsNotNone(stats["total_calories"])
        self.assertIsNotNone(stats["avg_calories"])


from django.db.models import Count  # Add this import at the top
