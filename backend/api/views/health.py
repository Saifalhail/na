"""
Health check endpoints for monitoring application status.
"""

import os
import time
from datetime import datetime
from typing import Dict, Any

import psutil
from django.conf import settings
from django.core.cache import cache
from django.db import connection, models
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import User, Meal, Notification
from api.services.gemini_service import GeminiService
from api.services.push_notification_service import ExpoNotificationService
from api.services.stripe_service import StripeService
from api.utils.circuit_breaker import circuit_breaker_registry


class HealthCheckView(APIView):
    """
    Basic health check endpoint.

    Returns 200 OK if the application is running.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required

    def get(self, request):
        """Simple health check."""
        return Response(
            {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "version": getattr(settings, "VERSION", "1.0.0"),
                "environment": getattr(settings, "ENVIRONMENT", "development"),
            }
        )


class ReadinessCheckView(APIView):
    """
    Readiness check endpoint.

    Checks if the application is ready to serve requests by
    verifying all critical dependencies are available.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """Check application readiness."""
        checks = {
            "database": self._check_database(),
            "cache": self._check_cache(),
            "storage": self._check_storage(),
            "gemini_api": self._check_gemini_api(),
        }

        # Overall status
        all_healthy = all(check["healthy"] for check in checks.values())
        overall_status = "ready" if all_healthy else "not_ready"

        response_data = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "checks": checks,
        }

        # Return appropriate status code
        status_code = (
            status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        )

        return Response(response_data, status=status_code)

    def _check_database(self):
        """Check database connectivity."""
        try:
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            response_time = int((time.time() - start_time) * 1000)

            return {
                "healthy": True,
                "response_time_ms": response_time,
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }

    def _check_cache(self):
        """Check cache connectivity."""
        try:
            start_time = time.time()
            test_key = "health_check_test"
            cache.set(test_key, "test_value", 10)
            value = cache.get(test_key)
            cache.delete(test_key)
            response_time = int((time.time() - start_time) * 1000)

            return {
                "healthy": value == "test_value",
                "response_time_ms": response_time,
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }

    def _check_storage(self):
        """Check file storage availability."""
        try:
            # Check if media directory is writable
            media_root = settings.MEDIA_ROOT
            test_file = os.path.join(media_root, ".health_check")

            # Try to write a test file
            with open(test_file, "w") as f:
                f.write("health check")

            # Try to read it back
            with open(test_file, "r") as f:
                content = f.read()

            # Clean up
            os.remove(test_file)

            return {
                "healthy": content == "health check",
                "media_root": media_root,
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }

    def _check_gemini_api(self):
        """Check Gemini API availability."""
        try:
            # First check if API key is configured
            api_key_configured = bool(settings.GEMINI_API_KEY)
            if not api_key_configured:
                return {
                    "healthy": False,
                    "api_key_configured": False,
                    "message": "API key not configured",
                }

            # Check cached health status (valid for 5 minutes)
            cache_key = "gemini_api_health_check"
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Perform actual health check (minimal API call)
            try:
                start_time = time.time()
                service = GeminiService()

                # Make a minimal test request
                import google.generativeai as genai

                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                response = model.generate_content("Return 'OK' if you receive this.")

                response_time = int((time.time() - start_time) * 1000)

                result = {
                    "healthy": bool(response.text),
                    "api_key_configured": True,
                    "response_time_ms": response_time,
                    "model": settings.GEMINI_MODEL,
                }

                # Cache successful result for 5 minutes
                cache.set(cache_key, result, 300)
                return result

            except Exception as api_error:
                # API call failed but key is configured
                result = {
                    "healthy": False,
                    "api_key_configured": True,
                    "error": str(api_error),
                    "message": "API reachable but request failed",
                }
                # Cache failure for 1 minute
                cache.set(cache_key, result, 60)
                return result

        except Exception as e:
            return {"healthy": False, "error": str(e), "message": "Health check failed"}


