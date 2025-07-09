"""
Structured logging configuration for the Nutrition AI API.
"""
import logging
import json
import sys
from datetime import datetime
from pythonjsonlogger import jsonlogger
import os


class CorrelationIdFilter(logging.Filter):
    """
    Logging filter that adds correlation ID to log records.
    """
    def filter(self, record):
        # Try to get correlation ID from various sources
        correlation_id = None
        
        # Check if it's already in the record
        if hasattr(record, 'correlation_id'):
            correlation_id = record.correlation_id
        # Check thread local storage
        elif hasattr(logging, 'correlation_id'):
            correlation_id = logging.correlation_id
        # Generate a new one if needed
        else:
            import uuid
            correlation_id = str(uuid.uuid4())
        
        record.correlation_id = correlation_id
        return True


class NutritionAIJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter for structured logging.
    """
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add logger name
        log_record['logger'] = record.name
        
        # Add module and function info
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id
        
        # Add any extra fields
        for key, value in record.__dict__.items():
            if key not in log_record and not key.startswith('_'):
                log_record[key] = value


def setup_logging(
    log_level='INFO',
    log_file=None,
    json_logs=True,
    correlation_id_enabled=True
):
    """
    Set up structured logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (None for stdout only)
        json_logs: Whether to output logs in JSON format
        correlation_id_enabled: Whether to add correlation IDs to logs
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create formatter
    if json_logs:
        formatter = NutritionAIJsonFormatter(
            '%(timestamp)s %(level)s %(correlation_id)s %(logger)s %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s'
        )
    
    # Add correlation ID filter if enabled
    if correlation_id_enabled:
        correlation_filter = CorrelationIdFilter()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(formatter)
    if correlation_id_enabled:
        console_handler.addFilter(correlation_filter)
    root_logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        # Ensure log directory exists
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        if correlation_id_enabled:
            file_handler.addFilter(correlation_filter)
        root_logger.addHandler(file_handler)
    
    # Configure specific loggers
    configure_app_loggers()


def configure_app_loggers():
    """Configure logging levels for specific modules."""
    # Set Django logging levels
    logging.getLogger('django').setLevel(logging.INFO)
    logging.getLogger('django.request').setLevel(logging.WARNING)
    logging.getLogger('django.db.backends').setLevel(logging.WARNING)
    
    # Set third-party library levels
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)
    
    # Set app-specific loggers
    logging.getLogger('api').setLevel(logging.DEBUG)
    logging.getLogger('api.security').setLevel(logging.INFO)
    logging.getLogger('api.services').setLevel(logging.INFO)


class LogContext:
    """
    Context manager for adding context to logs.
    
    Usage:
        with LogContext(user_id=123, action='create_meal'):
            logger.info('Creating meal')
    """
    def __init__(self, **kwargs):
        self.context = kwargs
        self.old_factory = None
    
    def __enter__(self):
        self.old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self.old_factory)


class SecurityLogger:
    """
    Specialized logger for security-related events.
    """
    def __init__(self):
        self.logger = logging.getLogger('api.security.audit')
    
    def log_authentication_attempt(self, username, ip_address, success, reason=None):
        """Log authentication attempt."""
        self.logger.info(
            'Authentication attempt',
            extra={
                'event_type': 'authentication',
                'username': username,
                'ip_address': ip_address,
                'success': success,
                'reason': reason,
            }
        )
    
    def log_authorization_failure(self, user, resource, permission):
        """Log authorization failure."""
        self.logger.warning(
            'Authorization failure',
            extra={
                'event_type': 'authorization',
                'user': user.email if user else 'anonymous',
                'resource': resource,
                'permission': permission,
            }
        )
    
    def log_suspicious_activity(self, user, activity, details):
        """Log suspicious activity."""
        self.logger.warning(
            'Suspicious activity detected',
            extra={
                'event_type': 'suspicious_activity',
                'user': user.email if user else 'anonymous',
                'activity': activity,
                'details': details,
            }
        )
    
    def log_rate_limit_exceeded(self, identifier, endpoint, limit):
        """Log rate limit exceeded."""
        self.logger.warning(
            'Rate limit exceeded',
            extra={
                'event_type': 'rate_limit',
                'identifier': identifier,
                'endpoint': endpoint,
                'limit': limit,
            }
        )


class PerformanceLogger:
    """
    Specialized logger for performance metrics.
    """
    def __init__(self):
        self.logger = logging.getLogger('api.performance')
    
    def log_api_request(self, method, path, user, response_time_ms, status_code):
        """Log API request performance."""
        self.logger.info(
            'API request',
            extra={
                'event_type': 'api_request',
                'method': method,
                'path': path,
                'user': user.email if user and user.is_authenticated else 'anonymous',
                'response_time_ms': response_time_ms,
                'status_code': status_code,
            }
        )
    
    def log_database_query(self, query, execution_time_ms):
        """Log database query performance."""
        self.logger.debug(
            'Database query',
            extra={
                'event_type': 'db_query',
                'query': query[:200],  # Truncate long queries
                'execution_time_ms': execution_time_ms,
            }
        )
    
    def log_external_api_call(self, service, endpoint, response_time_ms, success):
        """Log external API call performance."""
        self.logger.info(
            'External API call',
            extra={
                'event_type': 'external_api',
                'service': service,
                'endpoint': endpoint,
                'response_time_ms': response_time_ms,
                'success': success,
            }
        )


# Create singleton instances
security_logger = SecurityLogger()
performance_logger = PerformanceLogger()