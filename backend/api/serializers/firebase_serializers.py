"""
Firebase authentication serializers.
"""

import logging
from typing import Any, Dict

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

try:
    from api.services.firebase_service import firebase_service
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Firebase service not available: {e}")
    firebase_service = None
from api.serializers.auth_serializers import UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class FirebaseGoogleAuthSerializer(serializers.Serializer):
    """
    Serializer for Firebase Google authentication.
    """

    id_token = serializers.CharField(
        required=True, help_text="Firebase ID token from Google Sign-In"
    )

    def validate_id_token(self, value: str) -> str:
        """
        Validate Firebase ID token.

        Args:
            value: Firebase ID token

        Returns:
            Validated token

        Raises:
            ValidationError: If token is invalid
        """
        if not value:
            raise serializers.ValidationError("ID token is required")

        # Check if Firebase service is available
        if not firebase_service:
            raise serializers.ValidationError(
                "Firebase authentication is not available"
            )

        # Verify token with Firebase
        claims = firebase_service.verify_id_token(value)
        if not claims:
            raise serializers.ValidationError("Invalid or expired Firebase ID token")

        # Store claims for use in create method
        self._firebase_claims = claims
        return value

    def create(self, validated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or get user from Firebase claims and return JWT tokens.

        Args:
            validated_data: Validated data from serializer

        Returns:
            Dict with user data and JWT tokens
        """
        # Get Firebase claims from validation
        firebase_claims = getattr(self, "_firebase_claims", None)
        if not firebase_claims:
            raise serializers.ValidationError("Firebase claims not found")

        # Get or create user
        user = firebase_service.get_or_create_user_from_firebase(firebase_claims)
        if not user:
            raise serializers.ValidationError("Failed to create or retrieve user")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        return {
            "user": UserSerializer(user).data,
            "access_token": str(access_token),
            "refresh_token": str(refresh),
            "firebase_uid": firebase_claims.get("uid"),
        }


class FirebasePhoneAuthSerializer(serializers.Serializer):
    """
    Serializer for Firebase phone authentication.
    """

    id_token = serializers.CharField(
        required=True, help_text="Firebase ID token from phone authentication"
    )

    def validate_id_token(self, value: str) -> str:
        """
        Validate Firebase ID token for phone auth.

        Args:
            value: Firebase ID token

        Returns:
            Validated token

        Raises:
            ValidationError: If token is invalid or not from phone auth
        """
        if not value:
            raise serializers.ValidationError("ID token is required")

        # Check if Firebase service is available
        if not firebase_service:
            raise serializers.ValidationError(
                "Firebase authentication is not available"
            )

        # Verify token with Firebase
        claims = firebase_service.verify_id_token(value)
        if not claims:
            raise serializers.ValidationError("Invalid or expired Firebase ID token")

        # Verify this is a phone authentication
        if not claims.get("phone_number"):
            raise serializers.ValidationError("Token must be from phone authentication")

        # Store claims for use in create method
        self._firebase_claims = claims
        return value

    def create(self, validated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or get user from Firebase phone claims and return JWT tokens.

        Args:
            validated_data: Validated data from serializer

        Returns:
            Dict with user data and JWT tokens
        """
        # Get Firebase claims from validation
        firebase_claims = getattr(self, "_firebase_claims", None)
        if not firebase_claims:
            raise serializers.ValidationError("Firebase claims not found")

        # Get or create user
        user = firebase_service.get_or_create_user_from_firebase(firebase_claims)
        if not user:
            raise serializers.ValidationError("Failed to create or retrieve user")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        return {
            "user": UserSerializer(user).data,
            "access_token": str(access_token),
            "refresh_token": str(refresh),
            "firebase_uid": firebase_claims.get("uid"),
            "phone_number": firebase_claims.get("phone_number"),
        }


class PhoneNumberVerificationSerializer(serializers.Serializer):
    """
    Serializer for initiating phone number verification.
    """

    phone_number = serializers.CharField(
        required=True,
        help_text="Phone number in international format (e.g., +1234567890)",
    )

    def validate_phone_number(self, value: str) -> str:
        """
        Validate and format phone number.

        Args:
            value: Phone number string

        Returns:
            Formatted phone number

        Raises:
            ValidationError: If phone number is invalid
        """
        # Check if Firebase service is available
        if not firebase_service:
            raise serializers.ValidationError("Firebase service is not available")

        formatted_phone = firebase_service.format_phone_number(value)
        if not formatted_phone:
            raise serializers.ValidationError("Invalid phone number format")

        return formatted_phone

    def create(self, validated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate phone number verification.

        Args:
            validated_data: Validated data with phone number

        Returns:
            Dict with verification status
        """
        phone_number = validated_data["phone_number"]

        # Send verification code through Firebase service
        result = firebase_service.send_phone_verification(phone_number)

        if not result.get("success"):
            raise serializers.ValidationError(
                result.get("error", "Failed to send verification")
            )

        return result


class SMSOTPVerificationSerializer(serializers.Serializer):
    """
    Serializer for custom SMS OTP verification (backend-generated codes).
    """

    phone_number = serializers.CharField(required=True)
    otp_code = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate OTP code against stored code.

        Args:
            attrs: Serializer attributes

        Returns:
            Validated attributes

        Raises:
            ValidationError: If OTP is invalid or expired
        """
        # Import here to avoid circular imports
        from api.models import SMSOTPCode

        phone_number = attrs.get("phone_number")
        otp_code = attrs.get("otp_code")

        # Check if Firebase service is available
        if not firebase_service:
            raise serializers.ValidationError("Firebase service is not available")

        # Format phone number
        formatted_phone = firebase_service.format_phone_number(phone_number)
        if not formatted_phone:
            raise serializers.ValidationError("Invalid phone number format")

        # Validate OTP code format
        if not otp_code.isdigit() or len(otp_code) != 6:
            raise serializers.ValidationError("OTP must be a 6-digit code")

        # Verify OTP against stored codes
        if not SMSOTPCode.verify_otp(formatted_phone, otp_code):
            raise serializers.ValidationError("Invalid or expired OTP code")

        attrs["phone_number"] = formatted_phone
        return attrs

    def create(self, validated_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify OTP and create/login user.

        Args:
            validated_data: Validated phone number and OTP

        Returns:
            Dict with user data and tokens
        """
        phone_number = validated_data["phone_number"]

        # Find or create user with this phone number
        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            # Create new user with phone number
            user = User.objects.create(
                username=phone_number,  # Use phone as username
                phone_number=phone_number,
                is_active=True,
                account_type="free",
            )
            logger.info(f"Created new user with phone number: {phone_number}")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        return {
            "user": UserSerializer(user).data,
            "access_token": str(access_token),
            "refresh_token": str(refresh),
            "phone_number": phone_number,
        }
