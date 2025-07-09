from rest_framework import serializers
from .models import NutritionData, RecipeIngredient
from decimal import Decimal

class ImageUploadSerializer(serializers.Serializer):
    """Validates the image file upload."""
    image = serializers.ImageField(required=True)


class IngredientSerializer(serializers.ModelSerializer):
    """Serializer for recipe ingredients."""
    class Meta:
        model = RecipeIngredient
        fields = ['id', 'name', 'quantity', 'unit', 'calories', 'protein', 'carbohydrates', 'fat']
        read_only_fields = ['id']


class NutritionDataSerializer(serializers.ModelSerializer):
    """Serializer for nutrition data."""
    ingredients = IngredientSerializer(many=True, read_only=True)
    
    class Meta:
        model = NutritionData
        fields = [
            'id', 'image', 'calories', 'protein', 'carbohydrates', 'fat', 
            'fiber', 'sugar', 'sodium', 'serving_size', 'servings_per_recipe',
            'ingredients', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RecalculateNutritionSerializer(serializers.Serializer):
    """Serializer for nutrition recalculation requests."""
    servings = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        min_value=Decimal('0.1'),
        help_text="Number of servings to calculate nutrition for"
    )
    
    # Optional: Allow updating individual ingredients
    ingredients = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(),
            help_text="Format: {'id': ingredient_id, 'quantity': new_quantity}"
        ),
        required=False,
        help_text="List of ingredients to update with new quantities"
    )
    
    def validate_ingredients(self, value):
        """Validate ingredient updates."""
        for ingredient in value:
            if 'id' not in ingredient or 'quantity' not in ingredient:
                raise serializers.ValidationError(
                    "Each ingredient must have 'id' and 'quantity' fields"
                )
            try:
                float(ingredient['quantity'])
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Invalid quantity for ingredient {ingredient.get('id')}"
                )
        return value


class NutritionAnalysisResponseSerializer(serializers.Serializer):
    """Serializer for the nutrition analysis response."""
    nutrition_data_id = serializers.IntegerField()
    description = serializers.CharField()
    nutrition = NutritionDataSerializer()
    gemini_analysis = serializers.DictField(required=False)


class SimpleIngredientSerializer(serializers.Serializer):
    """Serializer for validating a single ingredient with name and grams."""
    name = serializers.CharField(max_length=255, required=True)
    estimated_grams = serializers.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        min_value=Decimal('0.01'),
        required=True
    )


class RecalculationRequestSerializer(serializers.Serializer):
    """Serializer for recalculation endpoint that accepts corrected ingredients."""
    ingredients = SimpleIngredientSerializer(many=True, required=True)