"""
Custom exception classes for the Nutrition AI API.
"""
from rest_framework.exceptions import APIException
from rest_framework import status


class NutritionAIException(APIException):
    """Base exception class for all Nutrition AI specific exceptions."""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'An error occurred in the Nutrition AI service.'
    default_code = 'nutrition_ai_error'


# Authentication and Authorization Exceptions
class AuthenticationException(NutritionAIException):
    """Base class for authentication exceptions."""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication failed.'
    default_code = 'authentication_failed'


class InvalidCredentialsException(AuthenticationException):
    """Raised when login credentials are invalid."""
    default_detail = 'Invalid email or password.'
    default_code = 'invalid_credentials'


class EmailNotVerifiedException(AuthenticationException):
    """Raised when user tries to login without verifying email."""
    default_detail = 'Email address is not verified. Please check your email.'
    default_code = 'email_not_verified'


class AccountDisabledException(AuthenticationException):
    """Raised when user account is disabled."""
    default_detail = 'This account has been disabled.'
    default_code = 'account_disabled'


class TokenExpiredException(AuthenticationException):
    """Raised when JWT token has expired."""
    default_detail = 'Authentication token has expired.'
    default_code = 'token_expired'


class InvalidTokenException(AuthenticationException):
    """Raised when JWT token is invalid."""
    default_detail = 'Invalid authentication token.'
    default_code = 'invalid_token'


# Permission Exceptions
class PermissionException(NutritionAIException):
    """Base class for permission exceptions."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'permission_denied'


class InsufficientPrivilegesException(PermissionException):
    """Raised when user lacks required privileges."""
    default_detail = 'Insufficient privileges for this operation.'
    default_code = 'insufficient_privileges'


class AccountTypeException(PermissionException):
    """Raised when feature requires higher account type."""
    default_detail = 'This feature requires a premium account.'
    default_code = 'account_type_required'


# Validation Exceptions
class ValidationException(NutritionAIException):
    """Base class for validation exceptions."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Validation failed.'
    default_code = 'validation_error'


class InvalidInputException(ValidationException):
    """Raised when input data is invalid."""
    default_detail = 'Invalid input data provided.'
    default_code = 'invalid_input'


# Alias for backward compatibility - many files expect ValidationError
ValidationError = ValidationException


class MissingRequiredFieldException(ValidationException):
    """Raised when required field is missing."""
    default_detail = 'Required field is missing.'
    default_code = 'missing_required_field'
    
    def __init__(self, field_name):
        self.default_detail = f'Required field "{field_name}" is missing.'
        super().__init__()


class InvalidImageException(ValidationException):
    """Raised when uploaded image is invalid."""
    default_detail = 'Invalid image file.'
    default_code = 'invalid_image'


class FileSizeExceededException(ValidationException):
    """Raised when uploaded file exceeds size limit."""
    default_detail = 'File size exceeds maximum allowed limit.'
    default_code = 'file_size_exceeded'
    
    def __init__(self, max_size_mb):
        self.default_detail = f'File size exceeds maximum allowed limit of {max_size_mb}MB.'
        super().__init__()


class InvalidFileTypeException(ValidationException):
    """Raised when uploaded file type is not allowed."""
    default_detail = 'File type is not allowed.'
    default_code = 'invalid_file_type'
    
    def __init__(self, allowed_types):
        self.default_detail = f'File type is not allowed. Allowed types: {", ".join(allowed_types)}'
        super().__init__()


