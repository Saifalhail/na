"""
URL configuration for notification endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from api.views.notifications import (
    NotificationViewSet,
    NotificationPreferencesView,
    AdminNotificationView,
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notifications')

app_name = 'notifications'

urlpatterns = [
    # Notification preferences endpoint (must come before router to avoid conflicts)
    path('preferences/', NotificationPreferencesView.as_view(), name='preferences'),
    
    # Admin notification creation endpoint
    path('admin/create/', AdminNotificationView.as_view(), name='admin-create'),
    
    # Notification CRUD endpoints (router must come last)
    path('', include(router.urls)),
]