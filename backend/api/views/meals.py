from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Avg, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
import logging
from typing import Dict, Any

from ..models import Meal, MealItem, FavoriteMeal, FoodItem
from ..serializers.meal_serializers import (
    MealListSerializer,
    MealDetailSerializer,
    MealCreateUpdateSerializer,
    FavoriteMealSerializer,
    MealDuplicateSerializer,
    MealStatisticsSerializer
)
from ..exceptions import (
    ValidationError,
    MealNotFoundException,
    DuplicateFavoriteException,
    BusinessLogicException
)
from ..permissions import IsOwnerPermission

logger = logging.getLogger(__name__)


class MealFilterBackend(DjangoFilterBackend):
    """Custom filter backend for meal queries."""
    
    def filter_queryset(self, request, queryset, view):
        """Apply custom filters to meal queryset."""
        queryset = super().filter_queryset(request, queryset, view)
        
        # Date range filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            try:
                start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
                queryset = queryset.filter(consumed_at__gte=start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
                queryset = queryset.filter(consumed_at__lte=end)
            except ValueError:
                pass
        
        # Calorie range filtering
        min_calories = request.query_params.get('min_calories')
        max_calories = request.query_params.get('max_calories')
        
        if min_calories:
            try:
                queryset = queryset.annotate(
                    total_cal=Sum('meal_items__calories')
                ).filter(total_cal__gte=float(min_calories))
            except ValueError:
                pass
        
        if max_calories:
            try:
                queryset = queryset.annotate(
                    total_cal=Sum('meal_items__calories')
                ).filter(total_cal__lte=float(max_calories))
            except ValueError:
                pass
        
        # Favorite filtering
        favorites_only = request.query_params.get('favorites_only', '').lower() == 'true'
        if favorites_only:
            queryset = queryset.filter(favorited_by__user=request.user)
        
        return queryset


class MealViewSet(viewsets.ModelViewSet):
    """
    ViewSet for meal management.
    
    Provides CRUD operations and additional actions for meals:
    - List meals with filtering and search
    - Create new meals
    - Retrieve meal details
    - Update meals
    - Delete meals
    - Favorite/unfavorite meals
    - Duplicate meals
    - Get meal statistics
    """
    permission_classes = [IsAuthenticated, IsOwnerPermission]
    filter_backends = [MealFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'notes', 'meal_items__food_item__name']
    ordering_fields = ['consumed_at', 'created_at', 'name']
    ordering = ['-consumed_at']
    filterset_fields = ['meal_type']
    
    def get_queryset(self):
        """Get meals for the current user."""
        return Meal.objects.filter(user=self.request.user).prefetch_related(
            'meal_items__food_item',
            'favorited_by'
        ).select_related('analysis')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return MealListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MealCreateUpdateSerializer
        elif self.action == 'duplicate':
            return MealDuplicateSerializer
        return MealDetailSerializer
    
    def perform_create(self, serializer):
        """Set user when creating meal."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        """Add meal to favorites."""
        meal = self.get_object()
        
        # Check if already favorited
        if FavoriteMeal.objects.filter(user=request.user, meal=meal).exists():
            raise DuplicateFavoriteException()
        
        # Create favorite
        favorite_data = request.data.copy()
        favorite_data['meal_id'] = meal.id
        
        serializer = FavoriteMealSerializer(
            data=favorite_data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        favorite = serializer.save()
        
        return Response(
            FavoriteMealSerializer(favorite).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['delete'])
    def unfavorite(self, request, pk=None):
        """Remove meal from favorites."""
        meal = self.get_object()
        
        try:
            favorite = FavoriteMeal.objects.get(user=request.user, meal=meal)
            favorite.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except FavoriteMeal.DoesNotExist:
            raise ValidationError('Meal is not in favorites')
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a meal with all its items.
        
        Optionally accepts new name and consumed_at time.
        """
        meal = self.get_object()
        serializer = MealDuplicateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create duplicate meal
        new_meal = Meal.objects.create(
            user=request.user,
            name=serializer.validated_data.get('name', f"Copy of {meal.name}"),
            meal_type=meal.meal_type,
            consumed_at=serializer.validated_data.get('consumed_at', timezone.now()),
            notes=meal.notes,
            location_name=meal.location_name,
            latitude=meal.latitude,
            longitude=meal.longitude
        )
        
        # Duplicate meal items
        for item in meal.meal_items.all():
            MealItem.objects.create(
                meal=new_meal,
                food_item=item.food_item,
                quantity=item.quantity,
                unit=item.unit,
                custom_name=item.custom_name,
                notes=item.notes
            )
        
        return Response(
            MealDetailSerializer(new_meal, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def favorites(self, request):
        """Get user's favorite meals."""
        favorites = FavoriteMeal.objects.filter(
            user=request.user
        ).select_related('meal').prefetch_related(
            'meal__meal_items__food_item'
        ).order_by('quick_add_order', '-created_at')
        
        serializer = FavoriteMealSerializer(
            favorites,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get meal statistics for the user.
        
        Query params:
        - period: 'week', 'month', 'year', or 'all' (default: 'month')
        """
        period = request.query_params.get('period', 'month')
        
        # Calculate date range
        end_date = timezone.now()
        if period == 'week':
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None
        
        # Base queryset
        meals = self.get_queryset()
        if start_date:
            meals = meals.filter(consumed_at__gte=start_date)
        
        # Calculate statistics
        stats = meals.aggregate(
            total_meals=Count('id'),
            total_calories=Sum('meal_items__calories'),
            avg_calories=Avg('meal_items__calories')
        )
        
        # Meals by type
        meals_by_type = meals.values('meal_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Convert to dict
        type_dict = {item['meal_type']: item['count'] for item in meals_by_type}
        
        # Most common meal type
        favorite_meal_type = meals_by_type[0]['meal_type'] if meals_by_type else 'other'
        
        # Average macros
        avg_macros = meals.aggregate(
            protein=Avg('meal_items__protein'),
            carbohydrates=Avg('meal_items__carbohydrates'),
            fat=Avg('meal_items__fat'),
            fiber=Avg('meal_items__fiber')
        )
        
        # Recent favorites
        recent_favorites = FavoriteMeal.objects.filter(
            user=request.user
        ).select_related('meal').order_by('-last_used')[:5]
        
        # Time-based stats
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        meals_this_week = self.get_queryset().filter(consumed_at__gte=week_ago).count()
        meals_this_month = self.get_queryset().filter(consumed_at__gte=month_ago).count()
        
        # Most active meal time
        meal_hours = meals.annotate(
            hour=F('consumed_at__hour')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('-count')
        
        if meal_hours:
            most_active_hour = meal_hours[0]['hour']
            most_active_meal_time = f"{most_active_hour:02d}:00 - {(most_active_hour + 1) % 24:02d}:00"
        else:
            most_active_meal_time = 'No data'
        
        # Prepare response data
        response_data = {
            'total_meals': stats['total_meals'] or 0,
            'total_calories': float(stats['total_calories'] or 0),
            'average_calories_per_meal': float(stats['avg_calories'] or 0),
            'favorite_meal_type': favorite_meal_type,
            'meals_by_type': type_dict,
            'recent_favorites': FavoriteMealSerializer(
                recent_favorites,
                many=True,
                context={'request': request}
            ).data,
            'average_macros': {
                k: float(v or 0) for k, v in avg_macros.items()
            },
            'meals_this_week': meals_this_week,
            'meals_this_month': meals_this_month,
            'most_active_meal_time': most_active_meal_time
        }
        
        serializer = MealStatisticsSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def quick_log(self, request):
        """
        Quick log a favorite meal as a new meal entry.
        
        Accepts favorite_meal_id and optionally consumed_at.
        """
        favorite_id = request.data.get('favorite_meal_id')
        if not favorite_id:
            raise ValidationError('favorite_meal_id is required')
        
        try:
            favorite = FavoriteMeal.objects.get(
                id=favorite_id,
                user=request.user
            )
        except FavoriteMeal.DoesNotExist:
            raise ValidationError('Favorite meal not found')
        
        # Duplicate the favorite meal
        consumed_at = request.data.get('consumed_at')
        if consumed_at:
            try:
                consumed_at = datetime.fromisoformat(consumed_at)
            except ValueError:
                raise ValidationError('Invalid consumed_at format')
        else:
            consumed_at = timezone.now()
        
        # Create new meal from favorite
        new_meal = Meal.objects.create(
            user=request.user,
            name=favorite.name or favorite.meal.name,
            meal_type=favorite.meal.meal_type,
            consumed_at=consumed_at,
            notes=f"Quick logged from favorite: {favorite.meal.name}"
        )
        
        # Copy meal items
        for item in favorite.meal.meal_items.all():
            MealItem.objects.create(
                meal=new_meal,
                food_item=item.food_item,
                quantity=item.quantity,
                unit=item.unit,
                custom_name=item.custom_name
            )
        
        # Update favorite usage stats
        favorite.times_used = F('times_used') + 1
        favorite.last_used = timezone.now()
        favorite.save()
        
        return Response(
            MealDetailSerializer(new_meal, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        """
        Find similar meals based on ingredients and meal type.
        
        Returns up to 5 similar meals.
        """
        meal = self.get_object()
        
        # Get food item IDs from this meal
        food_item_ids = list(
            meal.meal_items.values_list('food_item_id', flat=True)
        )
        
        if not food_item_ids:
            return Response([])
        
        # Find meals with similar ingredients
        similar_meals = Meal.objects.filter(
            user=request.user,
            meal_type=meal.meal_type
        ).exclude(
            id=meal.id
        ).filter(
            meal_items__food_item_id__in=food_item_ids
        ).annotate(
            match_count=Count('meal_items__food_item_id', filter=Q(
                meal_items__food_item_id__in=food_item_ids
            ))
        ).order_by('-match_count', '-consumed_at')[:5]
        
        serializer = MealListSerializer(
            similar_meals,
            many=True,
            context={'request': request}
        )
        
        return Response(serializer.data)