# Resource Exceptions
class ResourceException(NutritionAIException):
    """Base class for resource-related exceptions."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found.'
    default_code = 'resource_not_found'


class MealNotFoundException(ResourceException):
    """Raised when meal is not found."""
    default_detail = 'Meal not found.'
    default_code = 'meal_not_found'


class FoodItemNotFoundException(ResourceException):
    """Raised when food item is not found."""
    default_detail = 'Food item not found.'
    default_code = 'food_item_not_found'


class UserNotFoundException(ResourceException):
    """Raised when user is not found."""
    default_detail = 'User not found.'
    default_code = 'user_not_found'


# External Service Exceptions
class ExternalServiceException(NutritionAIException):
    """Base class for external service exceptions."""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'External service is unavailable.'
    default_code = 'external_service_error'


class AIServiceError(ExternalServiceException):
    """General AI service error."""
    default_detail = 'AI service encountered an error.'
    default_code = 'ai_service_error'


class GeminiAPIException(ExternalServiceException):
    """Raised when Gemini API call fails."""
    default_detail = 'AI service is temporarily unavailable.'
    default_code = 'gemini_api_error'


class GeminiQuotaExceededException(GeminiAPIException):
    """Raised when Gemini API quota is exceeded."""
    default_detail = 'AI service quota exceeded. Please try again later.'
    default_code = 'gemini_quota_exceeded'


class ImageAnalysisException(ExternalServiceException):
    """Raised when image analysis fails."""
    default_detail = 'Failed to analyze image.'
    default_code = 'image_analysis_failed'


# Rate Limiting Exceptions
class RateLimitException(NutritionAIException):
    """Base class for rate limiting exceptions."""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Rate limit exceeded.'
    default_code = 'rate_limit_exceeded'


class RateLimitError(RateLimitException):
    """General rate limit error."""
    default_detail = 'Rate limit exceeded. Please try again later.'
    default_code = 'rate_limit_error'


class LoginRateLimitException(RateLimitException):
    """Raised when login attempts exceed rate limit."""
    default_detail = 'Too many login attempts. Please try again later.'
    default_code = 'login_rate_limit'


class APIRateLimitException(RateLimitException):
    """Raised when API requests exceed rate limit."""
    default_detail = 'API rate limit exceeded. Please slow down your requests.'
    default_code = 'api_rate_limit'


# Business Logic Exceptions
class BusinessLogicException(NutritionAIException):
    """Base class for business logic exceptions."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Business logic error.'
    default_code = 'business_logic_error'


class NutritionCalculationException(BusinessLogicException):
    """Raised when nutrition calculation fails."""
    default_detail = 'Failed to calculate nutritional information.'
    default_code = 'nutrition_calculation_failed'


class DuplicateFavoriteException(BusinessLogicException):
    """Raised when trying to favorite an already favorited meal."""
    default_detail = 'This meal is already in your favorites.'
    default_code = 'duplicate_favorite'


class InvalidPortionSizeException(BusinessLogicException):
    """Raised when portion size is invalid."""
    default_detail = 'Invalid portion size specified.'
    default_code = 'invalid_portion_size'


# Security Exceptions
class SecurityException(NutritionAIException):
    """Base class for security exceptions."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Security violation detected.'
    default_code = 'security_violation'


class SuspiciousActivityException(SecurityException):
    """Raised when suspicious activity is detected."""
    default_detail = 'Suspicious activity detected. This incident has been logged.'
    default_code = 'suspicious_activity'


class InvalidAPIKeyException(SecurityException):
    """Raised when API key is invalid."""
    default_detail = 'Invalid API key.'
    default_code = 'invalid_api_key'


# System Exceptions
class SystemException(NutritionAIException):
    """Base class for system exceptions."""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'A system error occurred.'
    default_code = 'system_error'


class DatabaseException(SystemException):
    """Raised when database operation fails."""
    default_detail = 'Database operation failed.'
    default_code = 'database_error'


class ConfigurationException(SystemException):
    """Raised when system configuration is invalid."""
    default_detail = 'System configuration error.'
    default_code = 'configuration_error'


class StorageException(SystemException):
    """Raised when file storage operation fails."""
    default_detail = 'File storage operation failed.'
    default_code = 'storage_error'


# Payment Exceptions
class PaymentException(NutritionAIException):
    """Base class for payment exceptions."""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Payment processing error.'
    default_code = 'payment_error'


class PaymentError(PaymentException):
    """General payment error."""
    default_detail = 'Payment processing failed.'
    default_code = 'payment_failed'