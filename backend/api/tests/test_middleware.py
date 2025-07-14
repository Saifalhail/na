"""
Tests for custom middleware.
"""

import time
import uuid
from unittest.mock import MagicMock, Mock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse, JsonResponse
from django.test import RequestFactory, TestCase, override_settings

from api.middleware.performance import (CacheHitRateMiddleware,
                                        DatabaseQueryTimingMiddleware,
                                        PerformanceMonitoringMiddleware)
from api.models import APIUsageLog
from api.security.middleware import (HTTPSEnforcementMiddleware,
                                     RateLimitMiddleware,
                                     RequestLoggingMiddleware,
                                     SecurityAuditMiddleware,
                                     SecurityHeadersMiddleware)
from api.tests.factories import UserFactory

User = get_user_model()


class PerformanceMonitoringMiddlewareTestCase(TestCase):
    """Test cases for PerformanceMonitoringMiddleware."""

    def setUp(self):
        self.middleware = PerformanceMonitoringMiddleware(Mock())
        self.factory = RequestFactory()
        self.user = UserFactory()

    def test_process_request(self):
        """Test process_request sets up performance tracking."""
        request = self.factory.get("/api/v1/test/")

        self.middleware.process_request(request)

        self.assertTrue(hasattr(request, "_performance_start_time"))
        self.assertTrue(hasattr(request, "_performance_initial_queries"))
        self.assertIsInstance(request._performance_start_time, float)
        self.assertIsInstance(request._performance_initial_queries, int)

    @override_settings(DEBUG=True)
    def test_process_request_clears_query_log(self):
        """Test process_request clears query log in debug mode."""
        request = self.factory.get("/api/v1/test/")

        # Mock connection.queries_log
        with patch("api.middleware.performance.connection") as mock_connection:
            mock_connection.queries = []
            mock_connection.queries_log = Mock()

            self.middleware.process_request(request)

            mock_connection.queries_log.clear.assert_called_once()

    def test_process_response_without_start_time(self):
        """Test process_response handles missing start time gracefully."""
        request = self.factory.get("/api/v1/test/")
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        self.assertEqual(result, response)

    @override_settings(DEBUG=False)
    def test_process_response_production_mode(self):
        """Test process_response in production mode."""
        request = self.factory.get("/api/v1/test/")
        request._performance_start_time = time.time() - 0.1
        request._performance_initial_queries = 0
        response = HttpResponse("OK")

        with patch("api.middleware.performance.connection") as mock_connection:
            mock_connection.queries = [{"time": "0.05"}]

            result = self.middleware.process_response(request, response)

        self.assertIn("X-Response-Time", result)
        self.assertIn("X-Query-Count", result)
        self.assertNotIn("X-Query-Time", result)  # Not in production

    @override_settings(DEBUG=True)
    def test_process_response_debug_mode(self):
        """Test process_response in debug mode with full metrics."""
        request = self.factory.get("/api/v1/test/")
        request._performance_start_time = time.time() - 0.2
        request._performance_initial_queries = 0
        response = HttpResponse("OK")

        with patch("api.middleware.performance.connection") as mock_connection:
            mock_connection.queries = [{"time": "0.05"}, {"time": "0.03"}]

            result = self.middleware.process_response(request, response)

        self.assertIn("X-Response-Time", result)
        self.assertIn("X-Query-Count", result)
        self.assertIn("X-Query-Time", result)
        self.assertEqual(result["X-Query-Count"], "2")
        self.assertEqual(result["X-Query-Time"], "0.080s")

    @patch("api.middleware.performance.logger")
    def test_log_performance_metrics_slow_request(self, mock_logger):
        """Test logging for slow requests."""
        request = self.factory.get("/api/v1/test/")
        request.user = self.user
        response = HttpResponse("OK")
        response.status_code = 200

        self.middleware._log_performance_metrics(
            request=request,
            response=response,
            response_time=1.5,  # Slow request
            query_count=5,
            total_query_time=0.3,
        )

        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args
        self.assertIn("Slow API request", call_args[0][0])
        self.assertIn("1.500s", call_args[0][0])

    @patch("api.middleware.performance.logger")
    def test_log_performance_metrics_high_query_count(self, mock_logger):
        """Test logging for high query count."""
        request = self.factory.get("/api/v1/test/")
        request.user = self.user
        response = HttpResponse("OK")
        response.status_code = 200

        self.middleware._log_performance_metrics(
            request=request,
            response=response,
            response_time=0.5,
            query_count=15,  # High query count
            total_query_time=0.3,
        )

        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args
        self.assertIn("High query count", call_args[0][0])
        self.assertIn("15 queries", call_args[0][0])

    @patch("api.middleware.performance.logger")
    @override_settings(DEBUG=True)
    def test_log_performance_metrics_debug_info(self, mock_logger):
        """Test debug logging for normal requests."""
        request = self.factory.get("/api/v1/test/")
        request.user = self.user
        response = HttpResponse("OK")
        response.status_code = 200

        self.middleware._log_performance_metrics(
            request=request,
            response=response,
            response_time=0.2,
            query_count=3,
            total_query_time=0.1,
        )

        mock_logger.info.assert_called_once()
        call_args = mock_logger.info.call_args
        self.assertIn("API request", call_args[0][0])
        self.assertIn("[200]", call_args[0][0])

    def test_log_performance_metrics_non_api_path(self):
        """Test that non-API paths are not logged."""
        request = self.factory.get("/admin/")
        response = HttpResponse("OK")

        with patch("api.middleware.performance.logger") as mock_logger:
            self.middleware._log_performance_metrics(
                request=request,
                response=response,
                response_time=0.2,
                query_count=3,
                total_query_time=0.1,
            )

            mock_logger.warning.assert_not_called()
            mock_logger.info.assert_not_called()


