"""
Authentication views for user registration, login, and account management.
"""

import logging
from typing import Any, Dict

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.crypto import get_random_string
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (OpenApiExample, OpenApiParameter,
                                   extend_schema)
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from api.models import UserProfile
from api.security.jwt_serializers import (CustomTokenObtainPairSerializer,
                                          CustomTokenRefreshSerializer,
                                          LogoutSerializer,
                                          TokenVerifySerializer)
from api.serializers.auth_serializers import (EmailVerificationSerializer,
                                              PasswordChangeSerializer,
                                              PasswordResetConfirmSerializer,
                                              PasswordResetRequestSerializer,
                                              UserProfileSerializer,
                                              UserRegistrationSerializer,
                                              UserSerializer)

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    Creates a new user account and sends email verification.
    """

    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Register new user",
        description="Create a new user account with email verification",
        responses={201: UserSerializer, 400: "Validation error"},
    )
    def post(self, request, *args, **kwargs):
        """Create user and send verification email."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create user
        user = serializer.save()

        # Generate verification token
        token = self.generate_verification_token(user)

        # Send verification email
        self.send_verification_email(user, token)

        # Return user data
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def generate_verification_token(self, user: User) -> str:
        """Generate email verification token."""
        token = get_random_string(64)
        cache_key = f"email_verify_{token}"
        cache.set(cache_key, user.id, 86400)  # 24 hours
        return token

    def send_verification_email(self, user: User, token: str) -> None:
        """Send verification email to user."""
        try:
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

            context = {
                "user": user,
                "verification_url": verification_url,
                "app_name": "Nutrition AI",
            }

            # Render email templates
            subject = "Verify your Nutrition AI account"
            html_message = render_to_string("emails/verify_email.html", context)
            text_message = render_to_string("emails/verify_email.txt", context)

            send_mail(
                subject=subject,
                message=text_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

            logger.info(f"Verification email sent to {user.email}")

        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")


class EmailVerifyView(APIView):
    """
    Email verification endpoint.

    Verifies user email address with token.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Verify email address",
        description="Verify user email with verification token",
        request=EmailVerificationSerializer,
        responses={
            200: {"description": "Email verified successfully"},
            400: "Invalid or expired token",
        },
    )
    def post(self, request):
        """Verify email with token."""
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        cache_key = f"email_verify_{token}"

        # Get user ID from cache
        user_id = cache.get(cache_key)
        if not user_id:
            return Response(
                {"error": "Invalid or expired verification token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user and verify
        try:
            user = User.objects.get(id=user_id)
            user.is_verified = True
            user.save()

            # Delete token from cache
            cache.delete(cache_key)

            # Generate tokens for automatic login
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "message": "Email verified successfully",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                }
            )

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST
            )


class LoginView(TokenObtainPairView):
    """
    Login endpoint with custom JWT serializer.

    Returns access and refresh tokens.
    """

    serializer_class = CustomTokenObtainPairSerializer

    @extend_schema(
        summary="User login",
        description="Authenticate user and return JWT tokens",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "access": {"type": "string"},
                    "refresh": {"type": "string"},
                },
            },
            401: "Invalid credentials",
        },
    )
    def post(self, request, *args, **kwargs):
        """
        Override to handle 2FA session storage properly.
        """
        # Ensure session exists
        if not request.session.session_key:
            request.session.save()

        # Call the parent post method
        response = super().post(request, *args, **kwargs)

        # If the response contains 2FA requirement, update cache with session key
        if hasattr(response, "data") and response.data.get("requires_2fa"):
            # Get user ID from the serializer's user
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                user = serializer.user

                # Update cache to use session key instead of user ID
                old_cache_key = f"2fa_pending_{user.id}"
                new_cache_key = f"2fa_pending_session_{request.session.session_key}"

                pending_data = cache.get(old_cache_key)
                if pending_data:
                    # Move to session-based cache
                    cache.set(new_cache_key, pending_data, 300)  # 5 minutes
                    cache.delete(old_cache_key)

        return response


class RefreshTokenView(TokenRefreshView):
    """
    Token refresh endpoint with rotation.

    Returns new access and refresh tokens.
    """

    serializer_class = CustomTokenRefreshSerializer

    @extend_schema(
        summary="Refresh access token",
        description="Get new access token using refresh token with rotation",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "access": {"type": "string"},
                    "refresh": {"type": "string"},
                },
            },
            401: "Invalid refresh token",
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """
    Logout endpoint.

    Blacklists the refresh token.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="User logout",
        description="Logout user and blacklist refresh token",
        request=LogoutSerializer,
        responses={
            200: {"description": "Logged out successfully"},
            400: "Invalid token",
        },
    )
    def post(self, request):
        """Blacklist refresh token."""
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {"message": "Logged out successfully"}, status=status.HTTP_200_OK
        )


