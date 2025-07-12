from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import datetime
from decimal import Decimal
import uuid

from api.models import FoodItem, Meal, MealItem, MealAnalysis

User = get_user_model()


class FoodItemModelTest(TestCase):
    """Test cases for the FoodItem model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.valid_food_data = {
            'name': 'Apple',
            'calories': Decimal('52.00'),
            'protein': Decimal('0.30'),
            'carbohydrates': Decimal('14.00'),
            'fat': Decimal('0.20'),
            'fiber': Decimal('2.40'),
            'sugar': Decimal('10.40'),
            'sodium': Decimal('1.00'),
            'source': 'database'
        }
    
    def test_create_food_item(self):
        """Test creating a food item."""
        food = FoodItem.objects.create(**self.valid_food_data)
        
        self.assertEqual(food.name, 'Apple')
        self.assertEqual(food.calories, Decimal('52.00'))
        self.assertEqual(food.protein, Decimal('0.30'))
        self.assertEqual(food.carbohydrates, Decimal('14.00'))
        self.assertEqual(food.fat, Decimal('0.20'))
        self.assertIsInstance(food.id, uuid.UUID)
        self.assertFalse(food.is_verified)  # default
        self.assertTrue(food.is_public)  # default
    
    def test_create_food_with_brand(self):
        """Test creating a food item with brand."""
        food_data = self.valid_food_data.copy()
        food_data['brand'] = 'Organic Farms'
        food = FoodItem.objects.create(**food_data)
        
        self.assertEqual(food.brand, 'Organic Farms')
        self.assertEqual(str(food), 'Apple (Organic Farms)')
    
    def test_create_food_with_barcode(self):
        """Test creating a food item with barcode."""
        food_data = self.valid_food_data.copy()
        food_data['barcode'] = '1234567890123'
        food = FoodItem.objects.create(**food_data)
        
        self.assertEqual(food.barcode, '1234567890123')
    
    def test_optional_nutrients(self):
        """Test optional nutrient fields."""
        food = FoodItem.objects.create(
            name='Basic Food',
            calories=Decimal('100.00'),
            protein=Decimal('5.00'),
            carbohydrates=Decimal('20.00'),
            fat=Decimal('2.00'),
            source='manual'
        )
        
        # Optional nutrients should be 0 or None
        self.assertEqual(food.fiber, Decimal('0'))
        self.assertEqual(food.sugar, Decimal('0'))
        self.assertEqual(food.sodium, Decimal('0'))
        self.assertIsNone(food.saturated_fat)
        self.assertIsNone(food.trans_fat)
        self.assertIsNone(food.cholesterol)
        self.assertIsNone(food.potassium)
        self.assertIsNone(food.vitamin_a)
        self.assertIsNone(food.vitamin_c)
        self.assertIsNone(food.calcium)
        self.assertIsNone(food.iron)
    
    def test_source_choices(self):
        """Test source field choices."""
        food = FoodItem.objects.create(**self.valid_food_data)
        
        # Test valid choices
        for source, _ in FoodItem.SOURCE_CHOICES:
            food.source = source
            food.full_clean()  # Should not raise
    
    def test_created_by_user(self):
        """Test food item created by user."""
        food_data = self.valid_food_data.copy()
        food_data['created_by'] = self.user
        food = FoodItem.objects.create(**food_data)
        
        self.assertEqual(food.created_by, self.user)
        self.assertEqual(self.user.created_food_items.count(), 1)
        self.assertEqual(self.user.created_food_items.first(), food)
    
    def test_string_representation(self):
        """Test string representation."""
        food = FoodItem.objects.create(**self.valid_food_data)
        self.assertEqual(str(food), 'Apple')
        
        # With brand
        food.brand = 'Test Brand'
        food.save()
        self.assertEqual(str(food), 'Apple (Test Brand)')
    
    def test_model_ordering(self):
        """Test default ordering by name."""
        foods = []
        for name in ['Banana', 'Apple', 'Carrot']:
            food_data = self.valid_food_data.copy()
            food_data['name'] = name
            foods.append(FoodItem.objects.create(**food_data))
        
        ordered_foods = list(FoodItem.objects.all())
        self.assertEqual(ordered_foods[0].name, 'Apple')
        self.assertEqual(ordered_foods[1].name, 'Banana')
        self.assertEqual(ordered_foods[2].name, 'Carrot')
    
    def test_external_id_field(self):
        """Test external_id field for external database references."""
        food_data = self.valid_food_data.copy()
        food_data['external_id'] = 'USDA_12345'
        food_data['source'] = 'usda'
        food = FoodItem.objects.create(**food_data)
        
        self.assertEqual(food.external_id, 'USDA_12345')
    
    def test_public_private_foods(self):
        """Test public/private food items."""
        # Create public food
        public_food = FoodItem.objects.create(**self.valid_food_data)
        self.assertTrue(public_food.is_public)
        
        # Create private food
        private_data = self.valid_food_data.copy()
        private_data['name'] = 'Private Recipe'
        private_data['is_public'] = False
        private_data['created_by'] = self.user
        private_food = FoodItem.objects.create(**private_data)
        
        self.assertFalse(private_food.is_public)
        self.assertEqual(private_food.created_by, self.user)


class MealModelTest(TestCase):
    """Test cases for the Meal model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.food_item = FoodItem.objects.create(
            name='Apple',
            calories=Decimal('52.00'),
            protein=Decimal('0.30'),
            carbohydrates=Decimal('14.00'),
            fat=Decimal('0.20'),
            fiber=Decimal('2.40'),
            sugar=Decimal('10.40'),
            sodium=Decimal('1.00'),
            source='database'
        )
    
    def test_create_meal(self):
        """Test creating a meal."""
        meal = Meal.objects.create(
            user=self.user,
            name='Breakfast',
            meal_type='breakfast',
            consumed_at=datetime.now()
        )
        
        self.assertEqual(meal.user, self.user)
        self.assertEqual(meal.name, 'Breakfast')
        self.assertEqual(meal.meal_type, 'breakfast')
        self.assertIsInstance(meal.id, uuid.UUID)
        self.assertEqual(meal.notes, '')  # default
        self.assertEqual(meal.location_name, '')  # default
    
    def test_meal_type_choices(self):
        """Test meal type field choices."""
        meal = Meal.objects.create(
            user=self.user,
            name='Test Meal',
            consumed_at=datetime.now()
        )
        
        # Test valid choices
        for meal_type, _ in Meal.MEAL_TYPE_CHOICES:
            meal.meal_type = meal_type
            meal.full_clean()  # Should not raise
    
    def test_meal_with_location(self):
        """Test creating meal with location data."""
        meal = Meal.objects.create(
            user=self.user,
            name='Lunch at Restaurant',
            meal_type='lunch',
            consumed_at=datetime.now(),
            location_name='Healthy Eats Restaurant',
            latitude=Decimal('40.7128'),
            longitude=Decimal('-74.0060')
        )
        
        self.assertEqual(meal.location_name, 'Healthy Eats Restaurant')
        self.assertEqual(meal.latitude, Decimal('40.7128'))
        self.assertEqual(meal.longitude, Decimal('-74.0060'))
    
    def test_meal_with_image(self):
        """Test creating meal with image."""
        # Create a simple test image
        image = SimpleUploadedFile(
            name='test_meal.jpg',
            content=b'fake image content',
            content_type='image/jpeg'
        )
        
        meal = Meal.objects.create(
            user=self.user,
            name='Dinner',
            meal_type='dinner',
            consumed_at=datetime.now(),
            image=image
        )
        
        self.assertTrue(meal.image)
        self.assertIn('meal_images/', meal.image.name)
    
    def test_string_representation(self):
        """Test string representation."""
        consumed_time = datetime(2024, 1, 15, 12, 30, 0)
        meal = Meal.objects.create(
            user=self.user,
            name='Lunch',
            consumed_at=consumed_time
        )
        
        expected = "Lunch - 2024-01-15 12:30"
        self.assertEqual(str(meal), expected)
    
    def test_total_calories_property(self):
        """Test total_calories property calculation."""
        meal = Meal.objects.create(
            user=self.user,
            name='Test Meal',
            consumed_at=datetime.now()
        )
        
        # Add meal items
        MealItem.objects.create(
            meal=meal,
            food_item=self.food_item,
            quantity=Decimal('150'),  # 150g
            unit='g',
            calories=Decimal('78.00')  # 52 * 1.5
        )
        
        # Create another food item
        banana = FoodItem.objects.create(
            name='Banana',
            calories=Decimal('89.00'),
            protein=Decimal('1.10'),
            carbohydrates=Decimal('23.00'),
            fat=Decimal('0.30'),
            source='database'
        )
        
        MealItem.objects.create(
            meal=meal,
            food_item=banana,
            quantity=Decimal('120'),  # 120g
            unit='g',
            calories=Decimal('106.80')  # 89 * 1.2
        )
        
        # Test total calories
        self.assertEqual(meal.total_calories, Decimal('184.80'))
    
    def test_total_macros_property(self):
        """Test total_macros property calculation."""
        meal = Meal.objects.create(
            user=self.user,
            name='Test Meal',
            consumed_at=datetime.now()
        )
        
        # Add meal item (nutritional values will be calculated automatically)
        MealItem.objects.create(
            meal=meal,
            food_item=self.food_item,
            quantity=Decimal('200'),  # 200g
            unit='g'
        )
        
        macros = meal.total_macros
        self.assertEqual(macros['protein'], Decimal('0.60'))
        self.assertEqual(macros['carbohydrates'], Decimal('28.00'))
        self.assertEqual(macros['fat'], Decimal('0.40'))
        self.assertEqual(macros['fiber'], Decimal('4.80'))
        self.assertEqual(macros['sugar'], Decimal('20.80'))
        self.assertEqual(macros['sodium'], Decimal('2.00'))
    
    def test_meal_ordering(self):
        """Test default ordering by consumed_at descending."""
        # Create meals at different times
        meal1 = Meal.objects.create(
            user=self.user,
            name='Breakfast',
            consumed_at=datetime(2024, 1, 1, 8, 0)
        )
        meal2 = Meal.objects.create(
            user=self.user,
            name='Lunch',
            consumed_at=datetime(2024, 1, 1, 12, 0)
        )
        meal3 = Meal.objects.create(
            user=self.user,
            name='Dinner',
            consumed_at=datetime(2024, 1, 1, 18, 0)
        )
        
        meals = list(Meal.objects.all())
        # Should be ordered newest first
        self.assertEqual(meals[0], meal3)  # Dinner
        self.assertEqual(meals[1], meal2)  # Lunch
        self.assertEqual(meals[2], meal1)  # Breakfast
    
    def test_user_meals_relationship(self):
        """Test user can have multiple meals."""
        meals = []
        for i in range(3):
            meal = Meal.objects.create(
                user=self.user,
                name=f'Meal {i+1}',
                consumed_at=datetime.now()
            )
            meals.append(meal)
        
        self.assertEqual(self.user.meals.count(), 3)
        # Meals are ordered by -consumed_at (most recent first)
        self.assertEqual(list(self.user.meals.all()), list(reversed(meals)))


