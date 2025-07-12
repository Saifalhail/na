from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from decimal import Decimal
import logging
import time
from typing import Dict, List, Any, Optional

from ..models import Meal, MealItem, FoodItem, MealAnalysis, APIUsageLog
from ..serializers.ai_serializers import (
    ImageAnalysisSerializer,
    AnalysisResultSerializer,
    RecalculationRequestSerializer,
    NutritionalBreakdownSerializer,
    MealSerializer
)
from ..services.gemini_service import GeminiService
from ..services.progressive_analysis import progressive_analysis_service
from ..services.confidence_routing import confidence_routing_service
from ..exceptions import (
    AIServiceError,
    ValidationError,
    RateLimitError
)

logger = logging.getLogger(__name__)


def log_api_usage(request, endpoint_name, status_code, response_time_ms, 
                  ai_tokens_used=0, error_message=''):
    """Helper function to log API usage."""
    try:
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        APIUsageLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            endpoint=endpoint_name,
            method=request.method,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            request_body_size=len(request.body) if request.body else 0,
            response_status_code=status_code,
            response_time_ms=response_time_ms,
            ai_tokens_used=ai_tokens_used,
            error_message=error_message
        )
    except Exception as e:
        logger.error(f"Failed to log API usage: {str(e)}")


class AnalyzeImageView(APIView):
    """
    Analyze food image using AI to extract nutritional information.
    
    This endpoint:
    1. Accepts an image of food
    2. Uses AI (Google Gemini) to identify food items
    3. Creates a Meal with detected food items
    4. Returns detailed nutritional analysis
    
    Rate limit: 10 requests per minute per user
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(ratelimit(key='user', rate='10/m', method='POST'))
    def post(self, request, *args, **kwargs):
        """Process food image and return nutritional analysis."""
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {
                    'error': 'Rate limit exceeded',
                    'message': 'Maximum 10 image analyses per minute allowed',
                    'code': 'rate_limit_exceeded'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        serializer = ImageAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        image = validated_data['image']
        
        # Check if AI service is configured
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == 'your-gemini-api-key':
            return self._mock_response(image, validated_data)
        
        try:
            # Start timing
            start_time = time.time()
            
            # Initialize AI service
            gemini_service = GeminiService()
            
            # Prepare context for better analysis
            context = self._build_context(validated_data)
            
            # Analyze image
            image_bytes = image.read()
            analysis_result = gemini_service.analyze_food_image(
                image_bytes,
                context=context
            )
            
            if not analysis_result.get('success'):
                raise AIServiceError(
                    analysis_result.get('error', 'Failed to analyze image')
                )
            
            # Process analysis result and create meal
            with transaction.atomic():
                meal = self._create_meal_from_analysis(
                    user=request.user,
                    image=image,
                    analysis_data=analysis_result['data'],
                    validated_data=validated_data
                )
                
                # Record processing time
                processing_time_ms = int((time.time() - start_time) * 1000)
                
                # Create analysis record
                meal_analysis = MealAnalysis.objects.create(
                    meal=meal,
                    ai_service='gemini',
                    ai_response=analysis_result,
                    confidence_score=analysis_result['data'].get('confidence', {}).get('overall', 0.8),
                    analysis_time_ms=processing_time_ms,
                    tokens_used=analysis_result.get('tokens_used', 0)
                )
            
            # Prepare response
            response_data = {
                'meal': meal,
                'detected_items': analysis_result['data'].get('ingredients', []),
                'confidence': analysis_result['data'].get('confidence', {}),
                'processing_time_ms': processing_time_ms,
                'suggestions': analysis_result['data'].get('suggestions', [])
            }
            
            serializer = AnalysisResultSerializer(response_data)
            
            # Log successful API usage
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/analyze/',
                status_code=status.HTTP_201_CREATED,
                response_time_ms=processing_time_ms,
                ai_tokens_used=len(analysis_result['data'].get('ingredients', [])) * 100  # Rough estimate
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except AIServiceError as e:
            logger.error(f"AI service error: {str(e)}", exc_info=True)
            # Log failed API usage
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/analyze/',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                response_time_ms=processing_time,
                error_message=str(e)
            )
            return Response(
                {'error': str(e), 'code': 'AI_SERVICE_ERROR'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Unexpected error in image analysis: {str(e)}", exc_info=True)
            # Log failed API usage
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/analyze/',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                response_time_ms=processing_time,
                error_message=str(e)
            )
            return Response(
                {'error': 'An unexpected error occurred', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _build_context(self, validated_data: Dict) -> Dict[str, Any]:
        """Build context information for AI analysis."""
        context = {
            'meal_type': validated_data.get('meal_type', 'other'),
            'time_of_day': timezone.now().strftime('%H:%M'),
            'date': timezone.now().strftime('%Y-%m-%d')
        }
        
        if validated_data.get('cuisine_type'):
            context['cuisine_type'] = validated_data['cuisine_type']
        
        if validated_data.get('location_name'):
            context['location'] = validated_data['location_name']
        
        if validated_data.get('notes'):
            context['user_notes'] = validated_data['notes']
        
        return context
    
    def _create_meal_from_analysis(
        self,
        user,
        image,
        analysis_data: Dict,
        validated_data: Dict
    ) -> Meal:
        """Create meal and food items from AI analysis."""
        # Create meal
        meal = Meal.objects.create(
            user=user,
            name=analysis_data.get('description', 'Analyzed Meal'),
            meal_type=validated_data.get('meal_type', 'other'),
            consumed_at=timezone.now(),
            image=image,
            notes=validated_data.get('notes', ''),
            location_name=validated_data.get('location_name', '')
        )
        
        # Process detected ingredients
        for ingredient_data in analysis_data.get('ingredients', []):
            # Find or create food item
            food_item = self._get_or_create_food_item(ingredient_data, user)
            
            # Create meal item
            MealItem.objects.create(
                meal=meal,
                food_item=food_item,
                quantity=Decimal(str(ingredient_data.get('quantity', 100))),
                unit=ingredient_data.get('unit', 'g'),
                custom_name=ingredient_data.get('name', '')
            )
        
        return meal
    
    def _get_or_create_food_item(
        self,
        ingredient_data: Dict,
        user
    ) -> FoodItem:
        """Get existing food item or create new one from AI data."""
        # Try to find existing food item
        name = ingredient_data.get('name', 'Unknown Food')
        nutrition = ingredient_data.get('nutrition', {})
        
        # For now, create new food items for each analysis
        # In production, implement fuzzy matching to reuse existing items
        food_item = FoodItem.objects.create(
            name=name,
            calories=Decimal(str(nutrition.get('calories', 0))),
            protein=Decimal(str(nutrition.get('protein', 0))),
            carbohydrates=Decimal(str(nutrition.get('carbohydrates', 0))),
            fat=Decimal(str(nutrition.get('fat', 0))),
            fiber=Decimal(str(nutrition.get('fiber', 0))),
            sugar=Decimal(str(nutrition.get('sugar', 0))),
            sodium=Decimal(str(nutrition.get('sodium', 0))),
            source='ai',
            created_by=user,
            is_verified=False
        )
        
        return food_item
    
    def _mock_response(self, image, validated_data: Dict) -> Response:
        """Return mock response for development/testing."""
        mock_meal = {
            'id': 'mock-meal-id',
            'name': 'Mock Analyzed Meal',
            'meal_type': validated_data.get('meal_type', 'other'),
            'consumed_at': timezone.now().isoformat(),
            'total_calories': 450,
            'total_macros': {
                'protein': 25,
                'carbohydrates': 55,
                'fat': 15,
                'fiber': 8,
                'sugar': 12,
                'sodium': 800
            }
        }
        
        mock_response = {
            'meal': mock_meal,
            'detected_items': [
                {
                    'name': 'Grilled Chicken Breast',
                    'quantity': 150,
                    'unit': 'g',
                    'calories': 250,
                    'confidence': 0.9
                },
                {
                    'name': 'Brown Rice',
                    'quantity': 100,
                    'unit': 'g',
                    'calories': 110,
                    'confidence': 0.85
                },
                {
                    'name': 'Steamed Broccoli',
                    'quantity': 80,
                    'unit': 'g',
                    'calories': 30,
                    'confidence': 0.88
                }
            ],
            'confidence': {
                'overall': 0.87,
                'food_identification': 0.9,
                'portion_estimation': 0.84
            },
            'processing_time_ms': 1250,
            'suggestions': [
                'Image quality is good',
                'All items clearly visible'
            ]
        }
        
        return Response(mock_response, status=status.HTTP_200_OK)


class RecalculateNutritionView(APIView):
    """
    Recalculate nutrition based on corrected ingredients.
    
    This endpoint:
    1. Accepts a list of ingredients with quantities
    2. Uses AI to calculate accurate nutritional information
    3. Optionally updates an existing meal
    4. Returns detailed nutritional breakdown
    
    Rate limit: 20 requests per minute per user
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(ratelimit(key='user', rate='20/m', method='POST'))
    def post(self, request, *args, **kwargs):
        """Recalculate nutrition for given ingredients."""
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {
                    'error': 'Rate limit exceeded',
                    'message': 'Maximum 20 recalculations per minute allowed',
                    'code': 'rate_limit_exceeded'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        serializer = RecalculationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        ingredients = validated_data['ingredients']
        serving_size = validated_data.get('serving_size', 1)
        meal_id = validated_data.get('meal_id')
        
        # Check if AI service is configured
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == 'your-gemini-api-key':
            return self._mock_recalculation(ingredients, serving_size)
        
        try:
            # Start timing
            start_time = time.time()
            
            # Initialize AI service
            gemini_service = GeminiService()
            
            # Format ingredients for AI
            ingredient_list = [
                f"{ing['name']}: {ing['quantity']} {ing['unit']}"
                for ing in ingredients
            ]
            
            # Get nutrition calculation
            nutrition_result = gemini_service.calculate_nutrition_from_ingredients(
                ingredient_list,
                serving_size=serving_size
            )
            
            if not nutrition_result.get('success'):
                raise AIServiceError(
                    nutrition_result.get('error', 'Failed to calculate nutrition')
                )
            
            nutrition_data = nutrition_result['data']
            
            # Update existing meal if meal_id provided
            meal = None
            if meal_id:
                try:
                    meal = Meal.objects.get(id=meal_id, user=request.user)
                    meal = self._update_meal_with_recalculation(
                        meal,
                        ingredients,
                        nutrition_data
                    )
                except Meal.DoesNotExist:
                    logger.warning(f"Meal {meal_id} not found for user {request.user.id}")
            
            # Prepare response
            response_data = {
                'total_nutrition': nutrition_data['nutrition'],
                'per_serving': nutrition_data.get('per_serving', nutrition_data['nutrition']),
                'ingredients_breakdown': nutrition_data.get('ingredients_breakdown', []),
                'daily_values_percentage': self._calculate_daily_values(
                    nutrition_data.get('per_serving', nutrition_data['nutrition'])
                )
            }
            
            if meal:
                response_data['meal'] = MealSerializer(meal).data
            
            serializer = NutritionalBreakdownSerializer(data=response_data)
            serializer.is_valid(raise_exception=True)
            
            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Log successful API usage
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/recalculate/',
                status_code=status.HTTP_200_OK,
                response_time_ms=processing_time_ms,
                ai_tokens_used=len(ingredients) * 50  # Rough estimate
            )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except AIServiceError as e:
            logger.error(f"AI service error in recalculation: {str(e)}")
            # Log failed API usage
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/recalculate/',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                response_time_ms=processing_time,
                error_message=str(e)
            )
            return Response(
                {'error': str(e), 'code': 'AI_SERVICE_ERROR'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Unexpected error in recalculation: {str(e)}", exc_info=True)
            # Log failed API usage
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/recalculate/',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                response_time_ms=processing_time,
                error_message=str(e)
            )
            return Response(
                {'error': 'An unexpected error occurred', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _update_meal_with_recalculation(
        self,
        meal: Meal,
        ingredients: List[Dict],
        nutrition_data: Dict
    ) -> Meal:
        """Update meal with recalculated ingredients."""
        with transaction.atomic():
            # Clear existing meal items
            meal.meal_items.all().delete()
            
            # Create new meal items based on recalculation
            for idx, ingredient in enumerate(ingredients):
                # Get nutritional data for this ingredient
                ingredient_nutrition = nutrition_data.get('ingredients_breakdown', [])[idx] if idx < len(nutrition_data.get('ingredients_breakdown', [])) else {}
                
                # Create or get food item
                food_item = FoodItem.objects.create(
                    name=ingredient['name'],
                    brand=ingredient.get('brand', ''),
                    calories=Decimal(str(ingredient_nutrition.get('calories', 0))),
                    protein=Decimal(str(ingredient_nutrition.get('protein', 0))),
                    carbohydrates=Decimal(str(ingredient_nutrition.get('carbohydrates', 0))),
                    fat=Decimal(str(ingredient_nutrition.get('fat', 0))),
                    fiber=Decimal(str(ingredient_nutrition.get('fiber', 0))),
                    sugar=Decimal(str(ingredient_nutrition.get('sugar', 0))),
                    sodium=Decimal(str(ingredient_nutrition.get('sodium', 0))),
                    source='ai',
                    created_by=meal.user,
                    is_verified=False
                )
                
                # Create meal item
                MealItem.objects.create(
                    meal=meal,
                    food_item=food_item,
                    quantity=Decimal(str(ingredient['quantity'])),
                    unit=ingredient.get('unit', 'g'),
                    custom_name=ingredient['name']
                )
            
            # Update meal analysis if exists
            if hasattr(meal, 'analysis'):
                meal.analysis.ai_response['recalculated'] = True
                meal.analysis.ai_response['recalculation_data'] = nutrition_data
                meal.analysis.save()
        
        return meal
    
    def _calculate_daily_values(self, nutrition: Dict) -> Dict[str, float]:
        """Calculate percentage of daily recommended values."""
        # Based on 2000 calorie diet
        daily_values = {
            'calories': 2000,
            'protein': 50,
            'carbohydrates': 300,
            'fat': 65,
            'fiber': 25,
            'sugar': 50,
            'sodium': 2300
        }
        
        percentages = {}
        for nutrient, dv in daily_values.items():
            value = float(nutrition.get(nutrient, 0))
            percentages[nutrient] = round((value / dv) * 100, 1)
        
        return percentages
    
    def _mock_recalculation(
        self,
        ingredients: List[Dict],
        serving_size: int
    ) -> Response:
        """Return mock recalculation for development."""
        total_calories = sum(float(ing['quantity']) * 2 for ing in ingredients)
        total_protein = sum(float(ing['quantity']) * 0.25 for ing in ingredients)
        total_carbs = sum(float(ing['quantity']) * 0.5 for ing in ingredients)
        total_fat = sum(float(ing['quantity']) * 0.1 for ing in ingredients)
        
        total_nutrition = {
            'calories': total_calories,
            'protein': total_protein,
            'carbohydrates': total_carbs,
            'fat': total_fat,
            'fiber': total_carbs * 0.1,
            'sugar': total_carbs * 0.3,
            'sodium': total_calories * 0.5
        }
        
        per_serving = {
            nutrient: value / serving_size
            for nutrient, value in total_nutrition.items()
        }
        
        response_data = {
            'total_nutrition': total_nutrition,
            'per_serving': per_serving,
            'ingredients_breakdown': [
                {
                    'name': ing['name'],
                    'calories': float(ing['quantity']) * 2,
                    'protein': float(ing['quantity']) * 0.25,
                    'carbohydrates': float(ing['quantity']) * 0.5,
                    'fat': float(ing['quantity']) * 0.1
                }
                for ing in ingredients
            ],
            'daily_values_percentage': self._calculate_daily_values(per_serving)
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class CacheStatsView(APIView):
    """
    Get AI caching performance statistics.
    
    This endpoint provides insights into cache performance for monitoring
    and optimization purposes.
    
    Access: Staff/Admin only
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """Get comprehensive cache statistics."""
        # Only allow staff/admin access
        if not request.user.is_staff:
            return Response(
                {'error': 'Access denied - staff access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from ..services.visual_similarity_cache import visual_cache
            from ..services.ingredient_cache import ingredient_cache
            from ..services.gemini_service import GeminiService
            
            # Get visual cache statistics
            visual_stats = visual_cache.get_cache_stats()
            
            # Get ingredient cache statistics
            ingredient_stats = ingredient_cache.get_cache_stats()
            
            # Test AI service health
            gemini_service = GeminiService()
            ai_healthy = gemini_service.health_check()
            
            # Get regular cache info (basic Redis stats if available)
            regular_cache_info = {
                'backend': str(cache.__class__.__name__),
                'timeout_default': getattr(settings, 'AI_CACHE_TIMEOUT', 3600)
            }
            
            response_data = {
                'visual_similarity_cache': visual_stats,
                'ingredient_cache': ingredient_stats,
                'regular_cache': regular_cache_info,
                'ai_service_healthy': ai_healthy,
                'configuration': {
                    'use_advanced_prompts': getattr(settings, 'AI_USE_ADVANCED_PROMPTS', True),
                    'use_visual_cache': getattr(settings, 'AI_USE_VISUAL_CACHE', True),
                    'use_ingredient_cache': getattr(settings, 'AI_USE_INGREDIENT_CACHE', True),
                    'use_regular_cache': getattr(settings, 'AI_USE_CACHE', True),
                    'visual_similarity_threshold': getattr(settings, 'VISUAL_SIMILARITY_THRESHOLD', 0.75),
                    'ingredient_similarity_threshold': getattr(settings, 'INGREDIENT_SIMILARITY_THRESHOLD', 0.8),
                    'min_confidence_to_cache': getattr(settings, 'MIN_CONFIDENCE_TO_CACHE', 70),
                    'min_ingredient_confidence_to_cache': getattr(settings, 'MIN_INGREDIENT_CONFIDENCE_TO_CACHE', 70)
                },
                'timestamp': timezone.now().isoformat()
            }
            
            # Log access for audit
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/cache-stats/',
                status_code=status.HTTP_200_OK,
                response_time_ms=0  # Minimal processing time
            )
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting cache statistics: {e}")
            return Response(
                {'error': 'Failed to retrieve cache statistics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ClearCacheView(APIView):
    """
    Clear AI cache entries.
    
    This endpoint allows administrators to clear cache entries for
    maintenance or testing purposes.
    
    Access: Admin only
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Clear AI cache entries."""
        # Only allow superuser access
        if not request.user.is_superuser:
            return Response(
                {'error': 'Access denied - superuser access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from ..services.visual_similarity_cache import visual_cache
            from ..services.ingredient_cache import ingredient_cache
            
            cache_type = request.data.get('cache_type', 'visual')
            
            if cache_type == 'visual':
                success = visual_cache.clear_cache()
                message = "Visual similarity cache cleared"
            elif cache_type == 'ingredient':
                success = ingredient_cache.clear_cache()
                message = "Ingredient cache cleared"
            elif cache_type == 'all':
                # Clear all caches
                visual_success = visual_cache.clear_cache()
                ingredient_success = ingredient_cache.clear_cache()
                
                # Clear regular cache patterns
                try:
                    # This is a simplified approach - in production you might want more sophisticated cache key management
                    cache.clear()
                    regular_success = True
                except:
                    regular_success = False
                
                success = visual_success and ingredient_success and regular_success
                message = "All AI caches cleared"
            else:
                return Response(
                    {'error': 'Invalid cache_type. Use "visual", "ingredient", or "all"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if success:
                # Log cache clear action for audit
                log_api_usage(
                    request=request,
                    endpoint_name='/api/v1/ai/clear-cache/',
                    status_code=status.HTTP_200_OK,
                    response_time_ms=0
                )
                
                logger.warning(f"Cache cleared by admin user {request.user.id}: {cache_type}")
                
                return Response(
                    {
                        'success': True,
                        'message': message,
                        'cache_type': cache_type,
                        'cleared_by': request.user.username,
                        'timestamp': timezone.now().isoformat()
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'error': 'Failed to clear cache'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return Response(
                {'error': 'Failed to clear cache', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StartProgressiveAnalysisView(APIView):
    """
    Start progressive analysis for food image with real-time updates.
    
    This endpoint creates a progressive analysis session that provides
    real-time updates via WebSockets or polling.
    
    Rate limit: 5 requests per minute per user
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(ratelimit(key='user', rate='5/m', method='POST'))
    def post(self, request, *args, **kwargs):
        """Start progressive analysis session."""
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {
                    'error': 'Rate limit exceeded',
                    'message': 'Maximum 5 progressive analyses per minute allowed',
                    'code': 'rate_limit_exceeded'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        serializer = ImageAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        image = validated_data['image']
        
        try:
            # Read image data
            image_bytes = image.read()
            
            # Build context
            context = self._build_context(validated_data)
            
            # Create progressive analysis session
            session_id = progressive_analysis_service.create_analysis_session(
                user_id=request.user.id,
                image_data=image_bytes,
                context=context
            )
            
            # Start the analysis
            analysis_started = progressive_analysis_service.start_progressive_analysis(session_id)
            
            if not analysis_started:
                return Response(
                    {'error': 'Failed to start progressive analysis'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Log API usage
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/progressive-analyze/',
                status_code=status.HTTP_202_ACCEPTED,
                response_time_ms=0
            )
            
            return Response(
                {
                    'session_id': session_id,
                    'status': 'started',
                    'message': 'Progressive analysis started. Use WebSockets or polling to track progress.',
                    'websocket_group': f'user_{request.user.id}_analysis',
                    'polling_url': f'/api/v1/ai/progressive-status/{session_id}/'
                },
                status=status.HTTP_202_ACCEPTED
            )
            
        except Exception as e:
            logger.error(f"Error starting progressive analysis: {e}")
            return Response(
                {'error': 'Failed to start progressive analysis', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProgressiveAnalysisStatusView(APIView):
    """
    Get progressive analysis status (for polling clients).
    
    This endpoint allows clients without WebSocket support to poll
    for analysis progress updates.
    
    Rate limit: 30 requests per minute per user
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(ratelimit(key='user', rate='30/m', method='GET'))
    def get(self, request, session_id, *args, **kwargs):
        """Get current analysis status."""
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {
                    'error': 'Rate limit exceeded',
                    'message': 'Maximum 30 status checks per minute allowed',
                    'code': 'rate_limit_exceeded'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        try:
            # Get session status
            status_data = progressive_analysis_service.get_session_status(session_id)
            
            if not status_data:
                return Response(
                    {'error': 'Session not found or expired'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify user owns this session (basic security)
            # For better security, you might want to store user_id in session and verify
            
            return Response(status_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting progressive analysis status: {e}")
            return Response(
                {'error': 'Failed to get analysis status', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProgressiveAnalysisStatsView(APIView):
    """
    Get progressive analysis service statistics.
    
    Access: Staff/Admin only
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """Get progressive analysis service statistics."""
        # Only allow staff/admin access
        if not request.user.is_staff:
            return Response(
                {'error': 'Access denied - staff access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            service_stats = progressive_analysis_service.get_service_stats()
            
            response_data = {
                'progressive_analysis': service_stats,
                'configuration': {
                    'session_timeout': getattr(settings, 'PROGRESSIVE_ANALYSIS_TIMEOUT', 300),
                    'websocket_enabled': bool(getattr(settings, 'CHANNEL_LAYERS', None)),
                    'stages_count': len(progressive_analysis_service.analysis_stages)
                },
                'stages': [
                    {
                        'stage_id': stage['stage_id'],
                        'name': stage['name'],
                        'description': stage['description'],
                        'weight': stage['weight']
                    }
                    for stage in progressive_analysis_service.analysis_stages
                ],
                'timestamp': timezone.now().isoformat()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting progressive analysis stats: {e}")
            return Response(
                {'error': 'Failed to retrieve progressive analysis statistics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConfidenceRoutingAnalysisView(APIView):
    """
    Analyze food image using confidence-based model routing.
    
    This endpoint uses intelligent routing to select the best AI model
    based on image complexity, confidence requirements, and cost optimization.
    
    Rate limit: 8 requests per minute per user
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(ratelimit(key='user', rate='8/m', method='POST'))
    def post(self, request, *args, **kwargs):
        """Process food image using confidence-based routing."""
        # Check if rate limited
        if getattr(request, 'limited', False):
            return Response(
                {
                    'error': 'Rate limit exceeded',
                    'message': 'Maximum 8 confidence-routed analyses per minute allowed',
                    'code': 'rate_limit_exceeded'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        serializer = ImageAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        image = validated_data['image']
        
        # Check if AI service is configured
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == 'your-gemini-api-key':
            return self._mock_response(image, validated_data)
        
        try:
            # Start timing
            start_time = time.time()
            
            # Read image data
            image_bytes = image.read()
            
            # Prepare context for analysis
            context = self._build_context(validated_data)
            
            # Extract routing parameters from request
            confidence_requirement = validated_data.get('confidence_requirement')
            cost_limit = validated_data.get('cost_limit')
            speed_requirement = validated_data.get('speed_requirement', 'medium')
            
            # Route the analysis request
            routing_decision = confidence_routing_service.route_analysis_request(
                image_data=image_bytes,
                context=context,
                confidence_requirement=confidence_requirement,
                cost_limit=cost_limit,
                speed_requirement=speed_requirement
            )
            
            # Execute the routed analysis
            analysis_result = confidence_routing_service.execute_routed_analysis(
                routing_decision=routing_decision,
                image_data=image_bytes,
                context=context
            )
            
            if not analysis_result.get('success'):
                raise AIServiceError(
                    analysis_result.get('error', 'Failed to analyze image with confidence routing')
                )
            
            # Process analysis result and create meal
            with transaction.atomic():
                meal = self._create_meal_from_analysis(
                    user=request.user,
                    image=image,
                    analysis_data=analysis_result['data'],
                    validated_data=validated_data
                )
                
                # Record processing time
                processing_time_ms = int((time.time() - start_time) * 1000)
                
                # Create analysis record with routing info
                routing_info = analysis_result.get('routing_info', {})
                ai_response = analysis_result.copy()
                ai_response['routing_decision'] = asdict(routing_decision) if hasattr(routing_decision, '__dict__') else routing_decision
                
                meal_analysis = MealAnalysis.objects.create(
                    meal=meal,
                    ai_service=routing_info.get('model_used', 'confidence_routed'),
                    ai_response=ai_response,
                    confidence_score=analysis_result['data'].get('confidence', {}).get('overall', 0.8),
                    analysis_time_ms=processing_time_ms,
                    tokens_used=analysis_result.get('tokens_used', 0)
                )
            
            # Prepare response with routing information
            response_data = {
                'meal': meal,
                'detected_items': analysis_result['data'].get('ingredients', []),
                'confidence': analysis_result['data'].get('confidence', {}),
                'processing_time_ms': processing_time_ms,
                'suggestions': analysis_result['data'].get('suggestions', []),
                'routing_info': {
                    'model_used': routing_info.get('model_used'),
                    'routing_reasoning': routing_info.get('routing_reasoning'),
                    'estimated_cost': routing_info.get('estimated_cost'),
                    'actual_time': routing_info.get('actual_time'),
                    'primary_model_failed': routing_info.get('primary_model_failed')
                }
            }
            
            serializer = AnalysisResultSerializer(response_data)
            
            # Log successful API usage
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/confidence-analyze/',
                status_code=status.HTTP_201_CREATED,
                response_time_ms=processing_time_ms,
                ai_tokens_used=len(analysis_result['data'].get('ingredients', [])) * 100  # Rough estimate
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except AIServiceError as e:
            logger.error(f"AI service error in confidence routing: {str(e)}", exc_info=True)
            # Log failed API usage
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/confidence-analyze/',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                response_time_ms=processing_time,
                error_message=str(e)
            )
            return Response(
                {'error': str(e), 'code': 'AI_SERVICE_ERROR'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Unexpected error in confidence routing analysis: {str(e)}", exc_info=True)
            # Log failed API usage
            processing_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            log_api_usage(
                request=request,
                endpoint_name='/api/v1/ai/confidence-analyze/',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                response_time_ms=processing_time,
                error_message=str(e)
            )
            return Response(
                {'error': 'An unexpected error occurred', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConfidenceRoutingStatsView(APIView):
    """
    Get confidence routing service statistics.
    
    Access: Staff/Admin only
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """Get confidence routing statistics."""
        # Only allow staff/admin access
        if not request.user.is_staff:
            return Response(
                {'error': 'Access denied - staff access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            routing_stats = confidence_routing_service.get_routing_stats()
            
            response_data = {
                'confidence_routing': routing_stats,
                'configuration': {
                    'enabled': getattr(settings, 'AI_USE_CONFIDENCE_ROUTING', False),
                    'default_confidence_threshold': getattr(settings, 'DEFAULT_CONFIDENCE_THRESHOLD', 75.0),
                    'enable_cost_optimization': getattr(settings, 'ENABLE_COST_OPTIMIZATION', True),
                    'max_cost_per_request': getattr(settings, 'MAX_COST_PER_REQUEST', 0.10),
                    'enable_fallback_routing': getattr(settings, 'ENABLE_FALLBACK_ROUTING', True)
                },
                'timestamp': timezone.now().isoformat()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting confidence routing stats: {e}")
            return Response(
                {'error': 'Failed to retrieve confidence routing statistics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )