import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from decimal import Decimal
import json
import io
from PIL import Image

from api.models import Meal, MealItem, FoodItem, MealAnalysis
from api.tests.factories import UserFactory, MealFactory, FoodItemFactory


@pytest.mark.django_db
class TestAnalyzeImageView:
    """Test cases for AI image analysis endpoint."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('api:analyze-image')
    
    def create_test_image(self, format='JPEG', size=(100, 100)):
        """Create a test image file."""
        image = Image.new('RGB', size, color='red')
        file = io.BytesIO()
        image.save(file, format=format)
        file.seek(0)
        return SimpleUploadedFile(
            f"test.{format.lower()}",
            file.getvalue(),
            content_type=f"image/{format.lower()}"
        )
    
    @patch('api.services.gemini_service.GeminiService.analyze_food_image')
    def test_analyze_image_success(self, mock_analyze):
        """Test successful image analysis."""
        # Mock Gemini response
        mock_analyze.return_value = {
            'success': True,
            'data': {
                'description': 'Grilled chicken with rice',
                'servings': 1,
                'serving_size': '1 plate',
                'ingredients': [
                    {
                        'name': 'Grilled Chicken',
                        'quantity': 150,
                        'unit': 'g',
                        'calories': 250,
                        'protein': 45,
                        'carbohydrates': 0,
                        'fat': 5.5,
                        'nutrition': {
                            'calories': 250,
                            'protein': 45,
                            'carbohydrates': 0,
                            'fat': 5.5
                        }
                    },
                    {
                        'name': 'White Rice',
                        'quantity': 100,
                        'unit': 'g',
                        'calories': 130,
                        'protein': 2.7,
                        'carbohydrates': 28,
                        'fat': 0.3,
                        'nutrition': {
                            'calories': 130,
                            'protein': 2.7,
                            'carbohydrates': 28,
                            'fat': 0.3
                        }
                    }
                ],
                'nutrition': {
                    'calories': 380,
                    'protein': 47.7,
                    'carbohydrates': 28,
                    'fat': 5.8,
                    'fiber': 2,
                    'sugar': 1,
                    'sodium': 200
                },
                'confidence': {
                    'overall': 0.9,
                    'food_identification': 0.92,
                    'portion_estimation': 0.88
                }
            }
        }
        
        # Upload image
        image = self.create_test_image()
        data = {
            'image': image,
            'meal_type': 'lunch',
            'notes': 'Test meal'
        }
        
        response = self.client.post(self.url, data, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'meal' in response.data
        assert 'detected_items' in response.data
        assert 'confidence' in response.data
        assert 'processing_time_ms' in response.data
        
        # Verify meal was created
        assert Meal.objects.filter(user=self.user).exists()
        meal = Meal.objects.filter(user=self.user).first()
        assert meal.name == 'Grilled chicken with rice'
        assert meal.meal_type == 'lunch'
        assert meal.notes == 'Test meal'
        
        # Verify meal items were created
        assert meal.meal_items.count() == 2
        
        # Verify food items were created
        assert FoodItem.objects.filter(name='Grilled Chicken').exists()
        assert FoodItem.objects.filter(name='White Rice').exists()
        
        # Verify analysis record was created
        assert MealAnalysis.objects.filter(meal=meal).exists()
    
    @patch('api.services.gemini_service.GeminiService.analyze_food_image')
    def test_analyze_image_with_context(self, mock_analyze):
        """Test image analysis with context information."""
        mock_analyze.return_value = {
            'success': True,
            'data': {
                'description': 'Italian pasta',
                'servings': 1,
                'serving_size': '1 bowl',
                'ingredients': [],
                'nutrition': {
                    'calories': 450,
                    'protein': 15,
                    'carbohydrates': 60,
                    'fat': 18,
                    'fiber': 3,
                    'sugar': 5,
                    'sodium': 600
                },
                'confidence': {'overall': 0.85}
            }
        }
        
        image = self.create_test_image()
        data = {
            'image': image,
            'meal_type': 'dinner',
            'cuisine_type': 'italian',
            'location_name': 'Italian Restaurant',
            'notes': 'Carbonara pasta'
        }
        
        response = self.client.post(self.url, data, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify context was passed to Gemini
        mock_analyze.assert_called_once()
        call_args = mock_analyze.call_args
        context = call_args[1]['context']
        assert context['meal_type'] == 'dinner'
        assert context['cuisine_type'] == 'italian'
        assert context['location'] == 'Italian Restaurant'
        assert context['user_notes'] == 'Carbonara pasta'
    
    def test_analyze_image_no_auth(self):
        """Test image analysis without authentication."""
        self.client.force_authenticate(user=None)
        
        image = self.create_test_image()
        data = {'image': image}
        
        response = self.client.post(self.url, data, format='multipart')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_analyze_image_no_image(self):
        """Test analysis without image."""
        response = self.client.post(self.url, {}, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'image' in response.data
    
    @patch('api.services.gemini_service.GeminiService.analyze_food_image')
    def test_analyze_image_ai_service_error(self, mock_analyze):
        """Test handling of AI service errors."""
        mock_analyze.return_value = {
            'success': False,
            'error': 'API quota exceeded'
        }
        
        image = self.create_test_image()
        data = {'image': image}
        
        response = self.client.post(self.url, data, format='multipart')
        
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data['code'] == 'AI_SERVICE_ERROR'
        assert 'API quota exceeded' in response.data['error']
    
    @patch('api.services.gemini_service.GeminiService.analyze_food_image')
    def test_analyze_image_unexpected_error(self, mock_analyze):
        """Test handling of unexpected errors."""
        mock_analyze.side_effect = Exception('Unexpected error')
        
        image = self.create_test_image()
        data = {'image': image}
        
        response = self.client.post(self.url, data, format='multipart')
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'unexpected error' in response.data['error'].lower()
    
    def test_analyze_image_mock_response(self):
        """Test mock response when Gemini API key not configured."""
        with patch('django.conf.settings.GEMINI_API_KEY', 'your-gemini-api-key'):
            image = self.create_test_image()
            data = {
                'image': image,
                'meal_type': 'breakfast'
            }
            
            response = self.client.post(self.url, data, format='multipart')
            
            assert response.status_code == status.HTTP_200_OK
            assert 'meal' in response.data
            assert 'detected_items' in response.data
            assert len(response.data['detected_items']) == 3  # Mock returns 3 items
            assert response.data['meal']['meal_type'] == 'breakfast'
    
    def test_analyze_image_invalid_format(self):
        """Test image analysis with invalid format."""
        # Create a non-image file
        file = SimpleUploadedFile(
            "test.txt",
            b"This is not an image",
            content_type="text/plain"
        )
        
        data = {'image': file}
        
        response = self.client.post(self.url, data, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_analyze_large_image(self):
        """Test image analysis with large image."""
        # Create a large image (2000x2000)
        image = self.create_test_image(size=(2000, 2000))
        data = {'image': image}
        
        with patch('api.services.gemini_service.GeminiService.analyze_food_image') as mock:
            mock.return_value = {
                'success': True,
                'data': {
                    'description': 'Food',
                    'servings': 1,
                    'serving_size': '1 serving',
                    'ingredients': [],
                    'nutrition': {
                        'calories': 100,
                        'protein': 10,
                        'carbohydrates': 10,
                        'fat': 5,
                        'fiber': 2,
                        'sugar': 3,
                        'sodium': 100
                    },
                    'confidence': {'overall': 0.8}
                }
            }
            
            response = self.client.post(self.url, data, format='multipart')
            
            # Should succeed - we'll add size validation in the next step
            assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestRecalculateNutritionView:
    """Test cases for nutrition recalculation endpoint."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('api:recalculate-nutrition')
        
        # Create test meal
        self.meal = MealFactory(user=self.user)
        self.food1 = FoodItemFactory(
            name='Chicken',
            calories=165,
            protein=31,
            carbohydrates=0,
            fat=3.6
        )
        self.food2 = FoodItemFactory(
            name='Rice',
            calories=130,
            protein=2.7,
            carbohydrates=28,
            fat=0.3
        )
    
    @patch('api.services.gemini_service.GeminiService.calculate_nutrition_from_ingredients')
    def test_recalculate_success(self, mock_calculate):
        """Test successful nutrition recalculation."""
        mock_calculate.return_value = {
            'success': True,
            'data': {
                'description': 'Chicken and rice meal',
                'nutrition': {
                    'calories': 500,
                    'protein': 40,
                    'carbohydrates': 45,
                    'fat': 10,
                    'fiber': 3,
                    'sugar': 2,
                    'sodium': 400
                },
                'per_serving': {
                    'calories': 250,
                    'protein': 20,
                    'carbohydrates': 22.5,
                    'fat': 5,
                    'fiber': 1.5,
                    'sugar': 1,
                    'sodium': 200
                },
                'ingredients_breakdown': [
                    {
                        'name': 'Chicken',
                        'calories': 330,
                        'protein': 62,
                        'carbohydrates': 0,
                        'fat': 7.2
                    },
                    {
                        'name': 'Rice',
                        'calories': 170,
                        'protein': 3.5,
                        'carbohydrates': 37,
                        'fat': 0.4
                    }
                ]
            }
        }
        
        data = {
            'ingredients': [
                {'name': 'Chicken', 'quantity': 200, 'unit': 'g'},
                {'name': 'Rice', 'quantity': 130, 'unit': 'g'}
            ],
            'serving_size': 2
        }
        
        response = self.client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_nutrition' in response.data
        assert 'per_serving' in response.data
        assert 'ingredients_breakdown' in response.data
        assert 'daily_values_percentage' in response.data
        
        # Verify daily values calculation
        assert response.data['daily_values_percentage']['calories'] == 12.5  # 250/2000 * 100
    
    @patch('api.services.gemini_service.GeminiService.calculate_nutrition_from_ingredients')
    def test_recalculate_with_meal_update(self, mock_calculate):
        """Test recalculation with meal update."""
        mock_calculate.return_value = {
            'success': True,
            'data': {
                'nutrition': {
                    'calories': 400,
                    'protein': 35,
                    'carbohydrates': 40,
                    'fat': 8,
                    'fiber': 4,
                    'sugar': 3,
                    'sodium': 300
                },
                'ingredients_breakdown': [
                    {
                        'calories': 250,
                        'protein': 30,
                        'carbohydrates': 0,
                        'fat': 5
                    },
                    {
                        'calories': 150,
                        'protein': 5,
                        'carbohydrates': 40,
                        'fat': 3
                    }
                ]
            }
        }
        
        data = {
            'meal_id': str(self.meal.id),
            'ingredients': [
                {'name': 'Grilled Chicken', 'quantity': 150, 'unit': 'g'},
                {'name': 'Quinoa', 'quantity': 100, 'unit': 'g'}
            ],
            'serving_size': 1
        }
        
        response = self.client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'meal' in response.data
        
        # Verify meal items were updated
        self.meal.refresh_from_db()
        assert self.meal.meal_items.count() == 2
        assert self.meal.meal_items.filter(
            food_item__name='Grilled Chicken'
        ).exists()
    
    def test_recalculate_no_auth(self):
        """Test recalculation without authentication."""
        self.client.force_authenticate(user=None)
        
        data = {
            'ingredients': [
                {'name': 'Chicken', 'quantity': 100, 'unit': 'g'}
            ]
        }
        
        response = self.client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_recalculate_invalid_data(self):
        """Test recalculation with invalid data."""
        # Missing ingredients
        response = self.client.post(self.url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Invalid ingredient format
        data = {
            'ingredients': [
                {'name': 'Chicken'}  # Missing quantity
            ]
        }
        response = self.client.post(self.url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_recalculate_other_users_meal(self):
        """Test recalculation of another user's meal."""
        other_meal = MealFactory(user=self.other_user)
        
        data = {
            'meal_id': str(other_meal.id),
            'ingredients': [
                {'name': 'Chicken', 'quantity': 100, 'unit': 'g'}
            ]
        }
        
        with patch('api.services.gemini_service.GeminiService.calculate_nutrition_from_ingredients') as mock:
            mock.return_value = {
                'success': True,
                'data': {
                    'nutrition': {'calories': 165, 'protein': 31, 'carbohydrates': 0, 'fat': 3.6}
                }
            }
            
            response = self.client.post(self.url, data, format='json')
            
            # Should succeed but not update the meal
            assert response.status_code == status.HTTP_200_OK
            assert 'meal' not in response.data
    
    @patch('api.services.gemini_service.GeminiService.calculate_nutrition_from_ingredients')
    def test_recalculate_ai_service_error(self, mock_calculate):
        """Test handling of AI service errors."""
        mock_calculate.return_value = {
            'success': False,
            'error': 'Rate limit exceeded'
        }
        
        data = {
            'ingredients': [
                {'name': 'Chicken', 'quantity': 100, 'unit': 'g'}
            ]
        }
        
        response = self.client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data['code'] == 'AI_SERVICE_ERROR'
    
    def test_recalculate_mock_response(self):
        """Test mock response when Gemini API key not configured."""
        with patch('django.conf.settings.GEMINI_API_KEY', 'your-gemini-api-key'):
            data = {
                'ingredients': [
                    {'name': 'Chicken', 'quantity': 100, 'unit': 'g'},
                    {'name': 'Rice', 'quantity': 50, 'unit': 'g'}
                ],
                'serving_size': 2
            }
            
            response = self.client.post(self.url, data, format='json')
            
            assert response.status_code == status.HTTP_200_OK
            assert 'total_nutrition' in response.data
            assert 'per_serving' in response.data
            assert 'ingredients_breakdown' in response.data
            
            # Verify mock calculations
            total_calories = response.data['total_nutrition']['calories']
            per_serving_calories = response.data['per_serving']['calories']
            assert per_serving_calories == total_calories / 2