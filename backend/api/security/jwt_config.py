"""
JWT Configuration for Nutrition AI API.

This module contains all JWT-related settings and utilities.
"""
from datetime import timedelta
from django.conf import settings

# JWT Settings - These can be overridden in environment-specific settings
JWT_AUTH_SETTINGS = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Short-lived access token
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Longer-lived refresh token
    'ROTATE_REFRESH_TOKENS': True,  # Issue new refresh token on refresh
    'BLACKLIST_AFTER_ROTATION': True,  # Blacklist old refresh tokens
    'UPDATE_LAST_LOGIN': True,  # Update user's last_login field
    
    # Algorithm settings
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': settings.SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': 'nutrition-ai-api',
    'JWK_URL': None,
    'LEEWAY': timedelta(seconds=10),  # Time tolerance for expiration
    
    # Custom token claims
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    
    # Token types
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    
    # Headers
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # Cookie settings (optional, for web clients)
    'AUTH_COOKIE': 'nutrition-ai-auth',
    'AUTH_COOKIE_DOMAIN': None,
    'AUTH_COOKIE_SECURE': True,  # Only send over HTTPS
    'AUTH_COOKIE_HTTP_ONLY': True,  # Not accessible via JavaScript
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'Lax',
    
    # Refresh cookie settings
    'AUTH_REFRESH_COOKIE': 'nutrition-ai-refresh',
    'AUTH_REFRESH_COOKIE_DOMAIN': None,
    'AUTH_REFRESH_COOKIE_SECURE': True,
    'AUTH_REFRESH_COOKIE_HTTP_ONLY': True,
    'AUTH_REFRESH_COOKIE_PATH': '/',
    'AUTH_REFRESH_COOKIE_SAMESITE': 'Lax',
}

# Custom claims to include in tokens
def get_custom_jwt_claims(user):
    """
    Add custom claims to JWT tokens.
    
    Args:
        user: User instance
        
    Returns:
        dict: Custom claims to include in token
    """
    return {
        'email': user.email,
        'account_type': user.account_type,
        'is_verified': user.is_verified,
        'full_name': user.get_full_name(),
    }

# Token validation rules
def validate_token_claims(token_payload):
    """
    Custom validation for token claims.
    
    Args:
        token_payload: Decoded token payload
        
    Returns:
        bool: True if valid, raises exception if invalid
    """
    # Check if user is verified
    if not token_payload.get('is_verified', False):
        from rest_framework_simplejwt.exceptions import InvalidToken
        raise InvalidToken('Email not verified')
    
    return True