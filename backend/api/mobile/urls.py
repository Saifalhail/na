"""
URL patterns for mobile-optimized endpoints.
"""
from django.urls import path
from api.views.mobile import (
    MobileDashboardView, MobileImageOptimizationView, MobileBatchOperationsView,
    progressive_image_sizes, mobile_sync_data,
    # Security views
    DeviceFingerprintView, SuspiciousActivityView, CertificatePinningView,
    DeviceSecurityView, APIKeyManagementView,
    # Progressive loading views
    ProgressiveMealsView, DeltaSyncView, invalidate_cache, cache_stats
)
from api.views.batch_api import BatchAPIView, graphql_query
from api.views.push_notifications import (
    RegisterDeviceView, DeviceTokenListView, DeactivateDeviceView,
    TestPushNotificationView, PushNotificationHistoryView,
    update_device_last_used, update_notification_preferences
)

app_name = 'mobile'

urlpatterns = [
    # Dashboard
    path('dashboard/', MobileDashboardView.as_view(), name='dashboard'),
    
    # Image optimization
    path('optimize-image/', MobileImageOptimizationView.as_view(), name='optimize-image'),
    path('meals/<uuid:meal_id>/images/', progressive_image_sizes, name='progressive-images'),
    
    # Batch operations for offline sync
    path('batch/', MobileBatchOperationsView.as_view(), name='batch-operations'),
    
    # Sync
    path('sync/', mobile_sync_data, name='sync-data'),
    
    # Push notifications
    path('devices/register/', RegisterDeviceView.as_view(), name='register-device'),
    path('devices/', DeviceTokenListView.as_view(), name='device-list'),
    path('devices/<str:device_id>/deactivate/', DeactivateDeviceView.as_view(), name='deactivate-device'),
    path('devices/update-last-used/', update_device_last_used, name='update-device-last-used'),
    
    # Notifications
    path('notifications/test/', TestPushNotificationView.as_view(), name='test-push-notification'),
    path('notifications/history/', PushNotificationHistoryView.as_view(), name='notification-history'),
    path('notifications/preferences/', update_notification_preferences, name='notification-preferences'),
    
    # Security endpoints
    path('security/fingerprint/', DeviceFingerprintView.as_view(), name='device-fingerprint'),
    path('security/activity-check/', SuspiciousActivityView.as_view(), name='suspicious-activity'),
    path('security/cert-pinning/', CertificatePinningView.as_view(), name='certificate-pinning'),
    path('security/device-analysis/', DeviceSecurityView.as_view(), name='device-security'),
    path('security/api-keys/', APIKeyManagementView.as_view(), name='api-key-management'),
    
    # Performance & Batch endpoints
    path('batch/', BatchAPIView.as_view(), name='batch-api'),
    path('graphql/', graphql_query, name='graphql-query'),
    
    # Progressive loading & Delta sync
    path('meals/progressive/', ProgressiveMealsView.as_view(), name='progressive-meals'),
    path('delta-sync/', DeltaSyncView.as_view(), name='delta-sync'),
    path('cache/invalidate/', invalidate_cache, name='invalidate-cache'),
    path('cache/stats/', cache_stats, name='cache-stats'),
]