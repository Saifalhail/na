"""
Tests for security utilities and validators.
"""

import io
import os
import tempfile
from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import (InMemoryUploadedFile,
                                            SimpleUploadedFile)
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response

from api.security.api_keys import APIKeyManager
from api.security.validators import (ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE,
                                     SanitizedCharField, SanitizedEmailField,
                                     SecureFileUploadSerializer,
                                     SecurePasswordField, add_rel_nofollow,
                                     sanitize_html, validate_email,
                                     validate_image_upload, validate_input,
                                     validate_password_strength,
                                     validate_sql_injection, validate_xss)
from api.tests.factories import UserFactory


class ValidateInputDecoratorTestCase(TestCase):
    """Test cases for validate_input decorator."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_validate_input_post_valid_data(self):
        """Test decorator with valid POST data."""

        class TestSerializer(serializers.Serializer):
            name = serializers.CharField()
            email = serializers.EmailField()

        @validate_input(TestSerializer)
        def test_view(request):
            return Response({"validated": request.validated_data})

        request = self.factory.post("/", {"name": "John", "email": "john@example.com"})
        request.data = {"name": "John", "email": "john@example.com"}

        response = test_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.validated_data["name"], "John")
        self.assertEqual(request.validated_data["email"], "john@example.com")

    def test_validate_input_post_invalid_data(self):
        """Test decorator with invalid POST data."""

        class TestSerializer(serializers.Serializer):
            name = serializers.CharField(required=True)
            email = serializers.EmailField()

        @validate_input(TestSerializer)
        def test_view(request):
            return Response({"validated": request.validated_data})

        request = self.factory.post("/", {"email": "invalid-email"})
        request.data = {"email": "invalid-email"}

        response = test_view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.data)

    def test_validate_input_get_query_params(self):
        """Test decorator with GET query parameters."""

        class TestSerializer(serializers.Serializer):
            page = serializers.IntegerField(default=1)
            limit = serializers.IntegerField(default=10)

        @validate_input(TestSerializer)
        def test_view(request):
            return Response({"validated": request.validated_data})

        request = self.factory.get("/?page=2&limit=20")
        request.query_params = {"page": "2", "limit": "20"}

        response = test_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.validated_data["page"], 2)
        self.assertEqual(request.validated_data["limit"], 20)


class SanitizeHtmlTestCase(TestCase):
    """Test cases for HTML sanitization."""

    def test_sanitize_html_basic_tags(self):
        """Test sanitization of basic allowed tags."""
        html = "<p>Hello <strong>world</strong>!</p>"
        result = sanitize_html(html)
        self.assertEqual(result, "<p>Hello <strong>world</strong>!</p>")

    def test_sanitize_html_dangerous_tags(self):
        """Test removal of dangerous tags."""
        html = '<p>Hello</p><script>alert("xss")</script><p>World</p>'
        result = sanitize_html(html)
        self.assertEqual(result, '<p>Hello</p>alert("xss")<p>World</p>')

    def test_sanitize_html_custom_allowed_tags(self):
        """Test sanitization with custom allowed tags."""
        html = "<div><p>Hello</p><span>World</span></div>"
        result = sanitize_html(html, allowed_tags=["div", "span"])
        self.assertEqual(result, "<div>Hello<span>World</span></div>")

    def test_sanitize_html_links_with_rel_nofollow(self):
        """Test link sanitization adds rel nofollow."""
        html = '<a href="http://example.com">Link</a>'
        result = sanitize_html(html)

        self.assertIn('rel="nofollow noopener"', result)
        self.assertIn('target="_blank"', result)
        self.assertIn('href="http://example.com"', result)

    def test_add_rel_nofollow_callback(self):
        """Test add_rel_nofollow callback function."""
        attrs = {}
        result = add_rel_nofollow(attrs, new=True)

        self.assertEqual(result[(None, "rel")], "nofollow noopener")
        self.assertEqual(result[(None, "target")], "_blank")


class ValidateImageUploadTestCase(TestCase):
    """Test cases for image upload validation."""

    def test_validate_image_upload_none(self):
        """Test validation with None image."""
        result = validate_image_upload(None)
        self.assertIsNone(result)

    def test_validate_image_upload_too_large(self):
        """Test validation with oversized image."""
        # Create a mock file that's too large
        mock_file = Mock(spec=InMemoryUploadedFile)
        mock_file.size = MAX_IMAGE_SIZE + 1000

        with self.assertRaises(ValidationError) as cm:
            validate_image_upload(mock_file)

        self.assertIn("exceeds maximum allowed size", str(cm.exception))

    @patch("api.security.validators.magic")
    def test_validate_image_upload_invalid_mime_type(self, mock_magic):
        """Test validation with invalid MIME type."""
        mock_file = Mock(spec=InMemoryUploadedFile)
        mock_file.size = 1000
        mock_file.read.return_value = b"fake_content"
        mock_file.seek = Mock()
        mock_file.name = "test.jpg"

        mock_magic.from_buffer.return_value = "text/plain"

        with self.assertRaises(ValidationError) as cm:
            validate_image_upload(mock_file)

        self.assertIn("Invalid file type", str(cm.exception))

    @patch("api.security.validators.magic")
    def test_validate_image_upload_mismatched_extension(self, mock_magic):
        """Test validation with mismatched file extension."""
        mock_file = Mock(spec=InMemoryUploadedFile)
        mock_file.size = 1000
        mock_file.read.return_value = b"fake_content"
        mock_file.seek = Mock()
        mock_file.name = "test.txt"  # Wrong extension

        mock_magic.from_buffer.return_value = "image/jpeg"

        with self.assertRaises(ValidationError) as cm:
            validate_image_upload(mock_file)

        self.assertIn("File extension does not match", str(cm.exception))

    @patch("api.security.validators.Image")
    @patch("api.security.validators.magic")
    def test_validate_image_upload_oversized_dimensions(self, mock_magic, mock_image):
        """Test validation with oversized image dimensions."""
        mock_file = Mock(spec=InMemoryUploadedFile)
        mock_file.size = 1000
        mock_file.read.return_value = b"fake_content"
        mock_file.seek = Mock()
        mock_file.name = "test.jpg"

        mock_magic.from_buffer.return_value = "image/jpeg"

        # Mock PIL Image with oversized dimensions
        mock_img = Mock()
        mock_img.width = 5000
        mock_img.height = 5000
        mock_image.open.return_value = mock_img

        with self.assertRaises(ValidationError) as cm:
            validate_image_upload(mock_file)

        self.assertIn("dimensions exceed maximum", str(cm.exception))

    @patch("api.security.validators.Image")
    @patch("api.security.validators.magic")
    def test_validate_image_upload_valid_image(self, mock_magic, mock_image):
        """Test validation with valid image."""
        mock_file = Mock(spec=InMemoryUploadedFile)
        mock_file.size = 1000
        mock_file.read.return_value = b"fake_content"
        mock_file.seek = Mock()
        mock_file.name = "test.jpg"

        mock_magic.from_buffer.return_value = "image/jpeg"

        # Mock valid PIL Image
        mock_img = Mock()
        mock_img.width = 1024
        mock_img.height = 768
        mock_img._getexif.return_value = None
        mock_image.open.return_value = mock_img

        # Should not raise exception
        result = validate_image_upload(mock_file)
        self.assertIsNone(result)


class ValidateEmailTestCase(TestCase):
    """Test cases for email validation."""

    def test_validate_email_valid_addresses(self):
        """Test validation with valid email addresses."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "firstname+lastname@company.org",
            "test123@test-domain.net",
        ]

        for email in valid_emails:
            with self.subTest(email=email):
                result = validate_email(email)
                self.assertTrue(result)

    def test_validate_email_invalid_format(self):
        """Test validation with invalid email formats."""
        invalid_emails = [
            "invalid-email",
            "@domain.com",
            "user@",
            "user@domain",
            "user space@domain.com",
            "user..name@domain.com",
        ]

        for email in invalid_emails:
            with self.subTest(email=email):
                with self.assertRaises(ValidationError):
                    validate_email(email)

    def test_validate_email_disposable_domains(self):
        """Test validation rejects disposable email domains."""
        disposable_emails = [
            "test@tempmail.com",
            "user@10minutemail.com",
            "fake@mailinator.com",
        ]

        for email in disposable_emails:
            with self.subTest(email=email):
                with self.assertRaises(ValidationError) as cm:
                    validate_email(email)
                self.assertIn("Disposable email", str(cm.exception))


