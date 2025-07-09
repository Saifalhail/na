"""
Custom security middleware for the Nutrition AI API.
"""
import time
import uuid
import logging
import json
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings
from rest_framework import status

from api.models import APIUsageLog

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add security headers to all responses.
    """
    
    def process_response(self, request, response):
        """Add security headers to response."""
        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.sentry.io;"
        )
        
        # Other security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # HSTS (HTTP Strict Transport Security)
        if request.is_secure():
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        return response


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all API requests and responses with correlation IDs.
    """
    
    def process_request(self, request):
        """Add correlation ID and start timer."""
        # Generate correlation ID
        request.correlation_id = str(uuid.uuid4())
        request._start_time = time.time()
        
        # Log request
        logger.info(
            "API Request",
            extra={
                'correlation_id': request.correlation_id,
                'method': request.method,
                'path': request.path,
                'user': request.user.email if request.user.is_authenticated else 'anonymous',
                'ip': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        return None
    
    def process_response(self, request, response):
        """Log response and save to database."""
        # Calculate response time
        response_time_ms = int((time.time() - getattr(request, '_start_time', time.time())) * 1000)
        
        # Add correlation ID to response
        if hasattr(request, 'correlation_id'):
            response['X-Correlation-ID'] = request.correlation_id
        
        # Log response
        logger.info(
            "API Response",
            extra={
                'correlation_id': getattr(request, 'correlation_id', 'unknown'),
                'status_code': response.status_code,
                'response_time_ms': response_time_ms,
            }
        )
        
        # Save to database (async in production)
        if request.path.startswith('/api/'):
            try:
                APIUsageLog.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    endpoint=request.path,
                    method=request.method,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                    request_body_size=len(request.body) if request.body else 0,
                    response_status_code=response.status_code,
                    response_time_ms=response_time_ms,
                    ai_tokens_used=getattr(request, 'ai_tokens_used', 0),
                )
            except Exception as e:
                logger.error(f"Failed to log API usage: {str(e)}")
        
        return response
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RateLimitMiddleware(MiddlewareMixin):
    """
    Custom rate limiting middleware with different limits per endpoint.
    """
    
    # Rate limits per endpoint (requests per minute)
    RATE_LIMITS = {
        '/api/v1/auth/login/': 5,
        '/api/v1/auth/register/': 3,
        '/api/v1/analysis/image/': 10,
        '/api/v1/analysis/recalculate/': 20,
        'default': 60,
    }
    
    def process_request(self, request):
        """Check rate limits before processing request."""
        # Skip rate limiting for superusers
        if request.user.is_authenticated and request.user.is_superuser:
            return None
        
        # Get rate limit for endpoint
        rate_limit = self.get_rate_limit(request.path)
        
        # Check rate limit
        if self.is_rate_limited(request, rate_limit):
            return JsonResponse(
                {
                    'error': 'Rate limit exceeded',
                    'message': f'Maximum {rate_limit} requests per minute allowed',
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        return None
    
    def get_rate_limit(self, path):
        """Get rate limit for specific path."""
        for endpoint, limit in self.RATE_LIMITS.items():
            if endpoint != 'default' and path.startswith(endpoint):
                return limit
        return self.RATE_LIMITS['default']
    
    def is_rate_limited(self, request, limit):
        """Check if request should be rate limited."""
        # Get identifier (user ID or IP)
        if request.user.is_authenticated:
            identifier = f'user_{request.user.id}'
        else:
            identifier = f'ip_{self.get_client_ip(request)}'
        
        # Create cache key
        cache_key = f'rate_limit_{identifier}_{request.path}'
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            return True
        
        # Increment count
        cache.set(cache_key, current_count + 1, 60)  # 60 seconds
        
        return False
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class HTTPSEnforcementMiddleware(MiddlewareMixin):
    """
    Middleware to enforce HTTPS in production.
    """
    
    def process_request(self, request):
        """Redirect to HTTPS if not secure."""
        # Only enforce in production
        if not settings.DEBUG and not request.is_secure():
            # Don't redirect for health checks
            if request.path == '/health/':
                return None
            
            # Build HTTPS URL
            secure_url = request.build_absolute_uri(request.get_full_path())
            secure_url = secure_url.replace('http://', 'https://', 1)
            
            # Return redirect response
            from django.http import HttpResponsePermanentRedirect
            return HttpResponsePermanentRedirect(secure_url)
        
        return None


class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Middleware to audit security-sensitive operations.
    """
    
    SENSITIVE_OPERATIONS = [
        '/api/v1/auth/password/reset/',
        '/api/v1/auth/password/change/',
        '/api/v1/users/delete/',
        '/api/v1/admin/',
    ]
    
    def process_request(self, request):
        """Log security-sensitive operations."""
        for operation in self.SENSITIVE_OPERATIONS:
            if request.path.startswith(operation):
                logger.warning(
                    "Security-sensitive operation",
                    extra={
                        'operation': operation,
                        'user': request.user.email if request.user.is_authenticated else 'anonymous',
                        'ip': self.get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                        'correlation_id': getattr(request, 'correlation_id', 'unknown'),
                    }
                )
                break
        
        return None
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip