import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from api.models import (APIUsageLog, FavoriteMeal, FoodItem, Meal,
                        NutritionalInfo, NutritionData, RecipeIngredient)

User = get_user_model()


class APIUsageLogModelTest(TestCase):
    """Test cases for the APIUsageLog model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def test_create_api_usage_log(self):
        """Test creating an API usage log."""
        log = APIUsageLog.objects.create(
            user=self.user,
            endpoint="/api/v1/analysis/image/",
            method="POST",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 ...",
            request_body_size=2048,
            response_status_code=200,
            response_time_ms=1500,
            ai_tokens_used=350,
        )

        self.assertEqual(log.user, self.user)
        self.assertEqual(log.endpoint, "/api/v1/analysis/image/")
        self.assertEqual(log.method, "POST")
        self.assertEqual(log.ip_address, "192.168.1.100")
        self.assertEqual(log.response_status_code, 200)
        self.assertEqual(log.response_time_ms, 1500)
        self.assertEqual(log.ai_tokens_used, 350)

    def test_anonymous_user_log(self):
        """Test creating log for anonymous user."""
        log = APIUsageLog.objects.create(
            user=None,  # Anonymous
            endpoint="/api/v1/auth/register/",
            method="POST",
            ip_address="192.168.1.101",
            response_status_code=201,
            response_time_ms=300,
        )

        self.assertIsNone(log.user)
        self.assertEqual(log.endpoint, "/api/v1/auth/register/")

    def test_error_logging(self):
        """Test logging API errors."""
        log = APIUsageLog.objects.create(
            user=self.user,
            endpoint="/api/v1/meals/",
            method="POST",
            ip_address="192.168.1.100",
            response_status_code=400,
            response_time_ms=100,
            error_message='Invalid meal data: missing required field "name"',
        )

        self.assertEqual(log.response_status_code, 400)
        self.assertEqual(
            log.error_message, 'Invalid meal data: missing required field "name"'
        )

    def test_string_representation(self):
        """Test string representation."""
        log = APIUsageLog.objects.create(
            user=self.user,
            endpoint="/api/v1/meals/",
            method="GET",
            ip_address="192.168.1.100",
            response_status_code=200,
            response_time_ms=50,
        )

        expected = "test@example.com - GET /api/v1/meals/ - 200"
        self.assertEqual(str(log), expected)

        # Test anonymous user
        log.user = None
        log.save()
        expected = "Anonymous - GET /api/v1/meals/ - 200"
        self.assertEqual(str(log), expected)

    def test_get_user_usage_count(self):
        """Test get_user_usage_count class method."""
        # Create multiple logs
        now = timezone.now()

        # Recent logs (within 1 hour)
        for i in range(3):
            APIUsageLog.objects.create(
                user=self.user,
                endpoint="/api/v1/analysis/image/",
                method="POST",
                ip_address="192.168.1.100",
                response_status_code=200,
                response_time_ms=1000,
                created_at=now - timedelta(minutes=30),
            )

        # Old log (2 hours ago)
        old_log = APIUsageLog.objects.create(
            user=self.user,
            endpoint="/api/v1/analysis/image/",
            method="POST",
            ip_address="192.168.1.100",
            response_status_code=200,
            response_time_ms=1000,
        )
        old_log.created_at = now - timedelta(hours=2)
        old_log.save()

        # Test count within 1 hour
        count = APIUsageLog.get_user_usage_count(self.user, hours=1)
        self.assertEqual(count, 3)

        # Test count within 3 hours
        count = APIUsageLog.get_user_usage_count(self.user, hours=3)
        self.assertEqual(count, 4)

        # Test with specific endpoint
        count = APIUsageLog.get_user_usage_count(
            self.user, endpoint="/api/v1/analysis/image/", hours=1
        )
        self.assertEqual(count, 3)

    def test_get_ip_usage_count(self):
        """Test get_ip_usage_count class method."""
        ip_address = "192.168.1.100"
        now = timezone.now()

        # Create logs from same IP
        for i in range(5):
            APIUsageLog.objects.create(
                user=None,
                endpoint="/api/v1/auth/register/",
                method="POST",
                ip_address=ip_address,
                response_status_code=201,
                response_time_ms=300,
                created_at=now - timedelta(minutes=15),
            )

        # Different IP
        APIUsageLog.objects.create(
            user=None,
            endpoint="/api/v1/auth/register/",
            method="POST",
            ip_address="192.168.1.101",
            response_status_code=201,
            response_time_ms=300,
        )

        count = APIUsageLog.get_ip_usage_count(ip_address, hours=1)
        self.assertEqual(count, 5)

    def test_model_ordering(self):
        """Test default ordering by created_at descending."""
        logs = []
        for i in range(3):
            log = APIUsageLog.objects.create(
                endpoint=f"/api/v1/test/{i}/",
                method="GET",
                ip_address="192.168.1.100",
                response_status_code=200,
                response_time_ms=50,
            )
            logs.append(log)

        ordered_logs = list(APIUsageLog.objects.all())
        # Should be ordered newest first
        self.assertEqual(ordered_logs[0], logs[2])
        self.assertEqual(ordered_logs[1], logs[1])
        self.assertEqual(ordered_logs[2], logs[0])

    def test_ipv6_address(self):
        """Test IPv6 address support."""
        log = APIUsageLog.objects.create(
            endpoint="/api/v1/meals/",
            method="GET",
            ip_address="2001:0db8:85a3:0000:0000:8a2e:0370:7334",
            response_status_code=200,
            response_time_ms=50,
        )

        self.assertEqual(log.ip_address, "2001:0db8:85a3:0000:0000:8a2e:0370:7334")


class NutritionalInfoModelTest(TestCase):
    """Test cases for the NutritionalInfo model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        self.meal = Meal.objects.create(
            user=self.user, name="Breakfast", consumed_at=datetime.now()
        )

        self.food_item = FoodItem.objects.create(
            name="Apple",
            calories=Decimal("52.00"),
            protein=Decimal("0.30"),
            carbohydrates=Decimal("14.00"),
            fat=Decimal("0.20"),
            source="database",
        )

    def test_create_nutritional_info_for_meal(self):
        """Test creating nutritional info for a meal."""
        nutrition = NutritionalInfo.objects.create(
            meal=self.meal,
            vitamin_c=Decimal("8.40"),
            vitamin_a_iu=Decimal("54.00"),
            calcium=Decimal("6.00"),
            iron=Decimal("0.12"),
            potassium=Decimal("107.00"),
            source="USDA Database",
        )

        self.assertEqual(nutrition.meal, self.meal)
        self.assertEqual(nutrition.vitamin_c, Decimal("8.40"))
        self.assertEqual(nutrition.calcium, Decimal("6.00"))
        self.assertEqual(nutrition.source, "USDA Database")

    def test_create_nutritional_info_for_food(self):
        """Test creating nutritional info for a food item."""
        nutrition = NutritionalInfo.objects.create(
            food_item=self.food_item,
            vitamin_c=Decimal("8.40"),
            vitamin_a_iu=Decimal("54.00"),
            calcium=Decimal("6.00"),
            iron=Decimal("0.12"),
            potassium=Decimal("107.00"),
        )

        self.assertEqual(nutrition.food_item, self.food_item)
        self.assertEqual(nutrition.vitamin_c, Decimal("8.40"))

    def test_one_to_one_relationships(self):
        """Test one-to-one relationships."""
        # For meal
        meal_nutrition = NutritionalInfo.objects.create(
            meal=self.meal, vitamin_c=Decimal("10.00")
        )
        self.assertEqual(self.meal.detailed_nutrition, meal_nutrition)

        # For food item
        food_nutrition = NutritionalInfo.objects.create(
            food_item=self.food_item, vitamin_c=Decimal("8.40")
        )
        self.assertEqual(self.food_item.detailed_nutrition, food_nutrition)

    def test_comprehensive_nutrients(self):
        """Test all nutrient fields."""
        nutrition = NutritionalInfo.objects.create(
            meal=self.meal,
            # Vitamins
            vitamin_a_iu=Decimal("500.00"),
            vitamin_a_rae=Decimal("15.00"),
            vitamin_c=Decimal("60.00"),
            vitamin_d=Decimal("2.50"),
            vitamin_e=Decimal("1.50"),
            vitamin_k=Decimal("25.00"),
            # B Vitamins
            thiamin=Decimal("0.150"),
            riboflavin=Decimal("0.170"),
            niacin=Decimal("0.60"),
            vitamin_b6=Decimal("0.100"),
            folate=Decimal("40.00"),
            vitamin_b12=Decimal("0.00"),
            # Minerals
            calcium=Decimal("120.00"),
            iron=Decimal("1.80"),
            magnesium=Decimal("32.00"),
            phosphorus=Decimal("35.00"),
            potassium=Decimal("420.00"),
            sodium=Decimal("5.00"),
            zinc=Decimal("0.30"),
            # Other nutrients
            omega_3=Decimal("0.050"),
            omega_6=Decimal("0.100"),
            water=Decimal("86.00"),
            caffeine=Decimal("0.00"),
            alcohol=Decimal("0.00"),
        )

        # Test all values saved correctly
        self.assertEqual(nutrition.vitamin_a_iu, Decimal("500.00"))
        self.assertEqual(nutrition.thiamin, Decimal("0.150"))
        self.assertEqual(nutrition.calcium, Decimal("120.00"))
        self.assertEqual(nutrition.omega_3, Decimal("0.050"))
        self.assertEqual(nutrition.water, Decimal("86.00"))

    def test_optional_fields(self):
        """Test all fields are optional."""
        nutrition = NutritionalInfo.objects.create(meal=self.meal)

        # All nutrient fields should be None
        self.assertIsNone(nutrition.vitamin_a_iu)
        self.assertIsNone(nutrition.vitamin_c)
        self.assertIsNone(nutrition.calcium)
        self.assertIsNone(nutrition.omega_3)
        self.assertEqual(nutrition.source, "")  # blank default

    def test_string_representation(self):
        """Test string representation."""
        meal_nutrition = NutritionalInfo.objects.create(
            meal=self.meal, vitamin_c=Decimal("10.00")
        )
        self.assertEqual(str(meal_nutrition), f"Nutritional info for meal: {self.meal}")

        food_nutrition = NutritionalInfo.objects.create(
            food_item=self.food_item, vitamin_c=Decimal("8.40")
        )
        self.assertEqual(
            str(food_nutrition), f"Nutritional info for food: {self.food_item}"
        )

        # Neither meal nor food
        empty_nutrition = NutritionalInfo.objects.create()
        self.assertEqual(str(empty_nutrition), "Nutritional info")

    def test_last_updated_auto_now(self):
        """Test last_updated field auto updates."""
        import time

        nutrition = NutritionalInfo.objects.create(
            meal=self.meal, vitamin_c=Decimal("10.00")
        )

        original_updated = nutrition.last_updated

        # Wait a bit to ensure time difference
        time.sleep(0.1)

        # Update a field
        nutrition.vitamin_c = Decimal("12.00")
        nutrition.save()

        nutrition.refresh_from_db()
        self.assertGreater(nutrition.last_updated, original_updated)