class DatabaseQueryTimingMiddlewareTestCase(TestCase):
    """Test cases for DatabaseQueryTimingMiddleware."""

    def setUp(self):
        self.middleware = DatabaseQueryTimingMiddleware(Mock())
        self.factory = RequestFactory()

    @override_settings(DEBUG=False)
    def test_process_response_production_mode(self):
        """Test middleware does nothing in production mode."""
        request = self.factory.get("/api/v1/test/")
        response = HttpResponse("OK")

        with patch("api.middleware.performance.logger") as mock_logger:
            result = self.middleware.process_response(request, response)

            self.assertEqual(result, response)
            mock_logger.warning.assert_not_called()

    @override_settings(DEBUG=True)
    def test_process_response_non_api_path(self):
        """Test middleware ignores non-API paths."""
        request = self.factory.get("/admin/")
        response = HttpResponse("OK")

        with patch("api.middleware.performance.logger") as mock_logger:
            result = self.middleware.process_response(request, response)

            self.assertEqual(result, response)
            mock_logger.warning.assert_not_called()

    @override_settings(DEBUG=True)
    @patch("api.middleware.performance.connection")
    @patch("api.middleware.performance.logger")
    def test_process_response_slow_query_logging(self, mock_logger, mock_connection):
        """Test logging of slow individual queries."""
        request = self.factory.get("/api/v1/test/")
        response = HttpResponse("OK")

        # Mock slow query
        mock_connection.queries = [
            {
                "time": "0.150",  # Slow query (>100ms)
                "sql": "SELECT * FROM api_user WHERE id = 1 AND very_long_query_here",
            },
            {"time": "0.050", "sql": "SELECT COUNT(*) FROM api_meal"},  # Fast query
        ]

        self.middleware.process_response(request, response)

        # Should log only the slow query
        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args
        self.assertIn("Slow database query (0.150s)", call_args[0][0])
        self.assertIn("SELECT * FROM api_user", call_args[0][0])


