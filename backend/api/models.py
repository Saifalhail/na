from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Uses email as the primary authentication field.
    """
    
    # Override email to make it required and unique
    email = models.EmailField(
        _('email address'),
        unique=True,
        error_messages={
            'unique': _("A user with that email already exists."),
        },
    )
    
    # Override the groups field to fix reverse accessor clash
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_('The groups this user belongs to.'),
        related_name='api_user_set',
        related_query_name='api_user',
    )
    
    # Override the user_permissions field to fix reverse accessor clash
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='api_user_set',
        related_query_name='api_user',
    )
    
    # Additional fields
    phone_number = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True,
        help_text=_('Phone number in international format')
    )
    
    date_of_birth = models.DateField(
        _('date of birth'),
        null=True,
        blank=True,
        help_text=_('Used for age-specific nutritional recommendations')
    )
    
    # Account status fields
    is_verified = models.BooleanField(
        _('email verified'),
        default=False,
        help_text=_('Designates whether the user has verified their email address.')
    )
    
    verification_token = models.UUIDField(
        _('verification token'),
        default=uuid.uuid4,
        editable=False,
        help_text=_('Token used for email verification')
    )
    
    # Two-factor authentication
    two_factor_enabled = models.BooleanField(
        _('2FA enabled'),
        default=False,
        help_text=_('Whether two-factor authentication is enabled for this user')
    )
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    last_login_ip = models.GenericIPAddressField(
        _('last login IP'),
        null=True,
        blank=True,
        help_text=_('IP address of last successful login')
    )
    
    # Privacy settings
    is_profile_public = models.BooleanField(
        _('public profile'),
        default=False,
        help_text=_('Whether the user profile is visible to other users')
    )
    
    # Subscription/Account type
    ACCOUNT_TYPE_CHOICES = [
        ('free', _('Free')),
        ('premium', _('Premium')),
        ('professional', _('Professional')),
    ]
    
    account_type = models.CharField(
        _('account type'),
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        default='free',
        help_text=_('User subscription level')
    )
    
    # Use email as the primary authentication field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['account_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.email
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.email.split('@')[0]


class UserProfile(models.Model):
    """
    Extended user profile information.
    Stores additional user data that doesn't belong in the auth user model.
    """
    
    GENDER_CHOICES = [
        ('M', _('Male')),
        ('F', _('Female')),
        ('O', _('Other')),
        ('N', _('Prefer not to say')),
    ]
    
    ACTIVITY_LEVEL_CHOICES = [
        ('sedentary', _('Sedentary (little or no exercise)')),
        ('lightly_active', _('Lightly active (exercise 1-3 days/week)')),
        ('moderately_active', _('Moderately active (exercise 3-5 days/week)')),
        ('very_active', _('Very active (exercise 6-7 days/week)')),
        ('extra_active', _('Extra active (very hard exercise daily)')),
    ]
    
    MEASUREMENT_SYSTEM_CHOICES = [
        ('metric', _('Metric (kg, cm)')),
        ('imperial', _('Imperial (lbs, inches)')),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        primary_key=True
    )
    
    # Physical attributes
    gender = models.CharField(
        _('gender'),
        max_length=1,
        choices=GENDER_CHOICES,
        blank=True,
        help_text=_('Used for nutritional calculations')
    )
    
    height = models.DecimalField(
        _('height'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Height in centimeters')
    )
    
    weight = models.DecimalField(
        _('weight'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Weight in kilograms')
    )
    
    activity_level = models.CharField(
        _('activity level'),
        max_length=20,
        choices=ACTIVITY_LEVEL_CHOICES,
        default='moderately_active',
        help_text=_('Physical activity level for calorie calculations')
    )
    
    # Goals and preferences
    daily_calorie_goal = models.PositiveIntegerField(
        _('daily calorie goal'),
        null=True,
        blank=True,
        help_text=_('Target daily calorie intake')
    )
    
    daily_protein_goal = models.DecimalField(
        _('daily protein goal'),
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text=_('Target daily protein intake in grams')
    )
    
    daily_carbs_goal = models.DecimalField(
        _('daily carbohydrates goal'),
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text=_('Target daily carbohydrate intake in grams')
    )
    
    daily_fat_goal = models.DecimalField(
        _('daily fat goal'),
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        help_text=_('Target daily fat intake in grams')
    )
    
    # User preferences
    measurement_system = models.CharField(
        _('measurement system'),
        max_length=10,
        choices=MEASUREMENT_SYSTEM_CHOICES,
        default='metric',
        help_text=_('Preferred measurement system')
    )
    
    timezone = models.CharField(
        _('timezone'),
        max_length=50,
        default='UTC',
        help_text=_('User timezone for meal logging')
    )
    
    language = models.CharField(
        _('preferred language'),
        max_length=10,
        default='en',
        help_text=_('Language preference for the app')
    )
    
    # Bio and social
    bio = models.TextField(
        _('biography'),
        max_length=500,
        blank=True,
        help_text=_('A brief description about the user')
    )
    
    avatar = models.ImageField(
        _('avatar'),
        upload_to='avatars/',
        null=True,
        blank=True,
        help_text=_('User profile picture')
    )
    
    social_avatar_url = models.URLField(
        _('social avatar URL'),
        max_length=500,
        blank=True,
        help_text=_('Avatar URL from social provider')
    )
    
    # Privacy and notifications
    receive_email_notifications = models.BooleanField(
        _('receive email notifications'),
        default=True
    )
    
    receive_push_notifications = models.BooleanField(
        _('receive push notifications'),
        default=True
    )
    
    show_nutritional_info_publicly = models.BooleanField(
        _('show nutritional info publicly'),
        default=False,
        help_text=_('Whether to display nutritional data on public profile')
    )
    
    # Detailed notification preferences
    notification_preferences = models.JSONField(
        _('notification preferences'),
        default=dict,
        blank=True,
        help_text=_('Detailed preferences for different notification types')
    )
    
    # Meal reminder times (stored as JSON array of time strings)
    meal_reminder_times = models.JSONField(
        _('meal reminder times'),
        default=list,
        blank=True,
        help_text=_('Times for meal reminders (e.g., ["08:00", "12:00", "18:00"])')
    )
    
    # Email notification preferences
    email_daily_summary = models.BooleanField(
        _('email daily summary'),
        default=True,
        help_text=_('Receive daily nutrition summary via email')
    )
    
    email_weekly_report = models.BooleanField(
        _('email weekly report'),
        default=True,
        help_text=_('Receive weekly progress report via email')
    )
    
    email_tips = models.BooleanField(
        _('email nutrition tips'),
        default=True,
        help_text=_('Receive nutrition tips and recommendations via email')
    )
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # Calculated fields (cached for performance)
    bmi = models.DecimalField(
        _('BMI'),
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        editable=False,
        help_text=_('Body Mass Index (calculated automatically)')
    )
    
    bmr = models.PositiveIntegerField(
        _('BMR'),
        null=True,
        blank=True,
        editable=False,
        help_text=_('Basal Metabolic Rate (calculated automatically)')
    )
    
    tdee = models.PositiveIntegerField(
        _('TDEE'),
        null=True,
        blank=True,
        editable=False,
        help_text=_('Total Daily Energy Expenditure (calculated automatically)')
    )
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = _('user profile')
        verbose_name_plural = _('user profiles')
        indexes = [
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Profile for {self.user.email}"
    
    def save(self, *args, **kwargs):
        """Override save to calculate BMI, BMR, and TDEE."""
        # Calculate BMI if height and weight are available
        if self.height and self.weight:
            from decimal import Decimal
            height_m = self.height / Decimal('100')  # Convert cm to m
            self.bmi = self.weight / (height_m ** 2)
            
            # Calculate BMR using Mifflin-St Jeor equation
            if self.user.date_of_birth and self.gender:
                from datetime import date
                today = date.today()
                age = today.year - self.user.date_of_birth.year - (
                    (today.month, today.day) < 
                    (self.user.date_of_birth.month, self.user.date_of_birth.day)
                )
                
                if self.gender == 'M':
                    # Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
                    self.bmr = int(10 * float(self.weight) + 6.25 * float(self.height) - 5 * age + 5)
                elif self.gender == 'F':
                    # Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
                    self.bmr = int(10 * float(self.weight) + 6.25 * float(self.height) - 5 * age - 161)
                
                # Calculate TDEE based on activity level
                if self.bmr:
                    activity_multipliers = {
                        'sedentary': 1.2,
                        'lightly_active': 1.375,
                        'moderately_active': 1.55,
                        'very_active': 1.725,
                        'extra_active': 1.9,
                    }
                    multiplier = activity_multipliers.get(self.activity_level, 1.55)
                    self.tdee = int(self.bmr * multiplier)
        
        super().save(*args, **kwargs)
    
    def get_age(self):
        """Calculate user's age from date of birth."""
        if self.user.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - self.user.date_of_birth.year - (
                (today.month, today.day) < 
                (self.user.date_of_birth.month, self.user.date_of_birth.day)
            )
        return None
    
    def get_weight_in_preferred_unit(self):
        """Return weight in user's preferred measurement system."""
        if self.weight:
            if self.measurement_system == 'imperial':
                return float(self.weight) * 2.20462  # kg to lbs
            return float(self.weight)
        return None
    
    def get_height_in_preferred_unit(self):
        """Return height in user's preferred measurement system."""
        if self.height:
            if self.measurement_system == 'imperial':
                return float(self.height) * 0.393701  # cm to inches
            return float(self.height)
        return None


