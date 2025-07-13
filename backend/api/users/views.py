from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, F, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import FavoriteMeal, Meal, UserProfile
from api.serializers.meal_serializers import MealListSerializer
from api.serializers.user_serializers import (UserBasicSerializer,
                                              UserDetailSerializer,
                                              UserProfileDetailSerializer,
                                              UserSearchSerializer,
                                              UserStatisticsSerializer,
                                              UserUpdateSerializer)

from .permissions import IsUserOwnerOrStaff

User = get_user_model()


class UserListView(generics.ListAPIView):
    """
    List all users (admin/staff only)
    """

    queryset = User.objects.all()
    serializer_class = UserBasicSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter by account type
        account_type = self.request.query_params.get("account_type")
        if account_type:
            queryset = queryset.filter(account_type=account_type)

        # Ordering
        ordering = self.request.query_params.get("ordering", "-date_joined")
        queryset = queryset.order_by(ordering)

        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get, update, or delete a user (admin/staff only)
    """

    queryset = User.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return UserDetailSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        # Don't allow users to delete themselves
        if user == request.user:
            return Response(
                {"error": "You cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Soft delete by deactivating
        user.is_active = False
        user.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


class UserProfileDetailView(generics.RetrieveAPIView):
    """
    Get user profile details (owner or staff only)
    """

    serializer_class = UserProfileDetailSerializer
    permission_classes = [IsUserOwnerOrStaff]

    def get_object(self):
        user_id = self.kwargs.get("pk")
        return UserProfile.objects.select_related("user").get(user_id=user_id)


class UserMealsView(generics.ListAPIView):
    """
    List user's meals (owner or staff only)
    """

    serializer_class = MealListSerializer
    permission_classes = [IsUserOwnerOrStaff]

    def get_queryset(self):
        user_id = self.kwargs.get("pk")
        return (
            Meal.objects.filter(user_id=user_id)
            .select_related("user")
            .prefetch_related("meal_items__food_item")
        )


class UserStatisticsView(APIView):
    """
    Get user statistics and analytics (owner or staff only)
    """

    permission_classes = [IsUserOwnerOrStaff]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)

            # Check permissions
            if not (request.user == user or request.user.is_staff):
                return Response(
                    {
                        "error": "You don't have permission to view this user's statistics"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Calculate statistics
            now = timezone.now()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)

            meals = Meal.objects.filter(user=user)
            meal_stats = meals.aggregate(
                total_meals=Count("id"),
                total_calories=Sum("total_calories"),
                avg_calories=Avg("total_calories"),
            )

            # Count favorite meals
            favorite_count = FavoriteMeal.objects.filter(user=user).count()

            # Meals by time period
            meals_this_week = meals.filter(consumed_at__gte=week_ago).count()
            meals_this_month = meals.filter(consumed_at__gte=month_ago).count()

            # Most common meal type
            meal_type_counts = (
                meals.values("meal_type").annotate(count=Count("id")).order_by("-count")
            )
            most_common_meal_type = (
                meal_type_counts[0]["meal_type"] if meal_type_counts else "none"
            )

            # Meal type distribution
            meal_type_distribution = {
                item["meal_type"]: item["count"] for item in meal_type_counts
            }

            # Calculate streak
            meal_dates = (
                meals.values_list("consumed_at__date", flat=True)
                .distinct()
                .order_by("-consumed_at__date")
            )
            streak_days = 0
            if meal_dates:
                current_date = meal_dates[0]
                for i, date in enumerate(meal_dates):
                    if i == 0 or (current_date - date).days == 1:
                        streak_days += 1
                        current_date = date
                    else:
                        break

            # Nutritional summary
            nutritional_summary = meals.aggregate(
                total_protein=Sum("total_protein"),
                total_carbs=Sum("total_carbs"),
                total_fat=Sum("total_fat"),
                avg_protein=Avg("total_protein"),
                avg_carbs=Avg("total_carbs"),
                avg_fat=Avg("total_fat"),
            )

            statistics = {
                "total_meals": meal_stats["total_meals"] or 0,
                "total_calories": meal_stats["total_calories"] or 0,
                "avg_calories_per_meal": meal_stats["avg_calories"] or 0,
                "favorite_meals_count": favorite_count,
                "meals_this_week": meals_this_week,
                "meals_this_month": meals_this_month,
                "most_common_meal_type": most_common_meal_type,
                "streak_days": streak_days,
                "nutritional_summary": nutritional_summary,
                "meal_type_distribution": meal_type_distribution,
            }

            serializer = UserStatisticsSerializer(statistics)
            return Response(serializer.data)

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


class UserSearchView(generics.ListAPIView):
    """
    Search users (admin/staff only)
    """

    serializer_class = UserBasicSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        # Validate search params
        param_serializer = UserSearchSerializer(data=self.request.query_params)
        param_serializer.is_valid(raise_exception=True)
        params = param_serializer.validated_data

        queryset = User.objects.all()

        # Search query
        q = params.get("q")
        if q:
            queryset = queryset.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(email__icontains=q)
            )

        # Filters
        if "is_active" in params:
            queryset = queryset.filter(is_active=params["is_active"])

        if "is_staff" in params:
            queryset = queryset.filter(is_staff=params["is_staff"])

        if "account_type" in params:
            queryset = queryset.filter(account_type=params["account_type"])

        # Ordering
        queryset = queryset.order_by(params.get("ordering", "-date_joined"))

        return queryset
