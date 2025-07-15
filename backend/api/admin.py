from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (DeviceToken, FoodItem, Meal, MealAnalysis, MealItem, 
                     Notification, Payment, Subscription, SubscriptionPlan, User, UserProfile)


# User-related inline admins
class UserProfileInline(admin.StackedInline):
    """Inline admin for UserProfile."""

    model = UserProfile
    can_delete = False
    verbose_name_plural = "Profile"
    fields = (
        "gender",
        "height",
        "weight",
        "activity_level",
        "goal",
        "timezone",
        "bmi",
        "bmr",
        "tdee",
    )
    readonly_fields = ("bmi", "bmr", "tdee")


# User admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for custom User model."""

    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "is_verified",
        "is_staff",
        "created_at",
    )
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
        "is_verified",
        "created_at",
    )
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-created_at",)
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('profile')

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        (
            _("Personal info"),
            {"fields": ("first_name", "last_name", "phone_number", "date_of_birth")},
        ),
        (
            _("Account status"),
            {
                "fields": (
                    "is_verified",
                    "verification_token",
                    "last_login_ip",
                )
            },
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            _("Important dates"),
            {"fields": ("last_login", "date_joined", "created_at", "updated_at")},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    readonly_fields = (
        "verification_token",
        "created_at",
        "updated_at",
        "last_login",
        "date_joined",
    )
    inlines = [UserProfileInline]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile model."""

    list_display = (
        "user",
        "gender",
        "height",
        "weight",
        "activity_level",
        "goal",
        "bmi",
    )
    list_filter = ("gender", "activity_level", "goal")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    readonly_fields = ("bmi", "bmr", "tdee", "created_at", "updated_at")
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')

    fieldsets = (
        (_("User"), {"fields": ("user",)}),
        (
            _("Physical Information"),
            {"fields": ("gender", "height", "weight", "activity_level")},
        ),
        (
            _("Goals"),
            {"fields": ("goal",)},
        ),
        (
            _("Calculated Values"),
            {
                "fields": ("bmi", "bmr", "tdee"),
                "description": "These values are calculated automatically based on physical information.",
            },
        ),
        (
            _("Preferences"),
            {"fields": ("timezone",)},
        ),
        (_("Metadata"), {"fields": ("created_at", "updated_at")}),
    )


# Other inline admins
class MealItemInline(admin.TabularInline):
    """Inline admin for meal items."""

    model = MealItem
    extra = 1
    fields = [
        "food_item",
        "quantity",
        "unit",
        "calories",
        "protein",
        "carbohydrates",
        "fat",
    ]
    readonly_fields = ["calories", "protein", "carbohydrates", "fat"]
    autocomplete_fields = ["food_item"]


# Model admins
@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    """Admin interface for FoodItem model."""

    list_display = [
        "name",
        "brand",
        "category",
        "calories",
        "protein",
        "carbohydrates",
        "fat",
        "created_at",
    ]
    list_filter = ["category", "created_at"]
    search_fields = ["name", "brand"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = [
        (_("Basic Information"), {"fields": ["id", "name", "brand", "category"]}),
        (
            _("Nutritional Information (per 100g)"),
            {
                "fields": [
                    ("calories", "protein", "carbohydrates", "fat"),
                    ("fiber", "sugar", "sodium"),
                ]
            },
        ),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    """Admin interface for Meal model."""

    list_display = [
        "name",
        "user",
        "meal_type",
        "consumed_at",
        "total_calories",
        "created_at",
    ]
    list_filter = ["meal_type", "consumed_at", "created_at"]
    search_fields = ["name", "user__email", "notes", "location_name"]
    date_hierarchy = "consumed_at"
    readonly_fields = [
        "id",
        "total_calories",
        "total_macros",
        "created_at",
        "updated_at",
    ]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related and prefetch_related."""
        return super().get_queryset(request).select_related(
            'user', 'user__profile'
        ).prefetch_related(
            'meal_items__food_item'
        )

    fieldsets = [
        (_("Basic Information"), {"fields": ["id", "user", "name", "meal_type"]}),
        (_("Meal Details"), {"fields": ["consumed_at", "image", "notes"]}),
        (
            _("Location"),
            {
                "fields": ["location_name", ("latitude", "longitude")],
                "classes": ["collapse"],
            },
        ),
        (
            _("Nutritional Summary"),
            {
                "fields": ["total_calories", "total_macros"],
                "description": "Automatically calculated from meal items.",
            },
        ),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]

    inlines = [MealItemInline]

    def total_macros(self, obj):
        """Display total macros in admin."""
        macros = obj.total_macros
        return (
            f"Protein: {macros['protein']:.1f}g, "
            f"Carbs: {macros['carbohydrates']:.1f}g, "
            f"Fat: {macros['fat']:.1f}g"
        )

    total_macros.short_description = "Total Macronutrients"


@admin.register(MealItem)
class MealItemAdmin(admin.ModelAdmin):
    """Admin interface for MealItem model."""

    list_display = [
        "__str__",
        "meal",
        "quantity",
        "unit",
        "calories",
        "protein",
        "carbohydrates",
        "fat",
    ]
    list_filter = ["meal__meal_type", "created_at"]
    search_fields = ["food_item__name", "custom_name", "meal__name"]
    readonly_fields = [
        "calories",
        "protein",
        "carbohydrates",
        "fat",
        "fiber",
        "sugar",
        "sodium",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = ["food_item", "meal"]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related(
            'meal', 'meal__user', 'food_item'
        )


@admin.register(MealAnalysis)
class MealAnalysisAdmin(admin.ModelAdmin):
    """Admin interface for MealAnalysis model."""

    list_display = [
        "meal",
        "confidence_overall",
        "confidence_ingredients",
        "confidence_portions",
        "created_at",
    ]
    list_filter = ["created_at"]
    search_fields = ["meal__name"]
    readonly_fields = ["created_at", "updated_at", "gemini_response"]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('meal', 'meal__user')

    fieldsets = [
        (_("Meal"), {"fields": ["meal"]}),
        (
            _("Confidence Scores"),
            {
                "fields": [
                    "confidence_overall",
                    "confidence_ingredients",
                    "confidence_portions",
                ]
            },
        ),
        (_("Analysis Context"), {"fields": ["analysis_context"], "classes": ["collapse"]}),
        (_("Gemini Response"), {"fields": ["gemini_response"], "classes": ["collapse"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for Notification model."""

    list_display = [
        "title",
        "user",
        "type",
        "channel",
        "status",
        "priority",
        "created_at",
    ]
    list_filter = ["type", "channel", "status", "priority", "created_at"]
    search_fields = ["title", "message", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')

    fieldsets = [
        (_("Basic Information"), {"fields": ["user", "type", "title", "message"]}),
        (_("Delivery"), {"fields": ["channel", "priority", "scheduled_for"]}),
        (_("Status"), {"fields": ["status", "retry_count"]}),
        (_("Tracking"), {"fields": ["sent_at", "read_at", "failed_at", "error_message"]}),
        (_("Additional Data"), {"fields": ["data"], "classes": ["collapse"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    """Admin interface for DeviceToken model."""

    list_display = [
        "user",
        "platform",
        "device_name",
        "is_active",
        "created_at",
        "last_used",
    ]
    list_filter = ["platform", "is_active", "created_at"]
    search_fields = ["user__email", "device_name", "device_id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user')

    fieldsets = [
        (_("User"), {"fields": ["user"]}),
        (_("Device Information"), {"fields": ["platform", "device_id", "device_name"]}),
        (_("Token"), {"fields": ["token"]}),
        (_("Status"), {"fields": ["is_active"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at", "last_used"]}),
    ]


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    """Admin interface for SubscriptionPlan model."""

    list_display = [
        "name",
        "price",
        "currency",
        "ai_analyses_per_month",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "currency", "created_at"]
    search_fields = ["name", "stripe_price_id"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = [
        (_("Basic Information"), {"fields": ["name", "price", "currency"]}),
        (_("Features"), {"fields": ["ai_analyses_per_month"]}),
        (_("Stripe Integration"), {"fields": ["stripe_price_id"]}),
        (_("Status"), {"fields": ["is_active"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """Admin interface for Subscription model."""

    list_display = [
        "user",
        "plan",
        "status",
        "current_period_start",
        "current_period_end",
        "ai_analyses_used",
        "created_at",
    ]
    list_filter = ["status", "plan", "created_at"]
    search_fields = ["user__email", "stripe_subscription_id", "stripe_customer_id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'plan')

    fieldsets = [
        (_("Basic Information"), {"fields": ["id", "user", "plan"]}),
        (_("Status"), {"fields": ["status", "cancel_at_period_end"]}),
        (_("Stripe Integration"), {"fields": ["stripe_subscription_id", "stripe_customer_id"]}),
        (_("Trial Period"), {"fields": ["trial_start", "trial_end"]}),
        (_("Current Period"), {"fields": ["current_period_start", "current_period_end"]}),
        (_("Cancellation"), {"fields": ["canceled_at"]}),
        (_("Usage Tracking"), {"fields": ["ai_analyses_used", "ai_analyses_reset_date"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Admin interface for Payment model."""

    list_display = [
        "user",
        "subscription_plan",
        "amount",
        "currency",
        "status",
        "created_at",
    ]
    list_filter = ["status", "currency", "created_at"]
    search_fields = ["user__email", "stripe_payment_intent_id", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'subscription_plan')

    fieldsets = [
        (_("Basic Information"), {"fields": ["id", "user", "subscription_plan"]}),
        (_("Payment Details"), {"fields": ["amount", "currency", "status"]}),
        (_("Stripe Integration"), {"fields": ["stripe_payment_intent_id"]}),
        (_("Additional Info"), {"fields": ["description", "failure_reason"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]

    def has_add_permission(self, request):
        """Disable manual creation of payments."""
        return False

    def has_change_permission(self, request, obj=None):
        """Make most fields read-only."""
        return request.user.is_superuser