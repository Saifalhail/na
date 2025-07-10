"""
Serializers for two-factor authentication functionality.
"""
import base64
import io
import pyotp
import qrcode
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from api.models import TOTPDevice, BackupCode
import secrets
import string

User = get_user_model()


class TOTPDeviceSerializer(serializers.ModelSerializer):
    """Serializer for TOTP devices."""
    
    class Meta:
        model = TOTPDevice
        fields = ['id', 'name', 'confirmed', 'created_at', 'updated_at']
        read_only_fields = ['id', 'confirmed', 'created_at', 'updated_at']


class EnableTwoFactorSerializer(serializers.Serializer):
    """Serializer for enabling two-factor authentication."""
    
    device_name = serializers.CharField(max_length=64, default="Authenticator App")
    
    def create(self, validated_data):
        """Create a new TOTP device for the user."""
        user = self.context['request'].user
        
        # Generate a random secret key
        secret = pyotp.random_base32()
        
        # Create the TOTP device (not confirmed yet)
        device = TOTPDevice.objects.create(
            user=user,
            name=validated_data['device_name'],
            key=secret,
            confirmed=False
        )
        
        return device


class QRCodeSerializer(serializers.Serializer):
    """Serializer for QR code generation."""
    
    device_id = serializers.IntegerField()
    
    def validate_device_id(self, value):
        """Validate that the device exists and belongs to the user."""
        user = self.context['request'].user
        try:
            device = TOTPDevice.objects.get(id=value, user=user, confirmed=False)
        except TOTPDevice.DoesNotExist:
            raise serializers.ValidationError("Invalid device ID or device already confirmed.")
        return value
    
    def get_qr_code(self):
        """Generate QR code for the TOTP device."""
        device_id = self.validated_data['device_id']
        user = self.context['request'].user
        device = TOTPDevice.objects.get(id=device_id, user=user)
        
        # Create the provisioning URI
        totp = pyotp.TOTP(device.key)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name=settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'Nutrition AI'
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            'qr_code': f'data:image/png;base64,{img_str}',
            'secret': device.key,
            'provisioning_uri': provisioning_uri
        }


class VerifyTOTPSerializer(serializers.Serializer):
    """Serializer for verifying TOTP token."""
    
    device_id = serializers.IntegerField()
    token = serializers.CharField(max_length=6, min_length=6)
    
    def validate_device_id(self, value):
        """Validate that the device exists and belongs to the user."""
        user = self.context['request'].user
        try:
            device = TOTPDevice.objects.get(id=value, user=user)
        except TOTPDevice.DoesNotExist:
            raise serializers.ValidationError("Invalid device ID.")
        return value
    
    def validate(self, attrs):
        """Validate the TOTP token."""
        device_id = attrs['device_id']
        token = attrs['token']
        user = self.context['request'].user
        
        device = TOTPDevice.objects.get(id=device_id, user=user)
        totp = pyotp.TOTP(device.key)
        
        # Verify the token with tolerance
        if not totp.verify(token, valid_window=device.tolerance):
            raise serializers.ValidationError("Invalid token.")
        
        return attrs
    
    def save(self):
        """Mark the device as confirmed and enable 2FA for the user."""
        device_id = self.validated_data['device_id']
        user = self.context['request'].user
        
        device = TOTPDevice.objects.get(id=device_id, user=user)
        device.confirmed = True
        device.save()
        
        # Enable 2FA for the user
        user.two_factor_enabled = True
        user.save()
        
        # Generate backup codes if this is the first confirmed device
        if not BackupCode.objects.filter(user=user, used=False).exists():
            self._generate_backup_codes(user)
        
        return device
    
    def _generate_backup_codes(self, user):
        """Generate backup codes for the user."""
        # Delete any existing unused codes
        BackupCode.objects.filter(user=user, used=False).delete()
        
        # Generate 10 backup codes
        codes = []
        for _ in range(10):
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            backup_code = BackupCode.objects.create(user=user, code=code)
            codes.append(code)
        
        return codes


class DisableTwoFactorSerializer(serializers.Serializer):
    """Serializer for disabling two-factor authentication."""
    
    password = serializers.CharField(write_only=True)
    
    def validate_password(self, value):
        """Validate the user's password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Invalid password.")
        return value
    
    def save(self):
        """Disable 2FA for the user."""
        user = self.context['request'].user
        
        # Delete all TOTP devices
        TOTPDevice.objects.filter(user=user).delete()
        
        # Delete all backup codes
        BackupCode.objects.filter(user=user).delete()
        
        # Disable 2FA
        user.two_factor_enabled = False
        user.save()
        
        return user


class BackupCodeSerializer(serializers.ModelSerializer):
    """Serializer for backup codes."""
    
    class Meta:
        model = BackupCode
        fields = ['code', 'created_at']
        read_only_fields = ['code', 'created_at']


class RegenerateBackupCodesSerializer(serializers.Serializer):
    """Serializer for regenerating backup codes."""
    
    password = serializers.CharField(write_only=True)
    
    def validate_password(self, value):
        """Validate the user's password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Invalid password.")
        return value
    
    def save(self):
        """Generate new backup codes."""
        user = self.context['request'].user
        
        # Delete existing unused codes
        BackupCode.objects.filter(user=user, used=False).delete()
        
        # Generate 10 new backup codes
        codes = []
        for _ in range(10):
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            BackupCode.objects.create(user=user, code=code)
            codes.append(code)
        
        return codes


class LoginWithTwoFactorSerializer(serializers.Serializer):
    """Serializer for login with 2FA token."""
    
    token = serializers.CharField(max_length=6, min_length=6, required=False)
    backup_code = serializers.CharField(max_length=16, required=False)
    
    def validate(self, attrs):
        """Validate that either token or backup code is provided."""
        token = attrs.get('token')
        backup_code = attrs.get('backup_code')
        
        if not token and not backup_code:
            raise serializers.ValidationError("Either token or backup code is required.")
        
        if token and backup_code:
            raise serializers.ValidationError("Provide either token or backup code, not both.")
        
        return attrs
    
    def validate_with_user(self, user):
        """Validate the 2FA credentials for a specific user."""
        token = self.validated_data.get('token')
        backup_code = self.validated_data.get('backup_code')
        
        if token:
            # Verify TOTP token
            device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
            if not device:
                raise serializers.ValidationError("No 2FA device configured.")
            
            totp = pyotp.TOTP(device.key)
            if not totp.verify(token, valid_window=device.tolerance):
                raise serializers.ValidationError("Invalid token.")
                
        elif backup_code:
            # Verify backup code
            try:
                code = BackupCode.objects.get(
                    user=user,
                    code=backup_code.upper(),
                    used=False
                )
                # Mark the code as used
                code.used = True
                code.used_at = timezone.now()
                code.save()
            except BackupCode.DoesNotExist:
                raise serializers.ValidationError("Invalid backup code.")
        
        return True