class DietaryRestriction(models.Model):
    """
    User's dietary restrictions and preferences.
    Can be allergies, intolerances, or lifestyle choices.
    """
    
    RESTRICTION_TYPE_CHOICES = [
        ('allergy', _('Allergy')),
        ('intolerance', _('Intolerance')),
        ('preference', _('Preference')),
        ('religious', _('Religious')),
        ('medical', _('Medical')),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='dietary_restrictions'
    )
    
    name = models.CharField(
        _('restriction name'),
        max_length=100,
        help_text=_('e.g., Peanuts, Gluten, Dairy, Vegetarian')
    )
    
    restriction_type = models.CharField(
        _('type'),
        max_length=20,
        choices=RESTRICTION_TYPE_CHOICES,
        help_text=_('Type of dietary restriction')
    )
    
    severity = models.CharField(
        _('severity'),
        max_length=20,
        choices=[
            ('mild', _('Mild')),
            ('moderate', _('Moderate')),
            ('severe', _('Severe')),
            ('life_threatening', _('Life-threatening')),
        ],
        default='moderate',
        help_text=_('Severity of the restriction')
    )
    
    notes = models.TextField(
        _('notes'),
        blank=True,
        help_text=_('Additional information about this restriction')
    )
    
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Whether this restriction is currently active')
    )
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'dietary_restrictions'
        verbose_name = _('dietary restriction')
        verbose_name_plural = _('dietary restrictions')
        unique_together = [['user', 'name']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['restriction_type']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.name} ({self.get_restriction_type_display()})"


