from django.urls import include, path

# Import from views package
from .views import (HealthCheckView, LivenessCheckView, MetricsView,
                    ReadinessCheckView, ServiceHealthCheckView)

app_name = "api"

# Health check patterns (no versioning needed)
health_patterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path("health/services/", ServiceHealthCheckView.as_view(), name="service-health"),
    path("ready/", ReadinessCheckView.as_view(), name="ready"),
    path("live/", LivenessCheckView.as_view(), name="live"),
    path("metrics/", MetricsView.as_view(), name="metrics"),
]

# API v1 patterns
v1_patterns = [
    # Authentication endpoints
    path("auth/", include("api.auth.urls")),
    # Social authentication endpoints
    path("auth/social/", include("api.social.urls")),
    # AI Analysis endpoints (new)
    path("ai/", include("api.ai.urls")),
    # Meal endpoints
    path("meals/", include("api.meals.urls")),
    # Notification endpoints
    path("notifications/", include("api.notifications.urls")),
    # Payment and subscription endpoints
    # path("payments/", include("api.payments.urls")),  # Temporarily disabled during simplification
    # Mobile-optimized endpoints
    path("mobile/", include("api.mobile.urls")),
    # User endpoints
    path("users/", include("api.users.urls")),
    # Webhook endpoints
    path("webhooks/", include("api.webhooks.urls")),
]

urlpatterns = [
    # Health checks (at API root level)
    path("", include(health_patterns)),
    # V1 API endpoints (will be mounted at /api/v1/ by core.urls)
    path("", include(v1_patterns)),
]
