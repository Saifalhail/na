from rest_framework import serializers
from decimal import Decimal
from typing import Dict, List, Any
from ..models import Meal, MealItem, FoodItem, MealAnalysis
from django.utils.translation import gettext_lazy as _


class FoodItemSerializer(serializers.ModelSerializer):
    """Serializer for food items with nutritional information."""
    
    class Meta:
        model = FoodItem
        fields = [
            'id', 'name', 'brand', 'barcode', 'calories', 'protein',
            'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium',
            'saturated_fat', 'trans_fat', 'cholesterol', 'potassium',
            'vitamin_a', 'vitamin_c', 'calcium', 'iron',
            'source', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_verified']


class MealItemSerializer(serializers.ModelSerializer):
    """Serializer for meal items with calculated nutritional values."""
    food_item = FoodItemSerializer(read_only=True)
    food_item_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = MealItem
        fields = [
            'id', 'meal', 'food_item', 'food_item_id', 'quantity', 'unit',
            'calories', 'protein', 'carbohydrates', 'fat', 'fiber',
            'sugar', 'sodium', 'custom_name', 'notes', 'created_at'
        ]
        read_only_fields = [
            'id', 'calories', 'protein', 'carbohydrates', 'fat',
            'fiber', 'sugar', 'sodium', 'created_at'
        ]


class MealAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for meal analysis results."""
    
    class Meta:
        model = MealAnalysis
        fields = [
            'id', 'meal', 'ai_service', 'ai_response', 'confidence_score',
            'analysis_time_ms', 'tokens_used', 'is_accurate', 'user_notes',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MealSerializer(serializers.ModelSerializer):
    """Serializer for meals with nested items and analysis."""
    meal_items = MealItemSerializer(many=True, read_only=True)
    analysis = MealAnalysisSerializer(read_only=True)
    total_calories = serializers.ReadOnlyField()
    total_macros = serializers.ReadOnlyField()
    
    class Meta:
        model = Meal
        fields = [
            'id', 'user', 'name', 'meal_type', 'consumed_at', 'image',
            'notes', 'location_name', 'latitude', 'longitude',
            'meal_items', 'analysis', 'total_calories', 'total_macros',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class ImageAnalysisSerializer(serializers.Serializer):
    """Validates image upload for AI analysis."""
    image = serializers.ImageField(
        required=True,
        help_text=_('Food image to analyze (max 10MB, JPEG/PNG/WebP/HEIC)')
    )
    meal_type = serializers.ChoiceField(
        choices=Meal.MEAL_TYPE_CHOICES,
        required=False,
        default='other',
        help_text=_('Type of meal for context')
    )
    cuisine_type = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text=_('Cuisine type for better analysis (e.g., Italian, Chinese)')
    )
    location_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text=_('Location where meal was consumed')
    )
    notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text=_('Additional context about the meal')
    )
    
    # Allowed image formats
    ALLOWED_FORMATS = ['JPEG', 'JPG', 'PNG', 'WEBP', 'HEIC', 'HEIF']
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MIN_DIMENSION = 100  # Minimum width/height
    MAX_DIMENSION = 4096  # Maximum width/height
    
    def validate_image(self, value):
        """
        Validate image file:
        - Check file size
        - Verify format
        - Check dimensions
        """
        # Check file size
        if value.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                _('Image file too large. Maximum size is 10MB.')
            )
        
        # Check file extension
        file_extension = value.name.split('.')[-1].upper()
        if file_extension not in self.ALLOWED_FORMATS:
            raise serializers.ValidationError(
                _('Invalid image format. Supported formats: JPEG, PNG, WebP, HEIC')
            )
        
        # Verify it's a valid image and check dimensions
        try:
            from PIL import Image
            import io
            
            # Read image
            image_data = value.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Reset file pointer for later use
            value.seek(0)
            
            # Verify format matches content
            if image.format and image.format.upper() not in self.ALLOWED_FORMATS:
                raise serializers.ValidationError(
                    _('Image content does not match file extension.')
                )
            
            # Check dimensions
            width, height = image.size
            if width < self.MIN_DIMENSION or height < self.MIN_DIMENSION:
                raise serializers.ValidationError(
                    _(f'Image too small. Minimum dimension is {self.MIN_DIMENSION}px.')
                )
            
            if width > self.MAX_DIMENSION or height > self.MAX_DIMENSION:
                raise serializers.ValidationError(
                    _(f'Image too large. Maximum dimension is {self.MAX_DIMENSION}px.')
                )
            
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError(
                _('Invalid image file. Please upload a valid image.')
            )
        
        return value


class AnalysisResultSerializer(serializers.Serializer):
    """Serializer for AI analysis results."""
    meal = MealSerializer(read_only=True)
    detected_items = serializers.ListField(
        child=serializers.DictField(),
        help_text=_('List of detected food items with quantities')
    )
    confidence = serializers.DictField(
        help_text=_('Confidence scores for different aspects of analysis')
    )
    processing_time_ms = serializers.IntegerField(
        help_text=_('Time taken to process the image in milliseconds')
    )
    suggestions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text=_('AI suggestions for improving accuracy')
    )


class RecalculateIngredientSerializer(serializers.Serializer):
    """Serializer for ingredient in recalculation request."""
    name = serializers.CharField(
        max_length=255,
        required=True,
        help_text=_('Name of the ingredient')
    )
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=3,
        min_value=Decimal('0.001'),
        required=True,
        help_text=_('Quantity of the ingredient')
    )
    unit = serializers.CharField(
        max_length=50,
        default='g',
        help_text=_('Unit of measurement (g, ml, cup, etc.)')
    )
    brand = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text=_('Brand name for more accurate nutrition data')
    )


class RecalculationRequestSerializer(serializers.Serializer):
    """Serializer for nutrition recalculation requests."""
    meal_id = serializers.UUIDField(
        required=False,
        help_text=_('ID of existing meal to update')
    )
    ingredients = RecalculateIngredientSerializer(
        many=True,
        required=True,
        help_text=_('List of ingredients with quantities')
    )
    serving_size = serializers.IntegerField(
        min_value=1,
        default=1,
        help_text=_('Number of servings this recipe makes')
    )
    
    def validate_ingredients(self, value: List[Dict]) -> List[Dict]:
        """Ensure at least one ingredient is provided."""
        if not value:
            raise serializers.ValidationError(
                _('At least one ingredient must be provided')
            )
        return value


class NutritionalBreakdownSerializer(serializers.Serializer):
    """Detailed nutritional breakdown response."""
    total_nutrition = serializers.DictField(
        help_text=_('Total nutritional values for all ingredients')
    )
    per_serving = serializers.DictField(
        help_text=_('Nutritional values per serving')
    )
    ingredients_breakdown = serializers.ListField(
        child=serializers.DictField(),
        help_text=_('Individual nutritional breakdown for each ingredient')
    )
    daily_values_percentage = serializers.DictField(
        help_text=_('Percentage of daily recommended values')
    )
    meal = MealSerializer(
        read_only=True,
        required=False,
        help_text=_('Updated meal object if meal_id was provided')
    )