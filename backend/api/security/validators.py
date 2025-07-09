"""
Input validation decorators and utilities for enhanced security.
"""
import functools
import re
import magic
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework import status
import bleach


# Allowed file types for upload
ALLOWED_IMAGE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/heif': ['.heic', '.heif'],
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_input(schema):
    """
    Decorator to validate request data against a schema.
    
    Args:
        schema: Serializer class to validate against
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get data based on request method
            if request.method in ['POST', 'PUT', 'PATCH']:
                data = request.data
            else:
                data = request.query_params
            
            # Validate with serializer
            serializer = schema(data=data)
            if not serializer.is_valid():
                return Response(
                    {'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Add validated data to request
            request.validated_data = serializer.validated_data
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def sanitize_html(text, allowed_tags=None):
    """
    Sanitize HTML content to prevent XSS attacks.
    
    Args:
        text: HTML text to sanitize
        allowed_tags: List of allowed HTML tags
        
    Returns:
        Sanitized HTML string
    """
    if allowed_tags is None:
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
    
    allowed_attributes = {
        'a': ['href', 'title', 'rel'],
    }
    
    # Clean the HTML
    cleaned = bleach.clean(
        text,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True,
        strip_comments=True
    )
    
    # Additional sanitization for links
    if 'a' in allowed_tags:
        cleaned = bleach.linkify(cleaned, callbacks=[add_rel_nofollow])
    
    return cleaned


def add_rel_nofollow(attrs, new=False):
    """Add rel="nofollow noopener" to links."""
    attrs[(None, 'rel')] = 'nofollow noopener'
    attrs[(None, 'target')] = '_blank'
    return attrs


def validate_image_upload(image_field):
    """
    Validate uploaded image files.
    
    Args:
        image_field: Django UploadedFile instance
        
    Raises:
        ValidationError: If validation fails
    """
    if not image_field:
        return
    
    # Check file size
    if image_field.size > MAX_IMAGE_SIZE:
        raise ValidationError(
            f'Image size exceeds maximum allowed size of {MAX_IMAGE_SIZE // 1024 // 1024}MB'
        )
    
    # Check file type using python-magic
    if isinstance(image_field, (InMemoryUploadedFile, TemporaryUploadedFile)):
        # Read first 1024 bytes for magic number detection
        image_field.seek(0)
        file_content = image_field.read(1024)
        image_field.seek(0)
        
        # Detect MIME type
        mime = magic.from_buffer(file_content, mime=True)
        
        if mime not in ALLOWED_IMAGE_TYPES:
            raise ValidationError(
                f'Invalid file type. Allowed types: {", ".join(ALLOWED_IMAGE_TYPES.keys())}'
            )
        
        # Check file extension matches MIME type
        file_ext = image_field.name.lower().split('.')[-1]
        allowed_extensions = [ext.lstrip('.') for ext in ALLOWED_IMAGE_TYPES[mime]]
        
        if file_ext not in allowed_extensions:
            raise ValidationError(
                f'File extension does not match file type. Expected: {", ".join(allowed_extensions)}'
            )
    
    # Additional image validation (dimensions, etc.) can be added here
    try:
        from PIL import Image
        
        # Open image to validate it's a valid image
        image_field.seek(0)
        img = Image.open(image_field)
        
        # Check image dimensions
        if img.width > 4096 or img.height > 4096:
            raise ValidationError('Image dimensions exceed maximum allowed (4096x4096)')
        
        # Check for suspicious EXIF data
        if hasattr(img, '_getexif') and img._getexif():
            # Could check for GPS data or other sensitive EXIF tags
            pass
        
        image_field.seek(0)
        
    except Exception as e:
        raise ValidationError(f'Invalid image file: {str(e)}')


class SecureFileUploadSerializer(serializers.Serializer):
    """
    Base serializer for secure file uploads.
    """
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate uploaded file."""
        validate_image_upload(value)
        return value


def validate_email(email):
    """
    Validate email address format and domain.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if valid
        
    Raises:
        ValidationError: If invalid
    """
    # Basic email regex
    email_regex = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    if not email_regex.match(email):
        raise ValidationError('Invalid email format')
    
    # Check for disposable email domains (basic list)
    disposable_domains = [
        'tempmail.com', 'throwaway.email', '10minutemail.com',
        'guerrillamail.com', 'mailinator.com', 'trashmail.com'
    ]
    
    domain = email.split('@')[1].lower()
    if domain in disposable_domains:
        raise ValidationError('Disposable email addresses are not allowed')
    
    return True


def validate_password_strength(password):
    """
    Validate password meets security requirements.
    
    Args:
        password: Password to validate
        
    Raises:
        ValidationError: If password doesn't meet requirements
    """
    errors = []
    
    # Length check
    if len(password) < 8:
        errors.append('Password must be at least 8 characters long')
    
    # Complexity checks
    if not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter')
    
    if not re.search(r'[a-z]', password):
        errors.append('Password must contain at least one lowercase letter')
    
    if not re.search(r'\d', password):
        errors.append('Password must contain at least one number')
    
    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        errors.append('Password must contain at least one special character')
    
    # Common password check (basic)
    common_passwords = [
        'password', '12345678', 'qwerty', 'abc12345', 
        'password123', 'admin', 'letmein'
    ]
    
    if password.lower() in common_passwords:
        errors.append('Password is too common')
    
    if errors:
        raise ValidationError(errors)
    
    return True


def validate_sql_injection(value):
    """
    Check for potential SQL injection patterns.
    
    Args:
        value: String value to check
        
    Returns:
        bool: True if safe
        
    Raises:
        ValidationError: If suspicious patterns found
    """
    # SQL injection patterns
    sql_patterns = [
        r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
        r"(--|#|/\*|\*/)",
        r"(\bor\b\s*\d+\s*=\s*\d+)",
        r"(\band\b\s*\d+\s*=\s*\d+)",
        r"(;|'|\"|`|\\x00|\\n|\\r|\\x1a)",
    ]
    
    value_lower = str(value).lower()
    
    for pattern in sql_patterns:
        if re.search(pattern, value_lower, re.IGNORECASE):
            raise ValidationError('Invalid characters or patterns detected')
    
    return True


def validate_xss(value):
    """
    Check for potential XSS patterns.
    
    Args:
        value: String value to check
        
    Returns:
        bool: True if safe
        
    Raises:
        ValidationError: If suspicious patterns found
    """
    # XSS patterns
    xss_patterns = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
        r"<link",
        r"eval\s*\(",
        r"expression\s*\(",
    ]
    
    value_lower = str(value).lower()
    
    for pattern in xss_patterns:
        if re.search(pattern, value_lower, re.IGNORECASE):
            raise ValidationError('Invalid HTML or script patterns detected')
    
    return True


class SanitizedCharField(serializers.CharField):
    """
    CharField that automatically sanitizes input.
    """
    
    def to_internal_value(self, data):
        """Sanitize input data."""
        value = super().to_internal_value(data)
        
        # Remove any HTML tags
        value = bleach.clean(value, tags=[], strip=True)
        
        # Check for SQL injection
        validate_sql_injection(value)
        
        # Check for XSS
        validate_xss(value)
        
        return value


class SanitizedEmailField(serializers.EmailField):
    """
    EmailField with additional validation.
    """
    
    def to_internal_value(self, data):
        """Validate and sanitize email."""
        value = super().to_internal_value(data)
        validate_email(value)
        return value.lower()  # Normalize to lowercase


class SecurePasswordField(serializers.CharField):
    """
    Password field with strength validation.
    """
    
    def __init__(self, **kwargs):
        kwargs['write_only'] = True
        kwargs['style'] = {'input_type': 'password'}
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        """Validate password strength."""
        value = super().to_internal_value(data)
        validate_password_strength(value)
        return value