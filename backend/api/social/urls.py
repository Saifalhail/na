"""
URL patterns for social authentication endpoints.
"""

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from django.urls import include, path

from api.serializers.social_serializers import GoogleLoginSerializer


class GoogleLogin(SocialLoginView):
    """
    Social login view for Google OAuth2.
    """

    adapter_class = GoogleOAuth2Adapter
    callback_url = f"{settings.FRONTEND_URL}/auth/google/callback"
    client_class = OAuth2Client
    serializer_class = GoogleLoginSerializer


app_name = "social"

urlpatterns = [
    # Google OAuth2
    path("google/", GoogleLogin.as_view(), name="google-login"),
    # Add more social providers here as needed
    # path('facebook/', FacebookLogin.as_view(), name='facebook-login'),
    # path('apple/', AppleLogin.as_view(), name='apple-login'),
]
