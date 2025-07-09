from django.urls import path
from ..views.ai import (
    AnalyzeImageView,
    RecalculateNutritionView
)

app_name = 'ai'

urlpatterns = [
    # AI Analysis endpoints
    path('analyze/', AnalyzeImageView.as_view(), name='analyze-image'),
    path('recalculate/', RecalculateNutritionView.as_view(), name='recalculate-nutrition'),
]