"""
Firebase authentication views for Google Sign-In and phone authentication.
"""

import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.firebase_serializers import (
    FirebaseGoogleAuthSerializer, FirebasePhoneAuthSerializer,
    PhoneNumberVerificationSerializer, SMSOTPVerificationSerializer)

logger = logging.getLogger(__name__)


class FirebaseGoogleAuthView(APIView):
    """
    Firebase Google Sign-In authentication endpoint.

    Accepts Firebase ID token from Google Sign-In and returns JWT tokens.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = FirebaseGoogleAuthSerializer

    @extend_schema(
        summary="Firebase Google Sign-In",
        description="Authenticate user with Firebase Google Sign-In ID token",
        request=FirebaseGoogleAuthSerializer,
        responses={
            200: OpenApiResponse(
                description="Authentication successful",
                response=OpenApiTypes.OBJECT,
                examples=[
                    {
                        "user": {
                            "id": 1,
                            "email": "user@example.com",
                            "first_name": "John",
                            "last_name": "Doe",
                            "firebase_uid": "firebase-uid-123",
                        },
                        "access_token": "jwt-access-token",
                        "refresh_token": "jwt-refresh-token",
                        "firebase_uid": "firebase-uid-123",
                    }
                ],
            ),
            400: OpenApiResponse(
                description="Invalid ID token or authentication failed"
            ),
        },
        tags=["Firebase Authentication"],
    )
    def post(self, request):
        """
        Authenticate user with Firebase Google Sign-In.

        Args:
            request: HTTP request with Firebase ID token

        Returns:
            Response with user data and JWT tokens
        """
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            try:
                result = serializer.save()
                logger.info(
                    f"Firebase Google authentication successful for user: {result['user']['email']}"
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Firebase Google authentication failed: {e}")
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FirebasePhoneAuthView(APIView):
    """
    Firebase phone authentication endpoint.

    Accepts Firebase ID token from phone authentication and returns JWT tokens.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = FirebasePhoneAuthSerializer

    @extend_schema(
        summary="Firebase Phone Authentication",
        description="Authenticate user with Firebase phone authentication ID token",
        request=FirebasePhoneAuthSerializer,
        responses={
            200: OpenApiResponse(
                description="Authentication successful",
                response=OpenApiTypes.OBJECT,
                examples=[
                    {
                        "user": {
                            "id": 1,
                            "phone_number": "+1234567890",
                            "firebase_uid": "firebase-uid-123",
                        },
                        "access_token": "jwt-access-token",
                        "refresh_token": "jwt-refresh-token",
                        "firebase_uid": "firebase-uid-123",
                        "phone_number": "+1234567890",
                    }
                ],
            ),
            400: OpenApiResponse(
                description="Invalid ID token or authentication failed"
            ),
        },
        tags=["Firebase Authentication"],
    )
    def post(self, request):
        """
        Authenticate user with Firebase phone authentication.

        Args:
            request: HTTP request with Firebase ID token

        Returns:
            Response with user data and JWT tokens
        """
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            try:
                result = serializer.save()
                logger.info(
                    f"Firebase phone authentication successful for user: {result['phone_number']}"
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Firebase phone authentication failed: {e}")
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PhoneVerificationView(APIView):
    """
    Initiate phone number verification.

    Sends verification code to the provided phone number.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = PhoneNumberVerificationSerializer

    @extend_schema(
        summary="Initiate Phone Verification",
        description="Send verification code to phone number",
        request=PhoneNumberVerificationSerializer,
        responses={
            200: OpenApiResponse(
                description="Verification code sent successfully",
                response=OpenApiTypes.OBJECT,
                examples=[
                    {
                        "success": True,
                        "message": "Verification code sent",
                        "phone_number": "+1234567890",
                    }
                ],
            ),
            400: OpenApiResponse(description="Invalid phone number or failed to send"),
        },
        tags=["Phone Authentication"],
    )
    def post(self, request):
        """
        Send verification code to phone number.

        Args:
            request: HTTP request with phone number

        Returns:
            Response with verification status
        """
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            try:
                result = serializer.save()
                logger.info(
                    f"Phone verification initiated for: {result['phone_number']}"
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Phone verification failed: {e}")
                return Response(
                    {"error": "Failed to send verification code"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SMSOTPAuthView(APIView):
    """
    SMS OTP authentication endpoint.

    Verifies OTP code and authenticates user.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = SMSOTPVerificationSerializer

    @extend_schema(
        summary="SMS OTP Authentication",
        description="Authenticate user with SMS OTP code",
        request=SMSOTPVerificationSerializer,
        responses={
            200: OpenApiResponse(
                description="Authentication successful",
                response=OpenApiTypes.OBJECT,
                examples=[
                    {
                        "user": {
                            "id": 1,
                            "phone_number": "+1234567890",
                            "username": "+1234567890",
                        },
                        "access_token": "jwt-access-token",
                        "refresh_token": "jwt-refresh-token",
                        "phone_number": "+1234567890",
                    }
                ],
            ),
            400: OpenApiResponse(
                description="Invalid OTP code or authentication failed"
            ),
        },
        tags=["Phone Authentication"],
    )
    def post(self, request):
        """
        Authenticate user with SMS OTP code.

        Args:
            request: HTTP request with phone number and OTP code

        Returns:
            Response with user data and JWT tokens
        """
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            try:
                result = serializer.save()
                logger.info(
                    f"SMS OTP authentication successful for: {result['phone_number']}"
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"SMS OTP authentication failed: {e}")
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