class MealItemModelTest(TestCase):
    """Test cases for the MealItem model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.meal = Meal.objects.create(
            user=self.user,
            name='Lunch',
            consumed_at=datetime.now()
        )
        
        self.food_item = FoodItem.objects.create(
            name='Apple',
            calories=Decimal('52.00'),
            protein=Decimal('0.30'),
            carbohydrates=Decimal('14.00'),
            fat=Decimal('0.20'),
            fiber=Decimal('2.40'),
            sugar=Decimal('10.40'),
            sodium=Decimal('1.00'),
            source='database'
        )
    
    def test_create_meal_item(self):
        """Test creating a meal item."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('150.000'),
            unit='g'
        )
        
        self.assertEqual(meal_item.meal, self.meal)
        self.assertEqual(meal_item.food_item, self.food_item)
        self.assertEqual(meal_item.quantity, Decimal('150.000'))
        self.assertEqual(meal_item.unit, 'g')
    
    def test_nutritional_calculation_on_save(self):
        """Test nutritional values are calculated on save."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('150'),  # 150g
            unit='g'
        )
        
        # Values should be calculated as food_value * (quantity/100)
        factor = Decimal('1.5')  # 150/100
        self.assertEqual(meal_item.calories, Decimal('52.00') * factor)
        self.assertEqual(meal_item.protein, Decimal('0.30') * factor)
        self.assertEqual(meal_item.carbohydrates, Decimal('14.00') * factor)
        self.assertEqual(meal_item.fat, Decimal('0.20') * factor)
        self.assertEqual(meal_item.fiber, Decimal('2.40') * factor)
        self.assertEqual(meal_item.sugar, Decimal('10.40') * factor)
        self.assertEqual(meal_item.sodium, Decimal('1.00') * factor)
    
    def test_unit_conversion(self):
        """Test unit conversion in _convert_to_grams method."""
        # Test various units
        units_and_quantities = [
            ('kg', Decimal('0.5'), Decimal('500')),  # 0.5 kg = 500g
            ('mg', Decimal('5000'), Decimal('5')),   # 5000 mg = 5g
            ('oz', Decimal('1'), Decimal('28.3495')), # 1 oz ≈ 28.35g
            ('lb', Decimal('1'), Decimal('453.592')), # 1 lb ≈ 453.59g
            ('cup', Decimal('1'), Decimal('240')),    # 1 cup ≈ 240g (water)
            ('tbsp', Decimal('2'), Decimal('30')),    # 2 tbsp = 30g
            ('tsp', Decimal('3'), Decimal('15')),     # 3 tsp = 15g
            ('ml', Decimal('250'), Decimal('250')),   # 250 ml = 250g (water)
            ('l', Decimal('0.5'), Decimal('500')),    # 0.5 L = 500g
        ]
        
        for unit, quantity, expected_grams in units_and_quantities:
            meal_item = MealItem.objects.create(
                meal=self.meal,
                food_item=self.food_item,
                quantity=quantity,
                unit=unit
            )
            
            # Check calories calculation (based on converted grams)
            expected_calories = (self.food_item.calories * expected_grams) / 100
            self.assertAlmostEqual(
                float(meal_item.calories), 
                float(expected_calories), 
                places=2,
                msg=f"Failed for {quantity} {unit}"
            )
    
    def test_custom_name_override(self):
        """Test custom name field."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('100'),
            unit='g',
            custom_name='Organic Honeycrisp Apple'
        )
        
        self.assertEqual(meal_item.custom_name, 'Organic Honeycrisp Apple')
        # String representation should use custom name
        self.assertEqual(str(meal_item), '100 g Organic Honeycrisp Apple')
    
    def test_string_representation(self):
        """Test string representation."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('150'),
            unit='g'
        )
        
        self.assertEqual(str(meal_item), '150 g Apple')
    
    def test_quantity_validation(self):
        """Test quantity must be positive."""
        meal_item = MealItem(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('-10'),
            unit='g'
        )
        
        with self.assertRaises(ValidationError):
            meal_item.full_clean()
    
    def test_meal_cascade_delete(self):
        """Test meal items are deleted when meal is deleted."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('100'),
            unit='g'
        )
        
        meal_id = self.meal.id
        self.meal.delete()
        
        # Meal item should be deleted
        self.assertEqual(MealItem.objects.filter(meal_id=meal_id).count(), 0)
    
    def test_food_item_protect_delete(self):
        """Test food items are protected from deletion."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('100'),
            unit='g'
        )
        
        # Should not be able to delete food item that's in use
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.food_item.delete()
    
    def test_notes_field(self):
        """Test notes field on meal item."""
        meal_item = MealItem.objects.create(
            meal=self.meal,
            food_item=self.food_item,
            quantity=Decimal('100'),
            unit='g',
            notes='Added extra honey'
        )
        
        self.assertEqual(meal_item.notes, 'Added extra honey')


class MealAnalysisModelTest(TestCase):
    """Test cases for the MealAnalysis model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.meal = Meal.objects.create(
            user=self.user,
            name='Lunch',
            consumed_at=datetime.now()
        )
    
    def test_create_meal_analysis(self):
        """Test creating a meal analysis."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={'foods': ['apple', 'banana']},
            confidence_score=Decimal('0.92'),
            analysis_time_ms=1500,
            tokens_used=250
        )
        
        self.assertEqual(analysis.meal, self.meal)
        self.assertEqual(analysis.ai_service, 'gemini')
        self.assertEqual(analysis.ai_response, {'foods': ['apple', 'banana']})
        self.assertEqual(analysis.confidence_score, Decimal('0.92'))
        self.assertEqual(analysis.analysis_time_ms, 1500)
        self.assertEqual(analysis.tokens_used, 250)
    
    def test_one_to_one_relationship(self):
        """Test one-to-one relationship with Meal."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={},
            analysis_time_ms=1000
        )
        
        # Test reverse relationship
        self.assertEqual(self.meal.analysis, analysis)
        
        # Test can't create duplicate analysis
        with self.assertRaises(IntegrityError):
            MealAnalysis.objects.create(
                meal=self.meal,
                ai_service='openai',
                ai_response={},
                analysis_time_ms=2000
            )
    
    def test_ai_service_choices(self):
        """Test AI service field choices."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={},
            analysis_time_ms=1000
        )
        
        # Test valid choices
        for service, _ in MealAnalysis.AI_SERVICE_CHOICES:
            analysis.ai_service = service
            analysis.full_clean()  # Should not raise
    
    def test_user_feedback_fields(self):
        """Test user feedback fields."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={},
            analysis_time_ms=1000
        )
        
        # Default values
        self.assertIsNone(analysis.is_accurate)
        self.assertEqual(analysis.user_notes, '')
        
        # Update feedback
        analysis.is_accurate = True
        analysis.user_notes = 'Very accurate, but missed the salad dressing'
        analysis.save()
        
        self.assertTrue(analysis.is_accurate)
        self.assertEqual(analysis.user_notes, 'Very accurate, but missed the salad dressing')
    
    def test_string_representation(self):
        """Test string representation."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={},
            analysis_time_ms=1000
        )
        
        expected = f"Analysis for {self.meal} - gemini"
        self.assertEqual(str(analysis), expected)
    
    def test_confidence_score_validation(self):
        """Test confidence score validation (0-1 range)."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={},
            analysis_time_ms=1000,
            confidence_score=Decimal('0.95')
        )
        
        # Valid scores
        for score in [Decimal('0.00'), Decimal('0.50'), Decimal('1.00')]:
            analysis.confidence_score = score
            analysis.full_clean()  # Should not raise
    
    def test_timestamps(self):
        """Test timestamp fields."""
        analysis = MealAnalysis.objects.create(
            meal=self.meal,
            ai_service='gemini',
            ai_response={},
            analysis_time_ms=1000
        )
        
        self.assertIsNotNone(analysis.created_at)
        self.assertIsNotNone(analysis.updated_at)
        self.assertIsInstance(analysis.created_at, datetime)
        self.assertIsInstance(analysis.updated_at, datetime)