from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models import UserProfile, Meal
from api.serializers.meal_serializers import MealListSerializer

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for listings and references"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'is_active']
        read_only_fields = ['id', 'email']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user info for admin/staff views"""
    full_name = serializers.SerializerMethodField()
    account_type = serializers.CharField(source='get_account_type_display', read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined',
            'last_login', 'account_type', 'is_verified'
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'last_login']


class UserProfileDetailSerializer(serializers.ModelSerializer):
    """User profile with all details"""
    user = UserBasicSerializer(read_only=True)
    dietary_restrictions_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'gender', 'date_of_birth', 'height', 'weight',
            'activity_level', 'dietary_restrictions', 'dietary_restrictions_display',
            'daily_calorie_goal', 'daily_protein_goal', 'daily_carbs_goal',
            'daily_fat_goal', 'daily_fiber_goal', 'daily_water_goal',
            'timezone', 'measurement_system', 'bmi', 'bmr', 'tdee',
            'is_premium', 'social_avatar_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'bmi', 'bmr', 'tdee', 'created_at', 'updated_at']
    
    def get_dietary_restrictions_display(self, obj):
        return [restriction.name for restriction in obj.dietary_restrictions.all()]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user info (admin only)"""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'is_active', 'is_staff']
        
    def validate(self, attrs):
        # Don't allow users to deactivate themselves
        if 'is_active' in attrs and not attrs['is_active']:
            if self.instance == self.context['request'].user:
                raise serializers.ValidationError("You cannot deactivate your own account")
        return attrs


class UserStatisticsSerializer(serializers.Serializer):
    """User statistics and analytics"""
    total_meals = serializers.IntegerField()
    total_calories = serializers.FloatField()
    avg_calories_per_meal = serializers.FloatField()
    favorite_meals_count = serializers.IntegerField()
    meals_this_week = serializers.IntegerField()
    meals_this_month = serializers.IntegerField()
    most_common_meal_type = serializers.CharField()
    streak_days = serializers.IntegerField()
    nutritional_summary = serializers.DictField()
    meal_type_distribution = serializers.DictField()
    
    
class UserSearchSerializer(serializers.Serializer):
    """Search parameters for user search"""
    q = serializers.CharField(required=False, help_text="Search query (name or email)")
    is_active = serializers.BooleanField(required=False)
    is_staff = serializers.BooleanField(required=False)
    account_type = serializers.ChoiceField(
        choices=['free', 'premium', 'professional'],
        required=False
    )
    ordering = serializers.ChoiceField(
        choices=['date_joined', '-date_joined', 'last_login', '-last_login', 'email'],
        default='-date_joined'
    )