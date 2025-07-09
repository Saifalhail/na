"""
Django settings module loader.

This module automatically loads the appropriate settings file based on the 
DJANGO_SETTINGS_MODULE environment variable or defaults to development settings.
"""

import os

# Determine which settings to use based on environment
environment = os.getenv('DJANGO_ENVIRONMENT', 'development')

if environment == 'production':
    from .production import *
elif environment == 'testing':
    from .testing import *
else:
    from .development import *