class FavoriteMealModelTest(TestCase):
    """Test cases for the FavoriteMeal model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

        self.meal = Meal.objects.create(
            user=self.user,
            name="Healthy Breakfast",
            meal_type="breakfast",
            consumed_at=datetime.now(),
        )

    def test_create_favorite_meal(self):
        """Test creating a favorite meal."""
        favorite = FavoriteMeal.objects.create(
            user=self.user, meal=self.meal, name="My Go-To Breakfast"
        )

        self.assertEqual(favorite.user, self.user)
        self.assertEqual(favorite.meal, self.meal)
        self.assertEqual(favorite.name, "My Go-To Breakfast")
        self.assertFalse(favorite.is_template)  # default
        self.assertEqual(favorite.quick_add_order, 0)  # default
        self.assertEqual(favorite.times_used, 0)  # default
        self.assertIsNone(favorite.last_used)

    def test_unique_constraint(self):
        """Test unique constraint on user + meal."""
        FavoriteMeal.objects.create(user=self.user, meal=self.meal)

        # Try to create duplicate favorite
        with self.assertRaises(IntegrityError):
            FavoriteMeal.objects.create(
                user=self.user, meal=self.meal, name="Different Name"
            )

    def test_template_functionality(self):
        """Test template functionality."""
        favorite = FavoriteMeal.objects.create(
            user=self.user, meal=self.meal, is_template=True, name="Breakfast Template"
        )

        self.assertTrue(favorite.is_template)

    def test_quick_add_ordering(self):
        """Test quick add order functionality."""
        favorites = []
        for i in range(3):
            meal = Meal.objects.create(
                user=self.user, name=f"Meal {i}", consumed_at=datetime.now()
            )
            favorite = FavoriteMeal.objects.create(
                user=self.user, meal=meal, quick_add_order=i
            )
            favorites.append(favorite)

        ordered_favorites = list(FavoriteMeal.objects.all())
        self.assertEqual(ordered_favorites[0].quick_add_order, 0)
        self.assertEqual(ordered_favorites[1].quick_add_order, 1)
        self.assertEqual(ordered_favorites[2].quick_add_order, 2)

    def test_usage_tracking(self):
        """Test usage tracking fields."""
        favorite = FavoriteMeal.objects.create(user=self.user, meal=self.meal)

        # Simulate using the favorite
        favorite.times_used = 5
        favorite.last_used = timezone.now()
        favorite.save()

        self.assertEqual(favorite.times_used, 5)
        self.assertIsNotNone(favorite.last_used)

    def test_string_representation(self):
        """Test string representation."""
        # With custom name
        favorite = FavoriteMeal.objects.create(
            user=self.user, meal=self.meal, name="Quick Breakfast"
        )
        self.assertEqual(str(favorite), "Quick Breakfast")

        # Without custom name
        favorite2 = FavoriteMeal.objects.create(
            user=self.user,
            meal=Meal.objects.create(
                user=self.user, name="Lunch", consumed_at=datetime.now()
            ),
        )
        expected = f"test@example.com's favorite: Lunch"
        self.assertEqual(str(favorite2), expected)

    def test_meal_favorited_by_relationship(self):
        """Test reverse relationship from meal."""
        favorite = FavoriteMeal.objects.create(user=self.user, meal=self.meal)

        self.assertEqual(self.meal.favorited_by.count(), 1)
        self.assertEqual(self.meal.favorited_by.first(), favorite)

    def test_user_favorite_meals_relationship(self):
        """Test user can have multiple favorite meals."""
        meals = []
        for i in range(3):
            meal = Meal.objects.create(
                user=self.user, name=f"Meal {i}", consumed_at=datetime.now()
            )
            FavoriteMeal.objects.create(user=self.user, meal=meal)
            meals.append(meal)

        self.assertEqual(self.user.favorite_meals.count(), 3)


class NutritionDataModelTest(TestCase):
    """Test cases for the legacy NutritionData model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def test_create_nutrition_data(self):
        """Test creating nutrition data."""
        # Create a simple test image
        from django.core.files.uploadedfile import SimpleUploadedFile

        image = SimpleUploadedFile(
            name="test_food.jpg",
            content=b"fake image content",
            content_type="image/jpeg",
        )

        nutrition = NutritionData.objects.create(
            user=self.user,
            image=image,
            gemini_response={"foods": ["apple", "banana"]},
            calories=Decimal("150.00"),
            protein=Decimal("2.50"),
            carbohydrates=Decimal("35.00"),
            fat=Decimal("0.50"),
            fiber=Decimal("5.00"),
            sugar=Decimal("25.00"),
            sodium=Decimal("2.00"),
            serving_size="1 medium apple, 1 small banana",
            servings_per_recipe=Decimal("1.00"),
        )

        self.assertEqual(nutrition.user, self.user)
        self.assertEqual(nutrition.calories, Decimal("150.00"))
        self.assertEqual(nutrition.serving_size, "1 medium apple, 1 small banana")
        self.assertTrue(nutrition.image)

    def test_recalculate_nutrition(self):
        """Test recalculate_nutrition method."""
        nutrition = NutritionData.objects.create(
            calories=Decimal("200.00"),
            protein=Decimal("10.00"),
            carbohydrates=Decimal("30.00"),
            fat=Decimal("5.00"),
            servings_per_recipe=Decimal("2.00"),
        )

        # Recalculate for 3 servings
        recalculated = nutrition.recalculate_nutrition(3)

        # Values should be multiplied by 3/2 = 1.5
        self.assertEqual(recalculated["calories"], 300.0)  # 200 * 1.5
        self.assertEqual(recalculated["protein"], 15.0)  # 10 * 1.5
        self.assertEqual(recalculated["carbohydrates"], 45.0)  # 30 * 1.5
        self.assertEqual(recalculated["fat"], 7.5)  # 5 * 1.5
        self.assertEqual(recalculated["servings"], 3)

    def test_string_representation(self):
        """Test string representation."""
        nutrition = NutritionData.objects.create()
        expected = f"Nutrition Data {nutrition.id} - {nutrition.created_at}"
        self.assertEqual(str(nutrition), expected)

    def test_optional_user(self):
        """Test user field is optional (legacy support)."""
        nutrition = NutritionData.objects.create(calories=Decimal("100.00"))

        self.assertIsNone(nutrition.user)

    def test_default_values(self):
        """Test default values."""
        nutrition = NutritionData.objects.create()

        self.assertEqual(nutrition.gemini_response, {})
        self.assertEqual(nutrition.servings_per_recipe, Decimal("1"))
        self.assertEqual(nutrition.serving_size, "")

    def test_model_ordering(self):
        """Test default ordering by created_at descending."""
        from datetime import datetime, timedelta

        from django.utils import timezone

        nutritions = []
        base_time = timezone.now()

        for i in range(3):
            # Create with specific timestamps to ensure ordering
            nutrition = NutritionData.objects.create(
                calories=Decimal(f"{(i+1)*100}.00")
            )
            # Manually set created_at to ensure different timestamps
            nutrition.created_at = base_time + timedelta(seconds=i)
            nutrition.save()
            nutritions.append(nutrition)

        ordered = list(NutritionData.objects.all().order_by("-created_at"))
        # Should be ordered newest first
        self.assertEqual(ordered[0].calories, nutritions[2].calories)
        self.assertEqual(ordered[1].calories, nutritions[1].calories)
        self.assertEqual(ordered[2].calories, nutritions[0].calories)