class ValidatePasswordStrengthTestCase(TestCase):
    """Test cases for password strength validation."""

    def test_validate_password_strength_valid_passwords(self):
        """Test validation with strong passwords."""
        valid_passwords = [
            "MyStr0ngP@ssw0rd!",
            "C0mpl3x!ty",
            "S3cur3P@ss",
            "Anoth3r$trongP@ss",
        ]

        for password in valid_passwords:
            with self.subTest(password=password):
                result = validate_password_strength(password)
                self.assertTrue(result)

    def test_validate_password_strength_too_short(self):
        """Test validation with too short password."""
        with self.assertRaises(ValidationError) as cm:
            validate_password_strength("Sh0rt!")

        self.assertIn("at least 8 characters", str(cm.exception))

    def test_validate_password_strength_missing_uppercase(self):
        """Test validation with missing uppercase letter."""
        with self.assertRaises(ValidationError) as cm:
            validate_password_strength("lowercase123!")

        self.assertIn("uppercase letter", str(cm.exception))

    def test_validate_password_strength_missing_lowercase(self):
        """Test validation with missing lowercase letter."""
        with self.assertRaises(ValidationError) as cm:
            validate_password_strength("UPPERCASE123!")

        self.assertIn("lowercase letter", str(cm.exception))

    def test_validate_password_strength_missing_number(self):
        """Test validation with missing number."""
        with self.assertRaises(ValidationError) as cm:
            validate_password_strength("NoNumbers!")

        self.assertIn("at least one number", str(cm.exception))

    def test_validate_password_strength_missing_special_char(self):
        """Test validation with missing special character."""
        with self.assertRaises(ValidationError) as cm:
            validate_password_strength("NoSpecialChar1")

        self.assertIn("special character", str(cm.exception))

    def test_validate_password_strength_common_password(self):
        """Test validation rejects common passwords."""
        with self.assertRaises(ValidationError) as cm:
            validate_password_strength("password123")

        self.assertIn("too common", str(cm.exception))


