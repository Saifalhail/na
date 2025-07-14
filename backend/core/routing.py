"""
WebSocket URL routing for Django Channels.

This module defines WebSocket URL patterns for real-time functionality
including progressive analysis updates and notifications.
"""

from django.urls import re_path

from api.consumers import (HealthCheckConsumer, NotificationConsumer,
                           ProgressiveAnalysisConsumer)

websocket_urlpatterns = [
    # Progressive Analysis WebSocket
    re_path(r"ws/analysis/$", ProgressiveAnalysisConsumer.as_asgi()),
    # General Notifications WebSocket
    re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
    # Health Check WebSocket
    re_path(r"ws/health/$", HealthCheckConsumer.as_asgi()),
]
