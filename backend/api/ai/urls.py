from django.urls import path
from ..views.ai import (
    AnalyzeImageView,
    RecalculateNutritionView,
    CacheStatsView,
    ClearCacheView,
    StartProgressiveAnalysisView,
    ProgressiveAnalysisStatusView,
    ProgressiveAnalysisStatsView,
    ConfidenceRoutingAnalysisView,
    ConfidenceRoutingStatsView
)

app_name = 'ai'

urlpatterns = [
    # AI Analysis endpoints
    path('analyze/', AnalyzeImageView.as_view(), name='analyze-image'),
    path('recalculate/', RecalculateNutritionView.as_view(), name='recalculate-nutrition'),
    
    # Progressive Analysis endpoints
    path('progressive-analyze/', StartProgressiveAnalysisView.as_view(), name='start-progressive-analysis'),
    path('progressive-status/<str:session_id>/', ProgressiveAnalysisStatusView.as_view(), name='progressive-analysis-status'),
    path('progressive-stats/', ProgressiveAnalysisStatsView.as_view(), name='progressive-analysis-stats'),
    
    # Confidence Routing endpoints
    path('confidence-analyze/', ConfidenceRoutingAnalysisView.as_view(), name='confidence-routing-analysis'),
    path('confidence-stats/', ConfidenceRoutingStatsView.as_view(), name='confidence-routing-stats'),
    
    # Cache management endpoints (admin only)
    path('cache-stats/', CacheStatsView.as_view(), name='cache-stats'),
    path('clear-cache/', ClearCacheView.as_view(), name='clear-cache'),
]