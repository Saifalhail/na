"""
Custom JWT serializers with enhanced security features.
"""

import hashlib
import logging

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.core.cache import cache
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import (TokenObtainPairSerializer,
                                                  TokenRefreshSerializer)
from rest_framework_simplejwt.tokens import RefreshToken

# API usage logging has been simplified and moved to standard logging

User = get_user_model()
logger = logging.getLogger(__name__)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer with additional security features.
    """

    def validate(self, attrs):
        """Validate credentials and return tokens with custom claims."""
        # Get request from context
        request = self.context.get("request")

        # Rate limiting check
        ip_address = self.get_client_ip(request)
        if self.is_rate_limited(ip_address):
            raise serializers.ValidationError(
                _("Too many login attempts. Please try again later.")
            )

        # Authenticate user
        authenticate_kwargs = {
            self.username_field: attrs[self.username_field],
            "password": attrs["password"],
        }
        authenticate_kwargs["request"] = request

        self.user = authenticate(**authenticate_kwargs)

        if not self.user:
            # Log failed attempt
            self.log_failed_attempt(ip_address, attrs[self.username_field])
            raise serializers.ValidationError(
                _("No active account found with the given credentials")
            )

        if not self.user.is_active:
            raise serializers.ValidationError(_("Account is disabled"))

        # Check if email is verified
        if not self.user.is_verified:
            raise serializers.ValidationError(
                _("Email address is not verified. Please check your email.")
            )

        # Check if 2FA is enabled for this user
        if self.user.two_factor_enabled:
            # Store partial login info in cache for 2FA verification
            cache_key = f"2fa_pending_{self.user.id}"
            cache.set(
                cache_key,
                {
                    "user_id": self.user.id,
                    "ip_address": ip_address,
                    "timestamp": str(timezone.now()),
                },
                300,
            )  # 5 minutes to complete 2FA

            # Return a response indicating 2FA is required
            return {
                "requires_2fa": True,
                "message": "Two-factor authentication required",
            }

        # Get tokens
        refresh = self.get_token(self.user)

        # Add custom claims
        refresh["email"] = self.user.email
        refresh["account_type"] = self.user.account_type
        refresh["is_verified"] = self.user.is_verified

        # Batch user updates to reduce database operations and cache invalidations
        fields_to_update = []
        
        # Update last login
        if not self.user.last_login or (timezone.now() - self.user.last_login).total_seconds() > 300:
            # Only update if last login was more than 5 minutes ago to reduce frequent updates
            self.user.last_login = timezone.now()
            fields_to_update.append("last_login")
        
        # Update last login IP efficiently (avoid extra save if unchanged)
        if hasattr(self.user, "last_login_ip") and self.user.last_login_ip != ip_address:
            self.user.last_login_ip = ip_address
            fields_to_update.append("last_login_ip")
        
        # Save all updates in one operation to reduce cache invalidations
        if fields_to_update:
            self.user.save(update_fields=fields_to_update)

        # Skip APIUsageLog creation here as it's handled by middleware to avoid duplicate logging

        data = {}
        data["refresh"] = str(refresh)
        data["access"] = str(refresh.access_token)

        return data

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def is_rate_limited(self, ip_address):
        """Check if IP is rate limited for login attempts."""
        cache_key = f"login_attempts_{ip_address}"
        attempts = cache.get(cache_key, 0)

        if attempts >= 5:  # Max 5 attempts per 15 minutes
            return True

        return False

    def log_failed_attempt(self, ip_address, username):
        """Log failed login attempt."""
        # Increment rate limit counter
        cache_key = f"login_attempts_{ip_address}"
        attempts = cache.get(cache_key, 0)
        cache.set(cache_key, attempts + 1, 900)  # 15 minutes

        # Skip database logging here as it's handled by middleware to avoid duplicate logging
        # Just log to application logs for debugging
        logger.warning(f"Failed login attempt for username: {username} from IP: {ip_address}")


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom refresh token serializer with rotation and blacklisting.
    """

    def validate(self, attrs):
        """Validate refresh token and return new tokens."""
        refresh = RefreshToken(attrs["refresh"])

        # Check if token is blacklisted
        if self.is_token_blacklisted(refresh):
            raise InvalidToken(_("Token is blacklisted"))

        # Get user
        user_id = refresh.get("user_id")
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise InvalidToken(_("User not found"))

        # Check if user is still active
        if not user.is_active:
            raise InvalidToken(_("User account is disabled"))

        # Create new refresh token (rotation)
        new_refresh = RefreshToken.for_user(user)

        # Add custom claims
        new_refresh["email"] = user.email
        new_refresh["account_type"] = user.account_type
        new_refresh["is_verified"] = user.is_verified

        # Blacklist old refresh token
        self.blacklist_token(refresh)

        # Skip database logging here as it's handled by middleware to avoid duplicate logging

        data = {}
        data["refresh"] = str(new_refresh)
        data["access"] = str(new_refresh.access_token)

        return data

    def is_token_blacklisted(self, token):
        """Check if token is blacklisted."""
        # Use cache for blacklist (in production, use Redis or database)
        token_hash = hashlib.sha256(str(token).encode()).hexdigest()
        cache_key = f"blacklisted_token_{token_hash}"
        return cache.get(cache_key) is not None

    def blacklist_token(self, token):
        """Add token to blacklist."""
        token_hash = hashlib.sha256(str(token).encode()).hexdigest()
        cache_key = f"blacklisted_token_{token_hash}"
        # Store until token expiry
        cache.set(cache_key, True, token.lifetime.total_seconds())

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class TokenVerifySerializer(serializers.Serializer):
    """
    Serializer for verifying tokens.
    """

    token = serializers.CharField()

    def validate_token(self, value):
        """Validate the token."""
        try:
            # Try to decode as access token
            from rest_framework_simplejwt.tokens import AccessToken

            token = AccessToken(value)

            # Check if user still exists and is active
            user_id = token.get("user_id")
            user = User.objects.get(id=user_id)

            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")

            return value

        except Exception as e:
            raise serializers.ValidationError(f"Invalid token: {str(e)}")


class LogoutSerializer(serializers.Serializer):
    """
    Serializer for logout - blacklists refresh token.
    """

    refresh = serializers.CharField()

    def validate_refresh(self, value):
        """Validate and blacklist the refresh token."""
        try:
            token = RefreshToken(value)

            # Use database-backed blacklisting instead of cache
            from api.security.token_blacklist import token_blacklist_service

            # Get user from token
            user_id = token.get("user_id")
            if user_id:
                user = User.objects.get(id=user_id)

                # Blacklist the token in database
                token_blacklist_service.blacklist_token(
                    token=token,
                    user=user,
                    reason="logout",
                    ip_address=getattr(self, "_request_ip", None),
                )
            else:
                # Fallback to cache-based blacklisting if user not found
                token_hash = hashlib.sha256(str(token).encode()).hexdigest()
                cache_key = f"blacklisted_token_{token_hash}"
                cache.set(cache_key, True, token.lifetime.total_seconds())

            return value

        except Exception as e:
            raise serializers.ValidationError(f"Invalid token: {str(e)}")
