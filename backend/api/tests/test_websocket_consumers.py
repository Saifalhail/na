"""
Tests for WebSocket consumers.
"""

import json

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.urls import path

from api.consumers import HealthCheckConsumer, NotificationConsumer
from api.factories import NotificationFactory, UserFactory
from api.models import Notification

User = get_user_model()


class NotificationConsumerTestCase(TransactionTestCase):
    """Test notification WebSocket consumer."""

    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()
        self.application = AuthMiddlewareStack(
            URLRouter(
                [
                    path("ws/notifications/", NotificationConsumer.as_asgi()),
                ]
            )
        )

    async def test_connect_authenticated(self):
        """Test authenticated user can connect."""
        communicator = WebsocketCommunicator(self.application, "/ws/notifications/")
        communicator.scope["user"] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Should receive welcome message
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "connection_established")
        self.assertEqual(response["user_id"], self.user.id)

        await communicator.disconnect()

    async def test_mark_notification_read(self):
        """Test marking a notification as read."""
        # Create a notification
        notification = await database_sync_to_async(NotificationFactory)(
            user=self.user, status='pending'
        )

        communicator = WebsocketCommunicator(self.application, "/ws/notifications/")
        communicator.scope["user"] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive welcome message
        await communicator.receive_json_from()

        # Send mark_read message
        await communicator.send_json_to(
            {"type": "mark_read", "notification_id": str(notification.id)}
        )

        # Should receive success response
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "notification_marked_read")
        self.assertEqual(response["notification_id"], str(notification.id))
        self.assertTrue(response["success"])

        # Should receive broadcast update
        broadcast = await communicator.receive_json_from()
        self.assertEqual(broadcast["type"], "notification_update")
        self.assertEqual(broadcast["notification_id"], str(notification.id))
        self.assertTrue(broadcast["updates"]["is_read"])

        # Verify notification is marked as read in database
        notification = await database_sync_to_async(Notification.objects.get)(
            id=notification.id
        )
        self.assertTrue(notification.is_read)

        await communicator.disconnect()

    async def test_mark_all_notifications_read(self):
        """Test marking all notifications as read."""
        # Create multiple notifications
        notifications = []
        for _ in range(3):
            notification = await database_sync_to_async(NotificationFactory)(
                user=self.user, status='pending'
            )
            notifications.append(notification)

        communicator = WebsocketCommunicator(self.application, "/ws/notifications/")
        communicator.scope["user"] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive welcome message
        await communicator.receive_json_from()

        # Send mark_all_read message
        await communicator.send_json_to({"type": "mark_all_read"})

        # Should receive success response
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "all_notifications_marked_read")
        self.assertTrue(response["success"])

        # Should receive broadcast update
        broadcast = await communicator.receive_json_from()
        self.assertEqual(broadcast["type"], "notification_update")
        self.assertTrue(broadcast["updates"]["all_read"])

        # Verify all notifications are marked as read
        for notification in notifications:
            notification = await database_sync_to_async(Notification.objects.get)(
                id=notification.id
            )
            self.assertTrue(notification.is_read)

        await communicator.disconnect()

    async def test_mark_nonexistent_notification(self):
        """Test marking a non-existent notification."""
        communicator = WebsocketCommunicator(self.application, "/ws/notifications/")
        communicator.scope["user"] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive welcome message
        await communicator.receive_json_from()

        # Send mark_read message for non-existent notification
        await communicator.send_json_to(
            {
                "type": "mark_read",
                "notification_id": "00000000-0000-0000-0000-000000000000",
            }
        )

        # Should receive error response
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("Failed to mark notification", response["message"])

        await communicator.disconnect()

    async def test_ping_pong(self):
        """Test ping-pong functionality."""
        communicator = WebsocketCommunicator(self.application, "/ws/notifications/")
        communicator.scope["user"] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive welcome message
        await communicator.receive_json_from()

        # Send ping
        timestamp = "2025-07-12T12:00:00"
        await communicator.send_json_to({"type": "ping", "timestamp": timestamp})

        # Should receive pong
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "pong")
        self.assertEqual(response["timestamp"], timestamp)

        await communicator.disconnect()


class HealthCheckConsumerTestCase(TransactionTestCase):
    """Test health check WebSocket consumer."""

    def setUp(self):
        """Set up test application."""
        self.application = URLRouter(
            [
                path("ws/health/", HealthCheckConsumer.as_asgi()),
            ]
        )

    async def test_health_check(self):
        """Test health check connection."""
        communicator = WebsocketCommunicator(self.application, "/ws/health/")

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Should receive health check message
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "health_check")
        self.assertEqual(response["status"], "healthy")

        await communicator.disconnect()

    async def test_echo(self):
        """Test echo functionality."""
        communicator = WebsocketCommunicator(self.application, "/ws/health/")

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Receive health check message
        await communicator.receive_json_from()

        # Send test message
        test_message = {
            "type": "test",
            "data": "Hello, WebSocket!",
            "timestamp": "2025-07-12T12:00:00",
        }
        await communicator.send_json_to(test_message)

        # Should receive echo
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "echo")
        self.assertEqual(response["original_message"], test_message)
        self.assertEqual(response["timestamp"], test_message["timestamp"])

        await communicator.disconnect()
