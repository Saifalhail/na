from django.urls import path, include
# Import legacy views from legacy_views.py file
from .legacy_views import (
    AnalyzeImageView as LegacyAnalyzeImageView,
    NutritionDataDetailView,
    RecalculateNutritionView as LegacyRecalculateNutritionView,
    IngredientsListView,
    RecalculateView as LegacyRecalculateView,
)
# Import from views package for new views
from .views import (
    HealthCheckView,
    ReadinessCheckView,
    LivenessCheckView,
    MetricsView,
)

app_name = 'api'

# Health check patterns (no versioning needed)
health_patterns = [
    path('health/', HealthCheckView.as_view(), name='health'),
    path('ready/', ReadinessCheckView.as_view(), name='ready'),
    path('live/', LivenessCheckView.as_view(), name='live'),
    path('metrics/', MetricsView.as_view(), name='metrics'),
]

# API v1 patterns
v1_patterns = [
    # Authentication endpoints
    path('auth/', include('api.auth.urls')),
    
    # Social authentication endpoints
    path('auth/social/', include('api.social.urls')),
    
    # AI Analysis endpoints (new)
    path('ai/', include('api.ai.urls')),
    
    # Meal endpoints
    path('meals/', include('api.meals.urls')),
    
    # Notification endpoints
    path('notifications/', include('api.notifications.urls')),
    
    # User endpoints (to be implemented)
    # path('users/', include('api.users.urls')),
    
    # Legacy endpoints (deprecated, will be removed in v2)
    path('analyze-image/', LegacyAnalyzeImageView.as_view(), name='analyze-image-legacy'),
    path('recalculate/', LegacyRecalculateView.as_view(), name='recalculate-legacy'),
    path('nutrition/<int:pk>/', NutritionDataDetailView.as_view(), name='nutrition-detail'),
    path('nutrition/<int:pk>/recalculate/', LegacyRecalculateNutritionView.as_view(), name='nutrition-recalculate'),
    path('nutrition/<int:nutrition_data_id>/ingredients/', IngredientsListView.as_view(), name='ingredients-list'),
]

urlpatterns = [
    # Health checks (at API root level)
    path('', include(health_patterns)),
    
    # V1 API endpoints (will be mounted at /api/v1/ by core.urls)
    path('', include(v1_patterns)),
]