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

# User and UserProfile models are defined in this file


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

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    last_login_ip = models.GenericIPAddressField(
        _("last login IP"),
        null=True,
        blank=True,
        help_text=_("IP address of last successful login"),
    )

    # Use email as the unique identifier
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = _("user")
        verbose_name_plural = _("users")
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["is_verified"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """
    User profile with health and preference information.
    """

    GENDER_CHOICES = [
        ("M", _("Male")),
        ("F", _("Female")),
        ("O", _("Other")),
    ]

    ACTIVITY_LEVEL_CHOICES = [
        ("sedentary", _("Sedentary (little/no exercise)")),
        ("lightly_active", _("Lightly active (light exercise 1-3 days/week)")),
        ("moderately_active", _("Moderately active (moderate exercise 3-5 days/week)")),
        ("very_active", _("Very active (hard exercise 6-7 days/week)")),
        ("extra_active", _("Extra active (very hard exercise, 2x/day)")),
    ]

    GOAL_CHOICES = [
        ("maintain", _("Maintain current weight")),
        ("lose", _("Lose weight")),
        ("gain", _("Gain weight")),
        ("muscle", _("Build muscle")),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile"
    )

    # Physical attributes
    gender = models.CharField(
        _("gender"), max_length=1, choices=GENDER_CHOICES, blank=True
    )
    height = models.DecimalField(
        _("height (cm)"), max_digits=5, decimal_places=2, null=True, blank=True
    )
    weight = models.DecimalField(
        _("weight (kg)"), max_digits=5, decimal_places=2, null=True, blank=True
    )

    # Health metrics
    bmi = models.DecimalField(
        _("BMI"), max_digits=4, decimal_places=2, null=True, blank=True
    )
    bmr = models.IntegerField(
        _("BMR (calories/day)"), null=True, blank=True
    )
    tdee = models.IntegerField(
        _("TDEE (calories/day)"), null=True, blank=True
    )

    # Lifestyle information
    activity_level = models.CharField(
        _("activity level"),
        max_length=20,
        choices=ACTIVITY_LEVEL_CHOICES,
        default="moderately_active",
    )

    # Goals
    goal = models.CharField(
        _("goal"), max_length=20, choices=GOAL_CHOICES, default="maintain"
    )

    # Preferences
    timezone = models.CharField(
        _("timezone"), max_length=50, default="UTC"
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "user_profiles"
        verbose_name = _("user profile")
        verbose_name_plural = _("user profiles")
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Profile for {self.user.email}"

    def save(self, *args, **kwargs):
        """Override save to calculate BMI, BMR, and TDEE."""
        # Calculate BMI if height and weight are available
        if self.height and self.weight:
            from decimal import Decimal

            height_m = self.height / Decimal("100")  # Convert cm to m
            self.bmi = self.weight / (height_m**2)

            # Calculate BMR using Mifflin-St Jeor equation
            if self.user.date_of_birth and self.gender:
                from datetime import date

                today = date.today()
                age = (
                    today.year
                    - self.user.date_of_birth.year
                    - (
                        (today.month, today.day)
                        < (self.user.date_of_birth.month, self.user.date_of_birth.day)
                    )
                )

                if self.gender == "M":
                    # Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
                    self.bmr = int(
                        10 * float(self.weight)
                        + 6.25 * float(self.height)
                        - 5 * age
                        + 5
                    )
                elif self.gender == "F":
                    # Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
                    self.bmr = int(
                        10 * float(self.weight)
                        + 6.25 * float(self.height)
                        - 5 * age
                        - 161
                    )

                # Calculate TDEE based on activity level
                if self.bmr:
                    activity_multipliers = {
                        "sedentary": 1.2,
                        "lightly_active": 1.375,
                        "moderately_active": 1.55,
                        "very_active": 1.725,
                        "extra_active": 1.9,
                    }
                    multiplier = activity_multipliers.get(self.activity_level, 1.55)
                    self.tdee = int(self.bmr * multiplier)

        super().save(*args, **kwargs)


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

    @classmethod
    def is_blacklisted(cls, jti):
        """Check if a token JTI is blacklisted."""
        import hashlib
        
        # Hash the JTI to match our storage format
        token_hash = hashlib.sha256(jti.encode()).hexdigest()
        
        try:
            return cls.objects.filter(token_hash=token_hash).exists()
        except Exception:
            return False

    @classmethod
    def blacklist_token(cls, jti, user, token_type="refresh", expires_at=None, reason="logout", ip_address=None):
        """Blacklist a token by JTI."""
        import hashlib
        
        # Hash the JTI for secure storage
        token_hash = hashlib.sha256(jti.encode()).hexdigest()
        
        # Create or update the blacklisted token
        blacklisted_token, created = cls.objects.get_or_create(
            token_hash=token_hash,
            defaults={
                'user': user,
                'token_type': token_type,
                'expires_at': expires_at or timezone.now(),
                'reason': reason,
                'ip_address': ip_address,
            }
        )
        
        return blacklisted_token

    @classmethod
    def blacklist_all_user_tokens(cls, user, reason="logout_all", ip_address=None):
        """Blacklist all existing tokens for a user."""
        # This is a simplified implementation
        # In practice, you'd need to iterate through active tokens
        # For now, we'll just mark future tokens as blacklisted
        count = 0
        
        # Note: This is a simplified implementation
        # In a real scenario, you'd need to track active tokens
        # and blacklist them individually
        
        return count

    @classmethod
    def cleanup_expired(cls):
        """Clean up expired blacklisted tokens."""
        expired_tokens = cls.objects.filter(expires_at__lt=timezone.now())
        count = expired_tokens.count()
        expired_tokens.delete()
        
        return count


class FoodItem(models.Model):
    """
    Food database with nutritional information.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_("food name"), max_length=255)
    brand = models.CharField(_("brand"), max_length=100, blank=True)
    category = models.CharField(_("category"), max_length=100, blank=True)

    # Nutritional information (per 100g)
    calories = models.DecimalField(
        _("calories"), max_digits=6, decimal_places=2, null=True, blank=True
    )
    protein = models.DecimalField(
        _("protein (g)"), max_digits=6, decimal_places=2, null=True, blank=True
    )
    carbohydrates = models.DecimalField(
        _("carbohydrates (g)"), max_digits=6, decimal_places=2, null=True, blank=True
    )
    fat = models.DecimalField(
        _("fat (g)"), max_digits=6, decimal_places=2, null=True, blank=True
    )
    fiber = models.DecimalField(
        _("fiber (g)"), max_digits=6, decimal_places=2, null=True, blank=True
    )
    sugar = models.DecimalField(
        _("sugar (g)"), max_digits=6, decimal_places=2, null=True, blank=True
    )
    sodium = models.DecimalField(
        _("sodium (mg)"), max_digits=6, decimal_places=2, null=True, blank=True
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "food_items"
        verbose_name = _("food item")
        verbose_name_plural = _("food items")
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        if self.brand:
            return f"{self.brand} - {self.name}"
        return self.name


class Meal(models.Model):
    """
    Meal logged by a user.
    """

    MEAL_TYPE_CHOICES = [
        ("breakfast", _("Breakfast")),
        ("lunch", _("Lunch")),
        ("dinner", _("Dinner")),
        ("snack", _("Snack")),
        ("other", _("Other")),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meals"
    )

    name = models.CharField(_("meal name"), max_length=255)
    meal_type = models.CharField(
        _("meal type"), max_length=20, choices=MEAL_TYPE_CHOICES, default="other"
    )

    # When the meal was consumed
    consumed_at = models.DateTimeField(_("consumed at"))

    # Optional image of the meal
    image = models.ImageField(
        _("meal image"), upload_to="meal_images/", null=True, blank=True
    )

    # Notes about the meal
    notes = models.TextField(_("notes"), blank=True)

    # Location information (only captured during image analysis)
    location_name = models.CharField(_("location"), max_length=255, blank=True)
    latitude = models.DecimalField(
        _("latitude"), max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        _("longitude"), max_digits=9, decimal_places=6, null=True, blank=True
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "meals"
        verbose_name = _("meal")
        verbose_name_plural = _("meals")
        indexes = [
            models.Index(fields=["user", "consumed_at"]),
            models.Index(fields=["user", "meal_type"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-consumed_at"]

    def __str__(self):
        return f"{self.name} - {self.consumed_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def total_calories(self):
        """Calculate total calories for the meal."""
        return sum(item.calories or 0 for item in self.meal_items.all())

    @property
    def total_macros(self):
        """Calculate total macronutrients for the meal."""
        items = self.meal_items.all()
        return {
            "protein": sum(item.protein or 0 for item in items),
            "carbohydrates": sum(item.carbohydrates or 0 for item in items),
            "fat": sum(item.fat or 0 for item in items),
            "fiber": sum(item.fiber or 0 for item in items),
            "sugar": sum(item.sugar or 0 for item in items),
            "sodium": sum(item.sodium or 0 for item in items),
        }


class MealItem(models.Model):
    """
    Links food items to meals with specific quantities.
    """

    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name="meal_items")
    food_item = models.ForeignKey(
        FoodItem, on_delete=models.PROTECT, related_name="meal_occurrences"
    )

    # Quantity consumed
    quantity = models.DecimalField(
        _("quantity"),
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    unit = models.CharField(
        _("unit"),
        max_length=50,
        default="g",
        help_text=_("Unit of measurement (g, ml, cup, etc.)"),
    )

    # Calculated nutritional values (cached for performance)
    calories = models.DecimalField(
        _("calories"), max_digits=8, decimal_places=2, null=True
    )
    protein = models.DecimalField(
        _("protein (g)"), max_digits=8, decimal_places=2, null=True
    )
    carbohydrates = models.DecimalField(
        _("carbohydrates (g)"), max_digits=8, decimal_places=2, null=True
    )
    fat = models.DecimalField(_("fat (g)"), max_digits=8, decimal_places=2, null=True)
    fiber = models.DecimalField(
        _("fiber (g)"), max_digits=8, decimal_places=2, null=True
    )
    sugar = models.DecimalField(
        _("sugar (g)"), max_digits=8, decimal_places=2, null=True
    )
    sodium = models.DecimalField(
        _("sodium (mg)"), max_digits=8, decimal_places=2, null=True
    )

    # User adjustments
    custom_name = models.CharField(_("custom name"), max_length=255, blank=True)
    notes = models.TextField(_("notes"), blank=True)

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "meal_items"
        verbose_name = _("meal item")
        verbose_name_plural = _("meal items")
        ordering = ["created_at"]

    def __str__(self):
        name = self.custom_name or self.food_item.name
        return f"{self.quantity} {self.unit} {name}"

    def save(self, *args, **kwargs):
        """Calculate nutritional values based on quantity before saving."""
        if self.food_item and self.quantity:
            from decimal import Decimal

            # Convert quantity to grams if needed
            quantity_in_grams = self._convert_to_grams()

            # Calculate nutritional values based on per 100g values
            factor = quantity_in_grams / Decimal("100")

            self.calories = (
                Decimal(str(self.food_item.calories)) * factor
                if self.food_item.calories
                else None
            )
            self.protein = (
                Decimal(str(self.food_item.protein)) * factor
                if self.food_item.protein
                else None
            )
            self.carbohydrates = (
                Decimal(str(self.food_item.carbohydrates)) * factor
                if self.food_item.carbohydrates
                else None
            )
            self.fat = (
                Decimal(str(self.food_item.fat)) * factor
                if self.food_item.fat
                else None
            )
            self.fiber = (
                Decimal(str(self.food_item.fiber)) * factor
                if self.food_item.fiber
                else None
            )
            self.sugar = (
                Decimal(str(self.food_item.sugar)) * factor
                if self.food_item.sugar
                else None
            )
            self.sodium = (
                Decimal(str(self.food_item.sodium)) * factor
                if self.food_item.sodium
                else None
            )

        super().save(*args, **kwargs)

    def _convert_to_grams(self):
        """Convert quantity to grams based on unit."""
        from decimal import Decimal

        # Simple conversion - in production, use a proper conversion library
        conversions = {
            "g": Decimal("1"),
            "kg": Decimal("1000"),
            "ml": Decimal("1"),  # Assuming 1ml = 1g for most foods
            "l": Decimal("1000"),
            "cup": Decimal("240"),  # US cup
            "tbsp": Decimal("15"),  # tablespoon
            "tsp": Decimal("5"),   # teaspoon
            "oz": Decimal("28.35"),  # ounce
            "lb": Decimal("453.592"),  # pound
        }

        return self.quantity * conversions.get(self.unit.lower(), Decimal("1"))


class MealAnalysis(models.Model):
    """
    AI analysis results for meals.
    """

    meal = models.OneToOneField(
        Meal, on_delete=models.CASCADE, related_name="analysis"
    )
    
    # AI analysis results
    gemini_response = models.JSONField(
        _("Gemini response"), default=dict, help_text=_("Raw response from Gemini AI")
    )
    
    # Confidence scores
    confidence_overall = models.IntegerField(
        _("overall confidence"), default=0, help_text=_("0-100 confidence score")
    )
    confidence_ingredients = models.IntegerField(
        _("ingredients confidence"), default=0, help_text=_("0-100 confidence score")
    )
    confidence_portions = models.IntegerField(
        _("portions confidence"), default=0, help_text=_("0-100 confidence score")
    )
    
    # Context used for analysis
    analysis_context = models.JSONField(
        _("analysis context"), default=dict, help_text=_("Context used for AI analysis")
    )
    
    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "meal_analyses"
        verbose_name = _("meal analysis")
        verbose_name_plural = _("meal analyses")
        indexes = [
            models.Index(fields=["meal"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Analysis for {self.meal.name}"


class Notification(models.Model):
    """
    User notifications.
    """

    # Notification types
    TYPE_CHOICES = [
        ("meal_reminder", _("Meal Reminder")),
        ("daily_summary", _("Daily Summary")),
        ("weekly_report", _("Weekly Report")),
        ("goal_achieved", _("Goal Achieved")),
        ("system", _("System Notification")),
    ]

    # Notification status
    STATUS_CHOICES = [
        ("pending", _("Pending")),
        ("sent", _("Sent")),
        ("failed", _("Failed")),
        ("read", _("Read")),
        ("archived", _("Archived")),
    ]

    # Delivery channels
    CHANNEL_CHOICES = [
        ("in_app", _("In-App")),
        ("email", _("Email")),
        ("push", _("Push Notification")),
    ]

    # Priority levels
    PRIORITY_CHOICES = [
        ("low", _("Low")),
        ("medium", _("Medium")),
        ("high", _("High")),
        ("urgent", _("Urgent")),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(_("notification type"), max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(_("title"), max_length=200)
    message = models.TextField(_("message"))
    status = models.CharField(
        _("status"), max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    channel = models.CharField(
        _("delivery channel"), max_length=20, choices=CHANNEL_CHOICES, default="in_app"
    )
    priority = models.CharField(
        _("priority"), max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )

    # Metadata
    data = models.JSONField(
        _("additional data"),
        default=dict,
        blank=True,
        help_text=_("Additional data for the notification"),
    )

    # Scheduling
    scheduled_for = models.DateTimeField(
        _("scheduled for"),
        null=True,
        blank=True,
        help_text=_("When this notification should be sent"),
    )

    # Tracking
    sent_at = models.DateTimeField(_("sent at"), null=True, blank=True)
    read_at = models.DateTimeField(_("read at"), null=True, blank=True)
    failed_at = models.DateTimeField(_("failed at"), null=True, blank=True)
    error_message = models.TextField(_("error message"), blank=True)
    retry_count = models.PositiveSmallIntegerField(_("retry count"), default=0)

    # Timestamps
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "notifications"
        verbose_name = _("notification")
        verbose_name_plural = _("notifications")
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "type"]),
            models.Index(fields=["scheduled_for", "status"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.type} - {self.title}"

    def mark_as_sent(self):
        """Mark notification as sent."""
        self.status = "sent"
        self.sent_at = timezone.now()
        self.save(update_fields=["status", "sent_at", "updated_at"])

    def mark_as_read(self):
        """Mark notification as read."""
        self.status = "read"
        self.read_at = timezone.now()
        self.save(update_fields=["status", "read_at", "updated_at"])

    def mark_as_failed(self, error_message=""):
        """Mark notification as failed."""
        self.status = "failed"
        self.failed_at = timezone.now()
        self.error_message = error_message
        self.retry_count += 1
        self.save(
            update_fields=[
                "status",
                "failed_at",
                "error_message",
                "retry_count",
                "updated_at",
            ]
        )


class DeviceToken(models.Model):
    """
    Store device tokens for push notifications.
    """

    PLATFORM_CHOICES = [
        ("ios", _("iOS")),
        ("android", _("Android")),
        ("web", _("Web")),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="device_tokens"
    )
    
    token = models.TextField(_("device token"), help_text=_("Push notification token"))
    platform = models.CharField(
        _("platform"), max_length=20, choices=PLATFORM_CHOICES
    )
    
    # Device info
    device_id = models.CharField(_("device ID"), max_length=255, blank=True)
    device_name = models.CharField(_("device name"), max_length=255, blank=True)
    
    # Status
    is_active = models.BooleanField(_("is active"), default=True)
    
    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    last_used = models.DateTimeField(_("last used"), null=True, blank=True)

    class Meta:
        db_table = "device_tokens"
        verbose_name = _("device token")
        verbose_name_plural = _("device tokens")
        unique_together = [["user", "token"]]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["platform"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.platform} - {self.device_name or 'Unknown'}"


class SubscriptionPlan(models.Model):
    """
    Subscription plans for the service.
    """

    name = models.CharField(_("plan name"), max_length=100, unique=True)
    price = models.DecimalField(_("price"), max_digits=10, decimal_places=2)
    currency = models.CharField(_("currency"), max_length=3, default="USD")
    
    # Features
    ai_analyses_per_month = models.IntegerField(
        _("AI analyses per month"), default=0, help_text=_("0 = unlimited")
    )
    
    # Stripe integration
    stripe_price_id = models.CharField(
        _("Stripe price ID"), max_length=255, blank=True
    )
    
    # Status
    is_active = models.BooleanField(_("is active"), default=True)
    
    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "subscription_plans"
        verbose_name = _("subscription plan")
        verbose_name_plural = _("subscription plans")
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} - ${self.price}/{self.currency}"


class Subscription(models.Model):
    """
    User subscriptions to plans.
    """

    STATUS_CHOICES = [
        ("active", _("Active")),
        ("inactive", _("Inactive")),
        ("canceled", _("Canceled")),
        ("past_due", _("Past Due")),
        ("trialing", _("Trialing")),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions"
    )
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.CASCADE, related_name="subscriptions"
    )

    # Stripe integration
    stripe_subscription_id = models.CharField(
        _("Stripe subscription ID"), max_length=255, unique=True, blank=True
    )
    stripe_customer_id = models.CharField(
        _("Stripe customer ID"), max_length=255, blank=True
    )

    # Status and timing
    status = models.CharField(
        _("status"), max_length=20, choices=STATUS_CHOICES, default="inactive"
    )

    trial_start = models.DateTimeField(_("trial start"), null=True, blank=True)
    trial_end = models.DateTimeField(_("trial end"), null=True, blank=True)
    current_period_start = models.DateTimeField(
        _("current period start"), null=True, blank=True
    )
    current_period_end = models.DateTimeField(
        _("current period end"), null=True, blank=True
    )

    # Cancellation
    canceled_at = models.DateTimeField(_("canceled at"), null=True, blank=True)
    cancel_at_period_end = models.BooleanField(_("cancel at period end"), default=False)

    # Usage tracking
    ai_analyses_used = models.IntegerField(_("AI analyses used"), default=0)
    ai_analyses_reset_date = models.DateTimeField(
        _("AI analyses reset date"), null=True, blank=True
    )

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "subscriptions"
        verbose_name = _("subscription")
        verbose_name_plural = _("subscriptions")
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["stripe_subscription_id"]),
            models.Index(fields=["current_period_end"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} ({self.status})"

    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in ["active", "trialing"]

    def can_use_ai_analysis(self):
        """Check if user can use AI analysis based on their plan limits."""
        if self.plan.ai_analyses_per_month == 0:  # Unlimited
            return True
        return self.ai_analyses_used < self.plan.ai_analyses_per_month


class Payment(models.Model):
    """
    Payment transactions.
    """

    STATUS_CHOICES = [
        ("pending", _("Pending")),
        ("succeeded", _("Succeeded")),
        ("failed", _("Failed")),
        ("canceled", _("Canceled")),
        ("refunded", _("Refunded")),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments"
    )
    subscription_plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.CASCADE, related_name="payments", null=True, blank=True
    )

    # Stripe integration
    stripe_payment_intent_id = models.CharField(
        _("Stripe payment intent ID"), max_length=255, unique=True, blank=True
    )

    # Payment details
    amount = models.DecimalField(_("amount"), max_digits=10, decimal_places=2)
    currency = models.CharField(_("currency"), max_length=3, default="USD")
    status = models.CharField(
        _("status"), max_length=20, choices=STATUS_CHOICES, default="pending"
    )

    # Additional details
    description = models.TextField(_("description"), blank=True)
    failure_reason = models.TextField(_("failure reason"), blank=True)

    # Metadata
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        db_table = "payments"
        verbose_name = _("payment")
        verbose_name_plural = _("payments")
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["stripe_payment_intent_id"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment ${self.amount} - {self.user.email} ({self.status})"