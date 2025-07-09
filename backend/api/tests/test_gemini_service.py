import pytest
from unittest.mock import patch, MagicMock
import json
import base64
from PIL import Image
import io
import time

from ..services.gemini_service import GeminiService, retry_on_failure
from ..exceptions import AIServiceError, RateLimitError


@pytest.mark.django_db
class TestGeminiService:
    """Test cases for GeminiService."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment."""
        with patch('django.conf.settings.GEMINI_API_KEY', 'test-api-key'):
            self.service = GeminiService()
    
    def create_test_image_bytes(self):
        """Create test image bytes."""
        image = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        return buffer.getvalue()
    
    def test_init_no_api_key(self):
        """Test initialization without API key."""
        with patch('django.conf.settings.GEMINI_API_KEY', None):
            with pytest.raises(ValueError, match="GEMINI_API_KEY not found"):
                GeminiService()
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_analyze_food_image_success(self, mock_generate):
        """Test successful food image analysis."""
        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "description": "Grilled chicken salad",
            "servings": 1,
            "serving_size": "1 bowl",
            "cooking_method": "grilled",
            "ingredients": [
                {
                    "name": "Grilled Chicken Breast",
                    "quantity": 150,
                    "unit": "g",
                    "calories": 247.5,
                    "protein": 46.5,
                    "carbohydrates": 0,
                    "fat": 5.4
                },
                {
                    "name": "Mixed Greens",
                    "quantity": 100,
                    "unit": "g",
                    "calories": 20,
                    "protein": 2,
                    "carbohydrates": 3.8,
                    "fat": 0.2
                }
            ],
            "nutrition": {
                "calories": 267.5,
                "protein": 48.5,
                "carbohydrates": 3.8,
                "fat": 5.6,
                "fiber": 2.0,
                "sugar": 1.5,
                "sodium": 150
            },
            "confidence": {
                "overall": 90,
                "ingredients_identified": 92,
                "portions_estimated": 88
            }
        })
        mock_generate.return_value = mock_response
        
        # Test analysis
        image_bytes = self.create_test_image_bytes()
        result = self.service.analyze_food_image(image_bytes)
        
        assert result['success'] is True
        assert 'data' in result
        assert result['data']['description'] == "Grilled chicken salad"
        assert len(result['data']['ingredients']) == 2
        assert result['data']['nutrition']['calories'] == 267.5
        
        # Verify API was called correctly
        mock_generate.assert_called_once()
        call_args = mock_generate.call_args[0][0]
        assert len(call_args) == 2  # Prompt and image
        assert isinstance(call_args[0], str)  # Prompt
        assert call_args[1]['mime_type'] == 'image/jpeg'
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_analyze_food_image_with_context(self, mock_generate):
        """Test image analysis with context."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "description": "Breakfast eggs",
            "servings": 1,
            "serving_size": "2 eggs",
            "ingredients": [
                {
                    "name": "Scrambled Eggs",
                    "quantity": 2,
                    "unit": "eggs",
                    "calories": 180,
                    "protein": 12,
                    "carbohydrates": 2,
                    "fat": 14
                }
            ],
            "nutrition": {
                "calories": 180,
                "protein": 12,
                "carbohydrates": 2,
                "fat": 14,
                "fiber": 0,
                "sugar": 1,
                "sodium": 300
            }
        })
        mock_generate.return_value = mock_response
        
        context = {
            'meal_type': 'breakfast',
            'cuisine_type': 'american',
            'time_of_day': '08:00',
            'location': 'Home Kitchen',
            'user_notes': 'Two eggs scrambled with milk'
        }
        
        image_bytes = self.create_test_image_bytes()
        result = self.service.analyze_food_image(image_bytes, context=context)
        
        assert result['success'] is True
        
        # Verify context was included in prompt
        call_args = mock_generate.call_args[0][0]
        prompt = call_args[0]
        assert 'breakfast' in prompt
        assert 'american' in prompt
        assert '08:00' in prompt
        assert 'Home Kitchen' in prompt
        assert 'Two eggs scrambled with milk' in prompt
    
    def test_analyze_food_image_invalid_image(self):
        """Test analysis with invalid image data."""
        result = self.service.analyze_food_image(b'invalid image data')
        
        assert result['success'] is False
        assert 'Invalid image format' in result['error']
    
    def test_analyze_food_image_empty_data(self):
        """Test analysis with empty image data."""
        result = self.service.analyze_food_image(b'')
        
        assert result['success'] is False
        assert 'No image data provided' in result['error']
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_analyze_food_image_json_with_markdown(self, mock_generate):
        """Test handling of JSON wrapped in markdown."""
        mock_response = MagicMock()
        mock_response.text = """```json
{
    "description": "Test food",
    "servings": 1,
    "serving_size": "1 serving",
    "ingredients": [],
    "nutrition": {
        "calories": 100,
        "protein": 10,
        "carbohydrates": 10,
        "fat": 5,
        "fiber": 2,
        "sugar": 3,
        "sodium": 100
    }
}
```"""
        mock_generate.return_value = mock_response
        
        image_bytes = self.create_test_image_bytes()
        result = self.service.analyze_food_image(image_bytes)
        
        assert result['success'] is True
        assert result['data']['description'] == "Test food"
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_analyze_food_image_invalid_json(self, mock_generate):
        """Test handling of invalid JSON response."""
        mock_response = MagicMock()
        mock_response.text = "This is not JSON"
        mock_generate.return_value = mock_response
        
        image_bytes = self.create_test_image_bytes()
        result = self.service.analyze_food_image(image_bytes)
        
        assert result['success'] is False
        assert 'Failed to parse nutrition data' in result['error']
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_analyze_food_image_missing_fields(self, mock_generate):
        """Test handling of response with missing required fields."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "description": "Test food",
            # Missing required fields
        })
        mock_generate.return_value = mock_response
        
        image_bytes = self.create_test_image_bytes()
        result = self.service.analyze_food_image(image_bytes)
        
        assert result['success'] is False
        assert 'Invalid response format' in result['error']
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_calculate_nutrition_success(self, mock_generate):
        """Test successful nutrition calculation from ingredients."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "description": "Chicken and rice meal",
            "nutrition": {
                "calories": 450,
                "protein": 35,
                "carbohydrates": 45,
                "fat": 12,
                "fiber": 3,
                "sugar": 2,
                "sodium": 400
            },
            "per_serving": {
                "calories": 225,
                "protein": 17.5,
                "carbohydrates": 22.5,
                "fat": 6,
                "fiber": 1.5,
                "sugar": 1,
                "sodium": 200
            },
            "ingredients_breakdown": [
                {
                    "name": "chicken breast",
                    "calories": 330,
                    "protein": 62,
                    "carbohydrates": 0,
                    "fat": 7.2
                }
            ],
            "serving_info": {
                "total_weight": 330,
                "servings": 2,
                "serving_size": "165g per serving"
            }
        })
        mock_generate.return_value = mock_response
        
        ingredients = ["chicken breast: 200g", "white rice: 130g"]
        result = self.service.calculate_nutrition_from_ingredients(ingredients, serving_size=2)
        
        assert result['success'] is True
        assert result['data']['nutrition']['calories'] == 450
        assert result['data']['per_serving']['calories'] == 225
    
    @patch('google.generativeai.GenerativeModel.generate_content')
    def test_caching_functionality(self, mock_generate):
        """Test that caching works correctly."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "description": "Cached food",
            "servings": 1,
            "serving_size": "1 serving",
            "ingredients": [],
            "nutrition": {
                "calories": 100,
                "protein": 10,
                "carbohydrates": 10,
                "fat": 5,
                "fiber": 2,
                "sugar": 3,
                "sodium": 100
            }
        })
        mock_generate.return_value = mock_response
        
        # Enable caching
        with patch.object(self.service, 'use_cache', True):
            image_bytes = self.create_test_image_bytes()
            
            # First call - should hit API
            result1 = self.service.analyze_food_image(image_bytes)
            assert result1['success'] is True
            assert mock_generate.call_count == 1
            
            # Second call with same image - should use cache
            result2 = self.service.analyze_food_image(image_bytes)
            assert result2['success'] is True
            assert mock_generate.call_count == 1  # No additional API call
            
            # Results should be identical
            assert result1 == result2
    
    def test_validate_nutrition_response(self):
        """Test nutrition response validation."""
        # Valid data
        valid_data = {
            'description': 'Test',
            'servings': 1,
            'serving_size': '1 serving',
            'ingredients': [
                {
                    'name': 'Test ingredient',
                    'quantity': 100,
                    'unit': 'g',
                    'calories': 100
                }
            ],
            'nutrition': {
                'calories': 100
            }
        }
        
        result = self.service._validate_nutrition_response(valid_data)
        assert 'description' in result
        assert result['servings'] == 1
        
        # Invalid servings - should default to 1
        invalid_data = valid_data.copy()
        invalid_data['servings'] = -1
        result = self.service._validate_nutrition_response(invalid_data)
        assert result['servings'] == 1
        
        # Missing required field
        missing_data = valid_data.copy()
        del missing_data['description']
        with pytest.raises(ValueError, match="Missing required field: description"):
            self.service._validate_nutrition_response(missing_data)
    
    def test_validate_numeric(self):
        """Test numeric validation."""
        assert self.service._validate_numeric(10, 0, 100) == 10
        assert self.service._validate_numeric(-5, 0, 100) == 0
        assert self.service._validate_numeric(150, 0, 100) == 100
        assert self.service._validate_numeric(None, 0, 100) is None
        assert self.service._validate_numeric("invalid", 0, 100) is None


