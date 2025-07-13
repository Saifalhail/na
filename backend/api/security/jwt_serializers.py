"""
Custom JWT serializers with enhanced security features.
"""

import hashlib

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

from api.models import APIUsageLog

User = get_user_model()


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

        # Update last login
        update_last_login(None, self.user)

        # Update last login IP
        if hasattr(self.user, "last_login_ip"):
            self.user.last_login_ip = ip_address
            self.user.save(update_fields=["last_login_ip"])

        # Log successful login
        APIUsageLog.objects.create(
            user=self.user,
            endpoint="/api/v1/auth/login/",
            method="POST",
            ip_address=ip_address,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            response_status_code=200,
            response_time_ms=0,  # Will be updated by middleware
        )

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

        # Log to database
        APIUsageLog.objects.create(
            user=None,
            endpoint="/api/v1/auth/login/",
            method="POST",
            ip_address=ip_address,
            user_agent=self.context.get("request").META.get("HTTP_USER_AGENT", ""),
            response_status_code=401,
            response_time_ms=0,
            error_message=f"Failed login attempt for username: {username}",
        )


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

        # Log token refresh
        request = self.context.get("request")
        if request:
            APIUsageLog.objects.create(
                user=user,
                endpoint="/api/v1/auth/refresh/",
                method="POST",
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                response_status_code=200,
                response_time_ms=0,
            )

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
