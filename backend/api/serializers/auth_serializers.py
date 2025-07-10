"""
Authentication serializers for user registration, profile management, and password operations.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from typing import Dict, Any
import re

from api.models import UserProfile, DietaryRestriction

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with comprehensive validation.
    """
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    account_type = serializers.ChoiceField(
        choices=User.ACCOUNT_TYPE_CHOICES,
        default='free',
        help_text="Account type: free or premium"
    )
    terms_accepted = serializers.BooleanField(
        required=True,
        error_messages={'required': 'You must accept the terms and conditions'}
    )
    marketing_consent = serializers.BooleanField(default=False, required=False)
    
    class Meta:
        model = User
        fields = (
            'email', 'password', 'password_confirm', 
            'first_name', 'last_name', 'account_type',
            'terms_accepted', 'marketing_consent'
        )
    
    def validate_email(self, value: str) -> str:
        """Validate email format and domain."""
        value = value.lower().strip()
        
        # Check for disposable email domains
        disposable_domains = ['tempmail.com', 'throwaway.email', '10minutemail.com']
        domain = value.split('@')[1] if '@' in value else ''
        
        if domain in disposable_domains:
            raise serializers.ValidationError(
                _("Disposable email addresses are not allowed.")
            )
        
        return value
    
    def validate_password(self, value: str) -> str:
        """Validate password strength."""
        # Django's built-in password validation
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        
        # Additional custom validation
        if len(value) < 8:
            raise serializers.ValidationError(
                _("Password must be at least 8 characters long.")
            )
        
        # Check for complexity
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError(
                _("Password must contain at least one uppercase letter.")
            )
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError(
                _("Password must contain at least one lowercase letter.")
            )
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError(
                _("Password must contain at least one number.")
            )
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError(
                _("Password must contain at least one special character.")
            )
        
        return value
    
    def validate_terms_accepted(self, value: bool) -> bool:
        """Ensure terms are accepted."""
        if not value:
            raise serializers.ValidationError(
                _("You must accept the terms and conditions to register.")
            )
        return value
    
    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that passwords match."""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': _("Password fields didn't match.")
            })
        
        # Remove password_confirm as it's not needed for user creation
        attrs.pop('password_confirm', None)
        attrs.pop('terms_accepted', None)
        
        return attrs
    
    def create(self, validated_data: Dict[str, Any]) -> User:
        """Create user with profile."""
        marketing_consent = validated_data.pop('marketing_consent', False)
        
        # Create user (email is used as username)
        user = User.objects.create_user(
            username=validated_data['email'],  # Use email as username
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            account_type=validated_data.get('account_type', 'free'),
            is_verified=False  # Email verification required
        )
        
        # Create user profile
        UserProfile.objects.create(
            user=user
        )
        
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting password reset.
    """
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value: str) -> str:
        """Check if user with email exists."""
        value = value.lower().strip()
        
        # Check if user exists
        if not User.objects.filter(email=value).exists():
            # Don't reveal that the email doesn't exist
            # This prevents user enumeration attacks
            pass
        
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.
    """
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate_password(self, value: str) -> str:
        """Validate password strength."""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        
        return value
    
    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that passwords match."""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': _("Password fields didn't match.")
            })
        
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for authenticated password change.
    """
    current_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate_current_password(self, value: str) -> str:
        """Validate current password is correct."""
        user = self.context['request'].user
        
        if not user.check_password(value):
            raise serializers.ValidationError(
                _("Current password is incorrect.")
            )
        
        return value
    
    def validate_new_password(self, value: str) -> str:
        """Validate new password strength."""
        user = self.context['request'].user
        
        try:
            validate_password(value, user=user)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        
        return value
    
    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that new passwords match and differ from current."""
        if attrs.get('new_password') != attrs.get('new_password_confirm'):
            raise serializers.ValidationError({
                'new_password_confirm': _("New password fields didn't match.")
            })
        
        if attrs.get('current_password') == attrs.get('new_password'):
            raise serializers.ValidationError({
                'new_password': _("New password must be different from current password.")
            })
        
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for email verification.
    """
    token = serializers.CharField(required=True)


class DietaryRestrictionSerializer(serializers.ModelSerializer):
    """
    Serializer for dietary restrictions.
    """
    class Meta:
        model = DietaryRestriction
        fields = ('id', 'name', 'restriction_type', 'description')
        read_only_fields = ('id',)


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile with nested user data.
    """
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    date_of_birth = serializers.DateField(source='user.date_of_birth', required=False)
    account_type = serializers.CharField(source='user.account_type', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    dietary_restrictions = DietaryRestrictionSerializer(many=True, read_only=True)
    
    class Meta:
        model = UserProfile
        fields = (
            'email', 'first_name', 'last_name', 'date_of_birth',
            'account_type', 'is_verified', 'date_joined',
            'gender', 'height', 'weight',
            'activity_level', 'dietary_restrictions',
            'daily_calorie_goal', 'daily_protein_goal', 'daily_carbs_goal', 'daily_fat_goal',
            'timezone', 'measurement_system',
            'bmi', 'bmr', 'tdee'  # Computed properties
        )
        read_only_fields = ('bmi', 'bmr', 'tdee')
    
    def update(self, instance: UserProfile, validated_data: Dict[str, Any]) -> UserProfile:
        """Update profile and nested user data."""
        # Extract user data
        user_data = validated_data.pop('user', {})
        
        # Update user fields
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance


class UserSerializer(serializers.ModelSerializer):
    """
    Basic user serializer for public display.
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'account_type')
        read_only_fields = fields
    
    def get_full_name(self, obj: User) -> str:
        """Get user's full name."""
        return obj.get_full_name()