class CacheHitRateMiddlewareTestCase(TestCase):
    """Test cases for CacheHitRateMiddleware."""

    def setUp(self):
        self.middleware = CacheHitRateMiddleware(Mock())
        self.factory = RequestFactory()

    def test_init(self):
        """Test middleware initialization."""
        self.assertEqual(self.middleware.cache_hits, 0)
        self.assertEqual(self.middleware.cache_misses, 0)

    def test_process_request(self):
        """Test process_request initializes cache tracking."""
        request = self.factory.get("/api/v1/test/")

        self.middleware.process_request(request)

        self.assertEqual(request._cache_hits, 0)
        self.assertEqual(request._cache_misses, 0)

    def test_process_response_with_cache_operations(self):
        """Test process_response with cache operations."""
        request = self.factory.get("/api/v1/test/")
        request._cache_hits = 8
        request._cache_misses = 2
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        self.assertEqual(result["X-Cache-Hit-Rate"], "80.0%")
        self.assertEqual(result["X-Cache-Operations"], "10")

    def test_process_response_no_cache_operations(self):
        """Test process_response with no cache operations."""
        request = self.factory.get("/api/v1/test/")
        request._cache_hits = 0
        request._cache_misses = 0
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        self.assertNotIn("X-Cache-Hit-Rate", result)
        self.assertNotIn("X-Cache-Operations", result)

    def test_process_response_missing_cache_attributes(self):
        """Test process_response when cache attributes are missing."""
        request = self.factory.get("/api/v1/test/")
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        self.assertNotIn("X-Cache-Hit-Rate", result)
        self.assertNotIn("X-Cache-Operations", result)


class SecurityHeadersMiddlewareTestCase(TestCase):
    """Test cases for SecurityHeadersMiddleware."""

    def setUp(self):
        self.middleware = SecurityHeadersMiddleware(Mock())
        self.factory = RequestFactory()

    def test_process_response_http_request(self):
        """Test security headers for HTTP request."""
        request = self.factory.get("/")
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        # Check all security headers
        self.assertIn("Content-Security-Policy", result)
        self.assertEqual(result["X-Content-Type-Options"], "nosniff")
        self.assertEqual(result["X-Frame-Options"], "DENY")
        self.assertEqual(result["X-XSS-Protection"], "1; mode=block")
        self.assertEqual(result["Referrer-Policy"], "strict-origin-when-cross-origin")
        self.assertIn("Permissions-Policy", result)
        self.assertNotIn("Strict-Transport-Security", result)  # Not HTTPS

    def test_process_response_https_request(self):
        """Test security headers for HTTPS request."""
        request = self.factory.get("/", secure=True)
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        # Should include HSTS header for HTTPS
        self.assertIn("Strict-Transport-Security", result)
        self.assertIn("max-age=31536000", result["Strict-Transport-Security"])
        self.assertIn("includeSubDomains", result["Strict-Transport-Security"])

    def test_content_security_policy_header(self):
        """Test Content Security Policy header content."""
        request = self.factory.get("/")
        response = HttpResponse("OK")

        result = self.middleware.process_response(request, response)

        csp = result["Content-Security-Policy"]
        self.assertIn("default-src 'self'", csp)
        self.assertIn("script-src 'self'", csp)
        self.assertIn("style-src 'self'", csp)
        self.assertIn("connect-src 'self' https://api.sentry.io", csp)


