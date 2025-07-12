"""
Base Django settings for core project.

This file contains settings common to all environments.
"""

from pathlib import Path
import os
import warnings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Suppress deprecation warnings from third-party packages during development
warnings.filterwarnings('ignore', category=UserWarning, module='dj_rest_auth')
warnings.filterwarnings('ignore', category=UserWarning, module='allauth')

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# AI Service Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'your-gemini-api-key')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-pro')
AI_USE_CACHE = os.getenv('AI_USE_CACHE', 'True') == 'True'
AI_CACHE_TIMEOUT = int(os.getenv('AI_CACHE_TIMEOUT', '3600'))  # 1 hour default
AI_USE_ADVANCED_PROMPTS = os.getenv('AI_USE_ADVANCED_PROMPTS', 'True') == 'True'

# Visual Similarity Cache Configuration
AI_USE_VISUAL_CACHE = os.getenv('AI_USE_VISUAL_CACHE', 'True') == 'True'
VISUAL_CACHE_MAX_ENTRIES = int(os.getenv('VISUAL_CACHE_MAX_ENTRIES', '1000'))
VISUAL_CACHE_TTL = int(os.getenv('VISUAL_CACHE_TTL', str(86400 * 7)))  # 7 days default
VISUAL_SIMILARITY_THRESHOLD = float(os.getenv('VISUAL_SIMILARITY_THRESHOLD', '0.75'))
MIN_CONFIDENCE_TO_CACHE = int(os.getenv('MIN_CONFIDENCE_TO_CACHE', '70'))

# Ingredient Cache Configuration
AI_USE_INGREDIENT_CACHE = os.getenv('AI_USE_INGREDIENT_CACHE', 'True') == 'True'
INGREDIENT_CACHE_MAX_ENTRIES = int(os.getenv('INGREDIENT_CACHE_MAX_ENTRIES', '2000'))
INGREDIENT_COMBINATION_MAX_ENTRIES = int(os.getenv('INGREDIENT_COMBINATION_MAX_ENTRIES', '500'))
INGREDIENT_CACHE_TTL = int(os.getenv('INGREDIENT_CACHE_TTL', str(86400 * 30)))  # 30 days default
INGREDIENT_SIMILARITY_THRESHOLD = float(os.getenv('INGREDIENT_SIMILARITY_THRESHOLD', '0.8'))
MIN_INGREDIENT_CONFIDENCE_TO_CACHE = int(os.getenv('MIN_INGREDIENT_CONFIDENCE_TO_CACHE', '70'))

# Progressive Analysis Configuration
PROGRESSIVE_ANALYSIS_TIMEOUT = int(os.getenv('PROGRESSIVE_ANALYSIS_TIMEOUT', '300'))  # 5 minutes default
PROGRESSIVE_ANALYSIS_MAX_THREADS = int(os.getenv('PROGRESSIVE_ANALYSIS_MAX_THREADS', '4'))
PROGRESSIVE_ANALYSIS_WEBSOCKET_ENABLED = os.getenv('PROGRESSIVE_ANALYSIS_WEBSOCKET_ENABLED', 'True') == 'True'

# Confidence Routing Configuration
AI_USE_CONFIDENCE_ROUTING = os.getenv('AI_USE_CONFIDENCE_ROUTING', 'False') == 'True'
DEFAULT_CONFIDENCE_THRESHOLD = float(os.getenv('DEFAULT_CONFIDENCE_THRESHOLD', '75.0'))
ENABLE_COST_OPTIMIZATION = os.getenv('ENABLE_COST_OPTIMIZATION', 'True') == 'True'
MAX_COST_PER_REQUEST = float(os.getenv('MAX_COST_PER_REQUEST', '0.10'))
ENABLE_FALLBACK_ROUTING = os.getenv('ENABLE_FALLBACK_ROUTING', 'True') == 'True'
CONFIDENCE_ROUTING_CACHE_TTL = int(os.getenv('CONFIDENCE_ROUTING_CACHE_TTL', '3600'))  # 1 hour default


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Required for django-allauth
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',  # Required for dj-rest-auth
    'rest_framework_simplejwt.token_blacklist',  # For JWT token blacklisting
    'corsheaders',
    'drf_spectacular',
    'channels',  # WebSocket support
    
    # Authentication apps
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    
    # Local apps
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.gzip.GZipMiddleware',  # Add compression
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
    # allauth middleware
    'allauth.account.middleware.AccountMiddleware',
    
    # Custom security middleware
    'api.security.middleware.SecurityHeadersMiddleware',
    'api.security.middleware.RequestLoggingMiddleware',
    'api.security.middleware.RateLimitMiddleware',
    'api.security.middleware.HTTPSEnforcementMiddleware',
    'api.security.middleware.SecurityAuditMiddleware',
    
    # Performance monitoring middleware
    'api.middleware.performance.PerformanceMonitoringMiddleware',
    'api.middleware.performance.DatabaseQueryTimingMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# Channel layers configuration for WebSocket support
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://localhost:6379/1')],
        },
    },
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User model
AUTH_USER_MODEL = 'api.User'

