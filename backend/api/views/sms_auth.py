"""
SMS OTP authentication views.
"""

import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import SMSOTPCode
from api.serializers.firebase_serializers import SMSOTPVerificationSerializer
from api.services.firebase_service import firebase_service
from api.services.sms_service import sms_service

logger = logging.getLogger(__name__)


class SendSMSOTPView(APIView):
    """
    Send SMS OTP code for phone number verification.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Send SMS OTP Code",
        description="Send a 6-digit OTP code via SMS for phone number verification",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "phone_number": {
                        "type": "string",
                        "description": "Phone number in international format (e.g., +1234567890)",
                    }
                },
                "required": ["phone_number"],
            }
        },
        responses={
            200: OpenApiResponse(
                description="OTP code sent successfully",
                response=OpenApiTypes.OBJECT,
                examples=[
                    {
                        "success": True,
                        "message": "OTP code sent successfully",
                        "phone_number": "+1234567890",
                        "expires_in": 600,  # 10 minutes in seconds
                    }
                ],
            ),
            400: OpenApiResponse(
                description="Invalid phone number or rate limit exceeded"
            ),
            429: OpenApiResponse(description="Rate limit exceeded"),
        },
        tags=["SMS Authentication"],
    )
    def post(self, request):
        """
        Send OTP code to phone number.

        Args:
            request: HTTP request with phone number

        Returns:
            Response with sending status
        """
        phone_number = request.data.get("phone_number")
        if not phone_number:
            return Response(
                {"error": "Phone number is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Format phone number
        formatted_phone = firebase_service.format_phone_number(phone_number)
        if not formatted_phone:
            return Response(
                {"error": "Invalid phone number format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get client IP
        client_ip = self._get_client_ip(request)

        try:
            # Create OTP code
            otp_obj = SMSOTPCode.create_otp(formatted_phone, client_ip)

            # Send SMS
            sms_result = sms_service.send_otp_code(
                formatted_phone, otp_obj.otp_code, client_ip
            )

            if sms_result["success"]:
                logger.info(f"SMS OTP sent successfully to {formatted_phone}")
                return Response(
                    {
                        "success": True,
                        "message": "OTP code sent successfully",
                        "phone_number": formatted_phone,
                        "expires_in": 600,  # 10 minutes
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                # Delete OTP if SMS failed
                otp_obj.delete()

                # Check if it's a rate limit error
                if "rate limit" in sms_result.get("error", "").lower():
                    return Response(
                        {
                            "error": sms_result["error"],
                            "rate_limit": sms_result.get("rate_limit"),
                        },
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                    )

                return Response(
                    {"error": sms_result.get("error", "Failed to send SMS")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            logger.error(f"Error sending SMS OTP to {formatted_phone}: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class VerifySMSOTPView(APIView):
    """
    Verify SMS OTP code and authenticate user.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = SMSOTPVerificationSerializer

    @extend_schema(
        summary="Verify SMS OTP Code",
        description="Verify OTP code and authenticate user",
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
        tags=["SMS Authentication"],
    )
    def post(self, request):
        """
        Verify OTP code and authenticate user.

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
                    f"SMS OTP verification successful for: {result['phone_number']}"
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"SMS OTP verification failed: {e}")
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
