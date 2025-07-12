"""
Mobile-optimized views for React Native/Expo applications.
"""
import logging
from PIL import Image
import io
import base64
from django.http import JsonResponse
from django.utils import timezone
from django.conf import settings
from django.db import models
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from api.models import Meal, MealItem, User, Notification, DeviceToken
from api.serializers.meal_serializers import MealListSerializer, MealItemSerializer
from api.serializers.notification_serializers import NotificationSerializer
from api.serializers.mobile_serializers import (
    DeviceTokenSerializer, RegisterDeviceSerializer
)
from api.permissions import IsOwnerPermission
from api.utils.image_optimization import optimize_image_for_mobile
from api.security.mobile_security import (
    DeviceFingerprint, SuspiciousActivityDetector, 
    CertificatePinningValidator, JailbreakRootDetector,
    APIKeyRotationManager
)
from api.utils.mobile_cache import (
    MobileCacheManager, MobileCacheDecorator, MobileQueryOptimizer
)
from api.utils.progressive_loading import (
    ProgressiveLoader, DeltaSync, SmartCaching, MobileDataOptimizer
)

logger = logging.getLogger(__name__)


class MobileDashboardView(APIView):
    """
    Mobile-optimized dashboard with essential user data.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Get mobile dashboard data",
        description="Get lightweight dashboard data optimized for mobile apps.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "user": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "email": {"type": "string"},
                            "account_type": {"type": "string"},
                            "is_premium": {"type": "boolean"}
                        }
                    },
                    "today_stats": {
                        "type": "object",
                        "properties": {
                            "meals_logged": {"type": "integer"},
                            "total_calories": {"type": "number"},
                            "ai_analyses_used": {"type": "integer"},
                            "ai_analyses_remaining": {"type": "integer"}
                        }
                    },
                    "recent_meals": {"type": "array"},
                    "notifications_count": {"type": "integer"},
                    "subscription_status": {
                        "type": "object",
                        "properties": {
                            "is_active": {"type": "boolean"},
                            "plan_name": {"type": "string"},
                            "days_until_renewal": {"type": "integer"}
                        }
                    }
                }
            }
        }
    )
    def get(self, request):
        user = request.user
        
        # Try to get cached dashboard data first
        cached_data = MobileCacheManager.get_dashboard_data(user.id)
        if cached_data:
            return Response(cached_data)
        
        today = timezone.now().date()
        
        # Optimized query for today's meals with proper aggregation
        today_calories = user.meals.filter(
            consumed_at__date=today
        ).aggregate(
            total_calories=models.Sum(
                models.F('mealitem__quantity') * models.F('mealitem__food_item__calories') / 100,
                output_field=models.DecimalField()
            )
        )['total_calories'] or 0
        
        # Use optimized queryset helper
        recent_meals = MobileQueryOptimizer.get_optimized_meals_queryset(
            user, limit=5, include_items=True
        )
        
        recent_meals_data = []
        for meal in recent_meals:
            # Use prefetched data to avoid N+1 queries
            meal_items = meal.mealitem_set.all()
            total_calories = sum(
                float(item.quantity) * float(item.food_item.calories) / 100
                for item in meal_items
            )
            
            recent_meals_data.append({
                'id': str(meal.id),
                'name': meal.name,
                'meal_type': meal.meal_type,
                'consumed_at': meal.consumed_at,
                'image_thumbnail': request.build_absolute_uri(meal.image.url) if meal.image else None,
                'total_calories': round(total_calories, 1),
                'item_count': len(meal_items)
            })
        
        # Use optimized subscription helper
        subscription_status = MobileQueryOptimizer.get_user_subscription_info(user)
        
        if subscription_status.get('current_period_end'):
            days_left = (subscription_status['current_period_end'].date() - timezone.now().date()).days
            subscription_status['days_until_renewal'] = max(0, days_left)
        
        # Get today's meal count efficiently
        today_meals_count = user.meals.filter(consumed_at__date=today).count()
        
        # AI usage tracking from subscription
        ai_analyses_used = subscription_status.get('ai_analyses_used', 0)
        ai_analyses_limit = subscription_status.get('ai_analyses_limit', 10)
        
        if ai_analyses_limit == -1:
            ai_analyses_remaining = -1  # Unlimited
        else:
            ai_analyses_remaining = max(0, ai_analyses_limit - ai_analyses_used)
        
        # Optimized notifications count query
        notifications_count = user.notifications.filter(
            status__in=['pending', 'sent']
        ).count()
        
        data = {
            'user': {
                'name': user.get_full_name(),
                'email': user.email,
                'account_type': user.account_type,
                'is_premium': subscription_status.get('plan_type', 'free') in ['premium', 'professional']
            },
            'today_stats': {
                'meals_logged': today_meals_count,
                'total_calories': round(float(today_calories), 1),
                'ai_analyses_used': ai_analyses_used,
                'ai_analyses_remaining': ai_analyses_remaining
            },
            'recent_meals': recent_meals_data,
            'notifications_count': notifications_count,
            'subscription_status': subscription_status
        }
        
        # Cache the response for future requests
        MobileCacheManager.cache_dashboard_data(user.id, data)
        
        return Response(data)


class MobileImageOptimizationView(APIView):
    """
    Optimize images for mobile upload and storage.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Optimize image for mobile",
        description="Optimize and compress images for mobile app usage.",
        request={
            "type": "object",
            "properties": {
                "image_data": {
                    "type": "string",
                    "description": "Base64 encoded image data"
                },
                "quality": {
                    "type": "integer",
                    "description": "Compression quality (1-100)",
                    "default": 85
                },
                "max_width": {
                    "type": "integer",
                    "description": "Maximum width in pixels",
                    "default": 1024
                },
                "max_height": {
                    "type": "integer",
                    "description": "Maximum height in pixels",
                    "default": 1024
                }
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "optimized_image": {"type": "string"},
                    "original_size": {"type": "integer"},
                    "optimized_size": {"type": "integer"},
                    "compression_ratio": {"type": "number"}
                }
            }
        }
    )
    def post(self, request):
        try:
            image_data = request.data.get('image_data')
            quality = int(request.data.get('quality', 85))
            max_width = int(request.data.get('max_width', 1024))
            max_height = int(request.data.get('max_height', 1024))
            
            if not image_data:
                return Response(
                    {"detail": "image_data is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Decode base64 image
            try:
                image_bytes = base64.b64decode(image_data)
                original_size = len(image_bytes)
                
                # Open and optimize image
                image = Image.open(io.BytesIO(image_bytes))
                
                # Resize if necessary
                if image.width > max_width or image.height > max_height:
                    image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # Convert to RGB if necessary (for JPEG)
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")
                
                # Compress and save
                output = io.BytesIO()
                image.save(output, format='JPEG', quality=quality, optimize=True)
                optimized_bytes = output.getvalue()
                optimized_size = len(optimized_bytes)
                
                # Encode back to base64
                optimized_image_data = base64.b64encode(optimized_bytes).decode('utf-8')
                
                compression_ratio = (original_size - optimized_size) / original_size
                
                return Response({
                    'optimized_image': optimized_image_data,
                    'original_size': original_size,
                    'optimized_size': optimized_size,
                    'compression_ratio': round(compression_ratio, 3)
                })
                
            except Exception as e:
                logger.error(f"Image processing error: {e}")
                return Response(
                    {"detail": "Invalid image data"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Mobile image optimization error: {e}")
            return Response(
                {"detail": "Image optimization failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MobileBatchOperationsView(APIView):
    """
    Handle batch operations for offline sync.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Process batch operations",
        description="Process multiple operations in a single request for offline sync.",
        request={
            "type": "object",
            "properties": {
                "operations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["create_meal", "update_meal", "delete_meal"]},
                            "data": {"type": "object"},
                            "local_id": {"type": "string"}
                        }
                    }
                }
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "results": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "local_id": {"type": "string"},
                                "success": {"type": "boolean"},
                                "data": {"type": "object"},
                                "error": {"type": "string"}
                            }
                        }
                    }
                }
            }
        }
    )
    def post(self, request):
        operations = request.data.get('operations', [])
        results = []
        
        for operation in operations:
            operation_type = operation.get('type')
            operation_data = operation.get('data', {})
            local_id = operation.get('local_id')
            
            try:
                if operation_type == 'create_meal':
                    # Create meal
                    meal_data = operation_data.copy()
                    meal_data['user'] = request.user.id
                    
                    serializer = MealSerializer(data=meal_data)
                    if serializer.is_valid():
                        meal = serializer.save(user=request.user)
                        results.append({
                            'local_id': local_id,
                            'success': True,
                            'data': MealSerializer(meal).data,
                            'error': None
                        })
                    else:
                        results.append({
                            'local_id': local_id,
                            'success': False,
                            'data': None,
                            'error': str(serializer.errors)
                        })
                
                elif operation_type == 'update_meal':
                    # Update meal
                    meal_id = operation_data.get('id')
                    try:
                        meal = request.user.meals.get(id=meal_id)
                        serializer = MealSerializer(meal, data=operation_data, partial=True)
                        if serializer.is_valid():
                            meal = serializer.save()
                            results.append({
                                'local_id': local_id,
                                'success': True,
                                'data': MealSerializer(meal).data,
                                'error': None
                            })
                        else:
                            results.append({
                                'local_id': local_id,
                                'success': False,
                                'data': None,
                                'error': str(serializer.errors)
                            })
                    except Meal.DoesNotExist:
                        results.append({
                            'local_id': local_id,
                            'success': False,
                            'data': None,
                            'error': 'Meal not found'
                        })
                
                elif operation_type == 'delete_meal':
                    # Delete meal
                    meal_id = operation_data.get('id')
                    try:
                        meal = request.user.meals.get(id=meal_id)
                        meal.delete()
                        results.append({
                            'local_id': local_id,
                            'success': True,
                            'data': {'id': meal_id, 'deleted': True},
                            'error': None
                        })
                    except Meal.DoesNotExist:
                        results.append({
                            'local_id': local_id,
                            'success': False,
                            'data': None,
                            'error': 'Meal not found'
                        })
                
                else:
                    results.append({
                        'local_id': local_id,
                        'success': False,
                        'data': None,
                        'error': f'Unknown operation type: {operation_type}'
                    })
                    
            except Exception as e:
                logger.error(f"Batch operation error: {e}")
                results.append({
                    'local_id': local_id,
                    'success': False,
                    'data': None,
                    'error': str(e)
                })
        
        return Response({'results': results})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Get progressive image sizes",
    description="Get multiple image sizes for progressive loading.",
    parameters=[
        OpenApiParameter(name='meal_id', type=str, location=OpenApiParameter.PATH),
    ],
    responses={
        200: {
            "type": "object",
            "properties": {
                "thumbnail": {"type": "string"},
                "medium": {"type": "string"},
                "full": {"type": "string"}
            }
        }
    }
)
def progressive_image_sizes(request, meal_id):
    """Get progressive image sizes for a meal."""
    try:
        meal = request.user.meals.get(id=meal_id)
        
        if not meal.image:
            return Response(
                {"detail": "Meal has no image"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        base_url = request.build_absolute_uri(meal.image.url)
        
        # For now, return the same image URL
        # In production, you'd have different sized versions stored
        return Response({
            'thumbnail': base_url,  # Would be thumbnail version
            'medium': base_url,     # Would be medium version
            'full': base_url        # Original full size
        })
        
    except Meal.DoesNotExist:
        return Response(
            {"detail": "Meal not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Get mobile sync data",
    description="Get data needed for mobile app synchronization.",
    parameters=[
        OpenApiParameter(name='last_sync', type=str, description='ISO timestamp of last sync'),
    ],
    responses={
        200: {
            "type": "object",
            "properties": {
                "meals": {"type": "array"},
                "notifications": {"type": "array"},
                "user_profile": {"type": "object"},
                "sync_timestamp": {"type": "string"}
            }
        }
    }
)
def mobile_sync_data(request):
    """Get data for mobile synchronization."""
    last_sync = request.GET.get('last_sync')
    
    # Parse last sync timestamp
    if last_sync:
        try:
            from datetime import datetime
            last_sync_dt = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
        except ValueError:
            last_sync_dt = None
    else:
        last_sync_dt = None
    
    # Try to get cached sync data first
    cached_sync_data = MobileCacheManager.get_sync_data(request.user.id, last_sync)
    if cached_sync_data:
        return Response(cached_sync_data)
    
    # Use optimized queries
    meals_query = MobileQueryOptimizer.get_optimized_meals_queryset(
        request.user, limit=50, include_items=True
    )
    if last_sync_dt:
        meals_query = meals_query.filter(updated_at__gt=last_sync_dt)
    
    meals = list(meals_query[:50])  # Convert to list for caching
    
    # Optimized notifications query
    notifications_query = MobileQueryOptimizer.get_optimized_notifications_queryset(
        request.user, limit=20
    )
    if last_sync_dt:
        notifications_query = notifications_query.filter(updated_at__gt=last_sync_dt)
    
    notifications = list(notifications_query[:20])  # Convert to list for caching
    
    # Use optimized subscription helper
    subscription_status = MobileQueryOptimizer.get_user_subscription_info(request.user)
    
    user_profile = {
        'account_type': request.user.account_type,
        'is_premium': subscription_status.get('is_active', False),
        'subscription_status': subscription_status
    }
    
    sync_data = {
        'meals': MealSerializer(meals, many=True, context={'request': request}).data,
        'notifications': NotificationSerializer(notifications, many=True).data,
        'user_profile': user_profile,
        'sync_timestamp': timezone.now().isoformat()
    }
    
    # Cache the sync data for future requests
    MobileCacheManager.cache_sync_data(request.user.id, sync_data, last_sync)
    
    return Response(sync_data)


# Mobile Security Endpoints

class DeviceFingerprintView(APIView):
    """
    Generate and validate device fingerprints for fraud detection.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Generate device fingerprint",
        description="Generate a unique fingerprint for device identification and fraud detection.",
        request={
            "type": "object",
            "properties": {
                "device_data": {
                    "type": "object",
                    "properties": {
                        "model": {"type": "string"},
                        "os_version": {"type": "string"},
                        "screen_resolution": {"type": "string"},
                        "timezone": {"type": "string"},
                        "language": {"type": "string"},
                        "carrier": {"type": "string"},
                        "battery_level": {"type": "string"},
                        "available_storage": {"type": "string"},
                    }
                }
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "fingerprint": {"type": "string"},
                    "validation": {"type": "object"}
                }
            }
        }
    )
    def post(self, request):
        device_data = request.data.get('device_data', {})
        device_id = request.META.get('HTTP_X_DEVICE_ID')
        
        if not device_id:
            return Response(
                {"detail": "Device ID required in X-Device-ID header"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate fingerprint
        fingerprint = DeviceFingerprint.generate_fingerprint(device_data)
        
        # Validate against known fingerprints
        validation = DeviceFingerprint.validate_fingerprint(
            device_id, fingerprint, request.user.id
        )
        
        return Response({
            'fingerprint': fingerprint[:16] + '...',  # Partial for privacy
            'validation': validation
        })


class SuspiciousActivityView(APIView):
    """
    Check for suspicious login activity patterns.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Check suspicious activity",
        description="Analyze user login patterns for suspicious activity.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "risk_score": {"type": "integer"},
                    "alert_level": {"type": "string"},
                    "suspicious_indicators": {"type": "array"},
                    "recommendations": {"type": "array"}
                }
            }
        }
    )
    def post(self, request):
        device_id = request.META.get('HTTP_X_DEVICE_ID')
        ip_address = self.get_client_ip(request)
        
        # Check login patterns
        activity_analysis = SuspiciousActivityDetector.check_login_pattern(
            request.user.id, ip_address, device_id
        )
        
        return Response(activity_analysis)
    
    def get_client_ip(self, request):
        """Extract client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class CertificatePinningView(APIView):
    """
    Validate certificate pinning for mobile apps.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Validate certificate pinning",
        description="Validate SSL certificate hash against expected pins.",
        request={
            "type": "object",
            "properties": {
                "cert_hash": {"type": "string"},
                "domain": {"type": "string"}
            },
            "required": ["cert_hash", "domain"]
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "is_valid": {"type": "boolean"},
                    "cert_hash": {"type": "string"},
                    "domain": {"type": "string"}
                }
            }
        }
    )
    def post(self, request):
        cert_hash = request.data.get('cert_hash')
        domain = request.data.get('domain')
        
        if not cert_hash or not domain:
            return Response(
                {"detail": "cert_hash and domain are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate certificate pinning
        validation = CertificatePinningValidator.validate_certificate_pin(cert_hash, domain)
        
        return Response(validation)


class DeviceSecurityView(APIView):
    """
    Analyze device security characteristics.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Analyze device security",
        description="Analyze device for jailbreak/root and security risks.",
        request={
            "type": "object",
            "properties": {
                "device_data": {
                    "type": "object",
                    "properties": {
                        "is_jailbroken": {"type": "boolean"},
                        "is_rooted": {"type": "boolean"},
                        "debug_mode": {"type": "boolean"},
                        "developer_options": {"type": "boolean"},
                        "suspicious_apps": {"type": "array"},
                        "screen_lock_enabled": {"type": "boolean"},
                        "biometric_enabled": {"type": "boolean"},
                        "device_id": {"type": "string"}
                    }
                }
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "security_level": {"type": "string"},
                    "risk_score": {"type": "integer"},
                    "risk_indicators": {"type": "array"},
                    "recommendations": {"type": "array"}
                }
            }
        }
    )
    def post(self, request):
        device_data = request.data.get('device_data', {})
        
        # Analyze device security
        security_analysis = JailbreakRootDetector.analyze_device_security(device_data)
        
        return Response(security_analysis)


class APIKeyManagementView(APIView):
    """
    Manage API keys for mobile applications.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Generate new API key",
        description="Generate a new API key for mobile app authentication.",
        request={
            "type": "object",
            "properties": {
                "device_id": {"type": "string"},
                "key_type": {"type": "string", "default": "mobile"}
            },
            "required": ["device_id"]
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "api_key": {"type": "string"},
                    "expires_in": {"type": "integer"},
                    "key_type": {"type": "string"}
                }
            }
        }
    )
    def post(self, request):
        device_id = request.data.get('device_id')
        key_type = request.data.get('key_type', 'mobile')
        
        if not device_id:
            return Response(
                {"detail": "device_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new API key
        key_info = APIKeyRotationManager.generate_api_key(
            request.user.id, device_id, key_type
        )
        
        return Response(key_info)
    
    @extend_schema(
        summary="Validate API key",
        description="Validate an existing API key.",
        request={
            "type": "object",
            "properties": {
                "api_key": {"type": "string"},
                "device_id": {"type": "string"}
            },
            "required": ["api_key"]
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "is_valid": {"type": "boolean"},
                    "usage_count": {"type": "integer"}
                }
            }
        }
    )
    def put(self, request):
        api_key = request.data.get('api_key')
        device_id = request.data.get('device_id')
        
        if not api_key:
            return Response(
                {"detail": "api_key is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate API key
        validation = APIKeyRotationManager.validate_api_key(api_key, device_id)
        
        return Response(validation)
    
    @extend_schema(
        summary="Revoke API key",
        description="Revoke an existing API key.",
        request={
            "type": "object",
            "properties": {
                "api_key": {"type": "string"}
            },
            "required": ["api_key"]
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "revoked": {"type": "boolean"}
                }
            }
        }
    )
    def delete(self, request):
        api_key = request.data.get('api_key')
        
        if not api_key:
            return Response(
                {"detail": "api_key is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Revoke API key
        revoked = APIKeyRotationManager.revoke_api_key(api_key, request.user.id)
        
        return Response({'revoked': revoked})


# Progressive Loading and Delta Sync Endpoints

class ProgressiveMealsView(APIView):
    """
    Progressive loading for meals with delta sync support.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Progressive meals loading",
        description="Load meals progressively with pagination and delta sync support.",
        parameters=[
            OpenApiParameter(name='page', type=int, description='Page number (default: 1)'),
            OpenApiParameter(name='page_size', type=int, description='Items per page (max: 50)'),
            OpenApiParameter(name='delta_sync', type=bool, description='Enable delta sync'),
            OpenApiParameter(name='compression', type=str, description='Compression level (light/standard/aggressive)'),
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "data": {"type": "array"},
                    "pagination": {"type": "object"},
                    "delta_info": {"type": "object"},
                    "cache_info": {"type": "object"}
                }
            }
        }
    )
    def get(self, request):
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        delta_sync = request.GET.get('delta_sync', 'false').lower() == 'true'
        compression = request.GET.get('compression', 'standard')
        
        # Check cache first
        cache_key = SmartCaching.get_cache_key(
            'progressive_meals', request.user.id,
            page=page, page_size=page_size, delta=delta_sync
        )
        
        cached_data = SmartCaching.get_cached_data(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Get base queryset
        queryset = MobileQueryOptimizer.get_optimized_meals_queryset(
            request.user, limit=1000, include_items=True  # High limit for pagination
        )
        
        if delta_sync:
            # Use delta sync
            response_data = DeltaSync.create_delta_response(
                queryset, request.user.id, 'meals',
                MealSerializer, {'request': request}
            )
        else:
            # Use regular pagination
            paginated_data = ProgressiveLoader.paginate_queryset(
                queryset, page, page_size
            )
            
            # Serialize the page data
            serialized_data = MealSerializer(
                paginated_data['data'], many=True, context={'request': request}
            ).data
            
            response_data = {
                'data': serialized_data,
                'pagination': paginated_data['pagination']
            }
        
        # Optimize for mobile
        response_data['data'] = MobileDataOptimizer.optimize_image_urls(
            response_data['data']
        )
        response_data['data'] = MobileDataOptimizer.compress_data_for_mobile(
            response_data['data'], compression
        )
        
        # Add cache info
        response_data['cache_info'] = {
            'cached': False,
            'ttl': 300,
            'compression': compression
        }
        
        # Cache the response
        SmartCaching.cache_with_ttl(
            cache_key, response_data, ttl=300,
            tags=[f"user_{request.user.id}", f"user_{request.user.id}_meals"]
        )
        
        return Response(response_data)


class DeltaSyncView(APIView):
    """
    General delta sync endpoint for multiple resources.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Delta sync multiple resources",
        description="Sync multiple resources with delta support.",
        request={
            "type": "object",
            "properties": {
                "resources": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["meals", "notifications"]},
                            "limit": {"type": "integer"},
                            "fields": {"type": "array"}
                        }
                    }
                }
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "sync_results": {"type": "object"},
                    "sync_timestamp": {"type": "string"}
                }
            }
        }
    )
    def post(self, request):
        resources = request.data.get('resources', [])
        sync_timestamp = timezone.now()
        
        results = {}
        
        for resource_config in resources:
            resource_type = resource_config.get('type')
            limit = min(resource_config.get('limit', 50), 100)
            fields = resource_config.get('fields', [])
            
            try:
                if resource_type == 'meals':
                    queryset = MobileQueryOptimizer.get_optimized_meals_queryset(
                        request.user, limit=limit, include_items=True
                    )
                    
                    result = DeltaSync.create_delta_response(
                        queryset, request.user.id, 'meals',
                        MealSerializer, {'request': request}
                    )
                    
                elif resource_type == 'notifications':
                    queryset = MobileQueryOptimizer.get_optimized_notifications_queryset(
                        request.user, limit=limit
                    )
                    
                    result = DeltaSync.create_delta_response(
                        queryset, request.user.id, 'notifications',
                        NotificationSerializer
                    )
                else:
                    result = {'error': f'Unknown resource type: {resource_type}'}
                
                # Apply field filtering if specified
                if fields and 'data' in result:
                    result['data'] = self._filter_fields(result['data'], fields)
                
                results[resource_type] = result
                
            except Exception as e:
                logger.error(f"Delta sync failed for {resource_type}: {e}")
                results[resource_type] = {'error': str(e)}
        
        return Response({
            'sync_results': results,
            'sync_timestamp': sync_timestamp.isoformat()
        })
    
    def _filter_fields(self, data, fields):
        """Filter data to include only specified fields."""
        if isinstance(data, list):
            return [self._filter_single_item(item, fields) for item in data]
        else:
            return self._filter_single_item(data, fields)
    
    def _filter_single_item(self, item, fields):
        """Filter a single item to include only specified fields."""
        if not isinstance(item, dict):
            return item
        
        return {field: item.get(field) for field in fields if field in item}


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Invalidate user cache",
    description="Manually invalidate cache for specific resources.",
    request={
        "type": "object",
        "properties": {
            "resources": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Resources to invalidate (meals, notifications, profile, dashboard)"
            }
        }
    },
    responses={
        200: {
            "type": "object",
            "properties": {
                "invalidated_count": {"type": "integer"},
                "resources": {"type": "array"}
            }
        }
    }
)
def invalidate_cache(request):
    """Manually invalidate cache for user resources."""
    resources = request.data.get('resources', ['meals', 'notifications', 'profile', 'dashboard'])
    
    total_invalidated = 0
    
    for resource in resources:
        count = SmartCaching.invalidate_user_cache(request.user.id, resource)
        total_invalidated += count
        
        # Also invalidate mobile cache manager caches
        MobileCacheManager.invalidate_user_cache(request.user.id, [resource])
    
    return Response({
        'invalidated_count': total_invalidated,
        'resources': resources
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="Get cache statistics",
    description="Get cache usage statistics for the user.",
    responses={
        200: {
            "type": "object",
            "properties": {
                "cache_stats": {"type": "object"},
                "delta_sync_info": {"type": "object"}
            }
        }
    }
)
def cache_stats(request):
    """Get cache statistics for the user."""
    user_id = request.user.id
    
    # Check various cache keys
    cache_keys = [
        f"mobile_dashboard_user_{user_id}",
        f"mobile_meals_user_{user_id}",
        f"mobile_profile_user_{user_id}",
        f"mobile_sync_user_{user_id}",
    ]
    
    cache_status = {}
    for key in cache_keys:
        cache_status[key] = cache.get(key) is not None
    
    # Get delta sync info
    delta_sync_info = {}
    for resource in ['meals', 'notifications']:
        last_sync = DeltaSync.get_last_sync_timestamp(user_id, resource)
        delta_sync_info[resource] = {
            'last_sync': last_sync.isoformat() if last_sync else None,
            'has_synced': last_sync is not None
        }
    
    return Response({
        'cache_stats': cache_status,
        'delta_sync_info': delta_sync_info
    })