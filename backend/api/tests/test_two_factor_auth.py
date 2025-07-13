"""
Tests for two-factor authentication functionality.
"""

import json
from unittest.mock import MagicMock, patch

import pyotp
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from api.models import BackupCode, TOTPDevice
from api.tests.factories import UserFactory

User = get_user_model()


class TwoFactorAuthTestCase(TestCase):
    """Test two-factor authentication functionality."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = UserFactory(
            email="test@example.com", is_verified=True, two_factor_enabled=False
        )
        self.user.set_password("testpass123")
        self.user.save()

        # URLs
        self.status_url = reverse("api:auth:two_factor:status")
        self.enable_url = reverse("api:auth:two_factor:enable")
        self.qr_code_url = reverse("api:auth:two_factor:qr-code")
        self.verify_url = reverse("api:auth:two_factor:verify")
        self.disable_url = reverse("api:auth:two_factor:disable")
        self.backup_codes_url = reverse("api:auth:two_factor:backup-codes")
        self.complete_login_url = reverse("api:auth:two_factor:complete")

        # Authenticate user
        self.client.force_authenticate(user=self.user)

    def test_2fa_status_not_enabled(self):
        """Test 2FA status when not enabled."""
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["enabled"])
        self.assertEqual(len(response.data["devices"]), 0)
        self.assertEqual(response.data["backup_codes_count"], 0)

    def test_enable_2fa(self):
        """Test enabling 2FA."""
        data = {"device_name": "Test Device"}
        response = self.client.post(self.enable_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("device_id", response.data)
        self.assertIn("message", response.data)

        # Check device was created
        device = TOTPDevice.objects.get(user=self.user)
        self.assertEqual(device.name, "Test Device")
        self.assertFalse(device.confirmed)

    def test_enable_2fa_already_enabled(self):
        """Test enabling 2FA when already enabled."""
        self.user.two_factor_enabled = True
        self.user.save()

        response = self.client.post(self.enable_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_qr_code_generation(self):
        """Test QR code generation."""
        # Create unconfirmed device
        device = TOTPDevice.objects.create(
            user=self.user,
            name="Test Device",
            key=pyotp.random_base32(),
            confirmed=False,
        )

        data = {"device_id": device.id}
        response = self.client.post(self.qr_code_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("qr_code", response.data)
        self.assertIn("secret", response.data)
        self.assertIn("provisioning_uri", response.data)
        self.assertTrue(response.data["qr_code"].startswith("data:image/png;base64,"))

    def test_verify_totp_token(self):
        """Test TOTP token verification."""
        # Create device
        secret = pyotp.random_base32()
        device = TOTPDevice.objects.create(
            user=self.user, name="Test Device", key=secret, confirmed=False
        )

        # Generate valid token
        totp = pyotp.TOTP(secret)
        token = totp.now()

        data = {"device_id": device.id, "token": token}
        response = self.client.post(self.verify_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertIn("backup_codes", response.data)
        self.assertEqual(len(response.data["backup_codes"]), 10)

        # Check device is confirmed and 2FA is enabled
        device.refresh_from_db()
        self.assertTrue(device.confirmed)
        self.user.refresh_from_db()
        self.assertTrue(self.user.two_factor_enabled)

    def test_verify_invalid_token(self):
        """Test TOTP token verification with invalid token."""
        device = TOTPDevice.objects.create(
            user=self.user,
            name="Test Device",
            key=pyotp.random_base32(),
            confirmed=False,
        )

        data = {"device_id": device.id, "token": "000000"}  # Invalid token
        response = self.client.post(self.verify_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disable_2fa(self):
        """Test disabling 2FA."""
        # Enable 2FA first
        self.user.two_factor_enabled = True
        self.user.save()

        # Create confirmed device
        TOTPDevice.objects.create(
            user=self.user,
            name="Test Device",
            key=pyotp.random_base32(),
            confirmed=True,
        )

        # Create backup codes
        BackupCode.objects.create(user=self.user, code="TEST1234")

        data = {"password": "testpass123"}
        response = self.client.post(self.disable_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check 2FA is disabled
        self.user.refresh_from_db()
        self.assertFalse(self.user.two_factor_enabled)
        self.assertEqual(TOTPDevice.objects.filter(user=self.user).count(), 0)
        self.assertEqual(BackupCode.objects.filter(user=self.user).count(), 0)

    def test_disable_2fa_invalid_password(self):
        """Test disabling 2FA with invalid password."""
        self.user.two_factor_enabled = True
        self.user.save()

        data = {"password": "wrongpassword"}
        response = self.client.post(self.disable_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_backup_codes_count(self):
        """Test getting backup codes count."""
        self.user.two_factor_enabled = True
        self.user.save()

        # Create backup codes
        for i in range(5):
            BackupCode.objects.create(user=self.user, code=f"CODE{i:04d}")

        response = self.client.get(self.backup_codes_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 5)

    def test_regenerate_backup_codes(self):
        """Test regenerating backup codes."""
        self.user.two_factor_enabled = True
        self.user.save()

        # Create old backup codes
        BackupCode.objects.create(user=self.user, code="OLD1234")

        data = {"password": "testpass123"}
        response = self.client.post(self.backup_codes_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["backup_codes"]), 10)

        # Check old codes were deleted
        self.assertFalse(BackupCode.objects.filter(code="OLD1234").exists())

    def test_login_with_2fa_enabled(self):
        """Test login flow with 2FA enabled."""
        self.user.two_factor_enabled = True
        self.user.save()

        # Create confirmed device
        secret = pyotp.random_base32()
        TOTPDevice.objects.create(
            user=self.user, name="Test Device", key=secret, confirmed=True
        )

        # First, login with username and password
        self.client.logout()
        login_url = reverse("api:auth:login")
        login_data = {"email": "test@example.com", "password": "testpass123"}
        response = self.client.post(login_url, login_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("requires_2fa"))

        # Complete 2FA login
        totp = pyotp.TOTP(secret)
        token = totp.now()

        complete_data = {"user_id": self.user.id, "token": token}
        response = self.client.post(
            self.complete_login_url, complete_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

    def test_login_with_backup_code(self):
        """Test completing 2FA login with backup code."""
        self.user.two_factor_enabled = True
        self.user.save()

        # Create backup code
        backup_code = BackupCode.objects.create(user=self.user, code="TESTCODE")

        # Set up pending 2FA session
        cache_key = f"2fa_pending_{self.user.id}"
        cache.set(
            cache_key,
            {
                "user_id": self.user.id,
                "ip_address": "127.0.0.1",
                "timestamp": "2025-01-10T12:00:00Z",
            },
            300,
        )

        complete_data = {"user_id": self.user.id, "backup_code": "TESTCODE"}
        response = self.client.post(
            self.complete_login_url, complete_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

        # Check backup code was marked as used
        backup_code.refresh_from_db()
        self.assertTrue(backup_code.used)
        self.assertIsNotNone(backup_code.used_at)

    def test_complete_2fa_login_expired_session(self):
        """Test completing 2FA login with expired session."""
        complete_data = {"user_id": self.user.id, "token": "123456"}
        response = self.client.post(
            self.complete_login_url, complete_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data["error"])

    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
        super().tearDown()
