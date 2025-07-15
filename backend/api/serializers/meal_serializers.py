from decimal import Decimal
from typing import Any, Dict, List

from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from ..models import FoodItem, Meal, MealItem
from ..serializers.ai_serializers import FoodItemSerializer, MealItemSerializer


class MealItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating meal items."""

    food_item_id = serializers.UUIDField(required=False, allow_null=True)
    food_item_name = serializers.CharField(
        required=False, write_only=True, help_text=_("Name for creating new food item")
    )

    class Meta:
        model = MealItem
        fields = [
            "id",
            "food_item_id",
            "food_item_name",
            "quantity",
            "unit",
            "custom_name",
            "notes",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        """Ensure either food_item_id or food_item_name is provided."""
        if not data.get("food_item_id") and not data.get("food_item_name"):
            raise serializers.ValidationError(
                _("Either food_item_id or food_item_name must be provided")
            )
        return data


class MealListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for meal lists."""

    total_calories = serializers.ReadOnlyField()
    items_count = serializers.IntegerField(source="meal_items.count", read_only=True)
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = [
            "id",
            "name",
            "meal_type",
            "consumed_at",
            "total_calories",
            "items_count",
            "is_favorite",
            "image",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_is_favorite(self, obj):
        """Check if meal is in user's favorites."""
        # FavoriteMeal model has been removed in backend simplification
        return False


class MealDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single meal view."""

    meal_items = MealItemSerializer(many=True, read_only=True)
    total_calories = serializers.ReadOnlyField()
    total_macros = serializers.ReadOnlyField()
    is_favorite = serializers.SerializerMethodField()
    favorite_id = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = [
            "id",
            "user",
            "name",
            "meal_type",
            "consumed_at",
            "image",
            "notes",
            "location_name",
            "latitude",
            "longitude",
            "meal_items",
            "total_calories",
            "total_macros",
            "is_favorite",
            "favorite_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def get_is_favorite(self, obj):
        """Check if meal is in user's favorites."""
        # FavoriteMeal model has been removed in backend simplification
        return False

    def get_favorite_id(self, obj):
        """Get favorite ID if meal is favorited."""
        # FavoriteMeal model has been removed in backend simplification
        return None


class MealCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating meals."""

    meal_items = MealItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Meal
        fields = [
            "name",
            "meal_type",
            "consumed_at",
            "image",
            "notes",
            "location_name",
            "latitude",
            "longitude",
            "meal_items",
        ]

    def create(self, validated_data):
        """Create meal with nested meal items."""
        meal_items_data = validated_data.pop("meal_items", [])
        meal = Meal.objects.create(**validated_data)

        # Create meal items
        for item_data in meal_items_data:
            self._create_meal_item(meal, item_data)

        return meal

    def update(self, instance, validated_data):
        """Update meal and optionally replace meal items."""
        meal_items_data = validated_data.pop("meal_items", None)

        # Update meal fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If meal_items provided, replace all items
        if meal_items_data is not None:
            instance.meal_items.all().delete()
            for item_data in meal_items_data:
                self._create_meal_item(instance, item_data)

        return instance

    def _create_meal_item(self, meal, item_data):
        """Create a meal item, handling food item creation if needed."""
        food_item_name = item_data.pop("food_item_name", None)
        food_item_id = item_data.get("food_item_id")

        if food_item_name and not food_item_id:
            # Create new food item with basic nutrition
            food_item = FoodItem.objects.create(
                name=food_item_name,
                calories=0,
                protein=0,
                carbohydrates=0,
                fat=0,
                source="manual",
                created_by=meal.user,
            )
            item_data["food_item_id"] = food_item.id

        item_data["meal"] = meal
        return MealItem.objects.create(**item_data)


# FavoriteMeal model has been removed in backend simplification


class MealDuplicateSerializer(serializers.Serializer):
    """Serializer for meal duplication."""

    name = serializers.CharField(
        required=False, help_text=_("New name for duplicated meal")
    )
    consumed_at = serializers.DateTimeField(
        required=False, help_text=_("When the duplicated meal was consumed")
    )

    def validate_consumed_at(self, value):
        """Ensure consumed_at is not in the future."""
        if value and value > timezone.now():
            raise serializers.ValidationError(
                _("Consumed date cannot be in the future")
            )
        return value


class MealStatisticsSerializer(serializers.Serializer):
    """Serializer for meal statistics."""

    total_meals = serializers.IntegerField()
    total_calories = serializers.FloatField()
    average_calories_per_meal = serializers.FloatField()
    favorite_meal_type = serializers.CharField()
    meals_by_type = serializers.DictField()
    # recent_favorites removed in backend simplification

    # Nutritional averages
    average_macros = serializers.DictField()

    # Time-based stats
    meals_this_week = serializers.IntegerField()
    meals_this_month = serializers.IntegerField()
    most_active_meal_time = serializers.CharField()
