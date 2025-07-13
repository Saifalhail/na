"""
Global exception handler for the Nutrition AI API.
"""

import logging
import traceback
from typing import Any, Dict, Optional

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (APIException, AuthenticationFailed,
                                       MethodNotAllowed, NotAcceptable,
                                       NotAuthenticated, NotFound,
                                       PermissionDenied, Throttled,
                                       ValidationError)
from rest_framework.response import Response
from rest_framework.views import exception_handler
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .custom_exceptions import (InvalidTokenException, NutritionAIException,
                                RateLimitException, SystemException,
                                TokenExpiredException)

logger = logging.getLogger(__name__)


def custom_exception_handler(
    exc: Exception, context: Dict[str, Any]
) -> Optional[Response]:
    """
    Custom exception handler that formats all errors consistently.

    Args:
        exc: The exception that was raised
        context: Additional context including the view that raised the exception

    Returns:
        Response object with formatted error data
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # Get request object for additional context
    request = context.get("request")
    view = context.get("view")

    # Log the exception
    _log_exception(exc, request, view)

    # If response is None, we have an unhandled exception
    if response is None:
        response = _handle_generic_error(exc, request)

    # Format the response data
    if response is not None:
        response.data = _format_error_response(exc, response, request)

        # Add correlation ID if available
        if hasattr(request, "correlation_id"):
            response.data["correlation_id"] = request.correlation_id

    return response


def _log_exception(exc: Exception, request, view) -> None:
    """Log exception details."""
    # Determine log level based on exception type
    if isinstance(exc, (NotAuthenticated, PermissionDenied, ValidationError)):
        log_level = logging.INFO
    elif isinstance(exc, (Http404, NotFound)):
        log_level = logging.WARNING
    elif isinstance(exc, NutritionAIException):
        log_level = logging.WARNING
    else:
        log_level = logging.ERROR

    # Build log context
    log_context = {
        "exception_type": type(exc).__name__,
        "exception_message": str(exc),
        "request_method": getattr(request, "method", "Unknown"),
        "request_path": getattr(request, "path", "Unknown"),
        "user": (
            getattr(request.user, "email", "anonymous")
            if hasattr(request, "user")
            else "unknown"
        ),
        "view": view.__class__.__name__ if view else "Unknown",
        "correlation_id": getattr(request, "correlation_id", "unknown"),
    }

    # Log with appropriate level
    logger.log(
        log_level,
        f"Exception in {log_context['view']}: {log_context['exception_type']}",
        extra=log_context,
        exc_info=(log_level == logging.ERROR),
    )


def _handle_generic_error(exc: Exception, request) -> Response:
    """Handle non-DRF exceptions."""
    # Handle Django validation errors
    if isinstance(exc, DjangoValidationError):
        return Response(
            _format_validation_error(exc), status=status.HTTP_400_BAD_REQUEST
        )

    # Handle database integrity errors
    if isinstance(exc, IntegrityError):
        return Response(
            {
                "error": "Database constraint violation",
                "message": "The operation violates database constraints.",
                "code": "integrity_error",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Handle JWT token errors
    if isinstance(exc, TokenError):
        return Response(
            {"error": "Invalid token", "message": str(exc), "code": "token_error"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Generic server error for unhandled exceptions
    error_id = getattr(request, "correlation_id", "unknown")

    # In debug mode, include the traceback
    if hasattr(request, "META") and request.META.get("DEBUG"):
        return Response(
            {
                "error": "Internal server error",
                "message": str(exc),
                "code": "internal_error",
                "debug_info": traceback.format_exc(),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "code": "internal_error",
            "error_id": error_id,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _format_error_response(
    exc: Exception, response: Response, request
) -> Dict[str, Any]:
    """Format error response consistently."""
    # Extract error details
    if isinstance(exc, ValidationError):
        return _format_validation_error(exc)

    # Handle throttled requests
    if isinstance(exc, Throttled):
        wait_time = getattr(exc, "wait", None)
        return {
            "error": "Rate limit exceeded",
            "message": exc.detail,
            "code": "rate_limit_exceeded",
            "retry_after": int(wait_time) if wait_time else None,
        }

    # Handle custom exceptions
    if isinstance(exc, NutritionAIException):
        return {
            "error": exc.default_detail,
            "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
            "code": exc.default_code,
            "status_code": exc.status_code,
        }

    # Handle DRF exceptions
    error_mapping = {
        NotAuthenticated: ("Authentication required", "not_authenticated"),
        AuthenticationFailed: ("Authentication failed", "authentication_failed"),
        PermissionDenied: ("Permission denied", "permission_denied"),
        NotFound: ("Resource not found", "not_found"),
        MethodNotAllowed: ("Method not allowed", "method_not_allowed"),
        NotAcceptable: ("Not acceptable", "not_acceptable"),
    }

    exc_type = type(exc)
    if exc_type in error_mapping:
        error_title, error_code = error_mapping[exc_type]
        return {
            "error": error_title,
            "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
            "code": error_code,
        }

    # Default format
    if hasattr(response, "data") and isinstance(response.data, dict):
        # If already formatted, ensure consistency
        if "error" not in response.data:
            response.data["error"] = "Error"
        if "code" not in response.data:
            response.data["code"] = "error"
        return response.data

    # Fallback
    return {"error": "Error", "message": str(exc), "code": "error"}


def _format_validation_error(exc: ValidationError) -> Dict[str, Any]:
    """Format validation errors consistently."""
    if hasattr(exc, "detail"):
        detail = exc.detail
    else:
        detail = {"non_field_errors": [str(exc)]}

    # If detail is a dict, we have field-specific errors
    if isinstance(detail, dict):
        errors = {}
        for field, field_errors in detail.items():
            if isinstance(field_errors, list):
                errors[field] = [str(e) for e in field_errors]
            else:
                errors[field] = [str(field_errors)]

        # Extract first error for main message
        first_field = next(iter(errors))
        first_error = (
            errors[first_field][0] if errors[first_field] else "Validation failed"
        )

        return {
            "error": "Validation failed",
            "message": first_error,
            "code": "validation_error",
            "errors": errors,
        }

    # If detail is a list, we have non-field errors
    if isinstance(detail, list):
        return {
            "error": "Validation failed",
            "message": detail[0] if detail else "Validation failed",
            "code": "validation_error",
            "errors": {"non_field_errors": detail},
        }

    # Fallback
    return {
        "error": "Validation failed",
        "message": str(detail),
        "code": "validation_error",
    }
