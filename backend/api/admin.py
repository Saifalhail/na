from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (APIUsageLog, DietaryRestriction, FavoriteMeal, FoodItem,
                     Meal, MealAnalysis, MealItem, NutritionalInfo,
                     NutritionData, RecipeIngredient, User, UserProfile)


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
        "daily_calorie_goal",
        "daily_protein_goal",
        "daily_carbs_goal",
        "daily_fat_goal",
        "measurement_system",
        "timezone",
        "language",
        "bio",
        "avatar",
        "receive_email_notifications",
        "receive_push_notifications",
        "show_nutritional_info_publicly",
        "bmi",
        "bmr",
        "tdee",
    )
    readonly_fields = ("bmi", "bmr", "tdee")


class DietaryRestrictionInline(admin.TabularInline):
    """Inline admin for DietaryRestriction."""

    model = DietaryRestriction
    extra = 0
    fields = ("name", "restriction_type", "severity", "is_active", "notes")


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
        "account_type",
        "is_staff",
        "created_at",
    )
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
        "is_verified",
        "account_type",
        "created_at",
    )
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-created_at",)

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
                    "account_type",
                    "is_profile_public",
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
    inlines = [UserProfileInline, DietaryRestrictionInline]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile model."""

    list_display = (
        "user",
        "gender",
        "age",
        "height",
        "weight",
        "activity_level",
        "bmi",
        "measurement_system",
    )
    list_filter = ("gender", "activity_level", "measurement_system")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    readonly_fields = ("bmi", "bmr", "tdee", "created_at", "updated_at")

    fieldsets = (
        (_("User"), {"fields": ("user",)}),
        (
            _("Physical Information"),
            {"fields": ("gender", "height", "weight", "activity_level")},
        ),
        (
            _("Goals"),
            {
                "fields": (
                    "daily_calorie_goal",
                    "daily_protein_goal",
                    "daily_carbs_goal",
                    "daily_fat_goal",
                )
            },
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
            {
                "fields": (
                    "measurement_system",
                    "timezone",
                    "language",
                    "receive_email_notifications",
                    "receive_push_notifications",
                    "show_nutritional_info_publicly",
                )
            },
        ),
        (_("Profile"), {"fields": ("bio", "avatar")}),
        (_("Metadata"), {"fields": ("created_at", "updated_at")}),
    )

    def age(self, obj):
        """Display calculated age."""
        age_value = obj.get_age()
        return f"{age_value} years" if age_value else "N/A"

    age.short_description = "Age"


@admin.register(DietaryRestriction)
class DietaryRestrictionAdmin(admin.ModelAdmin):
    """Admin interface for DietaryRestriction model."""

    list_display = (
        "user",
        "name",
        "restriction_type",
        "severity",
        "is_active",
        "created_at",
    )
    list_filter = ("restriction_type", "severity", "is_active")
    search_fields = ("user__email", "name")
    ordering = ("-created_at",)

    fieldsets = (
        (_("User"), {"fields": ("user",)}),
        (
            _("Restriction Details"),
            {"fields": ("name", "restriction_type", "severity", "notes")},
        ),
        (_("Status"), {"fields": ("is_active",)}),
        (_("Metadata"), {"fields": ("created_at", "updated_at")}),
    )

    readonly_fields = ("created_at", "updated_at")


@admin.register(APIUsageLog)
class APIUsageLogAdmin(admin.ModelAdmin):
    """Admin interface for APIUsageLog model."""

    list_display = (
        "user",
        "endpoint",
        "method",
        "response_status_code",
        "response_time_ms",
        "ai_tokens_used",
        "created_at",
    )
    list_filter = (
        "method",
        "response_status_code",
        ("created_at", admin.DateFieldListFilter),
    )
    search_fields = ("user__email", "endpoint", "ip_address")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    fieldsets = (
        (
            _("Request Information"),
            {
                "fields": (
                    "user",
                    "endpoint",
                    "method",
                    "ip_address",
                    "user_agent",
                    "request_body_size",
                )
            },
        ),
        (
            _("Response Information"),
            {
                "fields": (
                    "response_status_code",
                    "response_time_ms",
                    "ai_tokens_used",
                    "error_message",
                )
            },
        ),
        (_("Timestamp"), {"fields": ("created_at",)}),
    )

    readonly_fields = ("created_at",)

    def has_add_permission(self, request):
        """Disable manual creation of logs."""
        return False

    def has_change_permission(self, request, obj=None):
        """Make logs read-only."""
        return False


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


class NutritionalInfoInline(admin.StackedInline):
    """Inline admin for detailed nutritional info."""

    model = NutritionalInfo
    extra = 0
    classes = ["collapse"]
    fieldsets = [
        (
            _("Vitamins"),
            {
                "fields": [
                    ("vitamin_a_iu", "vitamin_a_rae"),
                    ("vitamin_c", "vitamin_d"),
                    ("vitamin_e", "vitamin_k"),
                    ("thiamin", "riboflavin"),
                    ("niacin", "vitamin_b6"),
                    ("folate", "vitamin_b12"),
                ]
            },
        ),
        (
            _("Minerals"),
            {
                "fields": [
                    ("calcium", "iron"),
                    ("magnesium", "phosphorus"),
                    ("potassium", "sodium"),
                    "zinc",
                ]
            },
        ),
        (
            _("Other Nutrients"),
            {"fields": [("omega_3", "omega_6"), ("water", "caffeine", "alcohol")]},
        ),
    ]


# Model admins
@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    """Admin interface for FoodItem model."""

    list_display = [
        "name",
        "brand",
        "calories",
        "protein",
        "carbohydrates",
        "fat",
        "source",
        "is_verified",
        "created_by",
    ]
    list_filter = ["source", "is_verified", "is_public", "created_at"]
    search_fields = ["name", "brand", "barcode", "external_id"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = [
        (_("Basic Information"), {"fields": ["id", "name", "brand", "barcode"]}),
        (
            _("Nutritional Information (per 100g)"),
            {
                "fields": [
                    ("calories", "protein", "carbohydrates", "fat"),
                    ("fiber", "sugar", "sodium"),
                    ("saturated_fat", "trans_fat", "cholesterol"),
                    ("potassium", "vitamin_a", "vitamin_c"),
                    ("calcium", "iron"),
                ]
            },
        ),
        (_("Source Information"), {"fields": ["source", "external_id", "created_by"]}),
        (_("Settings"), {"fields": ["is_verified", "is_public"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]

    inlines = [NutritionalInfoInline]


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


@admin.register(MealAnalysis)
class MealAnalysisAdmin(admin.ModelAdmin):
    """Admin interface for MealAnalysis model."""

    list_display = [
        "meal",
        "ai_service",
        "confidence_score",
        "analysis_time_ms",
        "tokens_used",
        "is_accurate",
        "created_at",
    ]
    list_filter = ["ai_service", "is_accurate", "created_at"]
    search_fields = ["meal__name", "user_notes"]
    readonly_fields = ["created_at", "updated_at", "ai_response"]

    fieldsets = [
        (_("Meal"), {"fields": ["meal"]}),
        (
            _("Analysis Details"),
            {
                "fields": [
                    "ai_service",
                    "confidence_score",
                    "analysis_time_ms",
                    "tokens_used",
                ]
            },
        ),
        (_("User Feedback"), {"fields": ["is_accurate", "user_notes"]}),
        (_("AI Response"), {"fields": ["ai_response"], "classes": ["collapse"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(FavoriteMeal)
class FavoriteMealAdmin(admin.ModelAdmin):
    """Admin interface for FavoriteMeal model."""

    list_display = [
        "name",
        "user",
        "meal",
        "is_template",
        "quick_add_order",
        "times_used",
        "last_used",
    ]
    list_filter = ["is_template", "created_at", "last_used"]
    search_fields = ["name", "user__email", "meal__name"]
    readonly_fields = ["times_used", "last_used", "created_at", "updated_at"]

    fieldsets = [
        (_("Basic Information"), {"fields": ["user", "meal", "name"]}),
        (_("Settings"), {"fields": ["is_template", "quick_add_order"]}),
        (_("Usage Statistics"), {"fields": ["times_used", "last_used"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


# Legacy model admins (kept for backward compatibility)
@admin.register(NutritionData)
class NutritionDataAdmin(admin.ModelAdmin):
    """Admin interface for legacy NutritionData model."""

    list_display = [
        "id",
        "user",
        "calories",
        "protein",
        "carbohydrates",
        "fat",
        "created_at",
    ]
    list_filter = ["created_at", "updated_at"]
    search_fields = ["serving_size", "user__email"]
    readonly_fields = ["created_at", "updated_at", "gemini_response"]

    fieldsets = [
        (_("User"), {"fields": ["user"]}),
        (
            _("Basic Information"),
            {"fields": ["image", "serving_size", "servings_per_recipe"]},
        ),
        (
            _("Nutrition Facts"),
            {
                "fields": [
                    "calories",
                    "protein",
                    "carbohydrates",
                    "fat",
                    "fiber",
                    "sugar",
                    "sodium",
                ]
            },
        ),
        (_("AI Response"), {"fields": ["gemini_response"], "classes": ["collapse"]}),
        (_("Timestamps"), {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    """Admin interface for legacy RecipeIngredient model."""

    list_display = ["name", "quantity", "unit", "nutrition_data", "calories"]
    list_filter = ["nutrition_data__created_at"]
    search_fields = ["name"]

    fieldsets = [
        (
            _("Ingredient Information"),
            {"fields": ["nutrition_data", "name", "quantity", "unit"]},
        ),
        (
            _("Nutrition Values"),
            {"fields": ["calories", "protein", "carbohydrates", "fat"]},
        ),
    ]


# Inline admin for ingredients within NutritionData
class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1
    fields = ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"]


# Update NutritionDataAdmin to include inline ingredients
NutritionDataAdmin.inlines = [RecipeIngredientInline]
