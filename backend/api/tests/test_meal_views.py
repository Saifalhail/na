import json
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from api.models import FavoriteMeal, FoodItem, Meal, MealItem
from api.tests.factories import (FoodItemFactory, MealFactory, MealItemFactory,
                                 UserFactory)


@pytest.mark.django_db
class TestMealViewSet:
    """Test cases for MealViewSet."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = UserFactory()
        self.other_user = UserFactory()

        # Create test food items
        self.food1 = FoodItemFactory(
            name="Chicken Breast", calories=165, protein=31, carbohydrates=0, fat=3.6
        )
        self.food2 = FoodItemFactory(
            name="Brown Rice", calories=112, protein=2.6, carbohydrates=23.5, fat=0.9
        )

        # Create test meals
        self.meal1 = MealFactory(
            user=self.user,
            name="Lunch",
            meal_type="lunch",
            consumed_at=timezone.now() - timedelta(hours=2),
        )
        self.meal_item1 = MealItemFactory(
            meal=self.meal1, food_item=self.food1, quantity=150, unit="g"
        )

        self.meal2 = MealFactory(
            user=self.user,
            name="Dinner",
            meal_type="dinner",
            consumed_at=timezone.now() - timedelta(days=1),
        )

        # Other user's meal
        self.other_meal = MealFactory(user=self.other_user)

        # Authenticate
        self.client.force_authenticate(user=self.user)

    def test_list_meals(self):
        """Test listing user's meals."""
        url = reverse("api:meals:meal-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
        assert response.data["results"][0]["id"] == str(self.meal1.id)

    def test_list_meals_excludes_other_users(self):
        """Test that list excludes other users' meals."""
        url = reverse("api:meals:meal-list")
        response = self.client.get(url)

        meal_ids = [meal["id"] for meal in response.data["results"]]
        assert str(self.other_meal.id) not in meal_ids

    def test_retrieve_meal(self):
        """Test retrieving a single meal."""
        url = reverse("api:meals:meal-detail", kwargs={"pk": self.meal1.id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(self.meal1.id)
        assert "meal_items" in response.data
        assert len(response.data["meal_items"]) == 1

    def test_create_meal_with_items(self):
        """Test creating a meal with meal items."""
        url = reverse("api:meals:meal-list")
        data = {
            "name": "Test Breakfast",
            "meal_type": "breakfast",
            "consumed_at": timezone.now().isoformat(),
            "notes": "Healthy breakfast",
            "meal_items": [
                {"food_item_id": str(self.food1.id), "quantity": 100, "unit": "g"},
                {"food_item_id": str(self.food2.id), "quantity": 150, "unit": "g"},
            ],
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Meal.objects.filter(name="Test Breakfast").exists()

        meal = Meal.objects.get(name="Test Breakfast")
        assert meal.meal_items.count() == 2

    def test_create_meal_with_new_food_item(self):
        """Test creating a meal with a new food item."""
        url = reverse("api:meals:meal-list")
        data = {
            "name": "Quick Snack",
            "meal_type": "snack",
            "consumed_at": timezone.now().isoformat(),
            "meal_items": [{"food_item_name": "Apple", "quantity": 1, "unit": "piece"}],
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert FoodItem.objects.filter(name="Apple").exists()

    def test_update_meal(self):
        """Test updating a meal."""
        url = reverse("api:meals:meal-detail", kwargs={"pk": self.meal1.id})
        data = {"name": "Updated Lunch", "notes": "Updated notes"}

        response = self.client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        self.meal1.refresh_from_db()
        assert self.meal1.name == "Updated Lunch"
        assert self.meal1.notes == "Updated notes"

    def test_delete_meal(self):
        """Test deleting a meal."""
        url = reverse("api:meals:meal-detail", kwargs={"pk": self.meal1.id})
        response = self.client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Meal.objects.filter(id=self.meal1.id).exists()

    def test_favorite_meal(self):
        """Test adding a meal to favorites."""
        url = reverse("api:meals:meal-favorite", kwargs={"pk": self.meal1.id})
        data = {"name": "My Favorite Lunch"}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert FavoriteMeal.objects.filter(user=self.user, meal=self.meal1).exists()

    def test_unfavorite_meal(self):
        """Test removing a meal from favorites."""
        # First, favorite the meal
        FavoriteMeal.objects.create(
            user=self.user, meal=self.meal1, name="Favorite Lunch"
        )

        url = reverse("api:meals:meal-unfavorite", kwargs={"pk": self.meal1.id})
        response = self.client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not FavoriteMeal.objects.filter(user=self.user, meal=self.meal1).exists()

    def test_duplicate_meal(self):
        """Test duplicating a meal."""
        url = reverse("api:meals:meal-duplicate", kwargs={"pk": self.meal1.id})
        data = {"name": "Duplicate of Lunch", "consumed_at": timezone.now().isoformat()}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Duplicate of Lunch"

        # Check that meal items were also duplicated
        new_meal = Meal.objects.get(id=response.data["id"])
        assert new_meal.meal_items.count() == self.meal1.meal_items.count()

    def test_quick_log_from_favorite(self):
        """Test quick logging from a favorite meal."""
        # Create a favorite
        favorite = FavoriteMeal.objects.create(
            user=self.user, meal=self.meal1, name="Quick Lunch"
        )

        url = reverse("api:meals:meal-quick-log")
        data = {"favorite_meal_id": favorite.id}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "Quick logged from favorite" in response.data["notes"]

        # Check that favorite usage was updated
        favorite.refresh_from_db()
        assert favorite.times_used == 1
        assert favorite.last_used is not None

    def test_meal_statistics(self):
        """Test getting meal statistics."""
        url = reverse("api:meals:meal-statistics")
        response = self.client.get(url, {"period": "week"})

        assert response.status_code == status.HTTP_200_OK
        assert "total_meals" in response.data
        assert "average_calories_per_meal" in response.data
        assert "meals_by_type" in response.data

    def test_similar_meals(self):
        """Test finding similar meals."""
        # Create another meal with same food items
        similar_meal = MealFactory(user=self.user, meal_type="lunch")
        MealItemFactory(meal=similar_meal, food_item=self.food1, quantity=200)

        url = reverse("api:meals:meal-similar", kwargs={"pk": self.meal1.id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) > 0
        assert response.data[0]["id"] == str(similar_meal.id)

    def test_meal_search(self):
        """Test searching meals."""
        url = reverse("api:meals:meal-list")
        response = self.client.get(url, {"search": "Lunch"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Lunch"

    def test_meal_filtering_by_type(self):
        """Test filtering meals by type."""
        url = reverse("api:meals:meal-list")
        response = self.client.get(url, {"meal_type": "lunch"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["meal_type"] == "lunch"

    def test_meal_date_filtering(self):
        """Test filtering meals by date range."""
        url = reverse("api:meals:meal-list")
        start_date = (timezone.now() - timedelta(hours=3)).isoformat()
        end_date = timezone.now().isoformat()

        response = self.client.get(
            url, {"start_date": start_date, "end_date": end_date}
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == str(self.meal1.id)

    def test_unauthorized_access(self):
        """Test unauthorized access is blocked."""
        self.client.force_authenticate(user=None)
        url = reverse("api:meals:meal-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_access_other_users_meal(self):
        """Test user cannot access other user's meal."""
        url = reverse("api:meals:meal-detail", kwargs={"pk": self.other_meal.id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
