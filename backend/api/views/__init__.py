# Import all views for easy access
from .ai import AnalyzeImageView, RecalculateNutritionView
from .auth import (EmailVerifyView, LoginView, LogoutView, PasswordChangeView,
                   PasswordResetConfirmView, PasswordResetRequestView,
                   ProfileView, RefreshTokenView, RegisterView,
                   TokenVerifyView)
from .health import (HealthCheckView, LivenessCheckView, MetricsView,
                     ReadinessCheckView, ServiceHealthCheckView)
from .meals import MealViewSet
