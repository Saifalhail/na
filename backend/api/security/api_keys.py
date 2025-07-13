"""
API Key management for external services.
"""

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


class APIKeyManager:
    """
    Secure management of API keys for external services.
    """

    # Key rotation interval (days)
    KEY_ROTATION_INTERVAL = 90

    # Encryption key for storing API keys
    _cipher_suite = None

    @classmethod
    def _get_cipher(cls):
        """Get or create cipher for encryption."""
        if cls._cipher_suite is None:
            # Get or generate encryption key
            encryption_key = getattr(settings, "API_KEY_ENCRYPTION_KEY", None)
            if not encryption_key:
                # Generate a new key (store this securely in production!)
                encryption_key = Fernet.generate_key()
                logger.warning(
                    "No API_KEY_ENCRYPTION_KEY found in settings. "
                    "Generated temporary key - this should be set in production!"
                )
            else:
                encryption_key = (
                    encryption_key.encode()
                    if isinstance(encryption_key, str)
                    else encryption_key
                )

            cls._cipher_suite = Fernet(encryption_key)

        return cls._cipher_suite

    @classmethod
    def store_api_key(cls, service_name, api_key, metadata=None):
        """
        Securely store an API key.

        Args:
            service_name: Name of the service (e.g., 'gemini', 'sendgrid')
            api_key: The API key to store
            metadata: Additional metadata about the key

        Returns:
            dict: Storage confirmation with key reference
        """
        # Encrypt the API key
        cipher = cls._get_cipher()
        encrypted_key = cipher.encrypt(api_key.encode())

        # Generate key reference (hash)
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]

        # Store in cache with metadata
        cache_key = f"api_key_{service_name}"
        cache_data = {
            "encrypted_key": encrypted_key,
            "key_hash": key_hash,
            "stored_at": timezone.now().isoformat(),
            "metadata": metadata or {},
        }

        # Store with no expiration (manage rotation separately)
        cache.set(cache_key, cache_data, timeout=None)

        # Log key storage (without exposing the key)
        logger.info(
            f"API key stored for service: {service_name}",
            extra={
                "service": service_name,
                "key_hash": key_hash,
                "metadata": metadata,
            },
        )

        return {
            "service": service_name,
            "key_reference": key_hash,
            "stored_at": cache_data["stored_at"],
        }

    @classmethod
    def get_api_key(cls, service_name):
        """
        Retrieve and decrypt an API key.

        Args:
            service_name: Name of the service

        Returns:
            str: Decrypted API key or None if not found
        """
        cache_key = f"api_key_{service_name}"
        cache_data = cache.get(cache_key)

        if not cache_data:
            # Try to load from environment variable as fallback
            env_var_name = f"{service_name.upper()}_API_KEY"
            api_key = os.getenv(env_var_name)

            if api_key:
                # Store it in cache for future use
                cls.store_api_key(service_name, api_key, {"source": "environment"})
                return api_key

            logger.error(f"API key not found for service: {service_name}")
            return None

        # Decrypt the key
        try:
            cipher = cls._get_cipher()
            encrypted_key = cache_data["encrypted_key"]
            decrypted_key = cipher.decrypt(encrypted_key).decode()

            # Check if key needs rotation
            stored_at = datetime.fromisoformat(cache_data["stored_at"])
            if cls._should_rotate_key(stored_at):
                logger.warning(
                    f"API key for {service_name} should be rotated "
                    f"(stored {(timezone.now() - stored_at).days} days ago)"
                )

            return decrypted_key

        except Exception as e:
            logger.error(f"Error decrypting API key for {service_name}: {str(e)}")
            return None

    @classmethod
    def rotate_api_key(cls, service_name, new_api_key):
        """
        Rotate an API key for a service.

        Args:
            service_name: Name of the service
            new_api_key: New API key

        Returns:
            dict: Rotation confirmation
        """
        # Get old key info for logging
        old_key_info = cls.get_api_key_info(service_name)

        # Store new key
        result = cls.store_api_key(
            service_name,
            new_api_key,
            {
                "rotated": True,
                "previous_key_hash": (
                    old_key_info.get("key_hash") if old_key_info else None
                ),
                "rotation_date": timezone.now().isoformat(),
            },
        )

        logger.info(
            f"API key rotated for service: {service_name}",
            extra={
                "service": service_name,
                "old_key_hash": old_key_info.get("key_hash") if old_key_info else None,
                "new_key_hash": result["key_reference"],
            },
        )

        return result

    @classmethod
    def delete_api_key(cls, service_name):
        """
        Delete an API key from storage.

        Args:
            service_name: Name of the service

        Returns:
            bool: True if deleted, False if not found
        """
        cache_key = f"api_key_{service_name}"

        if cache.get(cache_key):
            cache.delete(cache_key)
            logger.info(f"API key deleted for service: {service_name}")
            return True

        return False

    @classmethod
    def get_api_key_info(cls, service_name):
        """
        Get information about a stored API key without decrypting it.

        Args:
            service_name: Name of the service

        Returns:
            dict: Key information or None
        """
        cache_key = f"api_key_{service_name}"
        cache_data = cache.get(cache_key)

        if not cache_data:
            return None

        stored_at = datetime.fromisoformat(cache_data["stored_at"])

        return {
            "service": service_name,
            "key_hash": cache_data["key_hash"],
            "stored_at": cache_data["stored_at"],
            "age_days": (timezone.now() - stored_at).days,
            "needs_rotation": cls._should_rotate_key(stored_at),
            "metadata": cache_data.get("metadata", {}),
        }

    @classmethod
    def list_api_keys(cls):
        """
        List all stored API keys (without decrypting).

        Returns:
            list: List of key information
        """
        # This is a simplified version - in production, use a proper database
        # or key management service
        services = ["gemini", "sendgrid", "sentry", "stripe"]

        keys = []
        for service in services:
            key_info = cls.get_api_key_info(service)
            if key_info:
                keys.append(key_info)

        return keys

    @classmethod
    def _should_rotate_key(cls, stored_at):
        """
        Check if a key should be rotated based on age.

        Args:
            stored_at: Datetime when key was stored

        Returns:
            bool: True if key should be rotated
        """
        age = timezone.now() - stored_at
        return age.days >= cls.KEY_ROTATION_INTERVAL

    @classmethod
    def generate_internal_api_key(cls, user, purpose="api_access"):
        """
        Generate an internal API key for user authentication.

        Args:
            user: User instance
            purpose: Purpose of the API key

        Returns:
            dict: API key information
        """
        # Generate a secure random key
        api_key = secrets.token_urlsafe(32)

        # Create key hash for storage
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        # Store key info (in production, use database)
        cache_key = f"user_api_key_{user.id}_{purpose}"
        cache_data = {
            "user_id": user.id,
            "key_hash": key_hash,
            "purpose": purpose,
            "created_at": timezone.now().isoformat(),
            "last_used": None,
            "is_active": True,
        }

        # Store with expiration
        cache.set(cache_key, cache_data, timeout=30 * 24 * 60 * 60)  # 30 days

        logger.info(
            f"Internal API key generated",
            extra={
                "user": user.email,
                "purpose": purpose,
                "key_hash": key_hash[:8],
            },
        )

        return {
            "api_key": api_key,
            "key_hash": key_hash[:8],  # Partial hash for reference
            "expires_in": 30 * 24 * 60 * 60,  # seconds
            "purpose": purpose,
        }

    @classmethod
    def validate_internal_api_key(cls, api_key):
        """
        Validate an internal API key.

        Args:
            api_key: API key to validate

        Returns:
            dict: User info if valid, None if invalid
        """
        # Generate hash of provided key
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        # Search for matching key (in production, use database with index)
        # This is a simplified version
        from django.contrib.auth import get_user_model

        User = get_user_model()

        for user in User.objects.filter(is_active=True):
            for purpose in ["api_access", "mobile_app", "integration"]:
                cache_key = f"user_api_key_{user.id}_{purpose}"
                cache_data = cache.get(cache_key)

                if cache_data and cache_data["key_hash"] == key_hash:
                    if cache_data["is_active"]:
                        # Update last used
                        cache_data["last_used"] = timezone.now().isoformat()
                        cache.set(cache_key, cache_data, timeout=30 * 24 * 60 * 60)

                        return {
                            "user_id": user.id,
                            "user": user,
                            "purpose": purpose,
                            "created_at": cache_data["created_at"],
                        }

        return None