class ServiceHealthCheckView(APIView):
    """
    Comprehensive service health check endpoint.
    
    Checks the health of all critical services and dependencies.
    """
    
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """Return detailed health status of all services."""
        start_time = time.time()
        
        health_checks = {
            'database': self._check_database_health(),
            'cache': self._check_cache_health(),
            'ai_service': self._check_ai_service_health(),
            'payment_service': self._check_payment_service_health(),
            'notification_service': self._check_notification_service_health(),
            'circuit_breakers': self._check_circuit_breakers(),
            'system_resources': self._check_system_resources(),
            'dependencies': self._check_external_dependencies()
        }
        
        # Overall health status
        overall_healthy = all(
            check.get('healthy', False) for check in health_checks.values()
        )
        
        response_time = time.time() - start_time
        
        response_data = {
            'status': 'healthy' if overall_healthy else 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': round(response_time * 1000, 2),
            'services': health_checks,
            'version': getattr(settings, 'VERSION', 'unknown'),
            'environment': getattr(settings, 'ENVIRONMENT', 'unknown')
        }
        
        status_code = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(response_data, status=status_code)
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            # Test model queries
            user_count = User.objects.count()
            meal_count = Meal.objects.count()
            
            query_time = time.time() - start_time
            
            return {
                'healthy': True,
                'query_time_ms': round(query_time * 1000, 2),
                'statistics': {
                    'users': user_count,
                    'meals': meal_count
                },
                'connection_status': 'connected'
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'connection_status': 'failed'
            }
    
    def _check_cache_health(self) -> Dict[str, Any]:
        """Check cache connectivity and performance."""
        try:
            start_time = time.time()
            test_key = 'health_check_test'
            test_value = f'test_{int(time.time())}'
            
            # Test set
            cache.set(test_key, test_value, 60)
            
            # Test get
            retrieved_value = cache.get(test_key)
            
            # Test delete
            cache.delete(test_key)
            
            operation_time = time.time() - start_time
            
            return {
                'healthy': retrieved_value == test_value,
                'operation_time_ms': round(operation_time * 1000, 2),
                'backend': getattr(cache, '_cache', {}).get('__class__', 'unknown'),
                'test_successful': retrieved_value == test_value
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_ai_service_health(self) -> Dict[str, Any]:
        """Check AI service availability."""
        try:
            # Check configuration
            api_key_configured = bool(getattr(settings, 'GEMINI_API_KEY', None))
            if not api_key_configured:
                return {
                    'healthy': False,
                    'api_key_configured': False,
                    'message': 'API key not configured'
                }
            
            # Check circuit breaker status
            breaker_status = circuit_breaker_registry.get_status()
            ai_breakers = {k: v for k, v in breaker_status.items() if 'gemini' in k.lower()}
            
            # Check if any AI circuit breakers are open
            ai_breakers_open = any(
                breaker['state'] == 'open' for breaker in ai_breakers.values()
            )
            
            return {
                'healthy': not ai_breakers_open,
                'api_key_configured': api_key_configured,
                'circuit_breakers': ai_breakers,
                'service_available': not ai_breakers_open
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_payment_service_health(self) -> Dict[str, Any]:
        """Check payment service configuration."""
        try:
            stripe_configured = all([
                getattr(settings, 'STRIPE_PUBLISHABLE_KEY', None),
                getattr(settings, 'STRIPE_SECRET_KEY', None)
            ])
            
            if not stripe_configured:
                return {
                    'healthy': False,
                    'stripe_configured': False,
                    'message': 'Stripe keys not configured'
                }
            
            # Check if Stripe service can be initialized
            stripe_service = StripeService()
            
            return {
                'healthy': True,
                'stripe_configured': stripe_configured,
                'service_initialized': True
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'stripe_configured': False
            }
    
    def _check_notification_service_health(self) -> Dict[str, Any]:
        """Check notification service status."""
        try:
            expo_token_configured = bool(getattr(settings, 'EXPO_ACCESS_TOKEN', None))
            
            # Check if service can be initialized
            notification_service = ExpoNotificationService()
            
            return {
                'healthy': True,
                'expo_configured': expo_token_configured,
                'service_initialized': True
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_circuit_breakers(self) -> Dict[str, Any]:
        """Check circuit breaker status."""
        try:
            breaker_status = circuit_breaker_registry.get_status()
            
            open_breakers = [
                name for name, status in breaker_status.items()
                if status['state'] == 'open'
            ]
            
            return {
                'healthy': len(open_breakers) == 0,
                'total_breakers': len(breaker_status),
                'open_breakers': open_breakers,
                'breaker_details': breaker_status
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Check if resources are within acceptable limits
            cpu_healthy = cpu_percent < 90
            memory_healthy = memory.percent < 90
            disk_healthy = disk.percent < 90
            
            return {
                'healthy': cpu_healthy and memory_healthy and disk_healthy,
                'cpu': {
                    'percent': cpu_percent,
                    'healthy': cpu_healthy
                },
                'memory': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'used_gb': round(memory.used / (1024**3), 2),
                    'percent': memory.percent,
                    'healthy': memory_healthy
                },
                'disk': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'used_gb': round(disk.used / (1024**3), 2),
                    'percent': disk.percent,
                    'healthy': disk_healthy
                }
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_external_dependencies(self) -> Dict[str, Any]:
        """Check external service dependencies."""
        try:
            dependencies = {
                'redis': self._check_redis_connection(),
                'file_storage': self._check_file_storage(),
            }
            
            all_healthy = all(dep.get('healthy', False) for dep in dependencies.values())
            
            return {
                'healthy': all_healthy,
                'dependencies': dependencies
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_redis_connection(self) -> Dict[str, Any]:
        """Check Redis connection if configured."""
        try:
            # Try to get cache backend info
            cache_backend = str(type(cache._cache))
            
            if 'redis' in cache_backend.lower():
                # Test Redis connection
                cache.set('redis_health_test', 'ok', 10)
                result = cache.get('redis_health_test')
                cache.delete('redis_health_test')
                
                return {
                    'healthy': result == 'ok',
                    'backend': 'redis',
                    'connection_test': result == 'ok'
                }
            else:
                return {
                    'healthy': True,
                    'backend': 'not_redis',
                    'message': 'Redis not configured'
                }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_file_storage(self) -> Dict[str, Any]:
        """Check file storage accessibility."""
        try:
            media_root = getattr(settings, 'MEDIA_ROOT', '')
            if not media_root:
                return {
                    'healthy': False,
                    'message': 'MEDIA_ROOT not configured'
                }
            
            # Test write access
            test_file = os.path.join(media_root, 'health_check.txt')
            with open(test_file, 'w') as f:
                f.write('health check')
            
            # Test read access
            with open(test_file, 'r') as f:
                content = f.read()
            
            # Cleanup
            os.remove(test_file)
            
            return {
                'healthy': content == 'health check',
                'media_root': media_root,
                'write_test': True,
                'read_test': True
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }


class LivenessCheckView(APIView):
    """
    Liveness check endpoint.

    Checks if the application is alive and not in a deadlock state.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """Check application liveness."""
        # Simple check - if we can respond, we're alive
        return Response(
            {
                "status": "alive",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "pid": os.getpid(),
                "uptime_seconds": self._get_uptime(),
            }
        )

    def _get_uptime(self):
        """Get application uptime in seconds."""
        try:
            process = psutil.Process(os.getpid())
            return int(time.time() - process.create_time())
        except:
            return None


class MetricsView(APIView):
    """
    Application metrics endpoint.

    Provides detailed metrics about application performance and resource usage.
    """

    permission_classes = [AllowAny]  # In production, restrict to monitoring systems
    authentication_classes = []

    def get(self, request):
        """Get application metrics."""
        metrics = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "system": self._get_system_metrics(),
            "application": self._get_application_metrics(),
            "database": self._get_database_metrics(),
        }

        return Response(metrics)

    def _get_system_metrics(self):
        """Get system-level metrics."""
        try:
            process = psutil.Process(os.getpid())

            # CPU usage
            cpu_percent = process.cpu_percent(interval=0.1)

            # Memory usage
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()

            # Disk usage
            disk_usage = psutil.disk_usage("/")

            return {
                "cpu": {
                    "percent": cpu_percent,
                    "count": psutil.cpu_count(),
                },
                "memory": {
                    "rss_mb": memory_info.rss / 1024 / 1024,
                    "vms_mb": memory_info.vms / 1024 / 1024,
                    "percent": memory_percent,
                    "available_mb": psutil.virtual_memory().available / 1024 / 1024,
                },
                "disk": {
                    "used_percent": disk_usage.percent,
                    "free_gb": disk_usage.free / 1024 / 1024 / 1024,
                },
                "process": {
                    "pid": os.getpid(),
                    "threads": process.num_threads(),
                    "open_files": len(process.open_files()),
                    "connections": len(process.connections()),
                },
            }
        except Exception as e:
            return {"error": str(e)}

    def _get_application_metrics(self):
        """Get application-specific metrics."""
        from datetime import timedelta

        from django.utils import timezone

        from api.models import APIUsageLog, Meal, User

        try:
            now = timezone.now()
            last_hour = now - timedelta(hours=1)
            last_24h = now - timedelta(hours=24)

            return {
                "users": {
                    "total": User.objects.count(),
                    "active_today": User.objects.filter(
                        last_login__gte=now.date()
                    ).count(),
                    "verified": User.objects.filter(is_verified=True).count(),
                },
                "meals": {
                    "total": Meal.objects.count(),
                    "last_hour": Meal.objects.filter(created_at__gte=last_hour).count(),
                    "last_24h": Meal.objects.filter(created_at__gte=last_24h).count(),
                },
                "api_usage": {
                    "last_hour": APIUsageLog.objects.filter(
                        created_at__gte=last_hour
                    ).count(),
                    "last_24h": APIUsageLog.objects.filter(
                        created_at__gte=last_24h
                    ).count(),
                    "avg_response_time_ms": APIUsageLog.objects.filter(
                        created_at__gte=last_hour
                    ).aggregate(avg_time=models.Avg("response_time_ms"))["avg_time"]
                    or 0,
                },
            }
        except Exception as e:
            return {"error": str(e)}

    def _get_database_metrics(self):
        """Get database metrics."""
        try:
            from django.db import connection

            with connection.cursor() as cursor:
                # Get database size
                cursor.execute(
                    """
                    SELECT pg_database_size(current_database()) as size
                """
                )
                db_size = cursor.fetchone()[0]

                # Get connection count
                cursor.execute(
                    """
                    SELECT count(*) FROM pg_stat_activity
                    WHERE datname = current_database()
                """
                )
                connection_count = cursor.fetchone()[0]

                return {
                    "size_mb": db_size / 1024 / 1024,
                    "connections": connection_count,
                    "queries_executed": len(connection.queries),
                }
        except Exception as e:
            return {"error": str(e)}