class ValidateSqlInjectionTestCase(TestCase):
    """Test cases for SQL injection validation."""

    def test_validate_sql_injection_safe_values(self):
        """Test validation with safe values."""
        safe_values = [
            "Normal text",
            "Email address: user@domain.com",
            "Number: 12345",
            "Special chars: !@#$%^&*()",
        ]

        for value in safe_values:
            with self.subTest(value=value):
                result = validate_sql_injection(value)
                self.assertTrue(result)

    def test_validate_sql_injection_dangerous_patterns(self):
        """Test validation detects SQL injection patterns."""
        dangerous_values = [
            "1' OR '1'='1",
            "admin'; DROP TABLE users; --",
            "1 UNION SELECT * FROM users",
            "' OR 1=1 --",
            "test/* comment */",
            "value; DELETE FROM table",
        ]

        for value in dangerous_values:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    validate_sql_injection(value)


class ValidateXssTestCase(TestCase):
    """Test cases for XSS validation."""

    def test_validate_xss_safe_values(self):
        """Test validation with safe values."""
        safe_values = [
            "Normal text content",
            "Text with <brackets> but not HTML",
            "Email: user@domain.com",
            "URL: https://example.com",
        ]

        for value in safe_values:
            with self.subTest(value=value):
                result = validate_xss(value)
                self.assertTrue(result)

    def test_validate_xss_dangerous_patterns(self):
        """Test validation detects XSS patterns."""
        dangerous_values = [
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            '<img onclick="alert()" src="x">',
            '<iframe src="evil.com"></iframe>',
            '<object data="evil.swf"></object>',
            '<link rel="stylesheet" href="evil.css">',
            "eval(malicious_code)",
            'expression(alert("xss"))',
        ]

        for value in dangerous_values:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    validate_xss(value)


