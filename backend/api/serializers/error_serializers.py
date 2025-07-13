"""
Error response serializers for consistent error formatting.
"""

from typing import Dict, List, Optional

from rest_framework import serializers


class ErrorDetailSerializer(serializers.Serializer):
    """Serializer for detailed error information."""

    field = serializers.CharField(
        required=False, help_text="Field name that caused the error"
    )
    message = serializers.CharField(help_text="Error message")
    code = serializers.CharField(required=False, help_text="Specific error code")

    class Meta:
        ref_name = "ErrorDetail"


class ErrorResponseSerializer(serializers.Serializer):
    """
    Standard error response serializer.

    All API errors should follow this format for consistency.
    """

    error = serializers.CharField(help_text="Human-readable error message")
    error_code = serializers.CharField(
        help_text="Machine-readable error code (e.g., VALIDATION_ERROR, AUTHENTICATION_REQUIRED)"
    )
    timestamp = serializers.DateTimeField(
        help_text="ISO 8601 timestamp of when the error occurred"
    )
    request_id = serializers.CharField(
        help_text="Unique request ID for tracking and debugging"
    )
    details = serializers.DictField(
        required=False,
        help_text="Additional error details, structure varies by error type",
    )

    class Meta:
        ref_name = "ErrorResponse"


class ValidationErrorResponseSerializer(ErrorResponseSerializer):
    """Serializer for validation error responses."""

    details = serializers.DictField(
        child=serializers.ListField(child=ErrorDetailSerializer()),
        help_text="Field-specific validation errors",
    )

    class Meta:
        ref_name = "ValidationErrorResponse"


class RateLimitErrorResponseSerializer(ErrorResponseSerializer):
    """Serializer for rate limit error responses."""

    retry_after = serializers.IntegerField(
        required=False, help_text="Number of seconds to wait before retrying"
    )
    limit = serializers.IntegerField(
        required=False, help_text="Rate limit for this endpoint"
    )
    remaining = serializers.IntegerField(
        required=False, help_text="Number of requests remaining in current window"
    )

    class Meta:
        ref_name = "RateLimitErrorResponse"


class AuthenticationErrorResponseSerializer(ErrorResponseSerializer):
    """Serializer for authentication error responses."""

    www_authenticate = serializers.CharField(
        required=False, help_text="WWW-Authenticate header value"
    )

    class Meta:
        ref_name = "AuthenticationErrorResponse"


class PermissionErrorResponseSerializer(ErrorResponseSerializer):
    """Serializer for permission error responses."""

    required_permission = serializers.CharField(
        required=False, help_text="Permission required for this action"
    )
    required_account_type = serializers.CharField(
        required=False, help_text="Account type required for this feature"
    )

    class Meta:
        ref_name = "PermissionErrorResponse"


# Error code documentation
ERROR_CODES = {
    # Authentication errors (401)
    "AUTHENTICATION_REQUIRED": {
        "status": 401,
        "description": "Authentication credentials are required",
        "example": {
            "error": "Authentication credentials required",
            "error_code": "AUTHENTICATION_REQUIRED",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    "INVALID_CREDENTIALS": {
        "status": 401,
        "description": "The provided credentials are invalid",
        "example": {
            "error": "Invalid email or password",
            "error_code": "INVALID_CREDENTIALS",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    "TOKEN_EXPIRED": {
        "status": 401,
        "description": "Authentication token has expired",
        "example": {
            "error": "Authentication token has expired",
            "error_code": "TOKEN_EXPIRED",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    # Permission errors (403)
    "INSUFFICIENT_PERMISSIONS": {
        "status": 403,
        "description": "User lacks required permissions",
        "example": {
            "error": "Insufficient permissions for this action",
            "error_code": "INSUFFICIENT_PERMISSIONS",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
            "details": {"required_permission": "meals.delete_meal"},
        },
    },
    "ACCOUNT_TYPE_REQUIRED": {
        "status": 403,
        "description": "Feature requires a higher account type",
        "example": {
            "error": "This feature requires a premium account",
            "error_code": "ACCOUNT_TYPE_REQUIRED",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
            "details": {"required_account_type": "premium"},
        },
    },
    # Validation errors (400)
    "VALIDATION_ERROR": {
        "status": 400,
        "description": "Input validation failed",
        "example": {
            "error": "Validation failed",
            "error_code": "VALIDATION_ERROR",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
            "details": {
                "email": [
                    {
                        "field": "email",
                        "message": "Enter a valid email address",
                        "code": "invalid_email",
                    }
                ]
            },
        },
    },
    "MISSING_REQUIRED_FIELD": {
        "status": 400,
        "description": "A required field is missing",
        "example": {
            "error": 'Required field "name" is missing',
            "error_code": "MISSING_REQUIRED_FIELD",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    "INVALID_IMAGE": {
        "status": 400,
        "description": "Uploaded image is invalid or corrupt",
        "example": {
            "error": "Invalid image file",
            "error_code": "INVALID_IMAGE",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    # Resource errors (404)
    "RESOURCE_NOT_FOUND": {
        "status": 404,
        "description": "Requested resource was not found",
        "example": {
            "error": "Meal not found",
            "error_code": "RESOURCE_NOT_FOUND",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    # Rate limiting errors (429)
    "RATE_LIMIT_EXCEEDED": {
        "status": 429,
        "description": "Rate limit has been exceeded",
        "example": {
            "error": "Rate limit exceeded",
            "error_code": "RATE_LIMIT_EXCEEDED",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
            "retry_after": 60,
            "limit": 10,
            "remaining": 0,
        },
    },
    # External service errors (503)
    "GEMINI_API_ERROR": {
        "status": 503,
        "description": "AI service is temporarily unavailable",
        "example": {
            "error": "AI service is temporarily unavailable",
            "error_code": "GEMINI_API_ERROR",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
    # Server errors (500)
    "INTERNAL_SERVER_ERROR": {
        "status": 500,
        "description": "An unexpected server error occurred",
        "example": {
            "error": "An unexpected error occurred",
            "error_code": "INTERNAL_SERVER_ERROR",
            "timestamp": "2024-01-15T12:00:00Z",
            "request_id": "req_abc123def456",
        },
    },
}


def create_error_response(
    error_code: str,
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    details: Optional[Dict] = None,
) -> Dict:
    """
    Helper function to create consistent error responses.

    Args:
        error_code: The error code (e.g., 'VALIDATION_ERROR')
        message: Custom error message (uses default if not provided)
        request_id: Request ID for tracking
        details: Additional error details

    Returns:
        Dict: Error response data
    """
    import uuid
    from datetime import datetime

    # Get error info from ERROR_CODES
    error_info = ERROR_CODES.get(error_code, {})

    # Use provided message or default
    if not message:
        message = error_info.get("example", {}).get("error", "An error occurred")

    # Generate request ID if not provided
    if not request_id:
        request_id = f"req_{uuid.uuid4().hex[:12]}"

    response = {
        "error": message,
        "error_code": error_code,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "request_id": request_id,
    }

    if details:
        response["details"] = details

    return response
