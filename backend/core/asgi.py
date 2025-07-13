"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

This ASGI application supports both HTTP and WebSocket protocols for
real-time functionality including progressive analysis updates.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

from .routing import websocket_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        # HTTP protocol
        "http": django_asgi_app,
        # WebSocket protocol with authentication
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
