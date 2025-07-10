"""
URL patterns for two-factor authentication endpoints.
"""
from django.urls import path
from api.views.two_factor import (
    TwoFactorStatusView,
    EnableTwoFactorView,
    QRCodeView,
    VerifyTOTPView,
    DisableTwoFactorView,
    BackupCodesView,
)
from api.views.two_factor_auth import CompleteTwoFactorLoginView

app_name = 'two_factor'

urlpatterns = [
    # 2FA status
    path('status/', TwoFactorStatusView.as_view(), name='status'),
    
    # Enable 2FA
    path('enable/', EnableTwoFactorView.as_view(), name='enable'),
    
    # QR code generation
    path('qr-code/', QRCodeView.as_view(), name='qr-code'),
    
    # Verify TOTP token
    path('verify/', VerifyTOTPView.as_view(), name='verify'),
    
    # Disable 2FA
    path('disable/', DisableTwoFactorView.as_view(), name='disable'),
    
    # Backup codes
    path('backup-codes/', BackupCodesView.as_view(), name='backup-codes'),
    
    # Complete 2FA login
    path('complete/', CompleteTwoFactorLoginView.as_view(), name='complete'),
]