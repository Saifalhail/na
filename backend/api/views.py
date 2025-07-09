from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.conf import settings
from decimal import Decimal
import logging

from .serializers import (
    ImageUploadSerializer, NutritionDataSerializer, 
    RecalculateNutritionSerializer, NutritionAnalysisResponseSerializer,
    IngredientSerializer, RecalculationRequestSerializer, SimpleIngredientSerializer
)
from .models import NutritionData, RecipeIngredient
from .services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class AnalyzeImageView(APIView):
    """
    Analyze food image and extract nutritional information.
    
    Accepts a POST request with an image and analyzes it using Google Gemini Vision API.
    Returns detailed nutrition information and a list of detected ingredients.
    
    If Gemini API is not configured, returns mock data for testing purposes.
    """
    def post(self, request, *args, **kwargs):
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        image = serializer.validated_data['image']
        image_bytes = image.read()
        
        # Use Gemini service if API key is configured, otherwise use mock
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != 'your-gemini-api-key':
            try:
                gemini_service = GeminiService()
                analysis_result = gemini_service.analyze_food_image(image_bytes)
                
                if not analysis_result.get('success'):
                    return Response(
                        {'error': analysis_result.get('error', 'Failed to analyze image')},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Extract data from Gemini response
                gemini_data = analysis_result['data']
                
                # Create NutritionData instance
                nutrition_data = NutritionData.objects.create(
                    image=image,
                    gemini_response=analysis_result,
                    calories=gemini_data['nutrition'].get('calories'),
                    protein=gemini_data['nutrition'].get('protein'),
                    carbohydrates=gemini_data['nutrition'].get('carbohydrates'),
                    fat=gemini_data['nutrition'].get('fat'),
                    fiber=gemini_data['nutrition'].get('fiber'),
                    sugar=gemini_data['nutrition'].get('sugar'),
                    sodium=gemini_data['nutrition'].get('sodium'),
                    serving_size=gemini_data.get('serving_size', ''),
                    servings_per_recipe=gemini_data.get('servings', 1)
                )
                
                # Create ingredient records with nutritional data
                for ingredient in gemini_data.get('ingredients', []):
                    RecipeIngredient.objects.create(
                        nutrition_data=nutrition_data,
                        name=ingredient['name'],
                        quantity=ingredient.get('quantity', 0),
                        unit=ingredient.get('unit', 'g'),
                        calories=ingredient.get('calories'),
                        protein=ingredient.get('protein'),
                        carbohydrates=ingredient.get('carbohydrates'),
                        fat=ingredient.get('fat')
                    )
                
                # Prepare response
                response_data = {
                    'nutrition_data_id': nutrition_data.id,
                    'description': gemini_data.get('description', ''),
                    'cooking_method': gemini_data.get('cooking_method', ''),
                    'confidence': gemini_data.get('confidence', {}),
                    'nutrition': NutritionDataSerializer(nutrition_data).data,
                    'gemini_analysis': gemini_data
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Error analyzing image: {e}")
                return Response(
                    {'error': 'Failed to analyze image', 'details': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Mock response for development
            image_size = len(image_bytes)
            mock_response = {
                'description': f"Mock AI Response: Received image of size {image_size} bytes.",
                'message': 'Gemini API key not configured. Using mock response.'
            }
            return Response(mock_response, status=status.HTTP_200_OK)


class NutritionDataDetailView(generics.RetrieveAPIView):
    """Get nutrition data by ID."""
    queryset = NutritionData.objects.all()
    serializer_class = NutritionDataSerializer


class RecalculateNutritionView(APIView):
    """
    Recalculate nutrition values based on new serving size or ingredient quantities.
    """
    def post(self, request, pk):
        nutrition_data = get_object_or_404(NutritionData, pk=pk)
        serializer = RecalculateNutritionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        new_servings = serializer.validated_data['servings']
        ingredient_updates = serializer.validated_data.get('ingredients', [])
        
        # Update ingredient quantities if provided
        if ingredient_updates:
            for update in ingredient_updates:
                try:
                    ingredient = RecipeIngredient.objects.get(
                        id=update['id'], 
                        nutrition_data=nutrition_data
                    )
                    ingredient.quantity = Decimal(update['quantity'])
                    ingredient.save()
                except RecipeIngredient.DoesNotExist:
                    return Response(
                        {'error': f"Ingredient with id {update['id']} not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
        
        # Recalculate nutrition values
        recalculated = nutrition_data.recalculate_nutrition(new_servings)
        
        # Add original values for comparison
        original = {
            'calories': float(nutrition_data.calories) if nutrition_data.calories else None,
            'protein': float(nutrition_data.protein) if nutrition_data.protein else None,
            'carbohydrates': float(nutrition_data.carbohydrates) if nutrition_data.carbohydrates else None,
            'fat': float(nutrition_data.fat) if nutrition_data.fat else None,
            'fiber': float(nutrition_data.fiber) if nutrition_data.fiber else None,
            'sugar': float(nutrition_data.sugar) if nutrition_data.sugar else None,
            'sodium': float(nutrition_data.sodium) if nutrition_data.sodium else None,
            'servings': float(nutrition_data.servings_per_recipe)
        }
        
        response_data = {
            'nutrition_data_id': nutrition_data.id,
            'original': {k: v for k, v in original.items() if v is not None},
            'recalculated': recalculated,
            'ingredients': IngredientSerializer(
                nutrition_data.ingredients.all(), 
                many=True
            ).data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class IngredientsListView(generics.ListAPIView):
    """List all ingredients for a nutrition data entry."""
    serializer_class = IngredientSerializer
    
    def get_queryset(self):
        nutrition_data_id = self.kwargs.get('nutrition_data_id')
        return RecipeIngredient.objects.filter(nutrition_data_id=nutrition_data_id)


class RecalculateView(APIView):
    """
    Image-less endpoint that recalculates nutrition based on corrected ingredients.
    Accepts a JSON object with a list of ingredients and their weights.
    """
    def post(self, request, *args, **kwargs):
        serializer = RecalculationRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        ingredients = serializer.validated_data['ingredients']
        
        # Use Gemini service to calculate nutrition from ingredients
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != 'your-gemini-api-key':
            try:
                gemini_service = GeminiService()
                
                # Format ingredients for Gemini
                ingredient_list = [
                    f"{ing['name']}: {ing['estimated_grams']}g" 
                    for ing in ingredients
                ]
                
                # Get nutrition calculation from Gemini
                nutrition_result = gemini_service.calculate_nutrition_from_ingredients(ingredient_list)
                
                if not nutrition_result.get('success'):
                    return Response(
                        {'error': nutrition_result.get('error', 'Failed to calculate nutrition')},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Return the calculated nutrition data
                response_data = {
                    'ingredients': ingredients,
                    'nutrition': nutrition_result['data']['nutrition'],
                    'serving_info': nutrition_result['data'].get('serving_info', {}),
                    'gemini_response': nutrition_result['data']
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Error calculating nutrition: {e}")
                return Response(
                    {'error': 'Failed to calculate nutrition', 'details': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Mock response for development
            mock_nutrition = {
                'calories': sum(float(ing['estimated_grams']) * 2 for ing in ingredients),
                'protein': sum(float(ing['estimated_grams']) * 0.25 for ing in ingredients),
                'carbohydrates': sum(float(ing['estimated_grams']) * 0.5 for ing in ingredients),
                'fat': sum(float(ing['estimated_grams']) * 0.1 for ing in ingredients),
                'fiber': sum(float(ing['estimated_grams']) * 0.05 for ing in ingredients),
                'sugar': sum(float(ing['estimated_grams']) * 0.2 for ing in ingredients),
                'sodium': sum(float(ing['estimated_grams']) * 0.01 for ing in ingredients),
            }
            
            response_data = {
                'ingredients': ingredients,
                'nutrition': mock_nutrition,
                'message': 'Gemini API key not configured. Using mock calculation.'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)