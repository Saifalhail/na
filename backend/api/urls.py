from django.urls import path, include
from .views import (
    # Legacy views (to be updated)
    AnalyzeImageView, 
    NutritionDataDetailView,
    RecalculateNutritionView,
    IngredientsListView,
    RecalculateView,
    
    # Health check views
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
    # Authentication endpoints (to be implemented)
    # path('auth/', include('api.auth.urls')),
    
    # Analysis endpoints
    path('analysis/', include([
        path('image/', AnalyzeImageView.as_view(), name='analyze-image'),
        path('recalculate/', RecalculateView.as_view(), name='recalculate'),
    ])),
    
    # Meal endpoints (to be implemented)
    # path('meals/', include('api.meals.urls')),
    
    # User endpoints (to be implemented)
    # path('users/', include('api.users.urls')),
    
    # Legacy endpoints (deprecated, will be removed in v2)
    path('analyze-image/', AnalyzeImageView.as_view(), name='analyze-image-legacy'),
    path('recalculate/', RecalculateView.as_view(), name='recalculate-legacy'),
    path('nutrition/<int:pk>/', NutritionDataDetailView.as_view(), name='nutrition-detail'),
    path('nutrition/<int:pk>/recalculate/', RecalculateNutritionView.as_view(), name='nutrition-recalculate'),
    path('nutrition/<int:nutrition_data_id>/ingredients/', IngredientsListView.as_view(), name='ingredients-list'),
]

urlpatterns = [
    # Health checks (outside of versioning)
    path('', include(health_patterns)),
    
    # Versioned API endpoints are included from core.urls
] + v1_patterns