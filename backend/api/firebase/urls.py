"""
URL patterns for Firebase authentication endpoints.
"""

from django.urls import path

from api.views.firebase_auth import (FirebaseGoogleAuthView,
                                     FirebasePhoneAuthView,
                                     PhoneVerificationView, SMSOTPAuthView)
from api.views.sms_auth import SendSMSOTPView, VerifySMSOTPView

app_name = "firebase"

urlpatterns = [
    # Firebase Google Sign-In
    path("google/", FirebaseGoogleAuthView.as_view(), name="google-auth"),
    # Firebase Phone Authentication
    path("phone/", FirebasePhoneAuthView.as_view(), name="phone-auth"),
    # Phone verification (send OTP)
    path("phone/verify/", PhoneVerificationView.as_view(), name="phone-verify"),
    # SMS OTP authentication (deprecated in favor of dedicated endpoints)
    path("sms/auth/", SMSOTPAuthView.as_view(), name="sms-auth"),
    # Dedicated SMS OTP endpoints
    path("sms/send/", SendSMSOTPView.as_view(), name="sms-send-otp"),
    path("sms/verify/", VerifySMSOTPView.as_view(), name="sms-verify-otp"),
]
