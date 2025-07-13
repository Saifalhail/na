"""
Mobile app security features including device fingerprinting and fraud detection.
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from django.conf import settings
from django.core.cache import cache
from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)


class DeviceFingerprint:
    """
    Generate and validate device fingerprints for fraud detection.
    """

    @staticmethod
    def generate_fingerprint(device_data: Dict) -> str:
        """
        Generate a device fingerprint from device characteristics.

        Args:
            device_data: Dictionary containing device information

        Returns:
            Hex string fingerprint
        """
        # Extract relevant device characteristics
        characteristics = {
            "model": device_data.get("model", ""),
            "os_version": device_data.get("os_version", ""),
            "screen_resolution": device_data.get("screen_resolution", ""),
            "timezone": device_data.get("timezone", ""),
            "language": device_data.get("language", ""),
            "carrier": device_data.get("carrier", ""),
            "battery_level": device_data.get("battery_level", ""),
            "available_storage": device_data.get("available_storage", ""),
        }

        # Create deterministic fingerprint
        fingerprint_string = json.dumps(characteristics, sort_keys=True)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()

    @staticmethod
    def validate_fingerprint(
        device_id: str, current_fingerprint: str, user_id: Optional[int] = None
    ) -> Dict:
        """
        Validate device fingerprint against known fingerprints.

        Args:
            device_id: Unique device identifier
            current_fingerprint: Current device fingerprint
            user_id: Optional user ID for user-specific validation

        Returns:
            Dictionary with validation results
        """
        cache_key = f"device_fingerprint_{device_id}"
        stored_fingerprints = cache.get(cache_key, [])

        # Check if fingerprint matches any known fingerprints
        is_known = current_fingerprint in stored_fingerprints

        # Calculate similarity score (simple implementation)
        max_similarity = 0.0
        for stored_fp in stored_fingerprints:
            similarity = DeviceFingerprint._calculate_similarity(
                current_fingerprint, stored_fp
            )
            max_similarity = max(max_similarity, similarity)

        # Determine risk level
        if is_known:
            risk_level = "low"
        elif max_similarity > 0.8:
            risk_level = "medium"
        elif max_similarity > 0.6:
            risk_level = "high"
        else:
            risk_level = "critical"

        # Store new fingerprint if not known
        if not is_known:
            stored_fingerprints.append(current_fingerprint)
            # Keep only last 5 fingerprints per device
            stored_fingerprints = stored_fingerprints[-5:]
            cache.set(cache_key, stored_fingerprints, 86400 * 30)  # 30 days

            # Log new device fingerprint
            logger.info(
                f"New device fingerprint detected",
                extra={
                    "device_id": device_id,
                    "fingerprint": current_fingerprint[:16]
                    + "...",  # Partial for privacy
                    "risk_level": risk_level,
                    "similarity": max_similarity,
                    "user_id": user_id,
                },
            )

        return {
            "is_known": is_known,
            "risk_level": risk_level,
            "similarity_score": max_similarity,
            "fingerprint_count": len(stored_fingerprints),
        }

    @staticmethod
    def _calculate_similarity(fp1: str, fp2: str) -> float:
        """Calculate similarity between two fingerprints."""
        if len(fp1) != len(fp2):
            return 0.0

        matches = sum(c1 == c2 for c1, c2 in zip(fp1, fp2))
        return matches / len(fp1)


class SuspiciousActivityDetector:
    """
    Detect suspicious user activity patterns.
    """

    @staticmethod
    def check_login_pattern(
        user_id: int, ip_address: str, device_id: Optional[str] = None
    ) -> Dict:
        """
        Check for suspicious login patterns.

        Args:
            user_id: User ID
            ip_address: Client IP address
            device_id: Optional device ID

        Returns:
            Dictionary with suspicious activity analysis
        """
        # Get recent login history
        cache_key = f"login_history_{user_id}"
        login_history = cache.get(cache_key, [])

        current_time = timezone.now()
        current_login = {
            "timestamp": current_time.isoformat(),
            "ip": ip_address,
            "device_id": device_id,
        }

        # Analyze patterns
        suspicious_indicators = []
        risk_score = 0

        # Check for rapid login attempts
        recent_logins = [
            login
            for login in login_history
            if datetime.fromisoformat(login["timestamp"]).replace(tzinfo=timezone.utc)
            > current_time - timedelta(minutes=5)
        ]

        if len(recent_logins) >= 3:
            suspicious_indicators.append("rapid_login_attempts")
            risk_score += 30

        # Check for multiple IP addresses
        recent_ips = {login["ip"] for login in login_history[-10:]}  # Last 10 logins
        if len(recent_ips) > 3:
            suspicious_indicators.append("multiple_ip_addresses")
            risk_score += 20

        # Check for new device/IP combination
        known_combinations = {
            (login["ip"], login.get("device_id")) for login in login_history
        }
        if (ip_address, device_id) not in known_combinations:
            suspicious_indicators.append("new_device_ip_combination")
            risk_score += 15

        # Check for geographic anomalies (basic implementation)
        # In production, use GeoIP service
        if SuspiciousActivityDetector._is_geographic_anomaly(login_history, ip_address):
            suspicious_indicators.append("geographic_anomaly")
            risk_score += 25

        # Store current login
        login_history.append(current_login)
        # Keep only last 50 logins
        login_history = login_history[-50:]
        cache.set(cache_key, login_history, 86400 * 7)  # 7 days

        # Determine alert level
        if risk_score >= 50:
            alert_level = "high"
        elif risk_score >= 25:
            alert_level = "medium"
        else:
            alert_level = "low"

        result = {
            "risk_score": risk_score,
            "alert_level": alert_level,
            "suspicious_indicators": suspicious_indicators,
            "recent_login_count": len(recent_logins),
            "unique_ip_count": len(recent_ips),
        }

        # Log suspicious activity
        if alert_level in ["medium", "high"]:
            logger.warning(
                f"Suspicious login activity detected",
                extra={
                    "user_id": user_id,
                    "ip_address": ip_address,
                    "device_id": device_id,
                    "risk_score": risk_score,
                    "alert_level": alert_level,
                    "indicators": suspicious_indicators,
                },
            )

        return result

    @staticmethod
    def _is_geographic_anomaly(login_history: List[Dict], current_ip: str) -> bool:
        """
        Check for geographic anomalies in login pattern.
        Simple implementation - in production use GeoIP service.
        """
        if len(login_history) < 2:
            return False

        # Get recent IPs (last 5 logins)
        recent_ips = [login["ip"] for login in login_history[-5:]]

        # Simple check: if IP changes significantly (different /16 network)
        # This is a basic approximation
        try:
            current_network = ".".join(current_ip.split(".")[:2])
            for ip in recent_ips:
                recent_network = ".".join(ip.split(".")[:2])
                if current_network != recent_network:
                    return True
        except (IndexError, AttributeError):
            # Handle IPv6 or malformed IPs
            pass

        return False


class CertificatePinningValidator:
    """
    Validate certificate pinning for mobile apps.
    """

    # Expected certificate hashes for the API domain
    EXPECTED_CERT_HASHES = [
        # Add your actual certificate hashes here
        # These would be SHA256 hashes of your SSL certificates
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",  # Primary cert
        "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",  # Backup cert
    ]

    @staticmethod
    def validate_certificate_pin(cert_hash: str, domain: str) -> Dict:
        """
        Validate that the provided certificate hash matches expected pins.

        Args:
            cert_hash: SHA256 hash of the certificate
            domain: Domain name being validated

        Returns:
            Dictionary with validation results
        """
        is_valid = cert_hash in CertificatePinningValidator.EXPECTED_CERT_HASHES

        result = {
            "is_valid": is_valid,
            "cert_hash": cert_hash,
            "domain": domain,
            "expected_hashes": len(CertificatePinningValidator.EXPECTED_CERT_HASHES),
        }

        # Log certificate pinning attempt
        log_level = logging.INFO if is_valid else logging.WARNING
        logger.log(
            log_level,
            f"Certificate pinning validation: {'PASS' if is_valid else 'FAIL'}",
            extra={
                "cert_hash": cert_hash,
                "domain": domain,
                "is_valid": is_valid,
            },
        )

        return result


class JailbreakRootDetector:
    """
    Analyze device characteristics to detect jailbroken/rooted devices.
    """

    @staticmethod
    def analyze_device_security(device_data: Dict) -> Dict:
        """
        Analyze device data for signs of jailbreak/root.

        Args:
            device_data: Dictionary containing device security information

        Returns:
            Dictionary with security analysis results
        """
        risk_indicators = []
        risk_score = 0

        # Check for jailbreak/root indicators
        if device_data.get("is_jailbroken", False):
            risk_indicators.append("device_jailbroken")
            risk_score += 50

        if device_data.get("is_rooted", False):
            risk_indicators.append("device_rooted")
            risk_score += 50

        if device_data.get("debug_mode", False):
            risk_indicators.append("debug_mode_enabled")
            risk_score += 20

        if device_data.get("developer_options", False):
            risk_indicators.append("developer_options_enabled")
            risk_score += 15

        # Check for suspicious installed apps
        suspicious_apps = device_data.get("suspicious_apps", [])
        if suspicious_apps:
            risk_indicators.append("suspicious_apps_detected")
            risk_score += min(len(suspicious_apps) * 5, 25)  # Max 25 points

        # Check for missing security features
        if not device_data.get("screen_lock_enabled", True):
            risk_indicators.append("no_screen_lock")
            risk_score += 10

        if not device_data.get("biometric_enabled", False):
            risk_indicators.append("no_biometric_auth")
            risk_score += 5

        # Determine security level
        if risk_score >= 50:
            security_level = "high_risk"
        elif risk_score >= 25:
            security_level = "medium_risk"
        elif risk_score >= 10:
            security_level = "low_risk"
        else:
            security_level = "secure"

        result = {
            "security_level": security_level,
            "risk_score": risk_score,
            "risk_indicators": risk_indicators,
            "suspicious_app_count": len(suspicious_apps),
            "recommendations": JailbreakRootDetector._get_security_recommendations(
                risk_indicators
            ),
        }

        # Log security analysis
        if security_level in ["medium_risk", "high_risk"]:
            logger.warning(
                f"Device security risk detected",
                extra={
                    "security_level": security_level,
                    "risk_score": risk_score,
                    "indicators": risk_indicators,
                    "device_id": device_data.get("device_id"),
                },
            )

        return result

    @staticmethod
    def _get_security_recommendations(risk_indicators: List[str]) -> List[str]:
        """Get security recommendations based on risk indicators."""
        recommendations = []

        if "device_jailbroken" in risk_indicators or "device_rooted" in risk_indicators:
            recommendations.append(
                "Consider using a non-jailbroken/rooted device for better security"
            )

        if "no_screen_lock" in risk_indicators:
            recommendations.append("Enable screen lock for improved device security")

        if "no_biometric_auth" in risk_indicators:
            recommendations.append("Enable biometric authentication when available")

        if "debug_mode_enabled" in risk_indicators:
            recommendations.append("Disable developer/debug mode when not needed")

        if "suspicious_apps_detected" in risk_indicators:
            recommendations.append(
                "Review installed applications for potential security risks"
            )

        return recommendations


class APIKeyRotationManager:
    """
    Manage API key rotation for mobile applications.
    """

    @staticmethod
    def generate_api_key(
        user_id: int, device_id: str, key_type: str = "mobile"
    ) -> Dict:
        """
        Generate a new API key for a user device.

        Args:
            user_id: User ID
            device_id: Device ID
            key_type: Type of API key (mobile, web, etc.)

        Returns:
            Dictionary with new API key information
        """
        # Generate key using user, device, and timestamp
        timestamp = int(timezone.now().timestamp())
        key_data = f"{user_id}:{device_id}:{timestamp}:{key_type}"

        # Use HMAC for key generation
        secret_key = getattr(settings, "SECRET_KEY", "default_secret")
        api_key = hmac.new(
            secret_key.encode(), key_data.encode(), hashlib.sha256
        ).hexdigest()

        # Store key metadata
        cache_key = f"api_key_{api_key}"
        key_metadata = {
            "user_id": user_id,
            "device_id": device_id,
            "key_type": key_type,
            "created_at": timestamp,
            "last_used": timestamp,
            "usage_count": 0,
        }

        # API keys expire after 30 days
        cache.set(cache_key, key_metadata, 86400 * 30)

        # Store user's active keys
        user_keys_cache = f"user_api_keys_{user_id}"
        user_keys = cache.get(user_keys_cache, [])
        user_keys.append(api_key)
        # Keep only last 5 keys per user
        user_keys = user_keys[-5:]
        cache.set(user_keys_cache, user_keys, 86400 * 30)

        logger.info(
            f"New API key generated",
            extra={
                "user_id": user_id,
                "device_id": device_id,
                "key_type": key_type,
                "key_prefix": api_key[:8] + "...",
            },
        )

        return {
            "api_key": api_key,
            "expires_in": 86400 * 30,  # 30 days in seconds
            "key_type": key_type,
            "created_at": timestamp,
        }

    @staticmethod
    def validate_api_key(api_key: str, device_id: Optional[str] = None) -> Dict:
        """
        Validate an API key and update usage statistics.

        Args:
            api_key: API key to validate
            device_id: Optional device ID for additional validation

        Returns:
            Dictionary with validation results
        """
        cache_key = f"api_key_{api_key}"
        key_metadata = cache.get(cache_key)

        if not key_metadata:
            return {
                "is_valid": False,
                "reason": "key_not_found_or_expired",
            }

        # Validate device ID if provided
        if device_id and key_metadata["device_id"] != device_id:
            logger.warning(
                f"API key device mismatch",
                extra={
                    "expected_device": key_metadata["device_id"],
                    "provided_device": device_id,
                    "user_id": key_metadata["user_id"],
                },
            )
            return {
                "is_valid": False,
                "reason": "device_mismatch",
            }

        # Update usage statistics
        key_metadata["last_used"] = int(timezone.now().timestamp())
        key_metadata["usage_count"] += 1
        cache.set(cache_key, key_metadata, 86400 * 30)

        return {
            "is_valid": True,
            "user_id": key_metadata["user_id"],
            "device_id": key_metadata["device_id"],
            "key_type": key_metadata["key_type"],
            "usage_count": key_metadata["usage_count"],
        }

    @staticmethod
    def revoke_api_key(api_key: str, user_id: Optional[int] = None) -> bool:
        """
        Revoke an API key.

        Args:
            api_key: API key to revoke
            user_id: Optional user ID for authorization

        Returns:
            True if key was revoked, False otherwise
        """
        cache_key = f"api_key_{api_key}"
        key_metadata = cache.get(cache_key)

        if not key_metadata:
            return False

        # Check authorization if user_id provided
        if user_id and key_metadata["user_id"] != user_id:
            return False

        # Remove key
        cache.delete(cache_key)

        # Remove from user's key list
        user_keys_cache = f"user_api_keys_{key_metadata['user_id']}"
        user_keys = cache.get(user_keys_cache, [])
        if api_key in user_keys:
            user_keys.remove(api_key)
            cache.set(user_keys_cache, user_keys, 86400 * 30)

        logger.info(
            f"API key revoked",
            extra={
                "user_id": key_metadata["user_id"],
                "device_id": key_metadata["device_id"],
                "key_prefix": api_key[:8] + "...",
            },
        )

        return True
