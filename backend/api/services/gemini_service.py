import base64
import hashlib
import io
import json
import logging
import time
from datetime import datetime
from functools import wraps
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
from django.conf import settings
from django.core.cache import cache
from PIL import Image

from ..exceptions import AIServiceError, RateLimitError
from ..utils.circuit_breaker import circuit_breaker, CircuitBreakerError
from .advanced_prompt_engine import AdvancedPromptEngine
from .ingredient_cache import ingredient_cache
from .visual_similarity_cache import visual_cache

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

                    # Check if it's a rate limit error
                    if "quota" in str(e).lower() or "rate limit" in str(e).lower():
                        raise RateLimitError(f"API rate limit exceeded: {str(e)}")

                    # Check if it's a permanent error that shouldn't be retried
                    if (
                        "invalid" in str(e).lower()
                        or "authentication" in str(e).lower()
                    ):
                        raise AIServiceError(f"API authentication error: {str(e)}")

                    if attempt < max_retries:
                        logger.warning(
                            f"Attempt {attempt + 1} failed for {func.__name__}: {str(e)}. "
                            f"Retrying in {current_delay} seconds..."
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"All {max_retries + 1} attempts failed for {func.__name__}"
                        )

            # If all retries failed, raise the last exception
            raise AIServiceError(
                f"Failed after {max_retries + 1} attempts: {str(last_exception)}"
            )

        return wrapper

    return decorator