class PasswordResetRequestView(APIView):
    """
    Request password reset.

    Sends password reset email.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Request password reset",
        description="Send password reset email to user",
        request=PasswordResetRequestSerializer,
        responses={
            200: {"description": "Password reset email sent"},
            400: "Validation error",
        },
    )
    def post(self, request):
        """Send password reset email."""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)

            # Generate reset token
            token = get_random_string(64)
            cache_key = f"password_reset_{token}"
            cache.set(cache_key, user.id, 3600)  # 1 hour

            # Send reset email
            self.send_reset_email(user, token)

        except User.DoesNotExist:
            # Don't reveal if user exists
            pass

        return Response(
            {
                "message": "If an account exists with this email, a password reset link has been sent."
            }
        )

    def send_reset_email(self, user: User, token: str) -> None:
        """Send password reset email."""
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

            context = {"user": user, "reset_url": reset_url, "app_name": "Nutrition AI"}

            subject = "Reset your Nutrition AI password"
            html_message = render_to_string("emails/reset_password.html", context)
            text_message = render_to_string("emails/reset_password.txt", context)

            send_mail(
                subject=subject,
                message=text_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

            logger.info(f"Password reset email sent to {user.email}")

        except Exception as e:
            logger.error(f"Failed to send reset email: {e}")


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset.

    Reset password with token.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Reset password with token",
        description="Reset user password using reset token",
        request=PasswordResetConfirmSerializer,
        responses={
            200: {"description": "Password reset successfully"},
            400: "Invalid token or validation error",
        },
    )
    def post(self, request):
        """Reset password with token."""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        cache_key = f"password_reset_{token}"
        user_id = cache.get(cache_key)

        if not user_id:
            return Response(
                {"error": "Invalid or expired reset token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
            user.set_password(password)
            user.save()

            # Delete token
            cache.delete(cache_key)

            # Log password change
            logger.info(f"Password reset for user {user.email}")

            return Response({"message": "Password reset successfully"})

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST
            )


class PasswordChangeView(APIView):
    """
    Change password for authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Change password",
        description="Change password for authenticated user",
        request=PasswordChangeSerializer,
        responses={
            200: {"description": "Password changed successfully"},
            400: "Validation error",
        },
    )
    def post(self, request):
        """Change user password."""
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Change password
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        # Log password change
        logger.info(f"Password changed for user {user.email}")

        return Response({"message": "Password changed successfully"})


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    User profile endpoint.

    Get and update user profile.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get user profile."""
        return self.request.user.profile

    @extend_schema(
        summary="Get user profile",
        description="Get current user's profile information",
        responses={200: UserProfileSerializer, 401: "Not authenticated"},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update user profile",
        description="Update current user's profile information",
        request=UserProfileSerializer,
        responses={
            200: UserProfileSerializer,
            400: "Validation error",
            401: "Not authenticated",
        },
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class TokenVerifyView(APIView):
    """
    Verify JWT token validity.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Verify token",
        description="Check if JWT token is valid",
        request=TokenVerifySerializer,
        responses={200: {"description": "Token is valid"}, 400: "Invalid token"},
    )
    def post(self, request):
        """Verify token validity."""
        serializer = TokenVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response({"message": "Token is valid"})
