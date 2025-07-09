from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.http import Http404
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    following the standardized error format.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Generate unique request ID for tracking
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    
    if response is not None:
        # Get error details from the original response
        error_details = response.data
        
        # Determine error code and message based on exception type and status
        error_code, error_message = _get_error_code_and_message(exc, response.status_code, error_details)
        
        # Format standardized error response
        custom_response_data = {
            'error': error_message,
            'error_code': error_code,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'request_id': request_id
        }
        
        # Add details if available
        if error_details and not isinstance(error_details, str):
            if hasattr(error_details, 'get'):
                # Handle DRF serializer errors
                custom_response_data['details'] = error_details
            elif isinstance(error_details, list) and error_details:
                # Handle list of errors
                custom_response_data['details'] = {'errors': error_details}
        
        response.data = custom_response_data
        
        # Log the error for debugging
        logger.error(
            f"API Error [{request_id}]: {error_code} - {error_message}",
            extra={
                'request_id': request_id,
                'error_code': error_code,
                'status_code': response.status_code,
                'exception_type': type(exc).__name__,
                'path': context.get('request').path if context.get('request') else None
            }
        )
    
    return response


def _get_error_code_and_message(exc, status_code, error_details):
    """
    Determine appropriate error code and message based on exception type and status.
    """
    exc_type = type(exc).__name__
    
    # Map specific exceptions to error codes
    if exc_type == 'ValidationError' or status_code == 400:
        if 'image' in str(error_details).lower():
            return 'IMAGE_FORMAT_INVALID', 'Invalid image format or file'
        elif 'required' in str(error_details).lower():
            return 'MISSING_REQUIRED_FIELD', 'Required field is missing'
        else:
            return 'VALIDATION_ERROR', 'Validation failed'
    
    elif exc_type == 'Http404' or status_code == 404:
        return 'RESOURCE_NOT_FOUND', 'Requested resource not found'
    
    elif exc_type == 'PermissionDenied' or status_code == 403:
        return 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions for this action'
    
    elif exc_type == 'NotAuthenticated' or status_code == 401:
        return 'AUTHENTICATION_REQUIRED', 'Authentication credentials required'
    
    elif exc_type == 'Throttled' or status_code == 429:
        return 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded'
    
    elif exc_type == 'MethodNotAllowed' or status_code == 405:
        return 'METHOD_NOT_ALLOWED', 'HTTP method not allowed for this endpoint'
    
    elif exc_type == 'GeminiAPIException':
        return 'GEMINI_API_ERROR', 'External AI service error'
    
    elif exc_type == 'NutritionCalculationException':
        return 'RECALCULATION_FAILED', 'Nutrition calculation failed'
    
    elif exc_type == 'ImageAnalysisException':
        return 'ANALYSIS_FAILED', 'Image analysis failed'
    
    elif status_code >= 500:
        return 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred'
    
    else:
        return 'INVALID_REQUEST', 'Invalid request'


class GeminiAPIException(Exception):
    """Exception raised when Gemini API calls fail."""
    pass


class NutritionCalculationException(Exception):
    """Exception raised when nutrition calculation fails."""
    pass


class ImageAnalysisException(Exception):
    """Exception raised when image analysis fails."""
    pass