from django.urls import path
from .views import (
    AnalyzeImageView, 
    NutritionDataDetailView,
    RecalculateNutritionView,
    IngredientsListView,
    RecalculateView
)

urlpatterns = [
    # Image analysis endpoint
    path('analyze-image/', AnalyzeImageView.as_view(), name='analyze-image'),
    
    # Recalculation endpoint (image-less)
    path('recalculate/', RecalculateView.as_view(), name='recalculate'),
    
    # Nutrition data endpoints
    path('nutrition/<int:pk>/', NutritionDataDetailView.as_view(), name='nutrition-detail'),
    path('nutrition/<int:pk>/recalculate/', RecalculateNutritionView.as_view(), name='nutrition-recalculate'),
    
    # Ingredients endpoints
    path('nutrition/<int:nutrition_data_id>/ingredients/', IngredientsListView.as_view(), name='ingredients-list'),
]