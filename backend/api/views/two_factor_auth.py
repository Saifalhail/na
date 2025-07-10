"""
View for completing two-factor authentication during login.
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from api.serializers.two_factor_serializers import LoginWithTwoFactorSerializer
from api.models import APIUsageLog
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class CompleteTwoFactorLoginView(APIView):
    """
    Complete login process with 2FA verification.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="Complete 2FA Login",
        description="Complete the login process by providing a 2FA token or backup code.",
        request=LoginWithTwoFactorSerializer,
        responses={
            200: {
                'description': 'Login successful',
                'examples': {
                    'success': {
                        'value': {
                            'access': 'eyJ0eXAiOiJKV1QiLCJhbGc...',
                            'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGc...',
                            'user': {
                                'id': 1,
                                'email': 'user@example.com',
                                'first_name': 'John',
                                'last_name': 'Doe'
                            }
                        }
                    }
                }
            },
            400: {
                'description': 'Invalid 2FA credentials or session expired'
            }
        },
        tags=['Two-Factor Authentication']
    )
    def post(self, request):
        """Complete 2FA login."""
        # Get user ID from request (could be from session or request body)
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'User ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's a pending 2FA session
        cache_key = f'2fa_pending_{user_id}'
        pending_data = cache.get(cache_key)
        
        if not pending_data:
            return Response(
                {'error': '2FA session expired or invalid. Please login again.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate 2FA credentials
        serializer = LoginWithTwoFactorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            serializer.validate_with_user(user)
        except Exception as e:
            # Log failed 2FA attempt
            APIUsageLog.objects.create(
                user=user,
                endpoint='/api/v1/auth/2fa/complete/',
                method='POST',
                ip_address=pending_data.get('ip_address', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                response_status_code=401,
                response_time_ms=0,
                error_message='Failed 2FA verification'
            )
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2FA verification successful, generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Add custom claims
        refresh['email'] = user.email
        refresh['account_type'] = user.account_type if hasattr(user, 'account_type') else 'free'
        refresh['is_verified'] = user.is_verified
        refresh['2fa_verified'] = True
        
        # Update last login
        user.last_login = timezone.now()
        if hasattr(user, 'last_login_ip'):
            user.last_login_ip = pending_data.get('ip_address', '')
        user.save()
        
        # Clear the pending 2FA session
        cache.delete(cache_key)
        
        # Log successful login
        APIUsageLog.objects.create(
            user=user,
            endpoint='/api/v1/auth/2fa/complete/',
            method='POST',
            ip_address=pending_data.get('ip_address', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            response_status_code=200,
            response_time_ms=0
        )
        
        # Return tokens and user info
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })