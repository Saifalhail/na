"""
Custom security middleware for the Nutrition AI API.
"""

import json
import logging
import time
import uuid

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status

from api.models import APIUsageLog

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add security headers to all responses.
    """

    def process_response(self, request, response):
        """Add security headers to response."""
        # Content Security Policy - Secure configuration without unsafe directives
        response["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net; "
            "style-src 'self' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.sentry.io https://api.openai.com https://generativelanguage.googleapis.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        # Other security headers
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["X-XSS-Protection"] = "1; mode=block"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # HSTS (HTTP Strict Transport Security)
        if request.is_secure():
            response["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

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
                "correlation_id": request.correlation_id,
                "method": request.method,
                "path": request.path,
                "user": (
                    request.user.email if request.user.is_authenticated else "anonymous"
                ),
                "ip": self.get_client_ip(request),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )

        return None

    def process_response(self, request, response):
        """Log response and save to database."""
        # Calculate response time
        response_time_ms = int(
            (time.time() - getattr(request, "_start_time", time.time())) * 1000
        )

        # Add correlation ID to response
        if hasattr(request, "correlation_id"):
            response["X-Correlation-ID"] = request.correlation_id

        # Log response
        logger.info(
            "API Response",
            extra={
                "correlation_id": getattr(request, "correlation_id", "unknown"),
                "status_code": response.status_code,
                "response_time_ms": response_time_ms,
            },
        )

        # Save to database (async in production)
        if request.path.startswith("/api/"):
            try:
                APIUsageLog.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    endpoint=request.path,
                    method=request.method,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                    request_body_size=len(request.body) if request.body else 0,
                    response_status_code=response.status_code,
                    response_time_ms=response_time_ms,
                    ai_tokens_used=getattr(request, "ai_tokens_used", 0),
                )
            except Exception as e:
                logger.error(f"Failed to log API usage: {str(e)}")

        return response

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class RateLimitMiddleware(MiddlewareMixin):
    """
    Enhanced rate limiting middleware with device-specific and subscription-aware limits.
    """

    # Rate limits per endpoint (requests per minute) - Free tier
    RATE_LIMITS_FREE = {
        "/api/v1/auth/login/": 5,
        "/api/v1/auth/register/": 3,
        "/api/v1/ai/analyze/": 8,  # Lower for free users
        "/api/v1/ai/recalculate/": 15,
        "/api/v1/mobile/batch/": 5,  # Batch operations limited for free
        "/api/v1/mobile/optimize-image/": 10,
        "default": 60,
    }

    # Rate limits per endpoint (requests per minute) - Premium tier
    RATE_LIMITS_PREMIUM = {
        "/api/v1/auth/login/": 10,
        "/api/v1/auth/register/": 5,
        "/api/v1/ai/analyze/": 30,  # Higher for premium
        "/api/v1/ai/recalculate/": 50,
        "/api/v1/mobile/batch/": 20,  # More batch operations
        "/api/v1/mobile/optimize-image/": 30,
        "default": 120,
    }

    # Burst limits for image uploads (per 5 minutes)
    BURST_LIMITS = {
        "free": {
            "/api/v1/ai/analyze/": 20,
            "/api/v1/mobile/optimize-image/": 25,
        },
        "premium": {
            "/api/v1/ai/analyze/": 80,
            "/api/v1/mobile/optimize-image/": 100,
        },
    }

    def process_request(self, request):
        """Check rate limits before processing request."""
        # Skip rate limiting for superusers
        if request.user.is_authenticated and request.user.is_superuser:
            return None

        # Get user subscription tier
        user_tier = self.get_user_tier(request.user)

        # Get rate limit for endpoint based on tier
        rate_limit = self.get_rate_limit(request.path, user_tier)

        # Check regular rate limit
        if self.is_rate_limited(request, rate_limit, "regular"):
            return JsonResponse(
                {
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {rate_limit} requests per minute allowed",
                    "tier": user_tier,
                    "upgrade_available": user_tier == "free",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Check burst limits for image endpoints
        if self.is_image_endpoint(request.path):
            burst_limit = self.get_burst_limit(request.path, user_tier)
            if burst_limit and self.is_rate_limited(request, burst_limit, "burst"):
                return JsonResponse(
                    {
                        "error": "Burst limit exceeded",
                        "message": f"Maximum {burst_limit} image requests per 5 minutes allowed",
                        "tier": user_tier,
                        "retry_after": 300,  # 5 minutes
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        return None

    def get_user_tier(self, user):
        """Get user subscription tier with caching for performance."""
        if not user.is_authenticated:
            return "free"

        # Use cached user tier for performance
        from api.services.user_cache_service import user_cache_service

        try:
            tier = user_cache_service.get_or_set_user_tier(user.id)
            return "premium" if tier in ["premium", "professional"] else "free"
        except Exception as e:
            # Fallback to direct database check if cache fails
            logger.error(f"Cache error in get_user_tier: {e}")

            try:
                # Check if user has active subscription
                active_subscription = user.subscriptions.filter(
                    status__in=["active", "trialing"]
                ).first()

                if active_subscription and active_subscription.plan.plan_type in [
                    "premium",
                    "professional",
                ]:
                    return "premium"
            except AttributeError:
                # Handle case where subscription models might not be available
                pass

            # Check legacy premium flag
            if hasattr(user, "profile") and getattr(user.profile, "is_premium", False):
                return "premium"

            return "free"

    def get_rate_limit(self, path, tier="free"):
        """Get rate limit for specific path and tier."""
        rate_limits = (
            self.RATE_LIMITS_PREMIUM if tier == "premium" else self.RATE_LIMITS_FREE
        )

        for endpoint, limit in rate_limits.items():
            if endpoint != "default" and path.startswith(endpoint):
                return limit
        return rate_limits["default"]

    def get_burst_limit(self, path, tier="free"):
        """Get burst limit for specific path and tier."""
        burst_limits = self.BURST_LIMITS.get(tier, {})

        for endpoint, limit in burst_limits.items():
            if path.startswith(endpoint):
                return limit
        return None

    def is_image_endpoint(self, path):
        """Check if endpoint handles image processing."""
        image_endpoints = ["/api/v1/ai/analyze/", "/api/v1/mobile/optimize-image/"]
        return any(path.startswith(endpoint) for endpoint in image_endpoints)

    def is_rate_limited(self, request, limit, limit_type="regular"):
        """Check if request should be rate limited."""
        # Get device ID from headers (for mobile apps)
        device_id = request.META.get("HTTP_X_DEVICE_ID")

        # Build identifier hierarchy: device -> user -> IP
        identifiers = []

        if device_id and request.user.is_authenticated:
            # Most specific: authenticated user on specific device
            identifiers.append(f"device_{device_id}_user_{request.user.id}")

        if request.user.is_authenticated:
            # User-level rate limiting
            identifiers.append(f"user_{request.user.id}")

        if device_id:
            # Device-level rate limiting (even for unauthenticated)
            identifiers.append(f"device_{device_id}")

        # Fallback to IP-based limiting
        identifiers.append(f"ip_{self.get_client_ip(request)}")

        # Set cache timeout based on limit type
        cache_timeout = 300 if limit_type == "burst" else 60  # 5 min vs 1 min

        # Check each identifier level
        for identifier in identifiers:
            cache_key = f"rate_limit_{limit_type}_{identifier}_{request.path}"

            # Get current count
            current_count = cache.get(cache_key, 0)

            if current_count >= limit:
                # Log rate limit hit for monitoring
                logger.warning(
                    f"Rate limit exceeded: {identifier} on {request.path}",
                    extra={
                        "identifier": identifier,
                        "path": request.path,
                        "limit": limit,
                        "current_count": current_count,
                        "limit_type": limit_type,
                        "device_id": device_id,
                        "user_id": (
                            request.user.id if request.user.is_authenticated else None
                        ),
                        "ip": self.get_client_ip(request),
                    },
                )
                return True

            # Increment count for this identifier
            cache.set(cache_key, current_count + 1, cache_timeout)

        return False

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
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
            if request.path == "/health/":
                return None

            # Build HTTPS URL
            secure_url = request.build_absolute_uri(request.get_full_path())
            secure_url = secure_url.replace("http://", "https://", 1)

            # Return redirect response
            from django.http import HttpResponsePermanentRedirect

            return HttpResponsePermanentRedirect(secure_url)

        return None


class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Middleware to audit security-sensitive operations.
    """

    SENSITIVE_OPERATIONS = [
        "/api/v1/auth/password/reset/",
        "/api/v1/auth/password/change/",
        "/api/v1/users/delete/",
        "/api/v1/admin/",
    ]

    def process_request(self, request):
        """Log security-sensitive operations."""
        for operation in self.SENSITIVE_OPERATIONS:
            if request.path.startswith(operation):
                logger.warning(
                    "Security-sensitive operation",
                    extra={
                        "operation": operation,
                        "user": (
                            request.user.email
                            if request.user.is_authenticated
                            else "anonymous"
                        ),
                        "ip": self.get_client_ip(request),
                        "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                        "correlation_id": getattr(request, "correlation_id", "unknown"),
                    },
                )
                break

        return None

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip
