"""
URL patterns for authentication endpoints.
"""

from django.urls import include, path

from api.views.auth import (EmailVerifyView, LoginView, LogoutView,
                            PasswordChangeView, PasswordResetConfirmView,
                            PasswordResetRequestView, ProfileView,
                            RefreshTokenView, RegisterView, TokenVerifyView)

app_name = "auth"

urlpatterns = [
    # Authentication
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", EmailVerifyView.as_view(), name="verify-email"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    # Token management
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("verify/", TokenVerifyView.as_view(), name="verify"),
    # Password management
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    # Profile
    path("profile/", ProfileView.as_view(), name="profile"),
    # Two-factor authentication
    path("2fa/", include("api.auth.two_factor_urls")),
]