class APIUsageLog(models.Model):
    """
    Track API usage for rate limiting and analytics.
    Records all API calls made by users.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='api_usage_logs',
        null=True,
        blank=True,
        help_text=_('User who made the request (null for anonymous)')
    )
    
    endpoint = models.CharField(
        _('API endpoint'),
        max_length=255,
        help_text=_('The API endpoint that was called')
    )
    
    method = models.CharField(
        _('HTTP method'),
        max_length=10,
        help_text=_('HTTP method used (GET, POST, etc.)')
    )
    
    ip_address = models.GenericIPAddressField(
        _('IP address'),
        help_text=_('IP address of the request')
    )
    
    user_agent = models.TextField(
        _('user agent'),
        blank=True,
        help_text=_('User agent string from the request')
    )
    
    request_body_size = models.PositiveIntegerField(
        _('request body size'),
        default=0,
        help_text=_('Size of the request body in bytes')
    )
    
    response_status_code = models.PositiveIntegerField(
        _('response status code'),
        help_text=_('HTTP status code of the response')
    )
    
    response_time_ms = models.PositiveIntegerField(
        _('response time (ms)'),
        help_text=_('Time taken to process the request in milliseconds')
    )
    
    ai_tokens_used = models.PositiveIntegerField(
        _('AI tokens used'),
        default=0,
        help_text=_('Number of AI tokens consumed (for AI endpoints)')
    )
    
    error_message = models.TextField(
        _('error message'),
        blank=True,
        help_text=_('Error message if the request failed')
    )
    
    created_at = models.DateTimeField(
        _('timestamp'),
        auto_now_add=True,
        db_index=True
    )
    
    class Meta:
        db_table = 'api_usage_logs'
        verbose_name = _('API usage log')
        verbose_name_plural = _('API usage logs')
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['endpoint', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['response_status_code']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        user_str = self.user.email if self.user else 'Anonymous'
        return f"{user_str} - {self.method} {self.endpoint} - {self.response_status_code}"
    
    @classmethod
    def get_user_usage_count(cls, user, endpoint=None, hours=1):
        """
        Get the number of API calls made by a user in the last N hours.
        Optionally filter by endpoint.
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        since = timezone.now() - timedelta(hours=hours)
        queryset = cls.objects.filter(user=user, created_at__gte=since)
        
        if endpoint:
            queryset = queryset.filter(endpoint=endpoint)
        
        return queryset.count()
    
    @classmethod
    def get_ip_usage_count(cls, ip_address, endpoint=None, hours=1):
        """
        Get the number of API calls made from an IP in the last N hours.
        Optionally filter by endpoint.
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        since = timezone.now() - timedelta(hours=hours)
        queryset = cls.objects.filter(ip_address=ip_address, created_at__gte=since)
        
        if endpoint:
            queryset = queryset.filter(endpoint=endpoint)
        
        return queryset.count()

class FoodItem(models.Model):
    """
    Individual food items with nutritional data.
    Can be created from AI analysis or manual entry.
    """
    
    # Identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('food name'), max_length=255)
    brand = models.CharField(_('brand'), max_length=100, blank=True)
    barcode = models.CharField(_('barcode'), max_length=50, blank=True, db_index=True)
    
    # Nutritional information (per 100g)
    calories = models.DecimalField(_('calories'), max_digits=8, decimal_places=2)
    protein = models.DecimalField(_('protein (g)'), max_digits=8, decimal_places=2)
    carbohydrates = models.DecimalField(_('carbohydrates (g)'), max_digits=8, decimal_places=2)
    fat = models.DecimalField(_('fat (g)'), max_digits=8, decimal_places=2)
    fiber = models.DecimalField(_('fiber (g)'), max_digits=8, decimal_places=2, default=0)
    sugar = models.DecimalField(_('sugar (g)'), max_digits=8, decimal_places=2, default=0)
    sodium = models.DecimalField(_('sodium (mg)'), max_digits=8, decimal_places=2, default=0)
    
    # Additional nutrients
    saturated_fat = models.DecimalField(_('saturated fat (g)'), max_digits=8, decimal_places=2, null=True, blank=True)
    trans_fat = models.DecimalField(_('trans fat (g)'), max_digits=8, decimal_places=2, null=True, blank=True)
    cholesterol = models.DecimalField(_('cholesterol (mg)'), max_digits=8, decimal_places=2, null=True, blank=True)
    potassium = models.DecimalField(_('potassium (mg)'), max_digits=8, decimal_places=2, null=True, blank=True)
    vitamin_a = models.DecimalField(_('vitamin A (%)'), max_digits=5, decimal_places=2, null=True, blank=True)
    vitamin_c = models.DecimalField(_('vitamin C (%)'), max_digits=5, decimal_places=2, null=True, blank=True)
    calcium = models.DecimalField(_('calcium (%)'), max_digits=5, decimal_places=2, null=True, blank=True)
    iron = models.DecimalField(_('iron (%)'), max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Source information
    SOURCE_CHOICES = [
        ('ai', _('AI Analysis')),
        ('database', _('Food Database')),
        ('manual', _('Manual Entry')),
        ('usda', _('USDA Database')),
    ]
    source = models.CharField(_('data source'), max_length=20, choices=SOURCE_CHOICES)
    external_id = models.CharField(_('external ID'), max_length=100, blank=True, help_text=_('ID from external database'))
    
    # User who created this item (null for system items)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_food_items'
    )
    
    # Metadata
    is_verified = models.BooleanField(_('verified'), default=False)
    is_public = models.BooleanField(_('public'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'food_items'
        verbose_name = _('food item')
        verbose_name_plural = _('food items')
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['barcode']),
            models.Index(fields=['created_by', 'created_at']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} {f'({self.brand})' if self.brand else ''}".strip()


class Meal(models.Model):
    """
    A meal is a collection of food items consumed together.
    Tracks when and what a user ate.
    """
    
    MEAL_TYPE_CHOICES = [
        ('breakfast', _('Breakfast')),
        ('lunch', _('Lunch')),
        ('dinner', _('Dinner')),
        ('snack', _('Snack')),
        ('other', _('Other')),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='meals'
    )
    
    name = models.CharField(_('meal name'), max_length=255)
    meal_type = models.CharField(
        _('meal type'),
        max_length=20,
        choices=MEAL_TYPE_CHOICES,
        default='other'
    )
    
    # When the meal was consumed
    consumed_at = models.DateTimeField(_('consumed at'))
    
    # Optional image of the meal
    image = models.ImageField(
        _('meal image'),
        upload_to='meal_images/',
        null=True,
        blank=True
    )
    
    # Notes about the meal
    notes = models.TextField(_('notes'), blank=True)
    
    # Location information
    location_name = models.CharField(_('location'), max_length=255, blank=True)
    latitude = models.DecimalField(
        _('latitude'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        _('longitude'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'meals'
        verbose_name = _('meal')
        verbose_name_plural = _('meals')
        indexes = [
            models.Index(fields=['user', 'consumed_at']),
            models.Index(fields=['user', 'meal_type']),  # For filtering by meal type per user
            models.Index(fields=['meal_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-consumed_at']
    
    def __str__(self):
        return f"{self.name} - {self.consumed_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def total_calories(self):
        """Calculate total calories for the meal."""
        return sum(
            item.calories or 0
            for item in self.meal_items.all()
        )
    
    @property
    def total_macros(self):
        """Calculate total macronutrients for the meal."""
        items = self.meal_items.all()
        return {
            'protein': sum(item.protein or 0 for item in items),
            'carbohydrates': sum(item.carbohydrates or 0 for item in items),
            'fat': sum(item.fat or 0 for item in items),
            'fiber': sum(item.fiber or 0 for item in items),
            'sugar': sum(item.sugar or 0 for item in items),
            'sodium': sum(item.sodium or 0 for item in items),
        }


class MealItem(models.Model):
    """
    Links food items to meals with specific quantities.
    Represents what and how much was eaten in a meal.
    """
    
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name='meal_items'
    )
    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.PROTECT,
        related_name='meal_occurrences'
    )
    
    # Quantity consumed
    quantity = models.DecimalField(
        _('quantity'),
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(0.001)]
    )
    unit = models.CharField(
        _('unit'),
        max_length=50,
        default='g',
        help_text=_('Unit of measurement (g, ml, cup, etc.)')
    )
    
    # Calculated nutritional values (cached for performance)
    calories = models.DecimalField(_('calories'), max_digits=8, decimal_places=2, null=True)
    protein = models.DecimalField(_('protein (g)'), max_digits=8, decimal_places=2, null=True)
    carbohydrates = models.DecimalField(_('carbohydrates (g)'), max_digits=8, decimal_places=2, null=True)
    fat = models.DecimalField(_('fat (g)'), max_digits=8, decimal_places=2, null=True)
    fiber = models.DecimalField(_('fiber (g)'), max_digits=8, decimal_places=2, null=True)
    sugar = models.DecimalField(_('sugar (g)'), max_digits=8, decimal_places=2, null=True)
    sodium = models.DecimalField(_('sodium (mg)'), max_digits=8, decimal_places=2, null=True)
    
    # User adjustments
    custom_name = models.CharField(_('custom name'), max_length=255, blank=True)
    notes = models.TextField(_('notes'), blank=True)
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'meal_items'
        verbose_name = _('meal item')
        verbose_name_plural = _('meal items')
        ordering = ['created_at']
    
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
            factor = quantity_in_grams / Decimal('100')
            
            self.calories = Decimal(str(self.food_item.calories)) * factor if self.food_item.calories else None
            self.protein = Decimal(str(self.food_item.protein)) * factor if self.food_item.protein else None
            self.carbohydrates = Decimal(str(self.food_item.carbohydrates)) * factor if self.food_item.carbohydrates else None
            self.fat = Decimal(str(self.food_item.fat)) * factor if self.food_item.fat else None
            self.fiber = Decimal(str(self.food_item.fiber)) * factor if self.food_item.fiber else None
            self.sugar = Decimal(str(self.food_item.sugar)) * factor if self.food_item.sugar else None
            self.sodium = Decimal(str(self.food_item.sodium)) * factor if self.food_item.sodium else None
        
        super().save(*args, **kwargs)
    
    def _convert_to_grams(self):
        """Convert quantity to grams based on unit."""
        from decimal import Decimal
        # Simple conversion - in production, use a proper conversion library
        conversions = {
            'g': Decimal('1'),
            'kg': Decimal('1000'),
            'mg': Decimal('0.001'),
            'oz': Decimal('28.3495'),
            'lb': Decimal('453.592'),
            'cup': Decimal('240'),  # Approximate for water/milk
            'tbsp': Decimal('15'),
            'tsp': Decimal('5'),
            'ml': Decimal('1'),  # Approximate for water
            'l': Decimal('1000'),
        }
        
        unit_lower = self.unit.lower()
        if unit_lower in conversions:
            return self.quantity * conversions[unit_lower]
        
        # Default to treating unknown units as grams
        return self.quantity


class MealAnalysis(models.Model):
    """
    Stores AI analysis results for meals.
    Links a meal to its AI-generated nutritional analysis.
    """
    
    meal = models.OneToOneField(
        Meal,
        on_delete=models.CASCADE,
        related_name='analysis'
    )
    
    # AI service used
    AI_SERVICE_CHOICES = [
        ('gemini', _('Google Gemini')),
        ('openai', _('OpenAI')),
        ('claude', _('Claude')),
    ]
    ai_service = models.CharField(
        _('AI service'),
        max_length=20,
        choices=AI_SERVICE_CHOICES,
        default='gemini'
    )
    
    # Raw AI response
    ai_response = models.JSONField(
        _('AI response'),
        default=dict,
        blank=True,
        help_text=_('Raw response from AI service')
    )
    
    # Confidence score
    confidence_score = models.DecimalField(
        _('confidence score'),
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('AI confidence in the analysis (0-1)')
    )
    
    # Analysis metadata
    analysis_time_ms = models.PositiveIntegerField(
        _('analysis time (ms)'),
        help_text=_('Time taken for analysis in milliseconds')
    )
    tokens_used = models.PositiveIntegerField(
        _('tokens used'),
        default=0,
        help_text=_('Number of AI tokens consumed')
    )
    
    # User feedback
    is_accurate = models.BooleanField(
        _('marked as accurate'),
        null=True,
        blank=True,
        help_text=_('User feedback on accuracy')
    )
    user_notes = models.TextField(
        _('user notes'),
        blank=True,
        help_text=_('User corrections or notes')
    )
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'meal_analyses'
        verbose_name = _('meal analysis')
        verbose_name_plural = _('meal analyses')
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['ai_service']),
        ]
    
    def __str__(self):
        return f"Analysis for {self.meal} - {self.ai_service}"


class NutritionData(models.Model):
    """
    Legacy model - kept for backward compatibility.
    Stores analyzed nutrition information from food images.
    Will be migrated to use Meal and MealAnalysis models.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='nutrition_data',
        null=True,  # Allow null for existing data
        blank=True
    )
    image = models.ImageField(upload_to='nutrition_images/')
    gemini_response = models.JSONField(default=dict, blank=True)
    
    # Basic nutrition facts (per serving)
    calories = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    protein = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # grams
    carbohydrates = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # grams
    fat = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # grams
    fiber = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # grams
    sugar = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # grams
    sodium = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # milligrams
    
    # Serving information
    serving_size = models.CharField(max_length=100, blank=True)
    servings_per_recipe = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Nutrition Data {self.id} - {self.created_at}"
    
    def recalculate_nutrition(self, new_servings):
        """Recalculate nutrition values based on new serving size."""
        if self.servings_per_recipe and new_servings:
            ratio = new_servings / self.servings_per_recipe
            
            # Create a dictionary with recalculated values
            recalculated = {
                'calories': float(self.calories * ratio) if self.calories else None,
                'protein': float(self.protein * ratio) if self.protein else None,
                'carbohydrates': float(self.carbohydrates * ratio) if self.carbohydrates else None,
                'fat': float(self.fat * ratio) if self.fat else None,
                'fiber': float(self.fiber * ratio) if self.fiber else None,
                'sugar': float(self.sugar * ratio) if self.sugar else None,
                'sodium': float(self.sodium * ratio) if self.sodium else None,
                'servings': new_servings
            }
            
            # Remove None values
            return {k: v for k, v in recalculated.items() if v is not None}
        return {}


class NutritionalInfo(models.Model):
    """
    Detailed nutritional breakdown for meals or food items.
    Can store comprehensive nutritional data beyond basic macros.
    """
    
    # Can be linked to either a meal or a food item
    meal = models.OneToOneField(
        Meal,
        on_delete=models.CASCADE,
        related_name='detailed_nutrition',
        null=True,
        blank=True
    )
    food_item = models.OneToOneField(
        FoodItem,
        on_delete=models.CASCADE,
        related_name='detailed_nutrition',
        null=True,
        blank=True
    )
    
    # Comprehensive nutritional data
    # Vitamins (in appropriate units)
    vitamin_a_iu = models.DecimalField(_('vitamin A (IU)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_a_rae = models.DecimalField(_('vitamin A (mcg RAE)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_c = models.DecimalField(_('vitamin C (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_d = models.DecimalField(_('vitamin D (mcg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_e = models.DecimalField(_('vitamin E (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_k = models.DecimalField(_('vitamin K (mcg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # B Vitamins
    thiamin = models.DecimalField(_('thiamin (mg)'), max_digits=10, decimal_places=3, null=True, blank=True)
    riboflavin = models.DecimalField(_('riboflavin (mg)'), max_digits=10, decimal_places=3, null=True, blank=True)
    niacin = models.DecimalField(_('niacin (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_b6 = models.DecimalField(_('vitamin B6 (mg)'), max_digits=10, decimal_places=3, null=True, blank=True)
    folate = models.DecimalField(_('folate (mcg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    vitamin_b12 = models.DecimalField(_('vitamin B12 (mcg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Minerals
    calcium = models.DecimalField(_('calcium (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    iron = models.DecimalField(_('iron (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    magnesium = models.DecimalField(_('magnesium (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    phosphorus = models.DecimalField(_('phosphorus (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    potassium = models.DecimalField(_('potassium (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    sodium = models.DecimalField(_('sodium (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    zinc = models.DecimalField(_('zinc (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Other nutrients
    omega_3 = models.DecimalField(_('omega-3 (g)'), max_digits=10, decimal_places=3, null=True, blank=True)
    omega_6 = models.DecimalField(_('omega-6 (g)'), max_digits=10, decimal_places=3, null=True, blank=True)
    water = models.DecimalField(_('water (g)'), max_digits=10, decimal_places=2, null=True, blank=True)
    caffeine = models.DecimalField(_('caffeine (mg)'), max_digits=10, decimal_places=2, null=True, blank=True)
    alcohol = models.DecimalField(_('alcohol (g)'), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Metadata
    source = models.CharField(_('data source'), max_length=100, blank=True)
    last_updated = models.DateTimeField(_('last updated'), auto_now=True)
    
    class Meta:
        db_table = 'nutritional_info'
        verbose_name = _('nutritional information')
        verbose_name_plural = _('nutritional information')
    
    def __str__(self):
        if self.meal:
            return f"Nutritional info for meal: {self.meal}"
        elif self.food_item:
            return f"Nutritional info for food: {self.food_item}"
        return "Nutritional info"


class FavoriteMeal(models.Model):
    """
    User's saved favorite meals for quick logging.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_meals'
    )
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    
    name = models.CharField(
        _('custom name'),
        max_length=255,
        blank=True,
        help_text=_('Custom name for this favorite')
    )
    
    # Quick access settings
    is_template = models.BooleanField(
        _('use as template'),
        default=False,
        help_text=_('Use this meal as a template for creating new meals')
    )
    
    quick_add_order = models.PositiveIntegerField(
        _('quick add order'),
        default=0,
        help_text=_('Order in quick add list (lower numbers appear first)')
    )
    
    # Usage tracking
    times_used = models.PositiveIntegerField(_('times used'), default=0)
    last_used = models.DateTimeField(_('last used'), null=True, blank=True)
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'favorite_meals'
        verbose_name = _('favorite meal')
        verbose_name_plural = _('favorite meals')
        unique_together = [['user', 'meal']]
        indexes = [
            models.Index(fields=['user', 'quick_add_order']),
            models.Index(fields=['user', 'last_used']),
        ]
        ordering = ['quick_add_order', '-last_used']
    
    def __str__(self):
        return self.name or f"{self.user.email}'s favorite: {self.meal.name}"


class RecipeIngredient(models.Model):
    """
    Legacy model - kept for backward compatibility.
    Stores individual ingredients extracted from recipes.
    Will be migrated to use MealItem model.
    """
    nutrition_data = models.ForeignKey(NutritionData, on_delete=models.CASCADE, related_name='ingredients')
    name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=50)
    
    # Individual ingredient nutrition (if available)
    calories = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    protein = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    carbohydrates = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    fat = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    class Meta:
        ordering = ['id']
        
    def __str__(self):
        return f"{self.quantity} {self.unit} {self.name}"


class TOTPDevice(models.Model):
    """
    Model to store TOTP (Time-based One-Time Password) device information.
    Used for two-factor authentication with authenticator apps.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='totp_devices'
    )
    name = models.CharField(
        _('device name'),
        max_length=64,
        help_text=_('Human-readable name for this device')
    )
    confirmed = models.BooleanField(
        _('confirmed'),
        default=False,
        help_text=_('Whether this device has been confirmed by entering a valid token')
    )
    key = models.CharField(
        _('secret key'),
        max_length=80,
        help_text=_('Base32-encoded secret key')
    )
    tolerance = models.PositiveSmallIntegerField(
        _('tolerance'),
        default=1,
        help_text=_('Number of periods before/after current time to allow')
    )
    t0 = models.BigIntegerField(
        _('t0'),
        default=0,
        help_text=_('Unix timestamp of when to start counting time steps')
    )
    step = models.PositiveSmallIntegerField(
        _('step'),
        default=30,
        help_text=_('Time step in seconds')
    )
    drift = models.SmallIntegerField(
        _('drift'),
        default=0,
        help_text=_('Current drift between server and device clocks')
    )
    last_t = models.BigIntegerField(
        _('last token timestamp'),
        default=-1,
        help_text=_('Timestamp of the last successfully verified token')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'totp_devices'
        verbose_name = _('TOTP device')
        verbose_name_plural = _('TOTP devices')
        
    def __str__(self):
        return f"{self.user.email} - {self.name}"


class BackupCode(models.Model):
    """
    Model to store backup codes for two-factor authentication.
    Used when the user doesn't have access to their TOTP device.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='backup_codes'
    )
    code = models.CharField(
        _('backup code'),
        max_length=16,
        unique=True,
        help_text=_('Single-use backup code')
    )
    used = models.BooleanField(
        _('used'),
        default=False,
        help_text=_('Whether this code has been used')
    )
    used_at = models.DateTimeField(
        _('used at'),
        null=True,
        blank=True,
        help_text=_('When this code was used')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    
    class Meta:
        db_table = 'backup_codes'
        verbose_name = _('backup code')
        verbose_name_plural = _('backup codes')
        indexes = [
            models.Index(fields=['user', 'used']),
            models.Index(fields=['code']),
        ]
        
    def __str__(self):
        return f"{self.user.email} - {'Used' if self.used else 'Available'}"


class Notification(models.Model):
    """
    Model to store user notifications.
    Supports multiple notification types and delivery channels.
    """
    
    # Notification types
    TYPE_CHOICES = [
        ('meal_reminder', _('Meal Reminder')),
        ('daily_summary', _('Daily Summary')),
        ('weekly_report', _('Weekly Report')),
        ('goal_achieved', _('Goal Achieved')),
        ('streak_milestone', _('Streak Milestone')),
        ('system', _('System Notification')),
        ('tips', _('Nutrition Tips')),
    ]
    
    # Notification status
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('sent', _('Sent')),
        ('failed', _('Failed')),
        ('read', _('Read')),
        ('archived', _('Archived')),
    ]
    
    # Delivery channels
    CHANNEL_CHOICES = [
        ('in_app', _('In-App')),
        ('email', _('Email')),
        ('push', _('Push Notification')),
        ('sms', _('SMS')),
    ]
    
    # Priority levels
    PRIORITY_CHOICES = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
        ('urgent', _('Urgent')),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(
        _('notification type'),
        max_length=50,
        choices=TYPE_CHOICES
    )
    title = models.CharField(
        _('title'),
        max_length=200
    )
    message = models.TextField(
        _('message')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    channel = models.CharField(
        _('delivery channel'),
        max_length=20,
        choices=CHANNEL_CHOICES,
        default='in_app'
    )
    priority = models.CharField(
        _('priority'),
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    
    # Metadata
    data = models.JSONField(
        _('additional data'),
        default=dict,
        blank=True,
        help_text=_('Additional data for the notification')
    )
    
    # Scheduling
    scheduled_for = models.DateTimeField(
        _('scheduled for'),
        null=True,
        blank=True,
        help_text=_('When this notification should be sent')
    )
    
    # Tracking
    sent_at = models.DateTimeField(
        _('sent at'),
        null=True,
        blank=True
    )
    read_at = models.DateTimeField(
        _('read at'),
        null=True,
        blank=True
    )
    failed_at = models.DateTimeField(
        _('failed at'),
        null=True,
        blank=True
    )
    error_message = models.TextField(
        _('error message'),
        blank=True
    )
    retry_count = models.PositiveSmallIntegerField(
        _('retry count'),
        default=0
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'type']),
            models.Index(fields=['scheduled_for', 'status']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.email} - {self.type} - {self.title}"
    
    def mark_as_sent(self):
        """Mark notification as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at', 'updated_at'])
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.status = 'read'
        self.read_at = timezone.now()
        self.save(update_fields=['status', 'read_at', 'updated_at'])
    
    def mark_as_failed(self, error_message=''):
        """Mark notification as failed."""
        self.status = 'failed'
        self.failed_at = timezone.now()
        self.error_message = error_message
        self.retry_count += 1
        self.save(update_fields=['status', 'failed_at', 'error_message', 'retry_count', 'updated_at'])
