"""
Health check endpoints for monitoring application status.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import time
import os
import psutil
from datetime import datetime

from api.services.gemini_service import GeminiService


class HealthCheckView(APIView):
    """
    Basic health check endpoint.
    
    Returns 200 OK if the application is running.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required
    
    def get(self, request):
        """Simple health check."""
        return Response({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'version': getattr(settings, 'VERSION', '1.0.0'),
            'environment': getattr(settings, 'ENVIRONMENT', 'development'),
        })


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
            'database': self._check_database(),
            'cache': self._check_cache(),
            'storage': self._check_storage(),
            'gemini_api': self._check_gemini_api(),
        }
        
        # Overall status
        all_healthy = all(check['healthy'] for check in checks.values())
        overall_status = 'ready' if all_healthy else 'not_ready'
        
        response_data = {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'checks': checks,
        }
        
        # Return appropriate status code
        status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        
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
                'healthy': True,
                'response_time_ms': response_time,
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
            }
    
    def _check_cache(self):
        """Check cache connectivity."""
        try:
            start_time = time.time()
            test_key = 'health_check_test'
            cache.set(test_key, 'test_value', 10)
            value = cache.get(test_key)
            cache.delete(test_key)
            response_time = int((time.time() - start_time) * 1000)
            
            return {
                'healthy': value == 'test_value',
                'response_time_ms': response_time,
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
            }
    
    def _check_storage(self):
        """Check file storage availability."""
        try:
            # Check if media directory is writable
            media_root = settings.MEDIA_ROOT
            test_file = os.path.join(media_root, '.health_check')
            
            # Try to write a test file
            with open(test_file, 'w') as f:
                f.write('health check')
            
            # Try to read it back
            with open(test_file, 'r') as f:
                content = f.read()
            
            # Clean up
            os.remove(test_file)
            
            return {
                'healthy': content == 'health check',
                'media_root': media_root,
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
            }
    
    def _check_gemini_api(self):
        """Check Gemini API availability."""
        try:
            # Just check if API key is configured
            # Don't make actual API call to avoid costs
            api_key_configured = bool(settings.GEMINI_API_KEY)
            
            return {
                'healthy': api_key_configured,
                'api_key_configured': api_key_configured,
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
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
        return Response({
            'status': 'alive',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'pid': os.getpid(),
            'uptime_seconds': self._get_uptime(),
        })
    
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
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'system': self._get_system_metrics(),
            'application': self._get_application_metrics(),
            'database': self._get_database_metrics(),
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
            disk_usage = psutil.disk_usage('/')
            
            return {
                'cpu': {
                    'percent': cpu_percent,
                    'count': psutil.cpu_count(),
                },
                'memory': {
                    'rss_mb': memory_info.rss / 1024 / 1024,
                    'vms_mb': memory_info.vms / 1024 / 1024,
                    'percent': memory_percent,
                    'available_mb': psutil.virtual_memory().available / 1024 / 1024,
                },
                'disk': {
                    'used_percent': disk_usage.percent,
                    'free_gb': disk_usage.free / 1024 / 1024 / 1024,
                },
                'process': {
                    'pid': os.getpid(),
                    'threads': process.num_threads(),
                    'open_files': len(process.open_files()),
                    'connections': len(process.connections()),
                },
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _get_application_metrics(self):
        """Get application-specific metrics."""
        from api.models import User, Meal, APIUsageLog
        from django.utils import timezone
        from datetime import timedelta
        
        try:
            now = timezone.now()
            last_hour = now - timedelta(hours=1)
            last_24h = now - timedelta(hours=24)
            
            return {
                'users': {
                    'total': User.objects.count(),
                    'active_today': User.objects.filter(
                        last_login__gte=now.date()
                    ).count(),
                    'verified': User.objects.filter(is_verified=True).count(),
                },
                'meals': {
                    'total': Meal.objects.count(),
                    'last_hour': Meal.objects.filter(
                        created_at__gte=last_hour
                    ).count(),
                    'last_24h': Meal.objects.filter(
                        created_at__gte=last_24h
                    ).count(),
                },
                'api_usage': {
                    'last_hour': APIUsageLog.objects.filter(
                        created_at__gte=last_hour
                    ).count(),
                    'last_24h': APIUsageLog.objects.filter(
                        created_at__gte=last_24h
                    ).count(),
                    'avg_response_time_ms': APIUsageLog.objects.filter(
                        created_at__gte=last_hour
                    ).aggregate(
                        avg_time=models.Avg('response_time_ms')
                    )['avg_time'] or 0,
                },
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _get_database_metrics(self):
        """Get database metrics."""
        try:
            from django.db import connection
            
            with connection.cursor() as cursor:
                # Get database size
                cursor.execute("""
                    SELECT pg_database_size(current_database()) as size
                """)
                db_size = cursor.fetchone()[0]
                
                # Get connection count
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE datname = current_database()
                """)
                connection_count = cursor.fetchone()[0]
                
                return {
                    'size_mb': db_size / 1024 / 1024,
                    'connections': connection_count,
                    'queries_executed': len(connection.queries),
                }
        except Exception as e:
            return {'error': str(e)}