"""
Security-specific settings for the Nutrition AI API.
"""
from datetime import timedelta
import os

# JWT Authentication Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': os.getenv('SECRET_KEY', 'your-secret-key'),
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': 'nutrition-ai-api',
    'JWK_URL': None,
    'LEEWAY': timedelta(seconds=10),
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    
    'JTI_CLAIM': 'jti',
}

# Security Middleware Configuration
SECURITY_MIDDLEWARE = [
    'api.security.middleware.SecurityHeadersMiddleware',
    'api.security.middleware.RequestLoggingMiddleware',
    'api.security.middleware.RateLimitMiddleware',
    'api.security.middleware.HTTPSEnforcementMiddleware',
    'api.security.middleware.SecurityAuditMiddleware',
]

# Rate Limiting Settings
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_VIEW = 'api.views.ratelimit_exceeded'

# Custom Rate Limits (requests per minute)
RATE_LIMITS = {
    'auth_login': '5/m',
    'auth_register': '3/m',
    'password_reset': '3/m',
    'image_analysis': '10/m',
    'api_general': '60/m',
}

# Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# HTTPS Settings (for production)
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Session Security
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_AGE = 3600  # 1 hour

# CSRF Settings
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')

# Password Validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'api.security.validators.CustomPasswordValidator',
    },
]

# File Upload Security
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

# Allowed file extensions for uploads
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']
ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf']

# API Key Encryption (generate a proper key for production)
API_KEY_ENCRYPTION_KEY = os.getenv('API_KEY_ENCRYPTION_KEY', None)

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net')
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", 'https://fonts.googleapis.com')
CSP_FONT_SRC = ("'self'", 'https://fonts.gstatic.com')
CSP_IMG_SRC = ("'self'", 'data:', 'https:')
CSP_CONNECT_SRC = ("'self'", 'https://api.sentry.io')
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_FORM_ACTION = ("'self'",)
CSP_BASE_URI = ("'self'",)

# Permissions Policy (Feature Policy)
PERMISSIONS_POLICY = {
    'geolocation': 'none',
    'microphone': 'none',
    'camera': 'none',
    'payment': 'none',
    'usb': 'none',
    'fullscreen': 'self',
}

# Security Logging
SECURITY_LOG_FILE = os.path.join(os.getenv('LOG_DIR', '/var/log/nutrition-ai'), 'security.log')

# Sentry Configuration (for production)
SENTRY_DSN = os.getenv('SENTRY_DSN', '')
SENTRY_ENVIRONMENT = os.getenv('SENTRY_ENVIRONMENT', 'development')
SENTRY_TRACES_SAMPLE_RATE = float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1'))

# API Documentation Security
SPECTACULAR_SETTINGS_SECURITY = {
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAdminUser'],
    'SERVE_AUTHENTICATION': ['rest_framework.authentication.SessionAuthentication'],
}

# Custom Password Validator
class CustomPasswordValidator:
    """
    Custom password validator for additional security requirements.
    """
    
    def validate(self, password, user=None):
        """Validate password meets custom requirements."""
        from django.core.exceptions import ValidationError
        import re
        
        # Check for uppercase letter
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                "Password must contain at least one uppercase letter.",
                code='password_no_upper',
            )
        
        # Check for lowercase letter
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                "Password must contain at least one lowercase letter.",
                code='password_no_lower',
            )
        
        # Check for digit
        if not re.search(r'\d', password):
            raise ValidationError(
                "Password must contain at least one digit.",
                code='password_no_digit',
            )
        
        # Check for special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                "Password must contain at least one special character.",
                code='password_no_special',
            )
        
        # Check if password contains user information
        if user:
            user_attributes = [
                user.username.lower(),
                user.email.split('@')[0].lower(),
                user.first_name.lower(),
                user.last_name.lower(),
            ]
            
            for attr in user_attributes:
                if attr and len(attr) > 2 and attr in password.lower():
                    raise ValidationError(
                        "Password must not contain your personal information.",
                        code='password_contains_user_info',
                    )
    
    def get_help_text(self):
        """Return help text for password requirements."""
        return (
            "Your password must contain at least one uppercase letter, "
            "one lowercase letter, one digit, and one special character. "
            "It must not contain your personal information."
        )