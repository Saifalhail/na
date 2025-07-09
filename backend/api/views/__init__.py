# Import all views for easy access
from .health import (
    HealthCheckView,
    ReadinessCheckView,
    LivenessCheckView,
    MetricsView
)

from .auth import (
    RegisterView,
    EmailVerifyView,
    LoginView,
    RefreshTokenView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordChangeView,
    ProfileView,
    TokenVerifyView
)

from .ai import (
    AnalyzeImageView,
    RecalculateNutritionView
)

from .meals import (
    MealViewSet
)