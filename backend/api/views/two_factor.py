"""
Views for two-factor authentication functionality.
"""

import logging

from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (OpenApiExample, OpenApiParameter,
                                   extend_schema)
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import BackupCode, TOTPDevice
from api.serializers.two_factor_serializers import (
    BackupCodeSerializer, DisableTwoFactorSerializer,
    EnableTwoFactorSerializer, QRCodeSerializer,
    RegenerateBackupCodesSerializer, TOTPDeviceSerializer,
    VerifyTOTPSerializer)

User = get_user_model()
logger = logging.getLogger(__name__)


class TwoFactorStatusView(APIView):
    """
    Get the current 2FA status for the authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get 2FA Status",
        description="Get the current two-factor authentication status for the authenticated user.",
        responses={
            200: {
                "description": "2FA status retrieved successfully",
                "examples": {
                    "enabled": {
                        "value": {
                            "enabled": True,
                            "devices": [
                                {
                                    "id": 1,
                                    "name": "Authenticator App",
                                    "confirmed": True,
                                    "created_at": "2025-01-10T12:00:00Z",
                                }
                            ],
                            "backup_codes_count": 8,
                        }
                    }
                },
            }
        },
        tags=["Two-Factor Authentication"],
    )
    def get(self, request):
        """Get 2FA status."""
        user = request.user
        devices = TOTPDevice.objects.filter(user=user, confirmed=True)
        backup_codes_count = BackupCode.objects.filter(user=user, used=False).count()

        return Response(
            {
                "enabled": user.two_factor_enabled,
                "devices": TOTPDeviceSerializer(devices, many=True).data,
                "backup_codes_count": backup_codes_count,
            }
        )


class EnableTwoFactorView(generics.CreateAPIView):
    """
    Enable two-factor authentication for the user.
    """

    serializer_class = EnableTwoFactorSerializer
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Enable 2FA",
        description="Start the process of enabling two-factor authentication by creating a TOTP device.",
        request=EnableTwoFactorSerializer,
        responses={
            201: {
                "description": "TOTP device created successfully",
                "examples": {
                    "success": {
                        "value": {
                            "device_id": 1,
                            "message": "TOTP device created. Please scan the QR code to complete setup.",
                        }
                    }
                },
            },
            400: {"description": "2FA already enabled"},
        },
        tags=["Two-Factor Authentication"],
    )
    def post(self, request, *args, **kwargs):
        """Create a new TOTP device."""
        if request.user.two_factor_enabled:
            return Response(
                {"error": "Two-factor authentication is already enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device = serializer.save()

        return Response(
            {
                "device_id": device.id,
                "message": "TOTP device created. Please scan the QR code to complete setup.",
            },
            status=status.HTTP_201_CREATED,
        )


class QRCodeView(APIView):
    """
    Generate QR code for TOTP device setup.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get QR Code",
        description="Generate a QR code for setting up a TOTP device with an authenticator app.",
        request=QRCodeSerializer,
        responses={
            200: {
                "description": "QR code generated successfully",
                "examples": {
                    "success": {
                        "value": {
                            "qr_code": "data:image/png;base64,iVBORw0KGgo...",
                            "secret": "JBSWY3DPEHPK3PXP",
                            "provisioning_uri": "otpauth://totp/Nutrition%20AI:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Nutrition%20AI",
                        }
                    }
                },
            }
        },
        tags=["Two-Factor Authentication"],
    )
    def post(self, request):
        """Generate QR code."""
        serializer = QRCodeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        qr_data = serializer.get_qr_code()
        return Response(qr_data)


class VerifyTOTPView(APIView):
    """
    Verify TOTP token and confirm device setup.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Verify TOTP Token",
        description="Verify a TOTP token to confirm device setup and enable 2FA.",
        request=VerifyTOTPSerializer,
        responses={
            200: {
                "description": "2FA enabled successfully",
                "examples": {
                    "success": {
                        "value": {
                            "message": "Two-factor authentication enabled successfully.",
                            "backup_codes": [
                                "ABC12345",
                                "DEF67890",
                                "GHI13579",
                                "JKL24680",
                                "MNO36912",
                                "PQR48135",
                                "STU60357",
                                "VWX72468",
                                "YZA84690",
                                "BCD96812",
                            ],
                        }
                    }
                },
            }
        },
        tags=["Two-Factor Authentication"],
    )
    def post(self, request):
        """Verify TOTP token."""
        serializer = VerifyTOTPSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        device = serializer.save()

        # Get the backup codes that were generated
        backup_codes = BackupCode.objects.filter(
            user=request.user, used=False
        ).values_list("code", flat=True)

        return Response(
            {
                "message": "Two-factor authentication enabled successfully.",
                "backup_codes": list(backup_codes),
            }
        )


class DisableTwoFactorView(APIView):
    """
    Disable two-factor authentication.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Disable 2FA",
        description="Disable two-factor authentication for the user. Requires password confirmation.",
        request=DisableTwoFactorSerializer,
        responses={
            200: {
                "description": "2FA disabled successfully",
                "examples": {
                    "success": {
                        "value": {
                            "message": "Two-factor authentication disabled successfully."
                        }
                    }
                },
            }
        },
        tags=["Two-Factor Authentication"],
    )
    def post(self, request):
        """Disable 2FA."""
        if not request.user.two_factor_enabled:
            return Response(
                {"error": "Two-factor authentication is not enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DisableTwoFactorSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Two-factor authentication disabled successfully."})


class BackupCodesView(APIView):
    """
    View and regenerate backup codes.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get Backup Codes Count",
        description="Get the count of remaining backup codes.",
        responses={
            200: {
                "description": "Backup codes count retrieved",
                "examples": {
                    "success": {
                        "value": {
                            "count": 8,
                            "message": "You have 8 backup codes remaining.",
                        }
                    }
                },
            }
        },
        tags=["Two-Factor Authentication"],
    )
    def get(self, request):
        """Get backup codes count."""
        if not request.user.two_factor_enabled:
            return Response(
                {"error": "Two-factor authentication is not enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        count = BackupCode.objects.filter(user=request.user, used=False).count()
        return Response(
            {"count": count, "message": f"You have {count} backup codes remaining."}
        )

    @extend_schema(
        summary="Regenerate Backup Codes",
        description="Generate new backup codes. Requires password confirmation.",
        request=RegenerateBackupCodesSerializer,
        responses={
            200: {
                "description": "Backup codes regenerated successfully",
                "examples": {
                    "success": {
                        "value": {
                            "message": "Backup codes regenerated successfully.",
                            "backup_codes": [
                                "ABC12345",
                                "DEF67890",
                                "GHI13579",
                                "JKL24680",
                                "MNO36912",
                                "PQR48135",
                                "STU60357",
                                "VWX72468",
                                "YZA84690",
                                "BCD96812",
                            ],
                        }
                    }
                },
            }
        },
        tags=["Two-Factor Authentication"],
    )
    def post(self, request):
        """Regenerate backup codes."""
        if not request.user.two_factor_enabled:
            return Response(
                {"error": "Two-factor authentication is not enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegenerateBackupCodesSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        codes = serializer.save()

        return Response(
            {"message": "Backup codes regenerated successfully.", "backup_codes": codes}
        )
