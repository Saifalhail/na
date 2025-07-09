"""
Sentry configuration for error tracking and monitoring.
"""
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from django.conf import settings
import logging


def init_sentry():
    """
    Initialize Sentry for error tracking.
    
    This should be called early in the application startup,
    ideally in settings or wsgi.py.
    """
    if not settings.SENTRY_DSN:
        logging.info("Sentry DSN not configured, skipping Sentry initialization")
        return
    
    # Configure logging integration
    logging_integration = LoggingIntegration(
        level=logging.INFO,  # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors as events
    )
    
    # Initialize Sentry
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            DjangoIntegration(
                transaction_style='endpoint',
                middleware_spans=True,
                signals_spans=True,
                cache_spans=True,
            ),
            logging_integration,
            RedisIntegration(),
        ],
        
        # Performance monitoring
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=0.1,  # Profile 10% of transactions
        
        # Release tracking
        release=settings.VERSION if hasattr(settings, 'VERSION') else None,
        environment=settings.SENTRY_ENVIRONMENT,
        
        # Options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        
        # Filtering
        before_send=before_send_filter,
        before_send_transaction=before_send_transaction_filter,
        
        # Ignore specific errors
        ignore_errors=[
            'Http404',
            'PermissionDenied',
            'DisallowedHost',
            'InvalidHTTPHostHeader',
            'RequestAborted',
        ],
        
        # Custom tags
        _experiments={
            "profiles_sample_rate": 0.1,
        }
    )
    
    # Set custom tags
    sentry_sdk.set_tag("app", "nutrition-ai")
    
    logging.info("Sentry initialized successfully")


def before_send_filter(event, hint):
    """
    Filter events before sending to Sentry.
    
    Args:
        event: The error event
        hint: Additional information about the error
        
    Returns:
        event or None (to filter out)
    """
    # Filter out specific errors
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']
        
        # Don't send client errors (4xx)
        if hasattr(exc_value, 'status_code') and 400 <= exc_value.status_code < 500:
            return None
        
        # Filter out test errors
        if settings.TESTING:
            return None
    
    # Remove sensitive data
    if 'request' in event:
        request = event['request']
        
        # Remove sensitive headers
        if 'headers' in request:
            sensitive_headers = [
                'Authorization',
                'Cookie',
                'X-CSRFToken',
                'X-API-Key',
            ]
            for header in sensitive_headers:
                if header in request['headers']:
                    request['headers'][header] = '[REDACTED]'
        
        # Remove sensitive cookies
        if 'cookies' in request:
            request['cookies'] = '[REDACTED]'
        
        # Remove sensitive data from body
        if 'data' in request:
            sensitive_fields = [
                'password',
                'token',
                'secret',
                'api_key',
                'credit_card',
            ]
            if isinstance(request['data'], dict):
                for field in sensitive_fields:
                    if field in request['data']:
                        request['data'][field] = '[REDACTED]'
    
    # Add custom context
    if 'user' in event and event['user']:
        # Add user context without PII
        event['user'] = {
            'id': event['user'].get('id'),
            'account_type': event['user'].get('account_type', 'unknown'),
        }
    
    return event


def before_send_transaction_filter(event, hint):
    """
    Filter performance transactions before sending to Sentry.
    
    Args:
        event: The transaction event
        hint: Additional information
        
    Returns:
        event or None (to filter out)
    """
    # Filter out health check endpoints
    if event.get('transaction') in ['/health/', '/ready/', '/metrics/']:
        return None
    
    # Filter out static file requests
    if event.get('transaction', '').startswith('/static/'):
        return None
    
    # Add custom transaction data
    if 'tags' not in event:
        event['tags'] = {}
    
    # Tag API version
    transaction = event.get('transaction', '')
    if '/api/v1/' in transaction:
        event['tags']['api_version'] = 'v1'
    
    return event


def capture_message(message, level='info', **kwargs):
    """
    Capture a message to Sentry with additional context.
    
    Args:
        message: The message to capture
        level: Log level (debug, info, warning, error, fatal)
        **kwargs: Additional context
    """
    with sentry_sdk.push_scope() as scope:
        # Add extra context
        for key, value in kwargs.items():
            scope.set_extra(key, value)
        
        # Capture the message
        sentry_sdk.capture_message(message, level=level)


def capture_exception(exception, **kwargs):
    """
    Capture an exception to Sentry with additional context.
    
    Args:
        exception: The exception to capture
        **kwargs: Additional context
    """
    with sentry_sdk.push_scope() as scope:
        # Add extra context
        for key, value in kwargs.items():
            scope.set_extra(key, value)
        
        # Capture the exception
        sentry_sdk.capture_exception(exception)


class SentryContextMiddleware:
    """
    Middleware to add request context to Sentry.
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Add user context
        if request.user.is_authenticated:
            sentry_sdk.set_user({
                'id': request.user.id,
                'email': request.user.email,
                'account_type': request.user.account_type,
            })
        
        # Add request context
        sentry_sdk.set_context('request_meta', {
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'method': request.method,
            'path': request.path,
        })
        
        # Add correlation ID if present
        if hasattr(request, 'correlation_id'):
            sentry_sdk.set_tag('correlation_id', request.correlation_id)
        
        response = self.get_response(request)
        
        # Clear user context after request
        sentry_sdk.set_user(None)
        
        return response
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip