from django.urls import include, path
from rest_framework.routers import DefaultRouter

from ..views.meals import MealViewSet

app_name = "meals"

# Create router for viewset
router = DefaultRouter()
router.register("", MealViewSet, basename="meal")

urlpatterns = [
    # Include all viewset routes
    path("", include(router.urls)),
]

# The router automatically generates the following URL patterns:
# GET /api/v1/meals/ - List all meals
# POST /api/v1/meals/ - Create a new meal
# GET /api/v1/meals/{id}/ - Retrieve a specific meal
# PUT /api/v1/meals/{id}/ - Update a meal (full update)
# PATCH /api/v1/meals/{id}/ - Update a meal (partial update)
# DELETE /api/v1/meals/{id}/ - Delete a meal
# POST /api/v1/meals/{id}/favorite/ - Add meal to favorites
# DELETE /api/v1/meals/{id}/unfavorite/ - Remove meal from favorites
# POST /api/v1/meals/{id}/duplicate/ - Duplicate a meal
# GET /api/v1/meals/{id}/similar/ - Get similar meals
# GET /api/v1/meals/favorites/ - Get user's favorite meals
# GET /api/v1/meals/statistics/ - Get meal statistics
# POST /api/v1/meals/quick_log/ - Quick log from favorite
