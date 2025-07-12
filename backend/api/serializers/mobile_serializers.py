"""
Serializers for mobile and push notification models.
"""
from rest_framework import serializers
from api.models import DeviceToken, PushNotification, SyncLog


class DeviceTokenSerializer(serializers.ModelSerializer):
    """Serializer for device tokens."""
    
    class Meta:
        model = DeviceToken
        fields = [
            'id', 'token', 'platform', 'device_id', 'device_name',
            'app_version', 'os_version', 'is_active', 'created_at',
            'updated_at', 'last_used_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'token': {'write_only': True}  # Don't expose token in responses
        }


class RegisterDeviceSerializer(serializers.Serializer):
    """Serializer for device registration."""
    
    token = serializers.CharField(max_length=500)
    platform = serializers.ChoiceField(choices=DeviceToken.PLATFORM_CHOICES)
    device_id = serializers.CharField(max_length=255)
    device_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    app_version = serializers.CharField(max_length=50, required=False, allow_blank=True)
    os_version = serializers.CharField(max_length=50, required=False, allow_blank=True)
    replace_existing = serializers.BooleanField(default=False)
    
    def validate_token(self, value):
        """Validate Expo push token format."""
        if not value:
            raise serializers.ValidationError("Token cannot be empty.")
        
        # Basic validation for Expo tokens
        valid_prefixes = ['ExponentPushToken[', 'ExpoPushToken[', 'ExpoIdentifier[']
        if not any(value.startswith(prefix) for prefix in valid_prefixes):
            raise serializers.ValidationError(
                "Invalid Expo push token format. Token should start with 'ExponentPushToken[' or 'ExpoPushToken['."
            )
        
        return value
    
    def validate_device_id(self, value):
        """Validate device ID."""
        if not value or len(value) < 3:
            raise serializers.ValidationError("Device ID must be at least 3 characters long.")
        return value


class PushNotificationSerializer(serializers.ModelSerializer):
    """Serializer for push notifications."""
    
    device_platform = serializers.CharField(source='device_token.platform', read_only=True)
    device_name = serializers.CharField(source='device_token.device_name', read_only=True)
    
    class Meta:
        model = PushNotification
        fields = [
            'id', 'title', 'body', 'data', 'status', 'sent_at',
            'delivered_at', 'failed_at', 'error_message', 'created_at',
            'device_platform', 'device_name'
        ]
        read_only_fields = [
            'id', 'status', 'sent_at', 'delivered_at', 'failed_at',
            'error_message', 'created_at', 'device_platform', 'device_name'
        ]


class SendPushNotificationSerializer(serializers.Serializer):
    """Serializer for sending push notifications."""
    
    title = serializers.CharField(max_length=255)
    body = serializers.CharField(max_length=1000)
    data = serializers.JSONField(required=False)
    device_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        help_text="Specific device IDs to send to (optional)"
    )
    platforms = serializers.ListField(
        child=serializers.ChoiceField(choices=DeviceToken.PLATFORM_CHOICES),
        required=False,
        help_text="Specific platforms to send to (optional)"
    )
    sound = serializers.CharField(max_length=50, default='default', required=False)
    badge = serializers.IntegerField(min_value=0, required=False)
    category_id = serializers.CharField(max_length=100, required=False)
    ttl = serializers.IntegerField(min_value=0, max_value=2419200, default=86400, required=False)  # Max 28 days
    priority = serializers.ChoiceField(choices=['normal', 'high'], default='normal', required=False)
    subtitle = serializers.CharField(max_length=255, required=False)
    
    def validate_ttl(self, value):
        """Validate TTL is reasonable."""
        if value < 60:  # Minimum 1 minute
            raise serializers.ValidationError("TTL must be at least 60 seconds.")
        return value


class SyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync logs."""
    
    device_platform = serializers.CharField(source='device_token.platform', read_only=True)
    device_name = serializers.CharField(source='device_token.device_name', read_only=True)
    
    class Meta:
        model = SyncLog
        fields = [
            'id', 'sync_type', 'status', 'meals_uploaded', 'meals_downloaded',
            'notifications_downloaded', 'started_at', 'completed_at',
            'duration_seconds', 'data_size_bytes', 'error_message',
            'app_version', 'os_version', 'device_platform', 'device_name'
        ]
        read_only_fields = [
            'id', 'started_at', 'device_platform', 'device_name'
        ]


class CreateSyncLogSerializer(serializers.Serializer):
    """Serializer for creating sync logs."""
    
    sync_type = serializers.ChoiceField(choices=SyncLog.SYNC_TYPE_CHOICES, default='incremental')
    device_id = serializers.CharField(max_length=255, required=False)
    app_version = serializers.CharField(max_length=50, required=False, allow_blank=True)
    os_version = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate_device_id(self, value):
        """Validate device ID exists for the user."""
        if value:
            request = self.context.get('request')
            if request and request.user:
                if not request.user.device_tokens.filter(device_id=value, is_active=True).exists():
                    raise serializers.ValidationError("Invalid device ID for this user.")
        return value


class CompleteSyncLogSerializer(serializers.Serializer):
    """Serializer for completing sync logs."""
    
    status = serializers.ChoiceField(choices=['completed', 'failed'])
    meals_uploaded = serializers.IntegerField(min_value=0, default=0)
    meals_downloaded = serializers.IntegerField(min_value=0, default=0)
    notifications_downloaded = serializers.IntegerField(min_value=0, default=0)
    data_size_bytes = serializers.IntegerField(min_value=0, default=0)
    error_message = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate completion data."""
        if attrs['status'] == 'failed' and not attrs.get('error_message'):
            raise serializers.ValidationError(
                "Error message is required when status is 'failed'."
            )
        return attrs


class MobileDashboardSerializer(serializers.Serializer):
    """Serializer for mobile dashboard data."""
    
    user = serializers.DictField(read_only=True)
    today_stats = serializers.DictField(read_only=True)
    recent_meals = serializers.ListField(read_only=True)
    notifications_count = serializers.IntegerField(read_only=True)
    subscription_status = serializers.DictField(read_only=True)


class BatchOperationSerializer(serializers.Serializer):
    """Serializer for batch operations."""
    
    operations = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=50  # Limit batch size
    )
    
    def validate_operations(self, value):
        """Validate operations structure."""
        valid_types = ['create_meal', 'update_meal', 'delete_meal']
        
        for i, operation in enumerate(value):
            if not isinstance(operation, dict):
                raise serializers.ValidationError(f"Operation {i} must be a dictionary.")
            
            op_type = operation.get('type')
            if op_type not in valid_types:
                raise serializers.ValidationError(
                    f"Operation {i} has invalid type '{op_type}'. Must be one of: {valid_types}"
                )
            
            if 'data' not in operation:
                raise serializers.ValidationError(f"Operation {i} missing 'data' field.")
            
            if 'local_id' not in operation:
                raise serializers.ValidationError(f"Operation {i} missing 'local_id' field.")
        
        return value


class ImageOptimizationSerializer(serializers.Serializer):
    """Serializer for image optimization requests."""
    
    image_data = serializers.CharField(
        help_text="Base64 encoded image data"
    )
    quality = serializers.IntegerField(
        min_value=1,
        max_value=100,
        default=85,
        help_text="Compression quality (1-100)"
    )
    max_width = serializers.IntegerField(
        min_value=100,
        max_value=4096,
        default=1024,
        help_text="Maximum width in pixels"
    )
    max_height = serializers.IntegerField(
        min_value=100,
        max_value=4096,
        default=1024,
        help_text="Maximum height in pixels"
    )
    
    def validate_image_data(self, value):
        """Validate base64 image data."""
        if not value:
            raise serializers.ValidationError("Image data cannot be empty.")
        
        # Check if it looks like base64
        import base64
        import binascii
        
        try:
            # Try to decode to validate format
            decoded = base64.b64decode(value)
            if len(decoded) == 0:
                raise serializers.ValidationError("Invalid base64 image data.")
            
            # Check reasonable size limits (10MB max)
            if len(decoded) > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image too large. Maximum size is 10MB.")
            
        except (binascii.Error, ValueError):
            raise serializers.ValidationError("Invalid base64 encoding.")
        
        return value