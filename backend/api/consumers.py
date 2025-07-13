"""
WebSocket consumers for real-time functionality.

This module provides WebSocket consumers for progressive analysis updates
and other real-time features.
"""

import json
import logging
from typing import Any, Dict

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

logger = logging.getLogger(__name__)


class ProgressiveAnalysisConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for progressive analysis updates.

    This consumer handles real-time updates for progressive food image analysis,
    providing live progress updates to connected clients.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # Get user from scope
            self.user = self.scope["user"]

            # Reject anonymous users
            if isinstance(self.user, AnonymousUser):
                logger.warning(
                    "Anonymous user attempted to connect to progressive analysis WebSocket"
                )
                await self.close()
                return

            # Create user-specific group
            self.group_name = f"user_{self.user.id}_analysis"

            # Join the group
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            # Accept the connection
            await self.accept()

            # Send welcome message
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "connection_established",
                        "message": "Connected to progressive analysis updates",
                        "user_id": self.user.id,
                        "group": self.group_name,
                    }
                )
            )

            logger.info(
                f"User {self.user.id} connected to progressive analysis WebSocket"
            )

        except Exception as e:
            logger.error(f"Error in progressive analysis WebSocket connect: {e}")
            await self.close()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave the group
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )

            if hasattr(self, "user"):
                logger.info(
                    f"User {self.user.id} disconnected from progressive analysis WebSocket"
                )

        except Exception as e:
            logger.error(f"Error in progressive analysis WebSocket disconnect: {e}")

    async def receive(self, text_data):
        """Handle messages from WebSocket client."""
        try:
            try:
                data = json.loads(text_data)
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Invalid JSON received in WebSocket: {e}")
                await self.send_error("Invalid JSON format")
                return
                
            message_type = data.get("type")

            if message_type == "ping":
                # Respond to ping with pong
                await self.send(
                    text_data=json.dumps(
                        {"type": "pong", "timestamp": data.get("timestamp")}
                    )
                )

            elif message_type == "subscribe_session":
                # Client wants to subscribe to a specific session
                session_id = data.get("session_id")
                if session_id:
                    await self.send(
                        text_data=json.dumps(
                            {
                                "type": "subscription_confirmed",
                                "session_id": session_id,
                                "message": f"Subscribed to session {session_id} updates",
                            }
                        )
                    )

            else:
                logger.warning(f"Unknown message type received: {message_type}")

        except json.JSONDecodeError as e:
            logger.error(
                f"Invalid JSON received in progressive analysis WebSocket: {e}"
            )
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            )

        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Internal server error"}
                )
            )

    async def analysis_progress(self, event):
        """
        Handle analysis progress updates from the group.

        This method is called when the progressive analysis service
        broadcasts updates to the user's group.
        """
        try:
            # Send progress update to WebSocket client
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "analysis_progress",
                        "session_id": event["session_id"],
                        "overall_progress": event["overall_progress"],
                        "current_stage": event["current_stage"],
                        "status": event["status"],
                        "stages": event["stages"],
                        "final_result": event.get("final_result"),
                        "timestamp": event.get("timestamp", None),
                    }
                )
            )

        except Exception as e:
            logger.error(f"Error sending progress update: {e}")

    async def analysis_error(self, event):
        """
        Handle analysis error notifications.
        """
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "analysis_error",
                        "session_id": event["session_id"],
                        "error": event["error"],
                        "stage": event.get("stage"),
                        "timestamp": event.get("timestamp"),
                    }
                )
            )

        except Exception as e:
            logger.error(f"Error sending error notification: {e}")

    async def send_error(self, error_message: str):
        """Send error message to WebSocket client."""
        try:
            await self.send(
                text_data=json.dumps({
                    "type": "error",
                    "error": error_message,
                    "timestamp": timezone.now().isoformat()
                })
            )
        except Exception as e:
            logger.error(f"Failed to send error message: {e}")


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for general notifications.

    This consumer handles real-time notifications for users,
    including system alerts, meal reminders, etc.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # Get user from scope
            self.user = self.scope["user"]

            # Reject anonymous users
            if isinstance(self.user, AnonymousUser):
                logger.warning(
                    "Anonymous user attempted to connect to notifications WebSocket"
                )
                await self.close()
                return

            # Create user-specific group
            self.group_name = f"user_{self.user.id}_notifications"

            # Join the group
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            # Accept the connection
            await self.accept()

            # Send welcome message
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "connection_established",
                        "message": "Connected to notifications",
                        "user_id": self.user.id,
                    }
                )
            )

            logger.info(f"User {self.user.id} connected to notifications WebSocket")

        except Exception as e:
            logger.error(f"Error in notifications WebSocket connect: {e}")
            await self.close()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave the group
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )

            if hasattr(self, "user"):
                logger.info(
                    f"User {self.user.id} disconnected from notifications WebSocket"
                )

        except Exception as e:
            logger.error(f"Error in notifications WebSocket disconnect: {e}")

    async def receive(self, text_data):
        """Handle messages from WebSocket client."""
        try:
            try:
                data = json.loads(text_data)
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Invalid JSON received in WebSocket: {e}")
                await self.send_error("Invalid JSON format")
                return
                
            message_type = data.get("type")

            if message_type == "ping":
                # Respond to ping with pong
                await self.send(
                    text_data=json.dumps(
                        {"type": "pong", "timestamp": data.get("timestamp")}
                    )
                )

            elif message_type == "mark_read":
                # Mark notification as read
                notification_id = data.get("notification_id")
                if notification_id:
                    # Mark the notification as read in the database
                    success = await self.mark_notification_as_read(notification_id)

                    if success:
                        await self.send(
                            text_data=json.dumps(
                                {
                                    "type": "notification_marked_read",
                                    "notification_id": notification_id,
                                    "success": True,
                                }
                            )
                        )

                        # Broadcast update to group so all connected clients get the update
                        await self.channel_layer.group_send(
                            self.group_name,
                            {
                                "type": "notification_update",
                                "notification_id": notification_id,
                                "updates": {"is_read": True},
                            },
                        )
                    else:
                        await self.send(
                            text_data=json.dumps(
                                {
                                    "type": "error",
                                    "message": "Failed to mark notification as read",
                                    "notification_id": notification_id,
                                }
                            )
                        )

            elif message_type == "mark_all_read":
                # Mark all notifications as read
                success = await self.mark_all_notifications_as_read()

                if success:
                    await self.send(
                        text_data=json.dumps(
                            {"type": "all_notifications_marked_read", "success": True}
                        )
                    )

                    # Broadcast update to group
                    await self.channel_layer.group_send(
                        self.group_name,
                        {"type": "notification_update", "updates": {"all_read": True}},
                    )
                else:
                    await self.send(
                        text_data=json.dumps(
                            {
                                "type": "error",
                                "message": "Failed to mark all notifications as read",
                            }
                        )
                    )

            else:
                logger.warning(f"Unknown message type received: {message_type}")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received in notifications WebSocket: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            )

        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Internal server error"}
                )
            )

    @database_sync_to_async
    def mark_notification_as_read(self, notification_id):
        """Mark a specific notification as read in the database."""
        try:
            from api.models import Notification

            notification = Notification.objects.filter(
                id=notification_id, user=self.user
            ).first()

            if notification and not notification.is_read:
                notification.is_read = True
                notification.save()
                return True

            return False

        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False

    @database_sync_to_async
    def mark_all_notifications_as_read(self):
        """Mark all user's notifications as read."""
        try:
            from api.models import Notification

            updated = Notification.objects.filter(user=self.user, is_read=False).update(
                is_read=True
            )

            return updated > 0

        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")
            return False

    async def notification_new(self, event):
        """
        Handle new notification broadcasts.
        """
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "new_notification",
                        "notification": event["notification"],
                        "timestamp": event.get("timestamp"),
                    }
                )
            )

        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    async def notification_update(self, event):
        """
        Handle notification update broadcasts.
        """
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "notification_update",
                        "notification_id": event.get("notification_id"),
                        "updates": event["updates"],
                        "timestamp": event.get("timestamp"),
                    }
                )
            )

        except Exception as e:
            logger.error(f"Error sending notification update: {e}")

    async def send_error(self, error_message: str):
        """Send error message to WebSocket client."""
        try:
            await self.send(
                text_data=json.dumps({
                    "type": "error",
                    "error": error_message,
                    "timestamp": timezone.now().isoformat()
                })
            )
        except Exception as e:
            logger.error(f"Failed to send error message: {e}")


class HealthCheckConsumer(AsyncWebsocketConsumer):
    """
    Simple WebSocket consumer for health checks and testing.
    """

    async def connect(self):
        """Accept any connection for health checks."""
        await self.accept()

        await self.send(
            text_data=json.dumps(
                {
                    "type": "health_check",
                    "status": "healthy",
                    "message": "WebSocket connection established",
                }
            )
        )

    async def disconnect(self, close_code):
        """Handle disconnection."""
        pass

    async def receive(self, text_data):
        """Echo received messages."""
        try:
            data = json.loads(text_data)

            # Echo the message back
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "echo",
                        "original_message": data,
                        "timestamp": data.get("timestamp"),
                    }
                )
            )

        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            )
        except Exception as e:
            await self.send(text_data=json.dumps({"type": "error", "message": str(e)}))