# Authentication backends
AUTHENTICATION_BACKENDS = [
    # Needed to login by username in Django admin, regardless of `allauth`
    'django.contrib.auth.backends.ModelBackend',
    # `allauth` specific authentication methods, such as login by e-mail
    'allauth.account.auth_backends.AuthenticationBackend',
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'EXCEPTION_HANDLER': 'api.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Gemini API Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# DRF Spectacular settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Nutrition AI API',
    'DESCRIPTION': '''
    ## Overview
    The Nutrition AI API provides intelligent nutritional analysis of food images using advanced AI technology.
    
    ## Features
    - 📸 AI-powered food image analysis
    - 🎯 Accurate nutritional information extraction
    - 👤 User authentication and profile management
    - 📊 Meal tracking and history
    - ⭐ Favorite meals and quick logging
    - 🔒 Secure JWT-based authentication
    
    ## Authentication
    This API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:
    ```
    Authorization: Bearer <your-token>
    ```
    
    ## Rate Limiting
    - Authentication endpoints: 5 requests/minute
    - Image analysis: 10 requests/minute
    - General API: 60 requests/minute
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': False,
        'defaultModelsExpandDepth': 1,
        'defaultModelRendering': 'example',
        'docExpansion': 'none',
        'filter': True,
        'showExtensions': True,
        'showCommonExtensions': True,
    },
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Development server'},
        {'url': 'https://api.nutritionai.com', 'description': 'Production server'},
    ],
    'EXTERNAL_DOCS': {
        'description': 'Find more info here',
        'url': 'https://github.com/yourusername/nutrition-ai',
    },
    'TAGS': [
        {'name': 'auth', 'description': 'Authentication operations'},
        {'name': 'analysis', 'description': 'Food image analysis'},
        {'name': 'meals', 'description': 'Meal management'},
        {'name': 'profile', 'description': 'User profile management'},
        {'name': 'health', 'description': 'Health check endpoints'},
    ],
    'SECURITY': [
        {'Bearer': []},
    ],
    'CONTACT': {
        'name': 'API Support',
        'email': 'api@nutritionai.com',
    },
    'LICENSE': {
        'name': 'MIT',
    },
}

# CORS settings
CORS_ALLOW_CREDENTIALS = True

# Email settings
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@nutritionai.com')
SERVER_EMAIL = os.getenv('SERVER_EMAIL', 'server@nutritionai.com')

# Frontend URL for email links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8081')

# Django sites framework
SITE_ID = 1

# Django-allauth settings
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*', 'first_name', 'last_name']
ACCOUNT_EMAIL_VERIFICATION = 'optional'
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_ADAPTER = 'api.adapters.AccountAdapter'
SOCIALACCOUNT_ADAPTER = 'api.adapters.SocialAccountAdapter'

# OAuth2 providers configuration
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': os.getenv('GOOGLE_OAUTH_CLIENT_ID', ''),
            'secret': os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', ''),
            'key': ''
        },
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        }
    }
}

# dj-rest-auth settings
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_HTTPONLY': False,
    'JWT_AUTH_REFRESH_COOKIE': 'refresh-token',
    'JWT_AUTH_SECURE': os.getenv('DJANGO_SECURE_SSL_REDIRECT', 'False') == 'True',
    'JWT_AUTH_SAMESITE': 'Lax',
    'SESSION_LOGIN': False,
    'USER_DETAILS_SERIALIZER': 'api.serializers.auth_serializers.UserSerializer',
    # New SIGNUP_FIELDS configuration to suppress deprecation warnings
    'SIGNUP_FIELDS': {
        'username': {'required': False},
        'email': {'required': True},
        'first_name': {'required': False},
        'last_name': {'required': False},
    },
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        'correlation_id': {
            '()': 'api.logging.structured_logging.CorrelationIdFilter',
        },
    },
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {correlation_id} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            '()': 'api.logging.structured_logging.NutritionAIJsonFormatter',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'filters': ['correlation_id'],
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'nutrition_ai.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
            'filters': ['correlation_id'],
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'security.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 10,
            'formatter': 'json',
            'filters': ['correlation_id'],
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'api.security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api.security.audit': {
            'handlers': ['security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'api.performance': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# Celery task routing
CELERY_TASK_ROUTES = {
    'api.tasks.email_tasks.*': {'queue': 'emails'},
    'api.tasks.sms_tasks.*': {'queue': 'sms'},
    'api.tasks.notification_tasks.*': {'queue': 'notifications'},
    'api.tasks.malware_tasks.*': {'queue': 'security'},
    'api.tasks.ai_tasks.*': {'queue': 'ai_processing'},
    'api.tasks.maintenance_tasks.*': {'queue': 'maintenance'},
}

# Celery beat settings (if using django-celery-beat)
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')

# Payment Configuration
PAYMENT_CURRENCY = 'USD'
PAYMENT_SUCCESS_URL = os.getenv('PAYMENT_SUCCESS_URL', 'https://yourapp.com/success')
PAYMENT_CANCEL_URL = os.getenv('PAYMENT_CANCEL_URL', 'https://yourapp.com/cancel')

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM_NUMBER = os.getenv('TWILIO_FROM_NUMBER', '')
TWILIO_STATUS_CALLBACK_URL = os.getenv('TWILIO_STATUS_CALLBACK_URL', '')

# Malware Scanning Configuration
CLAMAV_SOCKET_PATH = os.getenv('CLAMAV_SOCKET_PATH', '/tmp/clamd.socket')
CLAMAV_CLAMSCAN_PATH = os.getenv('CLAMAV_CLAMSCAN_PATH', 'clamscan')
VIRUSTOTAL_API_KEY = os.getenv('VIRUSTOTAL_API_KEY', '')
MALWARE_SCAN_CACHE_TIMEOUT = int(os.getenv('MALWARE_SCAN_CACHE_TIMEOUT', 86400))  # 24 hours
MALWARE_SCAN_TEMP_DIR = os.getenv('MALWARE_SCAN_TEMP_DIR', '')