"""
User and authentication related models.
"""
import random
import string
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Uses email as the primary authentication field.
    """

    # Override email to make it required and unique
    email = models.EmailField(
        _("email address"),
        unique=True,
        error_messages={
            "unique": _("A user with that email already exists."),
        },
    )

    # Override the groups field to fix reverse accessor clash
    groups = models.ManyToManyField(
        "auth.Group",
        verbose_name=_("groups"),
        blank=True,
        help_text=_("The groups this user belongs to."),
        related_name="api_user_set",
        related_query_name="api_user",
    )

    # Override the user_permissions field to fix reverse accessor clash
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        verbose_name=_("user permissions"),
        blank=True,
        help_text=_("Specific permissions for this user."),
        related_name="api_user_set",
        related_query_name="api_user",
    )

    # Additional fields
    phone_number = models.CharField(
        _("phone number"),
        max_length=20,
        blank=True,
        help_text=_("Phone number in international format"),
    )

    date_of_birth = models.DateField(
        _("date of birth"),
        null=True,
        blank=True,
        help_text=_("Used for age-specific nutritional recommendations"),
    )

    # Account status fields
    is_verified = models.BooleanField(
        _("email verified"),
        default=False,
        help_text=_("Designates whether the user has verified their email address."),
    )

    verification_token = models.UUIDField(
        _("verification token"),
        default=uuid.uuid4,
        editable=False,
        help_text=_("Token used for email verification"),
    )

    # Two-factor authentication
    two_factor_enabled = models.BooleanField(
        _("2FA enabled"),
        default=False,
        help_text=_("Whether two-factor authentication is enabled for this user"),
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    last_login_ip = models.GenericIPAddressField(
        _("last login IP"),
        null=True,
        blank=True,
        help_text=_("IP address of last successful login"),
    )

    # Privacy settings
    is_profile_public = models.BooleanField(
        _("public profile"),
        default=False,
        help_text=_("Whether the user profile is visible to other users"),
    )

    # Account type for subscription management
    ACCOUNT_TYPES = [
        ("free", _("Free")),
        ("premium", _("Premium")),
        ("professional", _("Professional")),
    ]
    account_type = models.CharField(
        _("account type"),
        max_length=15,
        choices=ACCOUNT_TYPES,
        default="free",
        help_text=_("User account type determining available features"),
    )

    # Firebase integration
    firebase_uid = models.CharField(
        _("Firebase UID"),
        max_length=128,
        blank=True,
        null=True,
        unique=True,
        help_text=_("Firebase Authentication UID"),
    )

    # Social login avatar
    social_avatar_url = models.URLField(
        _("social avatar URL"),
        blank=True,
        help_text=_("Avatar URL from social login provider"),
    )

    # Use email as username for login
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        db_table = "auth_user"

    def __str__(self):
        return self.email

    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()

    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name

    @property
    def is_premium(self):
        """Check if user has premium account."""
        return self.account_type in ["premium", "professional"]

    @property
    def is_professional(self):
        """Check if user has professional account."""
        return self.account_type == "professional"

    def save(self, *args, **kwargs):
        """Custom save method to handle email normalization."""
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """
    Extended user profile with nutrition-specific information.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name=_("user"),
    )

    # Physical characteristics
    height = models.FloatField(
        _("height"),
        null=True,
        blank=True,
        validators=[MinValueValidator(0.5)],
        help_text=_("Height in meters"),
    )

    weight = models.FloatField(
        _("weight"),
        null=True,
        blank=True,
        validators=[MinValueValidator(20.0)],
        help_text=_("Weight in kilograms"),
    )

    # Gender choices
    GENDER_CHOICES = [
        ("male", _("Male")),
        ("female", _("Female")),
        ("other", _("Other")),
        ("prefer_not_to_say", _("Prefer not to say")),
    ]
    gender = models.CharField(
        _("gender"),
        max_length=20,
        choices=GENDER_CHOICES,
        blank=True,
        help_text=_("Used for gender-specific nutritional recommendations"),
    )

    # Activity level
    ACTIVITY_LEVELS = [
        ("sedentary", _("Sedentary (little or no exercise)")),
        ("lightly_active", _("Lightly active (light exercise/sports 1-3 days/week)")),
        ("moderately_active", _("Moderately active (moderate exercise/sports 3-5 days/week)")),
        ("very_active", _("Very active (hard exercise/sports 6-7 days a week)")),
        ("extra_active", _("Extra active (very hard exercise/sports & physical job)")),
    ]
    activity_level = models.CharField(
        _("activity level"),
        max_length=20,
        choices=ACTIVITY_LEVELS,
        default="moderately_active",
        help_text=_("Used for calorie calculations"),
    )

    # Goals
    GOALS = [
        ("lose_weight", _("Lose Weight")),
        ("maintain_weight", _("Maintain Weight")),
        ("gain_weight", _("Gain Weight")),
        ("build_muscle", _("Build Muscle")),
        ("improve_health", _("Improve Health")),
    ]
    goal = models.CharField(
        _("goal"),
        max_length=20,
        choices=GOALS,
        default="maintain_weight",
        help_text=_("Primary fitness/health goal"),
    )

    # Nutritional goals
    daily_calorie_goal = models.PositiveIntegerField(
        _("daily calorie goal"),
        default=2000,
        help_text=_("Daily calorie target"),
    )

    daily_protein_goal = models.DecimalField(
        _("daily protein goal"),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Daily protein target in grams"),
    )

    daily_carbs_goal = models.DecimalField(
        _("daily carbs goal"),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Daily carbohydrates target in grams"),
    )

    daily_fat_goal = models.DecimalField(
        _("daily fat goal"),
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Daily fat target in grams"),
    )

    # Preferences
    MEASUREMENT_SYSTEMS = [
        ("metric", _("Metric")),
        ("imperial", _("Imperial")),
    ]
    measurement_system = models.CharField(
        _("measurement system"),
        max_length=10,
        choices=MEASUREMENT_SYSTEMS,
        default="metric",
        help_text=_("Preferred measurement system"),
    )

    # Dietary restrictions
    dietary_restrictions = models.ManyToManyField(
        "DietaryRestriction",
        blank=True,
        verbose_name=_("dietary restrictions"),
        help_text=_("User's dietary restrictions and preferences"),
    )

    # Avatar
    avatar = models.ImageField(
        _("avatar"),
        upload_to="avatars/",
        null=True,
        blank=True,
        help_text=_("User profile picture"),
    )

    # Location
    country = models.CharField(
        _("country"),
        max_length=100,
        blank=True,
        help_text=_("User's country for locale-specific features"),
    )

    timezone = models.CharField(
        _("timezone"),
        max_length=50,
        blank=True,
        help_text=_("User's timezone for meal tracking"),
    )

    # Privacy settings
    share_progress = models.BooleanField(
        _("share progress"),
        default=False,
        help_text=_("Allow sharing progress with other users"),
    )

    # Notification preferences
    email_notifications = models.BooleanField(
        _("email notifications"),
        default=True,
        help_text=_("Receive email notifications"),
    )

    push_notifications = models.BooleanField(
        _("push notifications"),
        default=True,
        help_text=_("Receive push notifications"),
    )

    # Premium features
    is_premium = models.BooleanField(
        _("premium status"),
        default=False,
        help_text=_("Has premium subscription"),
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("User Profile")
        verbose_name_plural = _("User Profiles")
        db_table = "api_userprofile"

    def __str__(self):
        return f"{self.user.email} Profile"

    @property
    def bmi(self):
        """Calculate BMI if height and weight are available."""
        if self.height and self.weight:
            return self.weight / (self.height ** 2)
        return None

    @property
    def bmr(self):
        """Calculate Basal Metabolic Rate using Harris-Benedict equation."""
        if not all([self.weight, self.height, self.user.date_of_birth]):
            return None

        age = (timezone.now().date() - self.user.date_of_birth).days / 365.25
        weight_kg = self.weight
        height_cm = self.height * 100

        # Harris-Benedict equation
        if self.gender == "male":
            return 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
        elif self.gender == "female":
            return 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
        else:
            # Use average of male and female calculations
            male_bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
            female_bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
            return (male_bmr + female_bmr) / 2

    def get_daily_calorie_needs(self):
        """Calculate daily calorie needs based on BMR and activity level."""
        bmr = self.bmr
        if not bmr:
            return None

        activity_multipliers = {
            "sedentary": 1.2,
            "lightly_active": 1.375,
            "moderately_active": 1.55,
            "very_active": 1.725,
            "extra_active": 1.9,
        }

        multiplier = activity_multipliers.get(self.activity_level, 1.55)
        return bmr * multiplier


class DietaryRestriction(models.Model):
    """
    Dietary restrictions and preferences.
    """

    name = models.CharField(
        _("name"),
        max_length=100,
        unique=True,
        help_text=_("Name of dietary restriction"),
    )

    description = models.TextField(
        _("description"),
        blank=True,
        help_text=_("Detailed description of the restriction"),
    )

    # Categorization
    CATEGORIES = [
        ("allergy", _("Allergy")),
        ("intolerance", _("Intolerance")),
        ("diet", _("Diet")),
        ("preference", _("Preference")),
        ("religious", _("Religious")),
        ("medical", _("Medical")),
    ]
    category = models.CharField(
        _("category"),
        max_length=20,
        choices=CATEGORIES,
        default="preference",
        help_text=_("Type of dietary restriction"),
    )

    # Severity level
    SEVERITY_LEVELS = [
        ("mild", _("Mild")),
        ("moderate", _("Moderate")),
        ("severe", _("Severe")),
    ]
    severity = models.CharField(
        _("severity"),
        max_length=10,
        choices=SEVERITY_LEVELS,
        default="moderate",
        help_text=_("Severity level of restriction"),
    )

    # Common restrictions
    is_common = models.BooleanField(
        _("is common"),
        default=False,
        help_text=_("Whether this is a common dietary restriction"),
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("Dietary Restriction")
        verbose_name_plural = _("Dietary Restrictions")
        db_table = "api_dietaryrestriction"
        ordering = ["name"]

    def __str__(self):
        return self.name


class TOTPDevice(models.Model):
    """
    TOTP (Time-based One-Time Password) device for two-factor authentication.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="totp_devices",
        verbose_name=_("user"),
    )

    name = models.CharField(
        _("device name"),
        max_length=100,
        help_text=_("Human-readable name for the device"),
    )

    secret = models.CharField(
        _("secret key"),
        max_length=32,
        help_text=_("Base32 encoded secret key"),
    )

    confirmed = models.BooleanField(
        _("confirmed"),
        default=False,
        help_text=_("Whether the device has been confirmed"),
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("TOTP Device")
        verbose_name_plural = _("TOTP Devices")
        db_table = "api_totpdevice"

    def __str__(self):
        return f"{self.user.email} - {self.name}"

    def generate_secret(self):
        """Generate a new secret key."""
        self.secret = "".join(random.choices(string.ascii_uppercase + "234567", k=32))
        return self.secret

    def verify_token(self, token):
        """Verify a TOTP token."""
        import pyotp
        
        totp = pyotp.TOTP(self.secret)
        return totp.verify(token, valid_window=1)


class BackupCode(models.Model):
    """
    Backup codes for two-factor authentication.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="backup_codes",
        verbose_name=_("user"),
    )

    code = models.CharField(
        _("backup code"),
        max_length=12,
        unique=True,
        help_text=_("8-digit backup code"),
    )

    used = models.BooleanField(
        _("used"),
        default=False,
        help_text=_("Whether the code has been used"),
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    used_at = models.DateTimeField(
        _("used at"),
        null=True,
        blank=True,
        help_text=_("When the code was used"),
    )

    class Meta:
        verbose_name = _("Backup Code")
        verbose_name_plural = _("Backup Codes")
        db_table = "api_backupcode"
        indexes = [
            models.Index(fields=["user", "used"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.code}"

    def generate_code(self):
        """Generate a new backup code."""
        self.code = "".join(random.choices(string.digits, k=8))
        return self.code

    def use(self):
        """Mark the code as used."""
        self.used = True
        self.used_at = timezone.now()
        self.save()


class BlacklistedToken(models.Model):
    """
    Blacklisted JWT tokens for logout functionality.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="blacklisted_tokens",
        verbose_name=_("user"),
    )

    token_hash = models.CharField(
        _("token hash"),
        max_length=64,
        unique=True,
        help_text=_("SHA256 hash of the token"),
    )

    token_type = models.CharField(
        _("token type"),
        max_length=10,
        choices=[
            ("access", _("Access Token")),
            ("refresh", _("Refresh Token")),
        ],
        default="refresh",
        help_text=_("Type of token"),
    )

    reason = models.CharField(
        _("reason"),
        max_length=50,
        choices=[
            ("logout", _("User Logout")),
            ("password_change", _("Password Change")),
            ("account_disabled", _("Account Disabled")),
            ("security_breach", _("Security Breach")),
        ],
        default="logout",
        help_text=_("Reason for blacklisting"),
    )

    expires_at = models.DateTimeField(
        _("expires at"),
        help_text=_("When the token would have expired"),
    )

    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
        help_text=_("IP address when token was blacklisted"),
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Blacklisted Token")
        verbose_name_plural = _("Blacklisted Tokens")
        db_table = "api_blacklistedtoken"
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.token_type} token"

    def is_expired(self):
        """Check if the token would have expired anyway."""
        return timezone.now() > self.expires_at


class SMSOTPCode(models.Model):
    """
    SMS OTP codes for phone verification.
    """

    phone_number = models.CharField(
        _("phone number"),
        max_length=20,
        help_text=_("Phone number in international format"),
    )

    code = models.CharField(
        _("OTP code"),
        max_length=6,
        help_text=_("6-digit OTP code"),
    )

    is_verified = models.BooleanField(
        _("is verified"),
        default=False,
        help_text=_("Whether the code has been verified"),
    )

    attempts = models.PositiveIntegerField(
        _("attempts"),
        default=0,
        help_text=_("Number of verification attempts"),
    )

    max_attempts = models.PositiveIntegerField(
        _("max attempts"),
        default=3,
        help_text=_("Maximum number of verification attempts"),
    )

    expires_at = models.DateTimeField(
        _("expires at"),
        help_text=_("When the code expires"),
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    verified_at = models.DateTimeField(
        _("verified at"),
        null=True,
        blank=True,
        help_text=_("When the code was verified"),
    )

    # Metadata
    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
        help_text=_("IP address when OTP was requested"),
    )

    user_agent = models.CharField(
        _("user agent"),
        max_length=500,
        blank=True,
        help_text=_("User agent when OTP was requested"),
    )

    class Meta:
        verbose_name = _("SMS OTP Code")
        verbose_name_plural = _("SMS OTP Codes")
        db_table = "api_smsotpcode"
        indexes = [
            models.Index(fields=["phone_number", "created_at"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.phone_number} - {self.code}"

    def generate_code(self):
        """Generate a new 6-digit OTP code."""
        self.code = "".join(random.choices(string.digits, k=6))
        self.expires_at = timezone.now() + timedelta(minutes=10)
        return self.code

    def is_expired(self):
        """Check if the code has expired."""
        return timezone.now() > self.expires_at

    def can_verify(self):
        """Check if the code can be verified."""
        return not self.is_expired() and not self.is_verified and self.attempts < self.max_attempts

    def verify(self, code):
        """Verify the OTP code."""
        self.attempts += 1
        
        if not self.can_verify():
            return False
        
        if self.code == code:
            self.is_verified = True
            self.verified_at = timezone.now()
            self.save()
            return True
        
        self.save()
        return False


class SMSRateLimit(models.Model):
    """
    Rate limiting for SMS OTP requests.
    """

    phone_number = models.CharField(
        _("phone number"),
        max_length=20,
        help_text=_("Phone number in international format"),
    )

    requests_count = models.PositiveIntegerField(
        _("requests count"),
        default=0,
        help_text=_("Number of OTP requests in the current window"),
    )

    window_start = models.DateTimeField(
        _("window start"),
        help_text=_("Start of the current rate limit window"),
    )

    # Rate limiting settings
    max_requests = models.PositiveIntegerField(
        _("max requests"),
        default=5,
        help_text=_("Maximum requests allowed in the window"),
    )

    window_duration = models.DurationField(
        _("window duration"),
        default=timedelta(hours=1),
        help_text=_("Duration of the rate limit window"),
    )

    # Metadata
    ip_address = models.GenericIPAddressField(
        _("IP address"),
        null=True,
        blank=True,
        help_text=_("IP address for additional rate limiting"),
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("SMS Rate Limit")
        verbose_name_plural = _("SMS Rate Limits")
        db_table = "api_smsratelimit"
        indexes = [
            models.Index(fields=["phone_number", "window_start"]),
            models.Index(fields=["ip_address", "window_start"]),
        ]

    def __str__(self):
        return f"{self.phone_number} - {self.requests_count}/{self.max_requests}"

    def is_rate_limited(self):
        """Check if the phone number is rate limited."""
        if self.is_window_expired():
            self.reset_window()
        
        return self.requests_count >= self.max_requests

    def is_window_expired(self):
        """Check if the rate limit window has expired."""
        return timezone.now() > self.window_start + self.window_duration

    def reset_window(self):
        """Reset the rate limit window."""
        self.requests_count = 0
        self.window_start = timezone.now()
        self.save()

    def increment(self):
        """Increment the request count."""
        if self.is_window_expired():
            self.reset_window()
        
        self.requests_count += 1
        self.save()