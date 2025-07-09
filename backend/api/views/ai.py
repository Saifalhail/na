from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import logging
import time
from typing import Dict, List, Any, Optional

from ..models import Meal, MealItem, FoodItem, MealAnalysis
from ..serializers.ai_serializers import (
    ImageAnalysisSerializer,
    AnalysisResultSerializer,
    RecalculationRequestSerializer,
    NutritionalBreakdownSerializer,
    MealSerializer
)
from ..services.gemini_service import GeminiService
from ..exceptions import (
    AIServiceError,
    ValidationError,
    RateLimitError
)

logger = logging.getLogger(__name__)


class AnalyzeImageView(APIView):
    """
    Analyze food image using AI to extract nutritional information.
    
    This endpoint:
    1. Accepts an image of food
    2. Uses AI (Google Gemini) to identify food items
    3. Creates a Meal with detected food items
    4. Returns detailed nutritional analysis
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Process food image and return nutritional analysis."""
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
                    processing_time_ms=processing_time_ms,
                    detected_items_count=len(analysis_result['data'].get('ingredients', [])),
                    analysis_version='1.0'
                )
            
            # Prepare response
            response_data = {
                'meal': MealSerializer(meal).data,
                'detected_items': analysis_result['data'].get('ingredients', []),
                'confidence': analysis_result['data'].get('confidence', {}),
                'processing_time_ms': processing_time_ms,
                'suggestions': analysis_result['data'].get('suggestions', [])
            }
            
            serializer = AnalysisResultSerializer(data=response_data)
            serializer.is_valid(raise_exception=True)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except AIServiceError as e:
            logger.error(f"AI service error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e), 'code': 'AI_SERVICE_ERROR'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Unexpected error in image analysis: {str(e)}", exc_info=True)
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
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Recalculate nutrition for given ingredients."""
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
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except AIServiceError as e:
            logger.error(f"AI service error in recalculation: {str(e)}")
            return Response(
                {'error': str(e), 'code': 'AI_SERVICE_ERROR'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Unexpected error in recalculation: {str(e)}", exc_info=True)
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