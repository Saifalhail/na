"""
Serializers for social authentication.
"""
from rest_framework import serializers
from dj_rest_auth.registration.serializers import SocialLoginSerializer


class GoogleLoginSerializer(SocialLoginSerializer):
    """
    Custom serializer for Google OAuth2 login.
    """
    access_token = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    id_token = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """
        Validate that either access_token or code is provided.
        """
        access_token = attrs.get('access_token')
        code = attrs.get('code')
        id_token = attrs.get('id_token')
        
        if not access_token and not code and not id_token:
            raise serializers.ValidationError(
                'Must provide either access_token, code, or id_token'
            )
        
        return super().validate(attrs)


class SocialConnectSerializer(serializers.Serializer):
    """
    Serializer for connecting social accounts to existing users.
    """
    provider = serializers.CharField(required=True)
    access_token = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    id_token = serializers.CharField(required=False, allow_blank=True)
    
    def validate_provider(self, value):
        """
        Validate that the provider is supported.
        """
        supported_providers = ['google', 'facebook', 'apple']
        if value not in supported_providers:
            raise serializers.ValidationError(
                f'Provider {value} is not supported. Supported providers: {", ".join(supported_providers)}'
            )
        return value
    
    def validate(self, attrs):
        """
        Validate that required authentication data is provided.
        """
        access_token = attrs.get('access_token')
        code = attrs.get('code')
        id_token = attrs.get('id_token')
        
        if not access_token and not code and not id_token:
            raise serializers.ValidationError(
                'Must provide either access_token, code, or id_token'
            )
        
        return attrs


class SocialAccountSerializer(serializers.Serializer):
    """
    Serializer for social account information.
    """
    provider = serializers.CharField(read_only=True)
    uid = serializers.CharField(read_only=True)
    last_login = serializers.DateTimeField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    extra_data = serializers.JSONField(read_only=True)