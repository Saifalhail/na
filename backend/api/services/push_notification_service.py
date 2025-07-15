"""
Push notification service for mobile applications using Expo.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import requests
from django.conf import settings
from django.utils import timezone
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from api.models import DeviceToken, Notification, User

logger = logging.getLogger(__name__)


class ExpoNotificationService:
    """
    Service for sending push notifications via Expo Push Notification API.
    """

    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    EXPO_RECEIPT_URL = "https://exp.host/--/api/v2/push/getReceipts"

    def __init__(self):
        self.access_token = getattr(settings, "EXPO_ACCESS_TOKEN", None)
        self._session = None
        self._setup_session()
    
    def _setup_session(self):
        """Setup requests session with connection pooling and retry logic."""
        self._session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "POST"]
        )
        
        # Configure HTTP adapter with connection pooling
        adapter = HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=retry_strategy,
            pool_block=False
        )
        
        self._session.mount("https://", adapter)
        self._session.mount("http://", adapter)

    def send_notification(
        self,
        device_token: DeviceToken,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
        badge: Optional[int] = None,
        category_id: Optional[str] = None,
        ttl: int = 86400,  # 24 hours default
        priority: str = "normal",
        subtitle: Optional[str] = None,
    ) -> Optional[Notification]:
        """
        Send a push notification to a specific device.

        Args:
            device_token: The device token to send to
            title: Notification title
            body: Notification body
            data: Additional data to include
            sound: Sound to play ('default' or None for silent)
            badge: Badge count for iOS
            category_id: Notification category for iOS
            ttl: Time to live in seconds
            priority: Priority ('normal' or 'high')
            subtitle: Subtitle for iOS notifications

        Returns:
            Notification instance if created, None if failed
        """
        if not self._is_valid_expo_token(device_token.token):
            logger.warning(f"Invalid Expo token format: {device_token.token[:20]}...")
            return None

        # Create notification record
        push_notification = Notification.objects.create(
            user=device_token.user,
            type="push_notification",
            title=title,
            message=body,
            data=data or {},
            channel="push",
        )

        # Prepare message
        message = {
            "to": device_token.token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": sound,
            "ttl": ttl,
            "priority": priority,
        }

        if badge is not None:
            message["badge"] = badge

        if category_id:
            message["categoryId"] = category_id

        if subtitle:
            message["subtitle"] = subtitle

        try:
            # Send to Expo
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            }

            if self.access_token:
                headers["Authorization"] = f"Bearer {self.access_token}"

            response = self._session.post(
                self.EXPO_PUSH_URL, json=message, headers=headers, timeout=30
            )

            if response.status_code == 200:
                result = response.json()

                if result.get("data") and result["data"].get("status") == "ok":
                    # Success
                    push_notification.data["expo_ticket_id"] = result["data"].get("id")
                    push_notification.status = "sent"
                    push_notification.sent_at = timezone.now()
                    push_notification.save()

                    logger.info(
                        f"Push notification sent successfully: {push_notification.id}"
                    )
                    return push_notification

                else:
                    # Expo returned an error
                    error_msg = result.get("data", {}).get("message", "Unknown error")
                    push_notification.status = "failed"
                    push_notification.failed_at = timezone.now()
                    push_notification.error_message = error_msg
                    push_notification.save()

                    logger.error(f"Expo push notification failed: {error_msg}")
                    return push_notification

            else:
                # HTTP error
                push_notification.status = "failed"
                push_notification.failed_at = timezone.now()
                push_notification.error_message = (
                    f"HTTP {response.status_code}: {response.text}"
                )
                push_notification.save()

                logger.error(
                    f"HTTP error sending push notification: {response.status_code}"
                )
                return push_notification

        except Exception as e:
            # Network or other error
            push_notification.status = "failed"
            push_notification.failed_at = timezone.now()
            push_notification.error_message = str(e)
            push_notification.save()

            logger.error(f"Exception sending push notification: {e}")
            return push_notification

    def send_bulk_notifications(
        self,
        device_tokens: List[DeviceToken],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        **kwargs,
    ) -> List[Notification]:
        """
        Send push notifications to multiple devices in bulk.

        Args:
            device_tokens: List of device tokens to send to
            title: Notification title
            body: Notification body
            data: Additional data to include
            **kwargs: Additional arguments for send_notification

        Returns:
            List of Notification instances
        """
        notifications = []

        # Prepare messages for bulk send
        messages = []
        token_to_notification = {}

        for device_token in device_tokens:
            if not self._is_valid_expo_token(device_token.token):
                continue

            # Create notification record
            push_notification = Notification.objects.create(
                user=device_token.user,
                type="push_notification",
                title=title,
                message=body,
                data=data or {},
                channel="push",
            )
            notifications.append(push_notification)
            token_to_notification[device_token.token] = push_notification

            # Prepare message
            message = {
                "to": device_token.token,
                "title": title,
                "body": body,
                "data": data or {},
                "sound": kwargs.get("sound", "default"),
                "ttl": kwargs.get("ttl", 86400),
                "priority": kwargs.get("priority", "normal"),
            }

            if kwargs.get("badge") is not None:
                message["badge"] = kwargs["badge"]

            if kwargs.get("category_id"):
                message["categoryId"] = kwargs["category_id"]

            if kwargs.get("subtitle"):
                message["subtitle"] = kwargs["subtitle"]

            messages.append(message)

        if not messages:
            logger.warning("No valid tokens for bulk notification")
            return notifications

        try:
            # Send bulk to Expo
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            }

            if self.access_token:
                headers["Authorization"] = f"Bearer {self.access_token}"

            response = self._session.post(
                self.EXPO_PUSH_URL,
                json=messages,
                headers=headers,
                timeout=60,  # Longer timeout for bulk
            )

            if response.status_code == 200:
                results = response.json().get("data", [])

                for i, result in enumerate(results):
                    if i < len(messages):
                        token = messages[i]["to"]
                        notification = token_to_notification.get(token)

                        if notification:
                            if result.get("status") == "ok":
                                notification.data["expo_ticket_id"] = result.get("id")
                                notification.status = "sent"
                                notification.sent_at = timezone.now()
                            else:
                                notification.status = "failed"
                                notification.failed_at = timezone.now()
                                notification.error_message = result.get(
                                    "message", "Unknown error"
                                )

                            notification.save()

                logger.info(f"Bulk push notifications sent: {len(results)} messages")

            else:
                # Mark all as failed
                for notification in notifications:
                    notification.status = "failed"
                    notification.failed_at = timezone.now()
                    notification.error_message = (
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    notification.save()

                logger.error(
                    f"HTTP error sending bulk notifications: {response.status_code}"
                )

        except Exception as e:
            # Mark all as failed
            for notification in notifications:
                notification.status = "failed"
                notification.failed_at = timezone.now()
                notification.error_message = str(e)
                notification.save()

            logger.error(f"Exception sending bulk notifications: {e}")

        return notifications

    def check_receipts(self, ticket_ids: List[str]) -> Dict[str, Dict]:
        """
        Check delivery receipts for sent notifications.

        Args:
            ticket_ids: List of Expo ticket IDs to check

        Returns:
            Dictionary mapping ticket IDs to receipt data
        """
        if not ticket_ids:
            return {}

        try:
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }

            if self.access_token:
                headers["Authorization"] = f"Bearer {self.access_token}"

            response = self._session.post(
                self.EXPO_RECEIPT_URL,
                json={"ids": ticket_ids},
                headers=headers,
                timeout=30,
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("data", {})

            logger.error(f"Error checking receipts: HTTP {response.status_code}")
            return {}

        except Exception as e:
            logger.error(f"Exception checking receipts: {e}")
            return {}

    def update_notification_receipts(self):
        """
        Update delivery status for sent notifications by checking receipts.
        """
        # Get notifications that have been sent but not yet delivered/failed
        pending_notifications = Notification.objects.filter(
            status="sent",
            data__expo_ticket_id__isnull=False,
            sent_at__gte=timezone.now() - timedelta(days=7),  # Only check recent ones
        )

        if not pending_notifications.exists():
            return

        # Get ticket IDs
        ticket_ids = []
        for notification in pending_notifications:
            ticket_id = notification.data.get("expo_ticket_id")
            if ticket_id:
                ticket_ids.append(ticket_id)

        # Check receipts
        receipts = self.check_receipts(ticket_ids)

        # Update notifications
        for notification in pending_notifications:
            ticket_id = notification.data.get("expo_ticket_id")
            receipt = receipts.get(ticket_id)

            if receipt:
                if receipt.get("status") == "ok":
                    notification.status = "sent"  # Keep as sent since Notification doesn't have delivered status
                    notification.sent_at = timezone.now()
                elif receipt.get("status") == "error":
                    notification.status = "failed"
                    notification.failed_at = timezone.now()
                    notification.error_message = receipt.get(
                        "message", "Delivery failed"
                    )

                notification.data["expo_receipt_id"] = receipt.get("id", "")
                notification.save()

        logger.info(f"Updated receipts for {len(receipts)} notifications")

    def send_to_user(
        self,
        user: User,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        platform: Optional[str] = None,
        **kwargs,
    ) -> List[Notification]:
        """
        Send notification to all active devices for a user.

        Args:
            user: User to send to
            title: Notification title
            body: Notification body
            data: Additional data to include
            platform: Specific platform to target ('ios', 'android', 'web')
            **kwargs: Additional arguments for send_notification

        Returns:
            List of Notification instances
        """
        device_tokens = user.device_tokens.filter(is_active=True)

        if platform:
            device_tokens = device_tokens.filter(platform=platform)

        return self.send_bulk_notifications(
            device_tokens=list(device_tokens),
            title=title,
            body=body,
            data=data,
            **kwargs,
        )

    def _is_valid_expo_token(self, token: str) -> bool:
        """
        Check if token appears to be a valid Expo push token.

        Args:
            token: Token to validate

        Returns:
            True if token appears valid
        """
        if not token:
            return False

        # Expo push tokens start with "ExponentPushToken[" or "ExpoPushToken["
        return (
            token.startswith("ExponentPushToken[")
            or token.startswith("ExpoPushToken[")
            or token.startswith("ExpoIdentifier[")  # Development tokens
        )


# Global service instance
push_notification_service = ExpoNotificationService()
