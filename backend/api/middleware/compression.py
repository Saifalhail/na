"""
Response compression middleware for API performance optimization.
"""

import gzip
import json
import logging
from io import BytesIO

from django.conf import settings
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class ResponseCompressionMiddleware(MiddlewareMixin):
    """
    Middleware to compress API responses for better performance.
    """

    # Minimum response size to compress (in bytes)
    MIN_COMPRESSION_SIZE = 1024  # 1KB

    # Content types that should be compressed
    COMPRESSIBLE_TYPES = [
        "application/json",
        "text/json",
        "application/xml",
        "text/xml",
        "text/plain",
        "text/html",
        "text/css",
        "application/javascript",
        "text/javascript",
    ]

    def process_response(self, request, response):
        """
        Compress response if appropriate.
        """
        # Skip compression in debug mode unless explicitly enabled
        if settings.DEBUG and not getattr(settings, "ENABLE_COMPRESSION_DEBUG", False):
            return response

        # Check if client accepts gzip
        if not self._accepts_gzip(request):
            return response

        # Check if response should be compressed
        if not self._should_compress(response):
            return response

        # Compress the response
        try:
            compressed_response = self._compress_response(response)
            if compressed_response:
                # Log compression stats
                original_size = len(response.content)
                compressed_size = len(compressed_response.content)
                compression_ratio = (1 - compressed_size / original_size) * 100

                logger.debug(
                    f"Compressed response: {original_size} -> {compressed_size} bytes "
                    f"({compression_ratio:.1f}% reduction)"
                )

                return compressed_response

        except Exception as e:
            logger.warning(f"Failed to compress response: {e}")

        return response

    def _accepts_gzip(self, request):
        """Check if client accepts gzip encoding."""
        accept_encoding = request.META.get("HTTP_ACCEPT_ENCODING", "").lower()
        return "gzip" in accept_encoding

    def _should_compress(self, response):
        """Check if response should be compressed."""
        # Don't compress if already compressed
        if response.get("Content-Encoding"):
            return False

        # Check content type
        content_type = response.get("Content-Type", "").lower().split(";")[0]
        if content_type not in self.COMPRESSIBLE_TYPES:
            return False

        # Check response size
        if len(response.content) < self.MIN_COMPRESSION_SIZE:
            return False

        # Don't compress error responses below 500
        if hasattr(response, "status_code") and 400 <= response.status_code < 500:
            return False

        return True

    def _compress_response(self, response):
        """Compress response content using gzip."""
        try:
            # Create gzipped content
            gzip_buffer = BytesIO()
            with gzip.GzipFile(fileobj=gzip_buffer, mode="wb") as gzip_file:
                gzip_file.write(response.content)

            # Create new response with compressed content
            compressed_content = gzip_buffer.getvalue()

            # Copy response
            compressed_response = HttpResponse(
                compressed_content,
                content_type=response.get("Content-Type"),
                status=response.status_code,
            )

            # Copy headers
            for header, value in response.items():
                compressed_response[header] = value

            # Set compression headers
            compressed_response["Content-Encoding"] = "gzip"
            compressed_response["Content-Length"] = len(compressed_content)
            compressed_response["Vary"] = "Accept-Encoding"

            return compressed_response

        except Exception as e:
            logger.error(f"Error compressing response: {e}")
            return None


class APIResponseOptimizationMiddleware(MiddlewareMixin):
    """
    Middleware to optimize API responses for mobile clients.
    """

    def process_response(self, request, response):
        """
        Optimize API responses based on client capabilities.
        """
        # Skip non-API requests
        if not request.path.startswith("/api/"):
            return response

        # Add performance headers
        self._add_performance_headers(request, response)

        # Optimize JSON responses for mobile
        if self._is_mobile_client(request) and self._is_json_response(response):
            try:
                self._optimize_json_response(response)
            except Exception as e:
                logger.warning(f"Failed to optimize JSON response: {e}")

        return response

    def _add_performance_headers(self, request, response):
        """Add performance-related headers."""
        # Cache headers for static content
        if request.path.startswith("/api/v1/mobile/"):
            response["Cache-Control"] = "private, max-age=300"  # 5 minutes

        # Add response time header for debugging
        if hasattr(request, "_start_time"):
            import time

            response_time = int((time.time() - request._start_time) * 1000)
            response["X-Response-Time"] = f"{response_time}ms"

    def _is_mobile_client(self, request):
        """Check if request is from a mobile client."""
        user_agent = request.META.get("HTTP_USER_AGENT", "").lower()
        mobile_indicators = ["mobile", "android", "iphone", "ipad", "expo"]
        return any(indicator in user_agent for indicator in mobile_indicators)

    def _is_json_response(self, response):
        """Check if response is JSON."""
        content_type = response.get("Content-Type", "").lower()
        return "application/json" in content_type

    def _optimize_json_response(self, response):
        """Optimize JSON response for mobile clients."""
        try:
            # Parse JSON
            data = json.loads(response.content.decode("utf-8"))

            # Remove null values to reduce payload size
            optimized_data = self._remove_null_values(data)

            # Compact JSON (no extra whitespace)
            optimized_content = json.dumps(optimized_data, separators=(",", ":"))

            # Update response
            response.content = optimized_content.encode("utf-8")
            response["Content-Length"] = len(response.content)

        except (json.JSONDecodeError, UnicodeDecodeError):
            # Skip optimization if JSON is invalid
            pass

    def _remove_null_values(self, data):
        """Recursively remove null values from data structure."""
        if isinstance(data, dict):
            return {
                key: self._remove_null_values(value)
                for key, value in data.items()
                if value is not None
            }
        elif isinstance(data, list):
            return [self._remove_null_values(item) for item in data if item is not None]
        else:
            return data


class RequestTimingMiddleware(MiddlewareMixin):
    """
    Middleware to track request timing for performance monitoring.
    """

    def process_request(self, request):
        """Record request start time."""
        import time

        request._start_time = time.time()

    def process_response(self, request, response):
        """Calculate and log request timing."""
        if hasattr(request, "_start_time"):
            import time

            request_time = time.time() - request._start_time

            # Log slow requests
            if request_time > 1.0:  # 1 second threshold
                logger.warning(
                    f"Slow request: {request.method} {request.path} took {request_time:.2f}s",
                    extra={
                        "request_time": request_time,
                        "method": request.method,
                        "path": request.path,
                        "user_id": (
                            request.user.id if request.user.is_authenticated else None
                        ),
                        "status_code": response.status_code,
                    },
                )

            # Add timing header
            response["X-Response-Time-Seconds"] = f"{request_time:.3f}"

        return response
