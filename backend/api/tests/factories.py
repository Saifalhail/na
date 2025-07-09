"""
Model factories for testing the Nutrition AI API.
"""
import factory
from factory.django import DjangoModelFactory
from factory import fuzzy
from django.contrib.auth import get_user_model
from django.utils import timezone as django_timezone
from datetime import datetime, timedelta
import random
from decimal import Decimal

from api.models import (
    UserProfile, FoodItem, Meal, MealItem, MealAnalysis,
    NutritionalInfo, FavoriteMeal, DietaryRestriction,
    APIUsageLog, NutritionData, RecipeIngredient
)

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory for User model."""
    
    class Meta:
        model = User
        django_get_or_create = ('email',)
    
    email = factory.LazyAttribute(lambda obj: f"{obj.first_name.lower()}.{obj.last_name.lower()}@example.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True
    is_verified = True
    account_type = fuzzy.FuzzyChoice(['free', 'premium'])
    date_joined = factory.LazyFunction(django_timezone.now)
    
    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        """Set password for user."""
        if not create:
            return
        if extracted:
            obj.set_password(extracted)
        else:
            obj.set_password('testpass123')
    
    @factory.post_generation
    def groups(obj, create, extracted, **kwargs):
        """Add groups to user."""
        if not create:
            return
        if extracted:
            for group in extracted:
                obj.groups.add(group)


class UserProfileFactory(DjangoModelFactory):
    """Factory for UserProfile model."""
    
    class Meta:
        model = UserProfile
        django_get_or_create = ('user',)
    
    user = factory.SubFactory(UserFactory)
    date_of_birth = factory.Faker('date_of_birth', minimum_age=18, maximum_age=80)
    gender = fuzzy.FuzzyChoice(['M', 'F', 'O'])
    height = fuzzy.FuzzyDecimal(150, 210, precision=1)  # cm
    weight = fuzzy.FuzzyDecimal(45, 120, precision=1)  # kg
    activity_level = fuzzy.FuzzyChoice(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'])
    dietary_goal = fuzzy.FuzzyChoice(['maintain', 'lose', 'gain'])
    target_calories = fuzzy.FuzzyInteger(1200, 3500)
    target_protein = fuzzy.FuzzyInteger(50, 200)
    target_carbs = fuzzy.FuzzyInteger(100, 400)
    target_fat = fuzzy.FuzzyInteger(30, 150)
    timezone = 'UTC'
    preferred_units = 'metric'
    marketing_consent = factory.Faker('boolean')
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)


class DietaryRestrictionFactory(DjangoModelFactory):
    """Factory for DietaryRestriction model."""
    
    class Meta:
        model = DietaryRestriction
    
    name = factory.Faker('word')
    restriction_type = fuzzy.FuzzyChoice(['allergy', 'intolerance', 'preference', 'religious', 'medical'])
    description = factory.Faker('sentence')
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)
    
    @factory.post_generation
    def users(obj, create, extracted, **kwargs):
        """Add users to dietary restriction."""
        if not create:
            return
        if extracted:
            for user in extracted:
                obj.users.add(user)


class FoodItemFactory(DjangoModelFactory):
    """Factory for FoodItem model."""
    
    class Meta:
        model = FoodItem
    
    name = factory.Faker('word')
    brand = factory.Faker('company')
    barcode = factory.Faker('ean13')
    category = fuzzy.FuzzyChoice(['fruit', 'vegetable', 'meat', 'dairy', 'grain', 'beverage', 'snack', 'other'])
    
    # Nutritional info per 100g
    calories = fuzzy.FuzzyDecimal(50, 500, precision=1)
    protein = fuzzy.FuzzyDecimal(0, 30, precision=1)
    carbohydrates = fuzzy.FuzzyDecimal(0, 80, precision=1)
    fat = fuzzy.FuzzyDecimal(0, 40, precision=1)
    fiber = fuzzy.FuzzyDecimal(0, 20, precision=1)
    sugar = fuzzy.FuzzyDecimal(0, 50, precision=1)
    sodium = fuzzy.FuzzyDecimal(0, 2000, precision=1)
    
    serving_size = fuzzy.FuzzyDecimal(10, 200, precision=1)
    serving_unit = fuzzy.FuzzyChoice(['g', 'ml', 'cup', 'piece', 'slice'])
    
    is_verified = factory.Faker('boolean')
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)


class MealFactory(DjangoModelFactory):
    """Factory for Meal model."""
    
    class Meta:
        model = Meal
    
    user = factory.SubFactory(UserFactory)
    name = factory.LazyAttribute(lambda obj: f"{obj.meal_type.title()} on {obj.consumed_at.strftime('%Y-%m-%d')}")
    meal_type = fuzzy.FuzzyChoice(['breakfast', 'lunch', 'dinner', 'snack'])
    consumed_at = factory.LazyFunction(lambda: django_timezone.now() - timedelta(hours=random.randint(0, 72)))
    notes = factory.Faker('paragraph', nb_sentences=2)
    
    # Calculated totals (will be updated when items are added)
    total_calories = Decimal('0')
    total_protein = Decimal('0')
    total_carbs = Decimal('0')
    total_fat = Decimal('0')
    
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)


class MealItemFactory(DjangoModelFactory):
    """Factory for MealItem model."""
    
    class Meta:
        model = MealItem
    
    meal = factory.SubFactory(MealFactory)
    food_item = factory.SubFactory(FoodItemFactory)
    quantity = fuzzy.FuzzyDecimal(0.5, 3.0, precision=1)
    unit = 'serving'
    
    # Calculated nutritionals
    calories = factory.LazyAttribute(lambda obj: obj.food_item.calories * obj.quantity)
    protein = factory.LazyAttribute(lambda obj: obj.food_item.protein * obj.quantity)
    carbohydrates = factory.LazyAttribute(lambda obj: obj.food_item.carbohydrates * obj.quantity)
    fat = factory.LazyAttribute(lambda obj: obj.food_item.fat * obj.quantity)
    
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)


class MealAnalysisFactory(DjangoModelFactory):
    """Factory for MealAnalysis model."""
    
    class Meta:
        model = MealAnalysis
    
    meal = factory.SubFactory(MealFactory)
    image_path = factory.Faker('file_path', extension='jpg')
    ai_provider = 'gemini'
    ai_model = 'gemini-1.5-flash'
    
    analysis_result = factory.LazyFunction(
        lambda: {
            'success': True,
            'foods': [
                {
                    'name': 'Apple',
                    'quantity': 150,
                    'unit': 'g',
                    'calories': 78,
                    'protein': 0.4,
                    'carbs': 20.8,
                    'fat': 0.3
                }
            ],
            'total_calories': 78,
            'confidence': 0.92
        }
    )
    
    tokens_used = fuzzy.FuzzyInteger(100, 1000)
    processing_time_ms = fuzzy.FuzzyInteger(500, 3000)
    confidence_score = fuzzy.FuzzyDecimal(0.7, 1.0, precision=2)
    
    created_at = factory.LazyFunction(django_timezone.now)


class NutritionalInfoFactory(DjangoModelFactory):
    """Factory for NutritionalInfo model."""
    
    class Meta:
        model = NutritionalInfo
    
    meal = factory.SubFactory(MealFactory)
    
    # Macronutrients
    calories = fuzzy.FuzzyDecimal(200, 800, precision=1)
    protein = fuzzy.FuzzyDecimal(5, 50, precision=1)
    carbohydrates = fuzzy.FuzzyDecimal(20, 100, precision=1)
    fat = fuzzy.FuzzyDecimal(5, 40, precision=1)
    fiber = fuzzy.FuzzyDecimal(0, 15, precision=1)
    sugar = fuzzy.FuzzyDecimal(0, 30, precision=1)
    sodium = fuzzy.FuzzyDecimal(100, 1500, precision=1)
    
    # Vitamins (as percentage of daily value)
    vitamin_a = fuzzy.FuzzyDecimal(0, 100, precision=1)
    vitamin_c = fuzzy.FuzzyDecimal(0, 200, precision=1)
    vitamin_d = fuzzy.FuzzyDecimal(0, 100, precision=1)
    vitamin_e = fuzzy.FuzzyDecimal(0, 100, precision=1)
    vitamin_k = fuzzy.FuzzyDecimal(0, 100, precision=1)
    
    # Minerals (as percentage of daily value)
    calcium = fuzzy.FuzzyDecimal(0, 100, precision=1)
    iron = fuzzy.FuzzyDecimal(0, 100, precision=1)
    magnesium = fuzzy.FuzzyDecimal(0, 100, precision=1)
    potassium = fuzzy.FuzzyDecimal(0, 100, precision=1)
    zinc = fuzzy.FuzzyDecimal(0, 100, precision=1)
    
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)


class FavoriteMealFactory(DjangoModelFactory):
    """Factory for FavoriteMeal model."""
    
    class Meta:
        model = FavoriteMeal
    
    user = factory.SubFactory(UserFactory)
    meal = factory.SubFactory(MealFactory)
    custom_name = factory.Faker('sentence', nb_words=3)
    notes = factory.Faker('paragraph', nb_sentences=1)
    quick_add_enabled = factory.Faker('boolean')
    created_at = factory.LazyFunction(django_timezone.now)


class APIUsageLogFactory(DjangoModelFactory):
    """Factory for APIUsageLog model."""
    
    class Meta:
        model = APIUsageLog
    
    user = factory.SubFactory(UserFactory)
    endpoint = factory.Faker('uri_path')
    method = fuzzy.FuzzyChoice(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    ip_address = factory.Faker('ipv4')
    user_agent = factory.Faker('user_agent')
    request_body_size = fuzzy.FuzzyInteger(0, 10000)
    response_status_code = fuzzy.FuzzyChoice([200, 201, 204, 400, 401, 403, 404, 500])
    response_time_ms = fuzzy.FuzzyInteger(10, 1000)
    ai_tokens_used = fuzzy.FuzzyInteger(0, 1000)
    error_message = factory.LazyAttribute(
        lambda obj: factory.Faker('sentence').generate() if obj.response_status_code >= 400 else None
    )
    correlation_id = factory.Faker('uuid4')
    created_at = factory.LazyFunction(django_timezone.now)


# Legacy model factories (for backwards compatibility)

class NutritionDataFactory(DjangoModelFactory):
    """Factory for NutritionData model (legacy)."""
    
    class Meta:
        model = NutritionData
    
    food_name = factory.Faker('word')
    brand = factory.Faker('company')
    portion_size = factory.Faker('sentence', nb_words=3)
    calories = fuzzy.FuzzyInteger(50, 500)
    protein = fuzzy.FuzzyDecimal(0, 50, precision=2)
    total_fat = fuzzy.FuzzyDecimal(0, 30, precision=2)
    saturated_fat = fuzzy.FuzzyDecimal(0, 10, precision=2)
    carbohydrates = fuzzy.FuzzyDecimal(0, 100, precision=2)
    fiber = fuzzy.FuzzyDecimal(0, 20, precision=2)
    sugar = fuzzy.FuzzyDecimal(0, 50, precision=2)
    sodium = fuzzy.FuzzyDecimal(0, 2000, precision=2)
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)


class RecipeIngredientFactory(DjangoModelFactory):
    """Factory for RecipeIngredient model (legacy)."""
    
    class Meta:
        model = RecipeIngredient
    
    nutrition_data = factory.SubFactory(NutritionDataFactory)
    name = factory.Faker('word')
    quantity = fuzzy.FuzzyDecimal(0.1, 5.0, precision=2)
    unit = fuzzy.FuzzyChoice(['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece'])
    calories = fuzzy.FuzzyDecimal(10, 200, precision=2)
    protein = fuzzy.FuzzyDecimal(0, 20, precision=2)
    fat = fuzzy.FuzzyDecimal(0, 15, precision=2)
    carbs = fuzzy.FuzzyDecimal(0, 40, precision=2)
    created_at = factory.LazyFunction(django_timezone.now)
    updated_at = factory.LazyFunction(django_timezone.now)