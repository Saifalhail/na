"""
Custom JWT token blacklist implementation with database backend.
"""

import logging

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

logger = logging.getLogger(__name__)
User = get_user_model()


class DatabaseBackedJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks database for blacklisted tokens.

    This provides persistent token blacklisting that survives cache clears
    and server restarts.
    """

    def get_validated_token(self, raw_token):
        """
        Validates an encoded JSON web token and returns a validated token
        wrapper object, checking against the database blacklist.
        """
        # First, validate the token structure
        validated_token = super().get_validated_token(raw_token)

        # Check if token is blacklisted in database
        jti = validated_token.get("jti")
        if jti and self._is_token_blacklisted(jti):
            logger.warning(f"Blacklisted token attempted access: {jti[:8]}...")
            raise InvalidToken("Token is blacklisted")

        return validated_token

    def _is_token_blacklisted(self, jti: str) -> bool:
        """
        Check if a token JTI is in the database blacklist.

        Args:
            jti: JWT ID to check

        Returns:
            True if token is blacklisted
        """
        # Import here to avoid circular imports
        from api.models import BlacklistedToken

        try:
            return BlacklistedToken.is_blacklisted(jti)
        except Exception as e:
            logger.error(f"Error checking token blacklist: {e}")
            # Fail secure - if we can't check, assume not blacklisted
            # but log the error for investigation
            return False


class TokenBlacklistService:
    """
    Service for managing token blacklisting operations.
    """

    @staticmethod
    def blacklist_token(token, user=None, reason="logout", ip_address=None):
        """
        Blacklist a JWT token.

        Args:
            token: JWT token object or raw token string
            user: User who owns the token (optional, will be extracted from token)
            reason: Reason for blacklisting
            ip_address: IP address that initiated blacklisting

        Returns:
            BlacklistedToken instance
        """
        from datetime import datetime

        from rest_framework_simplejwt.tokens import UntypedToken

        from api.models import BlacklistedToken

        try:
            # Handle both token objects and raw token strings
            if isinstance(token, str):
                token_obj = UntypedToken(token)
            else:
                token_obj = token

            jti = token_obj.get("jti")
            if not jti:
                raise ValueError("Token has no JTI claim")

            # Get user if not provided
            if user is None:
                user_id = token_obj.get("user_id")
                if user_id:
                    user = User.objects.get(id=user_id)
                else:
                    raise ValueError("Cannot determine user from token")

            # Determine token type
            token_type = "refresh" if token_obj.token_type == "refresh" else "access"

            # Get token expiration
            exp = token_obj.get("exp")
            expires_at = datetime.fromtimestamp(exp) if exp else None

            # Blacklist the token
            blacklisted_token = BlacklistedToken.blacklist_token(
                jti=jti,
                user=user,
                token_type=token_type,
                expires_at=expires_at,
                reason=reason,
                ip_address=ip_address,
            )

            logger.info(f"Token blacklisted: {jti[:8]}... for user {user.email}")
            return blacklisted_token

        except Exception as e:
            logger.error(f"Error blacklisting token: {e}")
            raise

    @staticmethod
    def blacklist_all_user_tokens(user, reason="logout_all", ip_address=None):
        """
        Blacklist all tokens for a user.

        Args:
            user: User whose tokens to blacklist
            reason: Reason for blacklisting
            ip_address: IP address that initiated blacklisting

        Returns:
            Number of tokens blacklisted
        """
        from api.models import BlacklistedToken

        try:
            count = BlacklistedToken.blacklist_all_user_tokens(
                user=user, reason=reason, ip_address=ip_address
            )

            logger.info(f"Blacklisted all tokens for user {user.email}")
            return count

        except Exception as e:
            logger.error(f"Error blacklisting all user tokens: {e}")
            raise

    @staticmethod
    def cleanup_expired_tokens():
        """
        Clean up expired blacklisted tokens.

        Returns:
            Number of tokens cleaned up
        """
        from api.models import BlacklistedToken

        try:
            count = BlacklistedToken.cleanup_expired()
            logger.info(f"Cleaned up {count} expired blacklisted tokens")
            return count

        except Exception as e:
            logger.error(f"Error cleaning up expired tokens: {e}")
            return 0


# Global service instance
token_blacklist_service = TokenBlacklistService()