class RequestLoggingMiddlewareTestCase(TestCase):
    """Test cases for RequestLoggingMiddleware."""

    def setUp(self):
        self.middleware = RequestLoggingMiddleware(Mock())
        self.factory = RequestFactory()
        self.user = UserFactory()

    @patch("api.security.middleware.uuid.uuid4")
    @patch("api.security.middleware.logger")
    def test_process_request(self, mock_logger, mock_uuid):
        """Test process_request logs and sets up tracking."""
        mock_uuid.return_value = uuid.UUID("12345678-1234-5678-1234-567812345678")
        request = self.factory.get("/api/v1/test/")
        request.user = self.user

        result = self.middleware.process_request(request)

        self.assertIsNone(result)
        self.assertEqual(request.correlation_id, "12345678-1234-5678-1234-567812345678")
        self.assertTrue(hasattr(request, "_start_time"))

        mock_logger.info.assert_called_once_with(
            "API Request",
            extra={
                "correlation_id": "12345678-1234-5678-1234-567812345678",
                "method": "GET",
                "path": "/api/v1/test/",
                "user": self.user.email,
                "ip": "127.0.0.1",  # RequestFactory sets default REMOTE_ADDR
                "user_agent": "",
            },
        )

    @patch("api.security.middleware.logger")
    def test_process_request_anonymous_user(self, mock_logger):
        """Test process_request with anonymous user."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/api/v1/test/")
        request.user = AnonymousUser()

        self.middleware.process_request(request)

        call_args = mock_logger.info.call_args
        self.assertEqual(call_args[1]["extra"]["user"], "anonymous")

    @patch("api.security.middleware.logger")
    def test_process_response_api_endpoint(self, mock_logger):
        """Test process_response for API endpoint."""
        request = self.factory.post(
            "/api/v1/test/", data='{"test": "data"}', content_type="application/json"
        )
        request.user = self.user
        request.correlation_id = "test-correlation-id"
        request._start_time = time.time() - 0.1
        response = HttpResponse("OK")
        response.status_code = 200

        with patch.object(APIUsageLog.objects, "create") as mock_create:
            result = self.middleware.process_response(request, response)

        self.assertEqual(result["X-Correlation-ID"], "test-correlation-id")
        mock_logger.info.assert_called_with(
            "API Response",
            extra={
                "correlation_id": "test-correlation-id",
                "status_code": 200,
                "response_time_ms": mock_logger.info.call_args[1]["extra"][
                    "response_time_ms"
                ],
            },
        )
        mock_create.assert_called_once()

    def test_process_response_non_api_endpoint(self):
        """Test process_response for non-API endpoint."""
        request = self.factory.get("/admin/")
        request.user = self.user
        request._start_time = time.time()
        response = HttpResponse("OK")

        with patch.object(APIUsageLog.objects, "create") as mock_create:
            self.middleware.process_response(request, response)

        mock_create.assert_not_called()

    def test_get_client_ip_with_forwarded_for(self):
        """Test IP extraction with X-Forwarded-For header."""
        request = self.factory.get("/")
        request.META["HTTP_X_FORWARDED_FOR"] = "192.168.1.1, 10.0.0.1"

        ip = self.middleware.get_client_ip(request)

        self.assertEqual(ip, "192.168.1.1")

    def test_get_client_ip_with_remote_addr(self):
        """Test IP extraction with REMOTE_ADDR."""
        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = "192.168.1.2"

        ip = self.middleware.get_client_ip(request)

        self.assertEqual(ip, "192.168.1.2")


class RateLimitMiddlewareTestCase(TestCase):
    """Test cases for RateLimitMiddleware."""

    def setUp(self):
        self.middleware = RateLimitMiddleware(Mock())
        self.factory = RequestFactory()
        self.user = UserFactory()
        cache.clear()  # Clear cache between tests

    def test_process_request_superuser_bypass(self):
        """Test superuser bypasses rate limiting."""
        self.user.is_superuser = True
        self.user.save()

        request = self.factory.post("/api/v1/auth/login/")
        request.user = self.user

        result = self.middleware.process_request(request)

        self.assertIsNone(result)

    def test_get_rate_limit_specific_endpoint(self):
        """Test rate limit for specific endpoint."""
        rate_limit = self.middleware.get_rate_limit("/api/v1/auth/login/")
        self.assertEqual(rate_limit, 5)

        rate_limit = self.middleware.get_rate_limit("/api/v1/analysis/image/")
        self.assertEqual(rate_limit, 10)

    def test_get_rate_limit_default(self):
        """Test default rate limit."""
        rate_limit = self.middleware.get_rate_limit("/api/v1/meals/")
        self.assertEqual(rate_limit, 60)

    def test_is_rate_limited_authenticated_user(self):
        """Test rate limiting for authenticated user."""
        request = self.factory.post("/api/v1/auth/login/")
        request.user = self.user

        # First request should not be limited
        self.assertFalse(self.middleware.is_rate_limited(request, 5))

        # Subsequent requests within limit
        for _ in range(4):
            self.assertFalse(self.middleware.is_rate_limited(request, 5))

        # 6th request should be limited
        self.assertTrue(self.middleware.is_rate_limited(request, 5))

    def test_is_rate_limited_anonymous_user(self):
        """Test rate limiting for anonymous user by IP."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.post("/api/v1/auth/login/")
        request.user = AnonymousUser()
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        # First request should not be limited
        self.assertFalse(self.middleware.is_rate_limited(request, 3))

        # Subsequent requests within limit
        for _ in range(2):
            self.assertFalse(self.middleware.is_rate_limited(request, 3))

        # 4th request should be limited
        self.assertTrue(self.middleware.is_rate_limited(request, 3))

    def test_process_request_rate_limited(self):
        """Test process_request returns error when rate limited."""
        request = self.factory.post("/api/v1/auth/login/")
        request.user = self.user

        # Exceed rate limit
        with patch.object(self.middleware, "is_rate_limited", return_value=True):
            response = self.middleware.process_request(request)

        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 429)


