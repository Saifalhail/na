import logging
from datetime import datetime, timedelta
from typing import Any, Dict

from django.db.models import Avg, Count, F, OuterRef, Q, Subquery, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..exceptions import (BusinessLogicException, DuplicateFavoriteException,
                          MealNotFoundException, ValidationError)
from ..models import FavoriteMeal, FoodItem, Meal, MealItem
from ..permissions import IsOwnerPermission
from ..serializers.meal_serializers import (FavoriteMealSerializer,
                                            MealCreateUpdateSerializer,
                                            MealDetailSerializer,
                                            MealDuplicateSerializer,
                                            MealListSerializer,
                                            MealStatisticsSerializer)
from ..utils.cache import CacheManager, invalidate_meal_cache

logger = logging.getLogger(__name__)


class MealFilterBackend(DjangoFilterBackend):
    """Custom filter backend for meal queries."""

    def filter_queryset(self, request, queryset, view):
        """Apply custom filters to meal queryset."""
        queryset = super().filter_queryset(request, queryset, view)

        # Date range filtering
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if start_date:
            try:
                start = timezone.datetime.fromisoformat(start_date)
                if timezone.is_naive(start):
                    start = timezone.make_aware(start)
                queryset = queryset.filter(consumed_at__gte=start)
            except ValueError:
                pass

        if end_date:
            try:
                end = timezone.datetime.fromisoformat(end_date)
                if timezone.is_naive(end):
                    end = timezone.make_aware(end)
                queryset = queryset.filter(consumed_at__lte=end)
            except ValueError:
                pass

        # Calorie range filtering
        min_calories = request.query_params.get("min_calories")
        max_calories = request.query_params.get("max_calories")

        if min_calories:
            try:
                queryset = queryset.annotate(
                    total_cal=Sum("meal_items__calories")
                ).filter(total_cal__gte=float(min_calories))
            except ValueError:
                pass

        if max_calories:
            try:
                queryset = queryset.annotate(
                    total_cal=Sum("meal_items__calories")
                ).filter(total_cal__lte=float(max_calories))
            except ValueError:
                pass

        # Favorite filtering
        favorites_only = (
            request.query_params.get("favorites_only", "").lower() == "true"
        )
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
    search_fields = ["name", "notes", "meal_items__food_item__name"]
    ordering_fields = ["consumed_at", "created_at", "name"]
    ordering = ["-consumed_at"]
    filterset_fields = ["meal_type"]

    def get_queryset(self):
        """Get meals for the current user with optimized queries."""
        queryset = Meal.objects.filter(user=self.request.user)

        # Optimize queries based on action
        if self.action == "list":
            # For list view, we need basic meal info and counts
            queryset = queryset.prefetch_related("meal_items", "favorited_by").annotate(
                items_count=Count("meal_items", distinct=True),
                is_favorited=Count(
                    "favorited_by", filter=Q(favorited_by__user=self.request.user)
                ),
            )
        elif self.action in ["retrieve", "update", "partial_update"]:
            # For detail views, we need full meal items and food items
            queryset = queryset.prefetch_related(
                "meal_items__food_item", "favorited_by"
            ).select_related("analysis")
        elif self.action == "statistics":
            # For statistics, optimize aggregation queries
            queryset = queryset.prefetch_related("meal_items")

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return MealListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return MealCreateUpdateSerializer
        elif self.action == "duplicate":
            return MealDuplicateSerializer
        return MealDetailSerializer

    def perform_create(self, serializer):
        """Set user when creating meal."""
        meal = serializer.save(user=self.request.user)
        # Invalidate meal cache for this user
        invalidate_meal_cache(self.request.user.id)

    def perform_update(self, serializer):
        """Invalidate cache when meal is updated."""
        super().perform_update(serializer)
        invalidate_meal_cache(self.request.user.id)

    def perform_destroy(self, instance):
        """Invalidate cache when meal is deleted."""
        super().perform_destroy(instance)
        invalidate_meal_cache(self.request.user.id)

    @action(detail=True, methods=["post"])
    def favorite(self, request, pk=None):
        """Add meal to favorites."""
        meal = self.get_object()

        # Check if already favorited
        if FavoriteMeal.objects.filter(user=request.user, meal=meal).exists():
            raise DuplicateFavoriteException()

        # Create favorite
        favorite_data = request.data.copy()
        favorite_data["meal_id"] = meal.id

        serializer = FavoriteMealSerializer(
            data=favorite_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        favorite = serializer.save()

        return Response(
            FavoriteMealSerializer(favorite).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["delete"])
    def unfavorite(self, request, pk=None):
        """Remove meal from favorites."""
        meal = self.get_object()

        try:
            favorite = FavoriteMeal.objects.get(user=request.user, meal=meal)
            favorite.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except FavoriteMeal.DoesNotExist:
            raise ValidationError("Meal is not in favorites")

    @action(detail=True, methods=["post"])
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
            name=serializer.validated_data.get("name", f"Copy of {meal.name}"),
            meal_type=meal.meal_type,
            consumed_at=serializer.validated_data.get("consumed_at", timezone.now()),
            notes=meal.notes,
            location_name=meal.location_name,
            latitude=meal.latitude,
            longitude=meal.longitude,
        )

        # Duplicate meal items with prefetch to avoid N+1 queries
        meal_items = meal.meal_items.select_related("food_item").all()
        new_meal_items = []
        for item in meal_items:
            new_meal_items.append(
                MealItem(
                    meal=new_meal,
                    food_item=item.food_item,
                    quantity=item.quantity,
                    unit=item.unit,
                    custom_name=item.custom_name,
                    notes=item.notes,
                )
            )

        # Bulk create for better performance
        MealItem.objects.bulk_create(new_meal_items)

        return Response(
            MealDetailSerializer(new_meal, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def favorites(self, request):
        """Get user's favorite meals."""

        def get_favorites():
            favorites = (
                FavoriteMeal.objects.filter(user=request.user)
                .select_related("meal", "meal__user")
                .prefetch_related("meal__meal_items__food_item")
                .annotate(meal_items_count=Count("meal__meal_items", distinct=True))
                .order_by("quick_add_order", "-created_at")
            )

            serializer = FavoriteMealSerializer(
                favorites, many=True, context={"request": request}
            )
            return serializer.data

        data = CacheManager.get_or_set(
            CacheManager.PREFIX_FAVORITE_MEALS,
            get_favorites,
            CacheManager.TIMEOUT_MEDIUM,
            user_id=request.user.id,
        )

        return Response(data)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        """
        Get meal statistics for the user.

        Query params:
        - period: 'week', 'month', 'year', or 'all' (default: 'month')
        """
        period = request.query_params.get("period", "month")

        # Try to get from cache first
        def get_statistics():
            return self._calculate_statistics(period)

        # Use different cache timeout based on period
        timeout = (
            CacheManager.TIMEOUT_MEDIUM
            if period in ["week", "month"]
            else CacheManager.TIMEOUT_LONG
        )

        response_data = CacheManager.get_or_set(
            CacheManager.PREFIX_MEAL_STATS,
            get_statistics,
            timeout,
            user_id=request.user.id,
            period=period,
        )

        serializer = MealStatisticsSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    def _calculate_statistics(self, period: str) -> Dict[str, Any]:
        """
        Calculate meal statistics for the given period.
        """
        # Calculate date range
        end_date = timezone.now()
        if period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # Base queryset - use a fresh queryset for statistics
        meals = Meal.objects.filter(user=self.request.user)
        if start_date:
            meals = meals.filter(consumed_at__gte=start_date)

        # Calculate statistics with optimized single-query approach
        # Use direct aggregation with joins to avoid subqueries
        stats = meals.prefetch_related("meal_items").aggregate(
            total_meals=Count("id", distinct=True),
            total_calories=Sum("meal_items__calories"),
            avg_calories=Avg("meal_items__calories"),
            total_protein=Sum("meal_items__protein"),
            total_carbs=Sum("meal_items__carbohydrates"), 
            total_fat=Sum("meal_items__fat"),
            total_fiber=Sum("meal_items__fiber"),
            avg_protein=Avg("meal_items__protein"),
            avg_carbs=Avg("meal_items__carbohydrates"),
            avg_fat=Avg("meal_items__fat")
        )

        # Meals by type
        meals_by_type = (
            meals.values("meal_type").annotate(count=Count("id")).order_by("-count")
        )

        # Convert to dict
        type_dict = {item["meal_type"]: item["count"] for item in meals_by_type}

        # Most common meal type
        favorite_meal_type = meals_by_type[0]["meal_type"] if meals_by_type else "other"

        # Average macros - calculate at meal level to avoid N+1 queries
        meal_macros = MealItem.objects.filter(meal__in=meals).aggregate(
            total_protein=Sum("protein"),
            total_carbohydrates=Sum("carbohydrates"),
            total_fat=Sum("fat"),
            total_fiber=Sum("fiber"),
            total_items=Count("id"),
        )

        avg_macros = {}
        if meal_macros["total_items"] and meal_macros["total_items"] > 0:
            avg_macros = {
                "protein": (
                    meal_macros["total_protein"] / meal_macros["total_items"]
                    if meal_macros["total_protein"]
                    else 0
                ),
                "carbohydrates": (
                    meal_macros["total_carbohydrates"] / meal_macros["total_items"]
                    if meal_macros["total_carbohydrates"]
                    else 0
                ),
                "fat": (
                    meal_macros["total_fat"] / meal_macros["total_items"]
                    if meal_macros["total_fat"]
                    else 0
                ),
                "fiber": (
                    meal_macros["total_fiber"] / meal_macros["total_items"]
                    if meal_macros["total_fiber"]
                    else 0
                ),
            }
        else:
            avg_macros = {"protein": 0, "carbohydrates": 0, "fat": 0, "fiber": 0}

        # Recent favorites
        recent_favorites = (
            FavoriteMeal.objects.filter(user=self.request.user)
            .select_related("meal")
            .order_by("-last_used")[:5]
        )

        # Time-based stats
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        meals_this_week = Meal.objects.filter(
            user=self.request.user, consumed_at__gte=week_ago
        ).count()
        meals_this_month = Meal.objects.filter(
            user=self.request.user, consumed_at__gte=month_ago
        ).count()

        # Most active meal time
        meal_hours = (
            meals.annotate(hour=F("consumed_at__hour"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        if meal_hours:
            most_active_hour = meal_hours[0]["hour"]
            most_active_meal_time = (
                f"{most_active_hour:02d}:00 - {(most_active_hour + 1) % 24:02d}:00"
            )
        else:
            most_active_meal_time = "No data"

        # Prepare response data
        return {
            "total_meals": stats["total_meals"] or 0,
            "total_calories": float(stats["total_calories"] or 0),
            "average_calories_per_meal": float(stats["avg_calories"] or 0),
            "favorite_meal_type": favorite_meal_type,
            "meals_by_type": type_dict,
            "recent_favorites": [
                {
                    "id": fav.id,
                    "name": fav.name,
                    "meal": {
                        "id": str(fav.meal.id),
                        "name": fav.meal.name,
                        "meal_type": fav.meal.meal_type,
                    },
                    "times_used": fav.times_used,
                    "last_used": fav.last_used,
                }
                for fav in recent_favorites
            ],
            "average_macros": {k: float(v or 0) for k, v in avg_macros.items()},
            "meals_this_week": meals_this_week,
            "meals_this_month": meals_this_month,
            "most_active_meal_time": most_active_meal_time,
        }

    @action(detail=False, methods=["post"])
    def quick_log(self, request):
        """
        Quick log a favorite meal as a new meal entry.

        Accepts favorite_meal_id and optionally consumed_at.
        """
        favorite_id = request.data.get("favorite_meal_id")
        if not favorite_id:
            raise ValidationError("favorite_meal_id is required")

        try:
            favorite = FavoriteMeal.objects.get(id=favorite_id, user=request.user)
        except FavoriteMeal.DoesNotExist:
            raise ValidationError("Favorite meal not found")

        # Duplicate the favorite meal
        consumed_at = request.data.get("consumed_at")
        if consumed_at:
            try:
                consumed_at = datetime.fromisoformat(consumed_at)
            except ValueError:
                raise ValidationError("Invalid consumed_at format")
        else:
            consumed_at = timezone.now()

        # Create new meal from favorite
        new_meal = Meal.objects.create(
            user=request.user,
            name=favorite.name or favorite.meal.name,
            meal_type=favorite.meal.meal_type,
            consumed_at=consumed_at,
            notes=f"Quick logged from favorite: {favorite.meal.name}",
        )

        # Copy meal items with prefetch to avoid N+1 queries
        meal_items = favorite.meal.meal_items.select_related("food_item").all()
        new_meal_items = []
        for item in meal_items:
            new_meal_items.append(
                MealItem(
                    meal=new_meal,
                    food_item=item.food_item,
                    quantity=item.quantity,
                    unit=item.unit,
                    custom_name=item.custom_name,
                )
            )

        # Bulk create for better performance
        MealItem.objects.bulk_create(new_meal_items)

        # Update favorite usage stats
        favorite.times_used = F("times_used") + 1
        favorite.last_used = timezone.now()
        favorite.save()

        return Response(
            MealDetailSerializer(new_meal, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def similar(self, request, pk=None):
        """
        Find similar meals based on ingredients and meal type.

        Returns up to 5 similar meals.
        """
        meal = self.get_object()

        # Get food item IDs from this meal
        food_item_ids = list(meal.meal_items.values_list("food_item_id", flat=True))

        if not food_item_ids:
            return Response([])

        # Find meals with similar ingredients with optimized query
        similar_meals = (
            Meal.objects.filter(user=request.user, meal_type=meal.meal_type)
            .exclude(id=meal.id)
            .filter(meal_items__food_item_id__in=food_item_ids)
            .annotate(
                match_count=Count(
                    "meal_items__food_item_id",
                    filter=Q(meal_items__food_item_id__in=food_item_ids),
                    distinct=True,
                )
            )
            .prefetch_related("meal_items__food_item")
            .order_by("-match_count", "-consumed_at")[:5]
        )

        serializer = MealListSerializer(
            similar_meals, many=True, context={"request": request}
        )

        return Response(serializer.data)
