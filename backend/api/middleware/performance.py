"""
Performance monitoring middleware.
"""

import logging
import time
from typing import Any, Dict

from django.conf import settings
from django.db import connection
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """
    Middleware to monitor API performance including:
    - Response times
    - Database query count and time
    - Memory usage
    """

    def process_request(self, request):
        """Record start time and initial database queries."""
        request._performance_start_time = time.time()
        request._performance_initial_queries = len(connection.queries)

        # Reset query log for this request
        if settings.DEBUG:
            connection.queries_log.clear()

    def process_response(self, request, response):
        """Log performance metrics after response is generated."""
        if not hasattr(request, "_performance_start_time"):
            return response

        # Calculate response time
        response_time = time.time() - request._performance_start_time

        # Calculate database metrics
        query_count = len(connection.queries) - request._performance_initial_queries
        total_query_time = 0

        if settings.DEBUG:
            # Calculate total query time
            for query in connection.queries[request._performance_initial_queries :]:
                total_query_time += float(query.get("time", 0))

        # Add performance headers
        response["X-Response-Time"] = f"{response_time:.3f}s"
        response["X-Query-Count"] = str(query_count)

        if settings.DEBUG:
            response["X-Query-Time"] = f"{total_query_time:.3f}s"

        # Log performance metrics
        self._log_performance_metrics(
            request=request,
            response=response,
            response_time=response_time,
            query_count=query_count,
            total_query_time=total_query_time,
        )

        return response

    def _log_performance_metrics(
        self,
        request,
        response,
        response_time: float,
        query_count: int,
        total_query_time: float,
    ):
        """Log performance metrics for monitoring."""
        # Only log for API endpoints
        if not request.path.startswith("/api/"):
            return

        # Prepare log data
        log_data = {
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "response_time": response_time,
            "query_count": query_count,
            "query_time": total_query_time,
            "user_id": (
                getattr(request.user, "id", None) if hasattr(request, "user") else None
            ),
        }

        # Log warnings for slow requests
        if response_time > 1.0:  # Slower than 1 second
            logger.warning(
                f"Slow API request: {request.method} {request.path} "
                f"took {response_time:.3f}s with {query_count} queries "
                f"({total_query_time:.3f}s query time)",
                extra=log_data,
            )
        elif query_count > 10:  # More than 10 database queries
            logger.warning(
                f"High query count: {request.method} {request.path} "
                f"made {query_count} queries in {response_time:.3f}s",
                extra=log_data,
            )
        elif settings.DEBUG:
            # In debug mode, log all API requests
            logger.info(
                f"API request: {request.method} {request.path} "
                f"[{response.status_code}] {response_time:.3f}s "
                f"({query_count} queries, {total_query_time:.3f}s)",
                extra=log_data,
            )


class DatabaseQueryTimingMiddleware(MiddlewareMixin):
    """
    Middleware to log individual slow database queries.
    """

    def process_response(self, request, response):
        """Log slow individual queries."""
        if not settings.DEBUG:
            return response

        # Only check API endpoints
        if not request.path.startswith("/api/"):
            return response

        # Log individual slow queries
        for query in connection.queries:
            query_time = float(query.get("time", 0))
            if query_time > 0.1:  # Slower than 100ms
                logger.warning(
                    f"Slow database query ({query_time:.3f}s): {query['sql'][:200]}...",
                    extra={
                        "query_time": query_time,
                        "sql": query["sql"],
                        "path": request.path,
                        "method": request.method,
                    },
                )

        return response


class CacheHitRateMiddleware(MiddlewareMixin):
    """
    Middleware to track cache hit rates.
    """

    def __init__(self, get_response):
        super().__init__(get_response)
        self.cache_hits = 0
        self.cache_misses = 0

    def process_request(self, request):
        """Initialize cache tracking for this request."""
        request._cache_hits = 0
        request._cache_misses = 0

    def process_response(self, request, response):
        """Add cache hit rate headers."""
        if hasattr(request, "_cache_hits") and hasattr(request, "_cache_misses"):
            total_cache_operations = request._cache_hits + request._cache_misses

            if total_cache_operations > 0:
                hit_rate = (request._cache_hits / total_cache_operations) * 100
                response["X-Cache-Hit-Rate"] = f"{hit_rate:.1f}%"
                response["X-Cache-Operations"] = str(total_cache_operations)

        return response