class RecipeIngredientModelTest(TestCase):
    """Test cases for the legacy RecipeIngredient model."""

    def setUp(self):
        """Set up test data."""
        self.nutrition_data = NutritionData.objects.create(
            calories=Decimal("500.00"),
            protein=Decimal("25.00"),
            carbohydrates=Decimal("60.00"),
            fat=Decimal("15.00"),
        )

    def test_create_recipe_ingredient(self):
        """Test creating a recipe ingredient."""
        ingredient = RecipeIngredient.objects.create(
            nutrition_data=self.nutrition_data,
            name="Chicken Breast",
            quantity=Decimal("200.000"),
            unit="g",
            calories=Decimal("330.00"),
            protein=Decimal("62.00"),
            carbohydrates=Decimal("0.00"),
            fat=Decimal("7.20"),
        )

        self.assertEqual(ingredient.nutrition_data, self.nutrition_data)
        self.assertEqual(ingredient.name, "Chicken Breast")
        self.assertEqual(ingredient.quantity, Decimal("200.000"))
        self.assertEqual(ingredient.unit, "g")
        self.assertEqual(ingredient.calories, Decimal("330.00"))

    def test_quantity_validation(self):
        """Test quantity must be non-negative."""
        ingredient = RecipeIngredient(
            nutrition_data=self.nutrition_data,
            name="Test",
            quantity=Decimal("-10.00"),
            unit="g",
        )

        with self.assertRaises(ValidationError):
            ingredient.full_clean()

    def test_string_representation(self):
        """Test string representation."""
        ingredient = RecipeIngredient.objects.create(
            nutrition_data=self.nutrition_data,
            name="Brown Rice",
            quantity=Decimal("150.00"),
            unit="g",
        )

        self.assertEqual(str(ingredient), "150.00 g Brown Rice")

    def test_nutrition_data_relationship(self):
        """Test relationship with NutritionData."""
        ingredients = []
        for name in ["Chicken", "Rice", "Vegetables"]:
            ingredient = RecipeIngredient.objects.create(
                nutrition_data=self.nutrition_data,
                name=name,
                quantity=Decimal("100.00"),
                unit="g",
            )
            ingredients.append(ingredient)

        self.assertEqual(self.nutrition_data.ingredients.count(), 3)
        self.assertEqual(list(self.nutrition_data.ingredients.all()), ingredients)

    def test_optional_nutrition_fields(self):
        """Test nutrition fields are optional."""
        ingredient = RecipeIngredient.objects.create(
            nutrition_data=self.nutrition_data,
            name="Salt",
            quantity=Decimal("5.00"),
            unit="g",
        )

        self.assertIsNone(ingredient.calories)
        self.assertIsNone(ingredient.protein)
        self.assertIsNone(ingredient.carbohydrates)
        self.assertIsNone(ingredient.fat)

    def test_cascade_delete(self):
        """Test ingredients are deleted when nutrition data is deleted."""
        RecipeIngredient.objects.create(
            nutrition_data=self.nutrition_data,
            name="Test Ingredient",
            quantity=Decimal("100.00"),
            unit="g",
        )

        nutrition_id = self.nutrition_data.id
        self.nutrition_data.delete()

        # Ingredient should be deleted
        self.assertEqual(
            RecipeIngredient.objects.filter(nutrition_data_id=nutrition_id).count(), 0
        )