class HTTPSEnforcementMiddlewareTestCase(TestCase):
    """Test cases for HTTPSEnforcementMiddleware."""

    def setUp(self):
        self.middleware = HTTPSEnforcementMiddleware(Mock())
        self.factory = RequestFactory()

    @override_settings(DEBUG=True)
    def test_process_request_debug_mode(self):
        """Test middleware does nothing in debug mode."""
        request = self.factory.get("/")

        result = self.middleware.process_request(request)

        self.assertIsNone(result)

    @override_settings(DEBUG=False)
    def test_process_request_secure_request(self):
        """Test secure request is allowed."""
        request = self.factory.get("/", secure=True)

        result = self.middleware.process_request(request)

        self.assertIsNone(result)

    @override_settings(DEBUG=False)
    def test_process_request_health_check_exception(self):
        """Test health check endpoint is exempt from HTTPS enforcement."""
        request = self.factory.get("/health/")

        result = self.middleware.process_request(request)

        self.assertIsNone(result)

    @override_settings(DEBUG=False)
    def test_process_request_https_redirect(self):
        """Test HTTP request is redirected to HTTPS."""
        request = self.factory.get("/api/v1/test/")
        request.META["HTTP_HOST"] = "example.com"

        with patch.object(request, "build_absolute_uri") as mock_build_uri:
            mock_build_uri.return_value = "http://example.com/api/v1/test/"

            response = self.middleware.process_request(request)

        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "https://example.com/api/v1/test/")


class SecurityAuditMiddlewareTestCase(TestCase):
    """Test cases for SecurityAuditMiddleware."""

    def setUp(self):
        self.middleware = SecurityAuditMiddleware(Mock())
        self.factory = RequestFactory()
        self.user = UserFactory()

    @patch("api.security.middleware.logger")
    def test_process_request_sensitive_operation(self, mock_logger):
        """Test logging of sensitive operations."""
        request = self.factory.post("/api/v1/auth/password/reset/")
        request.user = self.user
        request.correlation_id = "test-id"
        request.META["REMOTE_ADDR"] = "192.168.1.1"
        request.META["HTTP_USER_AGENT"] = "Test Agent"

        self.middleware.process_request(request)

        mock_logger.warning.assert_called_once_with(
            "Security-sensitive operation",
            extra={
                "operation": "/api/v1/auth/password/reset/",
                "user": self.user.email,
                "ip": "192.168.1.1",
                "user_agent": "Test Agent",
                "correlation_id": "test-id",
            },
        )

    @patch("api.security.middleware.logger")
    def test_process_request_non_sensitive_operation(self, mock_logger):
        """Test no logging for non-sensitive operations."""
        request = self.factory.get("/api/v1/meals/")
        request.user = self.user

        self.middleware.process_request(request)

        mock_logger.warning.assert_not_called()

    @patch("api.security.middleware.logger")
    def test_process_request_anonymous_user(self, mock_logger):
        """Test logging with anonymous user."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.post("/api/v1/admin/")
        request.user = AnonymousUser()

        self.middleware.process_request(request)

        call_args = mock_logger.warning.call_args
        self.assertEqual(call_args[1]["extra"]["user"], "anonymous")

    def test_get_client_ip(self):
        """Test IP extraction method."""
        request = self.factory.get("/")
        request.META["HTTP_X_FORWARDED_FOR"] = "192.168.1.1, 10.0.0.1"

        ip = self.middleware.get_client_ip(request)

        self.assertEqual(ip, "192.168.1.1")
