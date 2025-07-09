import google.generativeai as genai
from django.conf import settings
import json
import logging
from typing import Dict, Any, Optional, List
import base64
from PIL import Image
import io
import time
from functools import wraps

logger = logging.getLogger(__name__)


def retry_on_failure(max_retries=3, delay=1.0, backoff=2.0):
    """
    Retry decorator for handling transient failures.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries in seconds
        backoff: Multiplier for delay after each retry
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(self, *args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(
                            f"Attempt {attempt + 1} failed for {func.__name__}: {str(e)}. "
                            f"Retrying in {current_delay} seconds..."
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed for {func.__name__}")
            
            # If all retries failed, raise the last exception
            raise last_exception
        
        return wrapper
    return decorator


class GeminiService:
    """Service for interacting with Google's Gemini API for food image analysis."""
    
    def __init__(self):
        """Initialize the Gemini service with API key."""
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in settings")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-pro')
    
    def _validate_nutrition_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and clean Gemini nutrition response data.
        
        Args:
            data: Raw response data from Gemini
            
        Returns:
            Validated and cleaned data
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        errors = []
        
        # Required top-level fields
        required_fields = ['description', 'servings', 'serving_size', 'ingredients', 'nutrition']
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            raise ValueError(f"Invalid response structure: {'; '.join(errors)}")
        
        # Validate servings
        if not isinstance(data['servings'], (int, float)) or data['servings'] <= 0:
            data['servings'] = 1
            logger.warning("Invalid servings value, defaulting to 1")
        
        # Validate ingredients
        validated_ingredients = []
        for idx, ingredient in enumerate(data.get('ingredients', [])):
            if not isinstance(ingredient, dict):
                logger.warning(f"Skipping invalid ingredient at index {idx}")
                continue
                
            # Ensure required ingredient fields
            if 'name' not in ingredient:
                logger.warning(f"Skipping ingredient without name at index {idx}")
                continue
            
            # Set defaults for missing values
            validated_ingredient = {
                'name': str(ingredient['name']),
                'quantity': float(ingredient.get('quantity', 0)),
                'unit': str(ingredient.get('unit', 'g')),
                'calories': self._validate_numeric(ingredient.get('calories'), 0, 5000),
                'protein': self._validate_numeric(ingredient.get('protein'), 0, 500),
                'carbohydrates': self._validate_numeric(ingredient.get('carbohydrates'), 0, 500),
                'fat': self._validate_numeric(ingredient.get('fat'), 0, 500),
            }
            
            # Add optional fields if present
            if 'preparation' in ingredient:
                validated_ingredient['preparation'] = str(ingredient['preparation'])
                
            validated_ingredients.append(validated_ingredient)
        
        data['ingredients'] = validated_ingredients
        
        # Validate nutrition totals
        nutrition = data.get('nutrition', {})
        data['nutrition'] = {
            'calories': self._validate_numeric(nutrition.get('calories'), 0, 10000),
            'protein': self._validate_numeric(nutrition.get('protein'), 0, 1000),
            'carbohydrates': self._validate_numeric(nutrition.get('carbohydrates'), 0, 1000),
            'fat': self._validate_numeric(nutrition.get('fat'), 0, 1000),
            'fiber': self._validate_numeric(nutrition.get('fiber'), 0, 100),
            'sugar': self._validate_numeric(nutrition.get('sugar'), 0, 500),
            'sodium': self._validate_numeric(nutrition.get('sodium'), 0, 10000),
        }
        
        # Add optional fields with defaults
        if 'cooking_method' not in data:
            data['cooking_method'] = 'unknown'
            
        if 'confidence' not in data:
            data['confidence'] = {
                'overall': 75,
                'ingredients_identified': 75,
                'portions_estimated': 75
            }
        
        return data
    
    def _validate_numeric(self, value: Any, min_val: float, max_val: float) -> Optional[float]:
        """Validate and constrain numeric values."""
        if value is None:
            return None
            
        try:
            num_val = float(value)
            if num_val < min_val:
                return min_val
            elif num_val > max_val:
                return max_val
            return num_val
        except (TypeError, ValueError):
            return None
    
    @retry_on_failure(max_retries=3, delay=2.0)
    def _call_gemini_api(self, prompt: str, image_data: bytes) -> str:
        """
        Make API call to Gemini with retry logic for image analysis.
        
        Args:
            prompt: The prompt to send
            image_data: The image data in bytes
            
        Returns:
            The raw text response from Gemini
            
        Raises:
            Exception: If API call fails after all retries
        """
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        response = self.model.generate_content([
            prompt,
            {'mime_type': 'image/jpeg', 'data': image_base64}
        ])
        
        if not response.text:
            raise ValueError("Empty response from Gemini API")
            
        return response.text
    
    @retry_on_failure(max_retries=3, delay=2.0)
    def _call_gemini_text_api(self, prompt: str) -> str:
        """
        Make text-only API call to Gemini with retry logic.
        
        Args:
            prompt: The prompt to send
            
        Returns:
            The raw text response from Gemini
            
        Raises:
            Exception: If API call fails after all retries
        """
        response = self.model.generate_content(prompt)
        
        if not response.text:
            raise ValueError("Empty response from Gemini API")
            
        return response.text
    
    def analyze_food_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze a food image and extract nutrition information.
        
        Args:
            image_data: The image data in bytes
            
        Returns:
            Dict containing nutrition information and ingredients
        """
        try:
            # Validate image data
            if not image_data:
                raise ValueError("No image data provided")
            
            # Verify it's a valid image
            try:
                img = Image.open(io.BytesIO(image_data))
                img.verify()
            except Exception as e:
                logger.error(f"Invalid image data: {e}")
                return {
                    'success': False,
                    'error': 'Invalid image format'
                }
            # Create the prompt for nutrition analysis
            prompt = """
            Analyze this food image and provide detailed nutritional information.
            
            Instructions:
            1. Identify all visible ingredients and their estimated quantities
            2. Calculate nutrition for EACH individual ingredient
            3. Provide total nutrition information per serving
            4. Consider cooking methods (fried, grilled, etc.) when estimating
            5. Be specific about portion sizes and units
            
            Return ONLY valid JSON in the following format (no markdown, no explanations):
            {
                "description": "Brief description of the dish",
                "servings": number,
                "serving_size": "specific description (e.g., 1 burger, 2 cups, 250g)",
                "cooking_method": "grilled/fried/baked/raw/etc",
                "ingredients": [
                    {
                        "name": "ingredient name",
                        "quantity": number,
                        "unit": "grams/ml/pieces/etc",
                        "calories": number,
                        "protein": number (grams),
                        "carbohydrates": number (grams),
                        "fat": number (grams),
                        "preparation": "how it's prepared (optional)"
                    }
                ],
                "nutrition": {
                    "calories": number (total for the serving),
                    "protein": number (grams),
                    "carbohydrates": number (grams),
                    "fat": number (grams),
                    "fiber": number (grams),
                    "sugar": number (grams),
                    "sodium": number (milligrams)
                },
                "confidence": {
                    "overall": number (0-100),
                    "ingredients_identified": number (0-100),
                    "portions_estimated": number (0-100)
                }
            }
            
            Important:
            - For ingredients, prefer weight units (grams) when possible
            - Include cooking oil/butter if food appears cooked
            - Account for typical condiments/sauces visible
            - If unsure about exact values, use typical nutritional database values
            - Ensure individual ingredient nutrition adds up reasonably to the total
            """
            
            # Call Gemini API with retry logic
            try:
                response_text = self._call_gemini_api(prompt, image_data)
            except Exception as e:
                logger.error(f"Failed to get response from Gemini API: {e}")
                return {
                    'success': False,
                    'error': f'Failed to analyze image: {str(e)}'
                }
            
            # Clean and extract JSON from response
            response_text = response_text.strip()
            
            # Try to parse JSON from the response
            # Sometimes Gemini wraps JSON in markdown code blocks
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # Remove ```json
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # Remove ```
            
            nutrition_data = json.loads(response_text)
            
            # Validate and clean the response
            try:
                validated_data = self._validate_nutrition_response(nutrition_data)
            except ValueError as e:
                logger.error(f"Invalid response format: {e}")
                return {
                    'success': False,
                    'error': f'Invalid response format: {str(e)}',
                    'raw_response': response_text
                }
            
            return {
                'success': True,
                'data': validated_data,
                'raw_response': response_text
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return {
                'success': False,
                'error': 'Failed to parse nutrition data',
                'raw_response': response_text if 'response_text' in locals() else None
            }
        except Exception as e:
            logger.error(f"Error analyzing image with Gemini: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_nutrition_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract nutrition information from text (e.g., a recipe).
        
        Args:
            text: The text containing recipe or nutrition information
            
        Returns:
            Dict containing extracted nutrition information
        """
        try:
            prompt = f"""
            Extract nutrition information from the following text and return it in JSON format:
            
            {text}
            
            Return the data in the following JSON format:
            {{
                "servings": number,
                "serving_size": "description",
                "nutrition": {{
                    "calories": number,
                    "protein": number (in grams),
                    "carbohydrates": number (in grams),
                    "fat": number (in grams),
                    "fiber": number (in grams),
                    "sugar": number (in grams),
                    "sodium": number (in milligrams)
                }}
            }}
            
            If any values are not mentioned, use null.
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            return json.loads(response_text)
            
        except Exception as e:
            logger.error(f"Error extracting nutrition from text: {e}")
            return None
    
    def calculate_nutrition_from_ingredients(self, ingredients: list) -> Dict[str, Any]:
        """
        Calculate nutrition information from a list of ingredients.
        
        Args:
            ingredients: List of ingredient strings with quantities (e.g., ["chicken breast: 200g", "rice: 100g"])
            
        Returns:
            Dict containing calculated nutrition information
        """
        try:
            ingredients_text = "\n".join(f"- {ingredient}" for ingredient in ingredients)
            
            prompt = f"""
            Calculate the total nutrition information for the following ingredients:
            
            {ingredients_text}
            
            Return the data in the following JSON format:
            {{
                "description": "Brief description of the combined ingredients",
                "nutrition": {{
                    "calories": number,
                    "protein": number (in grams),
                    "carbohydrates": number (in grams),
                    "fat": number (in grams),
                    "fiber": number (in grams),
                    "sugar": number (in grams),
                    "sodium": number (in milligrams)
                }},
                "serving_info": {{
                    "total_weight": number (in grams),
                    "suggested_servings": number,
                    "serving_size": "description"
                }}
            }}
            
            Provide accurate nutritional calculations based on standard nutritional databases.
            """
            
            # Call Gemini API with retry logic
            try:
                response_text = self._call_gemini_text_api(prompt)
            except Exception as e:
                logger.error(f"Failed to get response from Gemini API: {e}")
                return {
                    'success': False,
                    'error': f'Failed to calculate nutrition: {str(e)}'
                }
            
            response_text = response_text.strip()
            
            # Clean up response
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            nutrition_data = json.loads(response_text)
            
            return {
                'success': True,
                'data': nutrition_data,
                'raw_response': response.text
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return {
                'success': False,
                'error': 'Failed to parse nutrition data',
                'raw_response': response_text if 'response_text' in locals() else None
            }
        except Exception as e:
            logger.error(f"Error calculating nutrition from ingredients: {e}")
            return {
                'success': False,
                'error': str(e)
            }