class GeminiService:
    """Service for interacting with Google's Gemini API for food image analysis."""

    def __init__(self):
        """Initialize the Gemini service with API key."""
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in settings")

        genai.configure(api_key=settings.GEMINI_API_KEY)

        # Use the best available model
        model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-pro")
        self.model = genai.GenerativeModel(model_name)

        # Cache configuration
        self.cache_timeout = getattr(
            settings, "AI_CACHE_TIMEOUT", 3600
        )  # 1 hour default
        self.use_cache = getattr(settings, "AI_USE_CACHE", True)

        # Advanced prompt engineering
        self.prompt_engine = AdvancedPromptEngine()
        self.use_advanced_prompts = getattr(settings, "AI_USE_ADVANCED_PROMPTS", True)

        # Visual similarity caching
        self.use_visual_cache = getattr(settings, "AI_USE_VISUAL_CACHE", True)

        # Ingredient-based caching
        self.use_ingredient_cache = getattr(settings, "AI_USE_INGREDIENT_CACHE", True)

        # Confidence routing (optional integration)
        self.use_confidence_routing = getattr(
            settings, "AI_USE_CONFIDENCE_ROUTING", False
        )

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
        required_fields = [
            "description",
            "servings",
            "serving_size",
            "ingredients",
            "nutrition",
        ]
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")

        if errors:
            raise ValueError(f"Invalid response structure: {'; '.join(errors)}")

        # Validate servings
        if not isinstance(data["servings"], (int, float)) or data["servings"] <= 0:
            data["servings"] = 1
            logger.warning("Invalid servings value, defaulting to 1")

        # Validate ingredients
        validated_ingredients = []
        for idx, ingredient in enumerate(data.get("ingredients", [])):
            if not isinstance(ingredient, dict):
                logger.warning(f"Skipping invalid ingredient at index {idx}")
                continue

            # Ensure required ingredient fields
            if "name" not in ingredient:
                logger.warning(f"Skipping ingredient without name at index {idx}")
                continue

            # Set defaults for missing values
            validated_ingredient = {
                "name": str(ingredient["name"]),
                "quantity": float(ingredient.get("quantity", 0)),
                "unit": str(ingredient.get("unit", "g")),
                "calories": self._validate_numeric(ingredient.get("calories"), 0, 5000),
                "protein": self._validate_numeric(ingredient.get("protein"), 0, 500),
                "carbohydrates": self._validate_numeric(
                    ingredient.get("carbohydrates"), 0, 500
                ),
                "fat": self._validate_numeric(ingredient.get("fat"), 0, 500),
            }

            # Add optional fields if present
            if "preparation" in ingredient:
                validated_ingredient["preparation"] = str(ingredient["preparation"])

            validated_ingredients.append(validated_ingredient)

        data["ingredients"] = validated_ingredients

        # Validate nutrition totals
        nutrition = data.get("nutrition", {})
        data["nutrition"] = {
            "calories": self._validate_numeric(nutrition.get("calories"), 0, 10000),
            "protein": self._validate_numeric(nutrition.get("protein"), 0, 1000),
            "carbohydrates": self._validate_numeric(
                nutrition.get("carbohydrates"), 0, 1000
            ),
            "fat": self._validate_numeric(nutrition.get("fat"), 0, 1000),
            "fiber": self._validate_numeric(nutrition.get("fiber"), 0, 100),
            "sugar": self._validate_numeric(nutrition.get("sugar"), 0, 500),
            "sodium": self._validate_numeric(nutrition.get("sodium"), 0, 10000),
        }

        # Add optional fields with defaults
        if "cooking_method" not in data:
            data["cooking_method"] = "unknown"

        # Validate reasoning field from advanced prompts (optional)
        if "reasoning" in data and isinstance(data["reasoning"], dict):
            # Keep reasoning field if present and valid
            pass
        elif "reasoning" in data:
            # Remove invalid reasoning field
            logger.warning("Invalid reasoning field detected, removing")
            del data["reasoning"]

        if "confidence" not in data:
            data["confidence"] = {
                "overall": 75,
                "ingredients_identified": 75,
                "portions_estimated": 75,
            }
        else:
            # Validate confidence scores
            confidence = data["confidence"]
            if isinstance(confidence, dict):
                # Ensure all confidence scores are valid numbers between 0-100
                for key in ["overall", "ingredients_identified", "portions_estimated"]:
                    if key in confidence:
                        confidence[key] = (
                            self._validate_numeric(confidence[key], 0, 100) or 75
                        )
                    else:
                        confidence[key] = 75

                # Add cooking_method confidence if present in advanced prompts
                if "cooking_method" in confidence:
                    confidence["cooking_method"] = (
                        self._validate_numeric(confidence["cooking_method"], 0, 100)
                        or 75
                    )

        return data

    def _validate_numeric(
        self, value: Any, min_val: float, max_val: float
    ) -> Optional[float]:
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

    def _build_context_prompt(self, context: Dict[str, Any]) -> str:
        """Build context information for the prompt."""
        context_parts = []

        if context.get("meal_type"):
            context_parts.append(f"This is a {context['meal_type']} meal.")

        if context.get("cuisine_type"):
            context_parts.append(f"The cuisine type is {context['cuisine_type']}.")

        if context.get("time_of_day"):
            context_parts.append(
                f"The meal is being consumed at {context['time_of_day']}."
            )

        if context.get("location"):
            context_parts.append(f"The meal is from {context['location']}.")

        if context.get("user_notes"):
            context_parts.append(f"Additional context: {context['user_notes']}")

        if context_parts:
            return (
                "Context:\n" + "\n".join(f"- {part}" for part in context_parts) + "\n"
            )

        return ""

    def _build_legacy_prompt(self, context_info: str) -> str:
        """Build the legacy prompt format for backward compatibility."""
        return f"""
        Analyze this food image and provide detailed nutritional information.
        
        {context_info}
        
        Instructions:
        1. Identify all visible ingredients and their estimated quantities
        2. Calculate nutrition for EACH individual ingredient
        3. Provide total nutrition information per serving
        4. Consider cooking methods (fried, grilled, etc.) when estimating
        5. Be specific about portion sizes and units
        
        Return ONLY valid JSON in the following format (no markdown, no explanations):
        {{
            "description": "Brief description of the dish",
            "servings": number,
            "serving_size": "specific description (e.g., 1 burger, 2 cups, 250g)",
            "cooking_method": "grilled/fried/baked/raw/etc",
            "ingredients": [
                {{
                    "name": "ingredient name",
                    "quantity": number,
                    "unit": "grams/ml/pieces/etc",
                    "calories": number,
                    "protein": number (grams),
                    "carbohydrates": number (grams),
                    "fat": number (grams),
                    "preparation": "how it's prepared (optional)"
                }}
            ],
            "nutrition": {{
                "calories": number (total for the serving),
                "protein": number (grams),
                "carbohydrates": number (grams),
                "fat": number (grams),
                "fiber": number (grams),
                "sugar": number (grams),
                "sodium": number (milligrams)
            }},
            "confidence": {{
                "overall": number (0-100),
                "ingredients_identified": number (0-100),
                "portions_estimated": number (0-100)
            }}
        }}
        
        Important:
        - For ingredients, prefer weight units (grams) when possible
        - Include cooking oil/butter if food appears cooked
        - Account for typical condiments/sauces visible
        - If unsure about exact values, use typical nutritional database values
        - Ensure individual ingredient nutrition adds up reasonably to the total
        """

    @retry_on_failure(max_retries=3, delay=2.0)
    @circuit_breaker(
        name="gemini_api_call", 
        failure_threshold=3,
        recovery_timeout=180,  # 3 minutes
        expected_exception=(AIServiceError, Exception)
    )
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
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        response = self.model.generate_content(
            [prompt, {"mime_type": "image/jpeg", "data": image_base64}]
        )

        if not response.text:
            raise ValueError("Empty response from Gemini API")

        return response.text

    @retry_on_failure(max_retries=3, delay=2.0)
    @circuit_breaker(
        name="gemini_text_api",
        failure_threshold=3, 
        recovery_timeout=180,  # 3 minutes
        expected_exception=(AIServiceError, Exception)
    )
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

    @circuit_breaker(
        name="gemini_food_analysis",
        failure_threshold=3,
        recovery_timeout=300,  # 5 minutes
        expected_exception=(AIServiceError, Exception)
    )
    def analyze_food_image(
        self, image_data: bytes, context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
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
                return {"success": False, "error": "Invalid image format"}
            # Check visual similarity cache first (if enabled)
            if self.use_visual_cache:
                similar_result = visual_cache.find_similar_analysis(image_data, context)
                if similar_result:
                    logger.info("Returning visually similar cached analysis")
                    return similar_result

            # Generate cache key for regular caching if enabled
            cache_key = None
            if self.use_cache:
                image_hash = hashlib.sha256(image_data).hexdigest()[:16]
                context_hash = hashlib.sha256(
                    json.dumps(context or {}, sort_keys=True).encode()
                ).hexdigest()[:8]
                cache_key = f"gemini_analysis_{image_hash}_{context_hash}"

                # Check regular cache
                cached_result = cache.get(cache_key)
                if cached_result:
                    logger.info(f"Returning cached analysis for key: {cache_key}")
                    return cached_result

            # Use advanced prompt engineering if enabled
            if self.use_advanced_prompts:
                # Estimate complexity for better prompt selection
                complexity_hint = self.prompt_engine.estimate_complexity(context)

                # Build enhanced prompt with multi-shot examples and advanced reasoning
                prompt = self.prompt_engine.build_enhanced_prompt(
                    context=context, complexity_hint=complexity_hint, use_examples=True
                )

                logger.info(
                    f"Using advanced prompt engineering (complexity: {complexity_hint})"
                )
            else:
                # Fallback to legacy prompt for compatibility
                context_info = self._build_context_prompt(context) if context else ""
                prompt = self._build_legacy_prompt(context_info)

            # Call Gemini API with retry logic
            try:
                response_text = self._call_gemini_api(prompt, image_data)
            except Exception as e:
                logger.error(f"Failed to get response from Gemini API: {e}")
                return {"success": False, "error": f"Failed to analyze image: {str(e)}"}

            # Clean and extract JSON from response
            response_text = response_text.strip()

            # Try to parse JSON from the response
            # Sometimes Gemini wraps JSON in markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]  # Remove ```json
            if response_text.endswith("```"):
                response_text = response_text[:-3]  # Remove ```

            nutrition_data = json.loads(response_text)

            # Validate and clean the response
            try:
                validated_data = self._validate_nutrition_response(nutrition_data)
            except ValueError as e:
                logger.error(f"Invalid response format: {e}")
                return {
                    "success": False,
                    "error": f"Invalid response format: {str(e)}",
                    "raw_response": response_text,
                }

            result = {
                "success": True,
                "data": validated_data,
                "raw_response": response_text,
            }

            # Cache successful result in regular cache
            if self.use_cache and cache_key:
                cache.set(cache_key, result, self.cache_timeout)
                logger.info(f"Cached analysis result for key: {cache_key}")

            # Store in visual similarity cache for future similar image matching
            if self.use_visual_cache:
                try:
                    visual_cache.store_analysis(image_data, result, context)
                    logger.debug("Stored result in visual similarity cache")
                except Exception as e:
                    logger.warning(f"Failed to store in visual cache: {e}")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return {
                "success": False,
                "error": "Failed to parse nutrition data",
                "raw_response": response_text if "response_text" in locals() else None,
            }
        except Exception as e:
            logger.error(f"Error analyzing image with Gemini: {e}")
            return {"success": False, "error": str(e)}

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
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            return json.loads(response_text)

        except Exception as e:
            logger.error(f"Error extracting nutrition from text: {e}")
            return None

    def calculate_nutrition_from_ingredients(
        self, ingredients: list, serving_size: int = 1
    ) -> Dict[str, Any]:
        """
        Calculate nutrition information from a list of ingredients.

        Args:
            ingredients: List of ingredient strings with quantities (e.g., ["chicken breast: 200g", "rice: 100g"])

        Returns:
            Dict containing calculated nutrition information
        """
        try:
            # Parse ingredients into structured format
            parsed_ingredients = self._parse_ingredients_list(ingredients)

            # Check ingredient cache for combination first
            if self.use_ingredient_cache:
                cached_result = ingredient_cache.find_combination(
                    parsed_ingredients, serving_size
                )
                if cached_result:
                    logger.info("Returning cached ingredient combination analysis")
                    return cached_result

            ingredients_text = "\n".join(
                f"- {ingredient}" for ingredient in ingredients
            )

            prompt = f"""
            Calculate the total nutrition information for the following ingredients:
            
            {ingredients_text}
            
            This recipe makes {serving_size} serving(s).
            
            Return the data in the following JSON format:
            {{
                "description": "Brief description of the combined ingredients",
                "nutrition": {{
                    "calories": number (total for all ingredients),
                    "protein": number (in grams),
                    "carbohydrates": number (in grams),
                    "fat": number (in grams),
                    "fiber": number (in grams),
                    "sugar": number (in grams),
                    "sodium": number (in milligrams)
                }},
                "per_serving": {{
                    "calories": number (per serving),
                    "protein": number (in grams),
                    "carbohydrates": number (in grams),
                    "fat": number (in grams),
                    "fiber": number (in grams),
                    "sugar": number (in grams),
                    "sodium": number (in milligrams)
                }},
                "ingredients_breakdown": [
                    {{
                        "name": "ingredient name",
                        "calories": number,
                        "protein": number,
                        "carbohydrates": number,
                        "fat": number
                    }}
                ],
                "serving_info": {{
                    "total_weight": number (in grams),
                    "servings": {serving_size},
                    "serving_size": "description"
                }}
            }}
            
            Provide accurate nutritional calculations based on standard nutritional databases.
            Be precise with the nutritional values for each ingredient.
            """

            # Call Gemini API with retry logic
            try:
                response_text = self._call_gemini_text_api(prompt)
            except Exception as e:
                logger.error(f"Failed to get response from Gemini API: {e}")
                return {
                    "success": False,
                    "error": f"Failed to calculate nutrition: {str(e)}",
                }

            response_text = response_text.strip()

            # Clean up response
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            nutrition_data = json.loads(response_text)

            result = {
                "success": True,
                "data": nutrition_data,
                "raw_response": response_text,
            }

            # Store in ingredient cache for future combination matching
            if self.use_ingredient_cache:
                try:
                    ingredient_cache.store_combination(
                        parsed_ingredients, result, serving_size
                    )
                    logger.debug("Stored result in ingredient cache")
                except Exception as e:
                    logger.warning(f"Failed to store in ingredient cache: {e}")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return {
                "success": False,
                "error": "Failed to parse nutrition data",
                "raw_response": response_text if "response_text" in locals() else None,
            }
        except Exception as e:
            logger.error(f"Error calculating nutrition from ingredients: {e}")
            return {"success": False, "error": str(e)}

    def _parse_ingredients_list(self, ingredients: List[str]) -> List[Dict[str, Any]]:
        """
        Parse ingredient strings into structured format for caching.

        Args:
            ingredients: List of ingredient strings (e.g., "chicken breast: 200g")

        Returns:
            List of ingredient dictionaries
        """
        parsed = []

        for ingredient_str in ingredients:
            try:
                # Split by colon or other separators
                if ":" in ingredient_str:
                    name_part, quantity_part = ingredient_str.split(":", 1)
                else:
                    # Try to extract quantity from the end
                    parts = ingredient_str.strip().split()
                    if len(parts) >= 2:
                        # Assume last part is quantity + unit
                        quantity_part = parts[-1]
                        name_part = " ".join(parts[:-1])
                    else:
                        name_part = ingredient_str
                        quantity_part = "100g"  # Default

                name = name_part.strip()
                quantity_part = quantity_part.strip()

                # Extract quantity and unit
                import re

                quantity_match = re.match(
                    r"(\d+(?:\.\d+)?)\s*([a-zA-Z]*)", quantity_part
                )

                if quantity_match:
                    quantity = float(quantity_match.group(1))
                    unit = quantity_match.group(2) or "g"
                else:
                    quantity = 100.0  # Default
                    unit = "g"

                parsed.append({"name": name, "quantity": quantity, "unit": unit})

            except Exception as e:
                logger.warning(f"Failed to parse ingredient '{ingredient_str}': {e}")
                # Add a basic entry
                parsed.append({"name": ingredient_str, "quantity": 100.0, "unit": "g"})

        return parsed

    def health_check(self) -> bool:
        """
        Perform a health check to verify AI service functionality.

        Returns:
            True if the service is healthy, False otherwise
        """
        try:
            # Test basic API connectivity with a simple prompt
            test_prompt = 'Respond with exactly this JSON: {"status": "healthy"}'

            response = self.model.generate_content(test_prompt)

            if not response.text:
                logger.error("Health check failed: Empty response from Gemini API")
                return False

            # Check if advanced prompt engine is working
            if self.use_advanced_prompts:
                try:
                    # Test advanced prompt engine initialization
                    complexity = self.prompt_engine.estimate_complexity()
                    if complexity not in ["low", "medium", "high"]:
                        logger.error(
                            f"Health check failed: Invalid complexity estimate: {complexity}"
                        )
                        return False

                    # Test prompt generation
                    test_context = {"meal_type": "lunch", "cuisine_type": "italian"}
                    prompt = self.prompt_engine.build_enhanced_prompt(
                        context=test_context,
                        complexity_hint="medium",
                        use_examples=False,  # Don't use examples for health check
                    )

                    if not prompt or len(prompt) < 100:
                        logger.error(
                            "Health check failed: Advanced prompt generation failed"
                        )
                        return False

                    logger.info("Advanced prompt engine health check passed")

                except Exception as e:
                    logger.error(
                        f"Health check failed: Advanced prompt engine error: {e}"
                    )
                    return False

            # Check visual similarity cache if enabled
            if self.use_visual_cache:
                try:
                    cache_stats = visual_cache.get_cache_stats()
                    if cache_stats["max_entries"] <= 0:
                        logger.error(
                            "Health check failed: Invalid visual cache configuration"
                        )
                        return False

                    logger.info(
                        f"Visual similarity cache health check passed (entries: {cache_stats['cached_entries']})"
                    )

                except Exception as e:
                    logger.error(f"Health check failed: Visual cache error: {e}")
                    return False

            # Check ingredient cache if enabled
            if self.use_ingredient_cache:
                try:
                    ingredient_stats = ingredient_cache.get_cache_stats()
                    if ingredient_stats["max_ingredients"] <= 0:
                        logger.error(
                            "Health check failed: Invalid ingredient cache configuration"
                        )
                        return False

                    logger.info(
                        f"Ingredient cache health check passed (ingredients: {ingredient_stats['cached_ingredients']}, combinations: {ingredient_stats['cached_combinations']})"
                    )

                except Exception as e:
                    logger.error(f"Health check failed: Ingredient cache error: {e}")
                    return False

            logger.info("Gemini service health check passed")
            return True

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