class SecureFieldsTestCase(TestCase):
    """Test cases for secure serializer fields."""

    def test_sanitized_char_field_clean_input(self):
        """Test SanitizedCharField with clean input."""
        field = SanitizedCharField()
        result = field.to_internal_value("Clean text input")
        self.assertEqual(result, "Clean text input")

    def test_sanitized_char_field_html_removal(self):
        """Test SanitizedCharField removes HTML tags."""
        field = SanitizedCharField()
        result = field.to_internal_value("<p>Text with <strong>HTML</strong></p>")
        self.assertEqual(result, "Text with HTML")

    def test_sanitized_char_field_sql_injection_detection(self):
        """Test SanitizedCharField detects SQL injection."""
        field = SanitizedCharField()

        with self.assertRaises(ValidationError):
            field.to_internal_value("'; DROP TABLE users; --")

    def test_sanitized_char_field_xss_detection(self):
        """Test SanitizedCharField detects XSS."""
        field = SanitizedCharField()

        with self.assertRaises(ValidationError):
            field.to_internal_value('<script>alert("xss")</script>')

    def test_sanitized_email_field_valid_email(self):
        """Test SanitizedEmailField with valid email."""
        field = SanitizedEmailField()
        result = field.to_internal_value("User@EXAMPLE.COM")
        self.assertEqual(result, "user@example.com")  # Normalized to lowercase

    def test_sanitized_email_field_invalid_email(self):
        """Test SanitizedEmailField with invalid email."""
        field = SanitizedEmailField()

        with self.assertRaises(ValidationError):
            field.to_internal_value("invalid-email-format")

    def test_sanitized_email_field_disposable_email(self):
        """Test SanitizedEmailField rejects disposable emails."""
        field = SanitizedEmailField()

        with self.assertRaises(ValidationError):
            field.to_internal_value("test@tempmail.com")

    def test_secure_password_field_strong_password(self):
        """Test SecurePasswordField with strong password."""
        field = SecurePasswordField()
        result = field.to_internal_value("MyStr0ngP@ssw0rd!")
        self.assertEqual(result, "MyStr0ngP@ssw0rd!")

    def test_secure_password_field_weak_password(self):
        """Test SecurePasswordField rejects weak password."""
        field = SecurePasswordField()

        with self.assertRaises(ValidationError):
            field.to_internal_value("weak")

    def test_secure_password_field_properties(self):
        """Test SecurePasswordField initialization properties."""
        field = SecurePasswordField()

        self.assertTrue(field.write_only)
        self.assertEqual(field.style["input_type"], "password")


class SecureFileUploadSerializerTestCase(TestCase):
    """Test cases for SecureFileUploadSerializer."""

    @patch("api.security.validators.validate_image_upload")
    def test_secure_file_upload_serializer_valid_file(self, mock_validate):
        """Test serializer with valid file."""
        mock_validate.return_value = None

        mock_file = Mock()
        serializer = SecureFileUploadSerializer(data={"file": mock_file})

        self.assertTrue(serializer.is_valid())
        mock_validate.assert_called_once_with(mock_file)

    @patch("api.security.validators.validate_image_upload")
    def test_secure_file_upload_serializer_invalid_file(self, mock_validate):
        """Test serializer with invalid file."""
        mock_validate.side_effect = ValidationError("Invalid file")

        mock_file = Mock()
        serializer = SecureFileUploadSerializer(data={"file": mock_file})

        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)


