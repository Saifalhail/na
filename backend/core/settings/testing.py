"""
Testing Django settings for core project.

This file contains settings specific to the testing environment.
"""

import os
from .base import *

# Use a fixed secret key for testing
SECRET_KEY = 'django-test-secret-key-for-testing-only'

# Always disable debug in testing
DEBUG = False

ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

# Use in-memory SQLite database for faster tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 20,
        }
    }
}

# Password hashers - use faster but less secure hashers for testing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable migrations for faster test runs (commented out for initial setup)
# class DisableMigrations:
#     def __contains__(self, item):
#         return True

#     def __getitem__(self, item):
#         return None

# MIGRATION_MODULES = DisableMigrations()

# Cache settings for testing (use locmem for rate limiting tests)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}

# Email backend for testing (locmem)
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Media files - use temporary directory for testing
import tempfile
MEDIA_ROOT = tempfile.mkdtemp()

# Logging - reduce log level for cleaner test output
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
        'api': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    },
}

# Disable CORS in testing
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = []

# Mock Gemini API key for testing
GEMINI_API_KEY = 'test-gemini-api-key'

# Testing-specific DRF settings
REST_FRAMEWORK.update({
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
})

# Celery settings for testing (always eager)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable HTTPS enforcement for testing
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Disable APPEND_SLASH to avoid 301 redirects in tests
APPEND_SLASH = False

# Override security middleware for testing (remove HTTPS enforcement)
# Remove HTTPSEnforcementMiddleware and Django's SecurityMiddleware from MIDDLEWARE list
MIDDLEWARE = [
    m for m in MIDDLEWARE 
    if m not in [
        'api.security.middleware.HTTPSEnforcementMiddleware',
        'django.middleware.security.SecurityMiddleware'
    ]
]