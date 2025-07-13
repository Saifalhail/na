"""
Firebase authentication service for validating Firebase ID tokens.
"""

import logging
import os
from typing import Any, Dict, Optional, Union

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

try:
    import firebase_admin
    from firebase_admin import auth, credentials

    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Firebase Admin SDK not available - Firebase features disabled")

try:
    import phonenumbers
    from phonenumbers import NumberParseException

    PHONENUMBERS_AVAILABLE = True
except ImportError:
    PHONENUMBERS_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("phonenumbers library not available - phone validation disabled")

User = get_user_model()
logger = logging.getLogger(__name__)


class FirebaseAuthService:
    """
    Service for handling Firebase authentication and user management.
    """

    def __init__(self):
        """Initialize Firebase Admin SDK if not already initialized."""
        self.enabled = (
            getattr(settings, "FIREBASE_AUTH_ENABLED", False) and FIREBASE_AVAILABLE
        )

        if not self.enabled:
            if not FIREBASE_AVAILABLE:
                logger.warning(
                    "Firebase authentication disabled - Firebase Admin SDK not available"
                )
            else:
                logger.warning("Firebase authentication is disabled in settings")
            return

        # Initialize Firebase Admin SDK if not already done
        if not firebase_admin._apps:
            try:
                # Try to use service account file if provided
                service_account_path = getattr(
                    settings, "FIREBASE_SERVICE_ACCOUNT_PATH", ""
                )
                if service_account_path and os.path.exists(service_account_path):
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase initialized with service account")
                else:
                    # Use default credentials (for production environments)
                    firebase_admin.initialize_app()
                    logger.info("Firebase initialized with default credentials")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {e}")
                self.enabled = False

    def verify_id_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Firebase ID token and return decoded claims.

        Args:
            id_token: Firebase ID token from client

        Returns:
            Dict with user claims if valid, None if invalid
        """
        if not self.enabled:
            logger.warning("Firebase service not enabled")
            return None

        try:
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            logger.info(
                f"Successfully verified Firebase token for user: {decoded_token.get('uid')}"
            )
            return decoded_token
        except auth.InvalidIdTokenError as e:
            logger.warning(f"Invalid Firebase ID token: {e}")
            return None
        except auth.ExpiredIdTokenError as e:
            logger.warning(f"Expired Firebase ID token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying Firebase token: {e}")
            return None

    def get_or_create_user_from_firebase(
        self, firebase_claims: Dict[str, Any]
    ) -> Optional[User]:
        """
        Get or create Django user from Firebase claims.

        Args:
            firebase_claims: Decoded Firebase token claims

        Returns:
            User instance or None if creation fails
        """
        try:
            firebase_uid = firebase_claims.get("uid")
            email = firebase_claims.get("email")
            name = firebase_claims.get("name", "")
            phone_number = firebase_claims.get("phone_number")

            if not firebase_uid:
                logger.error("Firebase UID missing from claims")
                return None

            # Try to find existing user by Firebase UID (stored in a custom field)
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                logger.info(f"Found existing user for Firebase UID: {firebase_uid}")
                return user
            except User.DoesNotExist:
                pass

            # If no Firebase UID match, try email if available
            if email:
                try:
                    user = User.objects.get(email=email)
                    # Link this user to Firebase UID
                    user.firebase_uid = firebase_uid
                    user.save(update_fields=["firebase_uid"])
                    logger.info(
                        f"Linked existing email user to Firebase UID: {firebase_uid}"
                    )
                    return user
                except User.DoesNotExist:
                    pass

            # Create new user
            user_data = {
                "firebase_uid": firebase_uid,
                "email": email or "",
                "is_active": True,
                "account_type": "free",
            }

            # Parse name if provided
            if name:
                name_parts = name.split(" ", 1)
                user_data["first_name"] = name_parts[0]
                if len(name_parts) > 1:
                    user_data["last_name"] = name_parts[1]

            # Set username (email or firebase_uid)
            user_data["username"] = email or firebase_uid

            # Create user
            user = User.objects.create(**user_data)

            # Update profile with phone number if provided
            if phone_number and hasattr(user, "profile"):
                try:
                    formatted_phone = self.format_phone_number(phone_number)
                    if formatted_phone:
                        user.profile.phone_number = formatted_phone
                        user.profile.save(update_fields=["phone_number"])
                except Exception as e:
                    logger.warning(f"Failed to save phone number: {e}")

            logger.info(f"Created new user for Firebase UID: {firebase_uid}")
            return user

        except Exception as e:
            logger.error(f"Error creating user from Firebase claims: {e}")
            return None

    def format_phone_number(self, phone_number: str) -> Optional[str]:
        """
        Format and validate phone number using phonenumbers library.

        Args:
            phone_number: Raw phone number string

        Returns:
            Formatted phone number in E.164 format or None if invalid
        """
        if not phone_number:
            return None

        if not PHONENUMBERS_AVAILABLE:
            logger.warning(
                "phonenumbers library not available - returning phone number as-is"
            )
            return phone_number

        try:
            # Parse phone number
            parsed = phonenumbers.parse(phone_number, None)

            # Validate
            if not phonenumbers.is_valid_number(parsed):
                logger.warning(f"Invalid phone number: {phone_number}")
                return None

            # Format to E.164
            formatted = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
            return formatted

        except NumberParseException as e:
            logger.warning(f"Failed to parse phone number {phone_number}: {e}")
            return None

    def send_phone_verification(self, phone_number: str) -> Dict[str, Any]:
        """
        Initiate phone number verification (placeholder for Firebase Auth).

        Note: This would typically be handled client-side with Firebase Auth.
        This method is for server-side verification if needed.

        Args:
            phone_number: Phone number to verify

        Returns:
            Dict with status and session info
        """
        if not self.enabled:
            return {"success": False, "error": "Firebase service not enabled"}

        # Format phone number
        formatted_phone = self.format_phone_number(phone_number)
        if not formatted_phone:
            return {"success": False, "error": "Invalid phone number format"}

        try:
            # In a real implementation, you might use Firebase Auth Admin SDK
            # to send verification codes or manage phone auth sessions
            # For now, we'll return a placeholder response
            return {
                "success": True,
                "message": "Verification code sent",
                "phone_number": formatted_phone,
            }
        except Exception as e:
            logger.error(f"Error sending phone verification: {e}")
            return {"success": False, "error": str(e)}


# Global instance
firebase_service = FirebaseAuthService()