class TestRetryDecorator:
    """Test retry_on_failure decorator."""
    
    def test_retry_on_transient_failure(self):
        """Test retry on transient failures."""
        call_count = 0
        
        @retry_on_failure(max_retries=2, delay=0.1, backoff=1)
        def flaky_function(self):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return "Success"
        
        result = flaky_function(None)
        assert result == "Success"
        assert call_count == 3
    
    def test_retry_rate_limit_error(self):
        """Test that rate limit errors are raised immediately."""
        @retry_on_failure(max_retries=3, delay=0.1)
        def rate_limited_function(self):
            raise Exception("Rate limit exceeded")
        
        with pytest.raises(RateLimitError):
            rate_limited_function(None)
    
    def test_retry_auth_error(self):
        """Test that auth errors are raised immediately."""
        @retry_on_failure(max_retries=3, delay=0.1)
        def auth_error_function(self):
            raise Exception("Invalid authentication")
        
        with pytest.raises(AIServiceError, match="API authentication error"):
            auth_error_function(None)
    
    def test_retry_max_attempts_exceeded(self):
        """Test failure after max retries."""
        call_count = 0
        
        @retry_on_failure(max_retries=2, delay=0.1)
        def always_fails(self):
            nonlocal call_count
            call_count += 1
            raise Exception("Always fails")
        
        with pytest.raises(AIServiceError, match="Failed after 3 attempts"):
            always_fails(None)
        
        assert call_count == 3  # Initial + 2 retries