class APIKeyManagerTestCase(TestCase):
    """Test cases for APIKeyManager."""

    def setUp(self):
        cache.clear()
        self.user = UserFactory()

    def tearDown(self):
        cache.clear()

    @patch("api.security.api_keys.Fernet")
    def test_get_cipher_with_settings_key(self, mock_fernet_class):
        """Test cipher creation with key from settings."""
        mock_cipher = Mock()
        mock_fernet_class.return_value = mock_cipher

        with override_settings(API_KEY_ENCRYPTION_KEY="test-key-value"):
            APIKeyManager._cipher_suite = None  # Reset
            cipher = APIKeyManager._get_cipher()

            self.assertEqual(cipher, mock_cipher)
            mock_fernet_class.assert_called_once_with(b"test-key-value")

    @patch("api.security.api_keys.Fernet")
    def test_get_cipher_generate_new_key(self, mock_fernet_class):
        """Test cipher creation with generated key."""
        mock_cipher = Mock()
        mock_fernet_class.return_value = mock_cipher
        mock_fernet_class.generate_key.return_value = b"generated-key"

        APIKeyManager._cipher_suite = None  # Reset

        with patch("api.security.api_keys.logger") as mock_logger:
            cipher = APIKeyManager._get_cipher()

            self.assertEqual(cipher, mock_cipher)
            mock_logger.warning.assert_called_once()
            self.assertIn(
                "Generated temporary key", mock_logger.warning.call_args[0][0]
            )

    @patch("api.security.api_keys.logger")
    def test_store_api_key(self, mock_logger):
        """Test storing an API key."""
        with patch.object(APIKeyManager, "_get_cipher") as mock_get_cipher:
            mock_cipher = Mock()
            mock_cipher.encrypt.return_value = b"encrypted_key"
            mock_get_cipher.return_value = mock_cipher

            result = APIKeyManager.store_api_key(
                "test_service", "test_api_key", {"environment": "test"}
            )

            self.assertEqual(result["service"], "test_service")
            self.assertIn("key_reference", result)
            self.assertIn("stored_at", result)

            # Check cache
            cache_data = cache.get("api_key_test_service")
            self.assertIsNotNone(cache_data)
            self.assertEqual(cache_data["encrypted_key"], b"encrypted_key")

            mock_logger.info.assert_called_once()

    def test_get_api_key_from_cache(self):
        """Test retrieving API key from cache."""
        with patch.object(APIKeyManager, "_get_cipher") as mock_get_cipher:
            mock_cipher = Mock()
            mock_cipher.decrypt.return_value = b"decrypted_key"
            mock_get_cipher.return_value = mock_cipher

            # Store key in cache
            cache.set(
                "api_key_test_service",
                {
                    "encrypted_key": b"encrypted_key",
                    "key_hash": "test_hash",
                    "stored_at": timezone.now().isoformat(),
                    "metadata": {},
                },
            )

            result = APIKeyManager.get_api_key("test_service")

            self.assertEqual(result, "decrypted_key")

    @patch.dict(os.environ, {"TEST_SERVICE_API_KEY": "env_api_key"})
    def test_get_api_key_from_environment(self):
        """Test retrieving API key from environment variable."""
        with patch.object(APIKeyManager, "store_api_key") as mock_store:
            result = APIKeyManager.get_api_key("test_service")

            self.assertEqual(result, "env_api_key")
            mock_store.assert_called_once_with(
                "test_service", "env_api_key", {"source": "environment"}
            )

    def test_get_api_key_not_found(self):
        """Test retrieving non-existent API key."""
        with patch("api.security.api_keys.logger") as mock_logger:
            result = APIKeyManager.get_api_key("nonexistent_service")

            self.assertIsNone(result)
            mock_logger.error.assert_called_once()

    def test_rotate_api_key(self):
        """Test API key rotation."""
        with patch.object(
            APIKeyManager, "get_api_key_info"
        ) as mock_get_info, patch.object(
            APIKeyManager, "store_api_key"
        ) as mock_store, patch(
            "api.security.api_keys.logger"
        ) as mock_logger:

            mock_get_info.return_value = {"key_hash": "old_hash"}
            mock_store.return_value = {"key_reference": "new_hash"}

            result = APIKeyManager.rotate_api_key("test_service", "new_api_key")

            self.assertEqual(result["key_reference"], "new_hash")
            mock_logger.info.assert_called_once()

    def test_delete_api_key_exists(self):
        """Test deleting existing API key."""
        cache.set("api_key_test_service", {"test": "data"})

        with patch("api.security.api_keys.logger") as mock_logger:
            result = APIKeyManager.delete_api_key("test_service")

            self.assertTrue(result)
            self.assertIsNone(cache.get("api_key_test_service"))
            mock_logger.info.assert_called_once()

    def test_delete_api_key_not_exists(self):
        """Test deleting non-existent API key."""
        result = APIKeyManager.delete_api_key("nonexistent_service")
        self.assertFalse(result)

    def test_get_api_key_info(self):
        """Test getting API key information."""
        stored_time = timezone.now() - timedelta(days=10)
        cache.set(
            "api_key_test_service",
            {
                "key_hash": "test_hash",
                "stored_at": stored_time.isoformat(),
                "metadata": {"test": "data"},
            },
        )

        result = APIKeyManager.get_api_key_info("test_service")

        self.assertEqual(result["service"], "test_service")
        self.assertEqual(result["key_hash"], "test_hash")
        self.assertEqual(result["age_days"], 10)
        self.assertFalse(result["needs_rotation"])
        self.assertEqual(result["metadata"], {"test": "data"})

    def test_should_rotate_key_old(self):
        """Test key rotation check for old key."""
        old_time = timezone.now() - timedelta(days=100)
        result = APIKeyManager._should_rotate_key(old_time)
        self.assertTrue(result)

    def test_should_rotate_key_recent(self):
        """Test key rotation check for recent key."""
        recent_time = timezone.now() - timedelta(days=30)
        result = APIKeyManager._should_rotate_key(recent_time)
        self.assertFalse(result)

    def test_generate_internal_api_key(self):
        """Test generating internal API key for user."""
        with patch("api.security.api_keys.logger") as mock_logger:
            result = APIKeyManager.generate_internal_api_key(self.user, "mobile_app")

            self.assertIn("api_key", result)
            self.assertIn("key_hash", result)
            self.assertEqual(result["purpose"], "mobile_app")
            self.assertEqual(result["expires_in"], 30 * 24 * 60 * 60)

            # Check cache
            cache_key = f"user_api_key_{self.user.id}_mobile_app"
            cache_data = cache.get(cache_key)
            self.assertIsNotNone(cache_data)
            self.assertEqual(cache_data["user_id"], self.user.id)

            mock_logger.info.assert_called_once()

    def test_validate_internal_api_key_valid(self):
        """Test validating valid internal API key."""
        # First generate a key
        key_info = APIKeyManager.generate_internal_api_key(self.user)
        api_key = key_info["api_key"]

        result = APIKeyManager.validate_internal_api_key(api_key)

        self.assertIsNotNone(result)
        self.assertEqual(result["user_id"], self.user.id)
        self.assertEqual(result["user"], self.user)
        self.assertEqual(result["purpose"], "api_access")

    def test_validate_internal_api_key_invalid(self):
        """Test validating invalid internal API key."""
        result = APIKeyManager.validate_internal_api_key("invalid_key")
        self.assertIsNone(result)
