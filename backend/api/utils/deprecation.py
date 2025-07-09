"""
Deprecation utilities for the Nutrition AI API.

This module provides decorators and utilities for marking API endpoints
and features as deprecated, with appropriate warnings and headers.
"""

import warnings
import logging
from functools import wraps
from datetime import datetime, timedelta
from django.http import HttpResponse
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def deprecated(
    version_removed: str,
    alternative: str = None,
    date_removed: str = None,
    reason: str = None
):
    """
    Decorator to mark API endpoints as deprecated.
    
    Args:
        version_removed: The version in which this endpoint will be removed
        alternative: Alternative endpoint or method to use
        date_removed: Date when the endpoint will be removed (YYYY-MM-DD)
        reason: Reason for deprecation
    
    Usage:
        @deprecated(
            version_removed="v2.0.0",
            alternative="POST /api/v2/analyze/",
            date_removed="2025-07-01",
            reason="Replaced with improved analysis endpoint"
        )
        def old_endpoint_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            # Extract request from args (could be self, request or just request)
            request = None
            if len(args) >= 2 and hasattr(args[1], 'META'):
                request = args[1]  # Class-based view
            elif len(args) >= 1 and hasattr(args[0], 'META'):
                request = args[0]  # Function-based view
            
            # Log deprecation warning
            endpoint = f"{request.method} {request.path}" if request else "Unknown endpoint"
            logger.warning(
                f"Deprecated endpoint accessed: {endpoint} - "
                f"Will be removed in {version_removed}"
            )
            
            # Call the original view function
            response = view_func(*args, **kwargs)
            
            # Add deprecation headers to response
            if isinstance(response, (HttpResponse, Response)):
                _add_deprecation_headers(
                    response, 
                    version_removed, 
                    alternative, 
                    date_removed, 
                    reason
                )
            
            return response
        
        # Mark the function as deprecated for introspection
        wrapper._is_deprecated = True
        wrapper._deprecation_info = {
            'version_removed': version_removed,
            'alternative': alternative,
            'date_removed': date_removed,
            'reason': reason
        }
        
        return wrapper
    return decorator


def deprecated_field(field_name: str, version_removed: str, alternative: str = None):
    """
    Decorator to mark serializer fields as deprecated.
    
    Args:
        field_name: Name of the deprecated field
        version_removed: Version when field will be removed
        alternative: Alternative field to use
    
    Usage:
        @deprecated_field("old_field", "v2.0.0", "new_field")
        class MySerializer(serializers.Serializer):
            old_field = serializers.CharField()
            new_field = serializers.CharField()
    """
    def decorator(serializer_class):
        original_to_representation = serializer_class.to_representation
        
        def to_representation(self, instance):
            data = original_to_representation(self, instance)
            
            # Add deprecation warning if the field is present
            if field_name in data:
                warning_msg = f"Field '{field_name}' is deprecated and will be removed in {version_removed}"
                if alternative:
                    warning_msg += f". Use '{alternative}' instead"
                
                logger.warning(warning_msg)
                
                # Add deprecation info to response
                if not hasattr(data, '_deprecation_warnings'):
                    data['_deprecation_warnings'] = []
                data['_deprecation_warnings'].append({
                    'field': field_name,
                    'message': warning_msg,
                    'version_removed': version_removed,
                    'alternative': alternative
                })
            
            return data
        
        serializer_class.to_representation = to_representation
        return serializer_class
    
    return decorator


def _add_deprecation_headers(
    response, 
    version_removed: str, 
    alternative: str = None, 
    date_removed: str = None, 
    reason: str = None
):
    """
    Add deprecation headers to the HTTP response.
    
    Args:
        response: Django/DRF response object
        version_removed: Version when endpoint will be removed
        alternative: Alternative endpoint
        date_removed: Date when endpoint will be removed
        reason: Reason for deprecation
    """
    # Standard deprecation header
    response['Deprecated'] = 'true'
    
    # Custom deprecation headers with more details
    response['X-API-Deprecation-Version'] = version_removed
    
    if date_removed:
        response['X-API-Deprecation-Date'] = date_removed
    
    if alternative:
        response['X-API-Deprecation-Alternative'] = alternative
    
    if reason:
        response['X-API-Deprecation-Reason'] = reason
    
    # Sunset header (RFC 8594) if date is provided
    if date_removed:
        try:
            sunset_date = datetime.strptime(date_removed, '%Y-%m-%d')
            response['Sunset'] = sunset_date.strftime('%a, %d %b %Y %H:%M:%S GMT')
        except ValueError:
            logger.warning(f"Invalid date format for deprecation date: {date_removed}")
    
    # Link header pointing to documentation
    response['Link'] = '</api/docs/>; rel="documentation", ' \
                      '</docs/API_CHANGELOG.md>; rel="deprecation"'


def check_deprecated_usage():
    """
    Utility function to check for deprecated API usage patterns.
    This can be used in monitoring or analytics to track deprecation adoption.
    """
    # This would typically integrate with your analytics/monitoring system
    # to track which deprecated endpoints are still being used
    pass


class DeprecationMiddleware:
    """
    Middleware to add global deprecation warnings for specific API versions.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add global deprecation warnings based on API version
        if request.path.startswith('/api/v1/') and self._should_warn_about_v1():
            self._add_global_deprecation_warning(response)
        
        return response
    
    def _should_warn_about_v1(self):
        """
        Determine if we should warn about v1 API usage.
        This could be based on dates, configuration, etc.
        """
        # For now, we don't have global v1 deprecation
        return False
    
    def _add_global_deprecation_warning(self, response):
        """Add global deprecation warning headers."""
        response['X-API-Global-Deprecation'] = 'API v1 will be deprecated in v3.0.0'
        response['X-API-Migration-Guide'] = '/docs/API_CHANGELOG.md#migration-guides'


# Utility functions for views

def warn_deprecated_parameter(parameter_name: str, version_removed: str, alternative: str = None):
    """
    Emit a warning for deprecated query parameters or request fields.
    
    Args:
        parameter_name: Name of the deprecated parameter
        version_removed: Version when parameter will be removed
        alternative: Alternative parameter to use
    """
    warning_msg = f"Parameter '{parameter_name}' is deprecated and will be removed in {version_removed}"
    if alternative:
        warning_msg += f". Use '{alternative}' instead"
    
    logger.warning(warning_msg)
    warnings.warn(warning_msg, DeprecationWarning, stacklevel=2)


def get_deprecation_info(view_func):
    """
    Extract deprecation information from a decorated view function.
    
    Args:
        view_func: The view function to check
        
    Returns:
        dict: Deprecation information or None if not deprecated
    """
    if hasattr(view_func, '_is_deprecated') and view_func._is_deprecated:
        return view_func._deprecation_info
    return None


def is_deprecated(view_func):
    """
    Check if a view function is marked as deprecated.
    
    Args:
        view_func: The view function to check
        
    Returns:
        bool: True if deprecated, False otherwise
    """
    return hasattr(view_func, '_is_deprecated') and view_func._is_deprecated