from rest_framework import permissions
from rest_framework.permissions import BasePermission


class IsOwnerPermission(BasePermission):
    """
    Custom permission to only allow owners of an object to view/edit it.
    
    Assumes the object has a 'user' attribute.
    """
    
    def has_permission(self, request, view):
        """Allow authenticated users to access the view."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check if the user owns the object."""
        # Handle different model types
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # Default to False if no user relationship found
        return False


class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to allow owners full access and others read-only access.
    """
    
    def has_permission(self, request, view):
        """Allow authenticated users to access the view."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Allow read permissions to any authenticated user, write only to owner."""
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsPremiumUser(BasePermission):
    """
    Permission for premium features based on active subscription.
    """
    
    message = "This feature requires a premium subscription."
    
    def has_permission(self, request, view):
        """Check if user has premium account."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check active subscription
        active_subscription = request.user.subscriptions.filter(
            status__in=['active', 'trialing']
        ).first()
        
        if active_subscription:
            return active_subscription.plan.plan_type in ['premium', 'professional']
        
        # Fallback to profile attribute for backward compatibility
        if hasattr(request.user, 'profile'):
            return getattr(request.user.profile, 'is_premium', False)
        
        return False


class CanAccessAIFeatures(BasePermission):
    """
    Permission to check if user can access AI features based on subscription limits.
    """
    
    message = "AI features require a premium subscription or you've exceeded your usage limit."
    
    def has_permission(self, request, view):
        """Check if user can access AI features."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check active subscription
        active_subscription = request.user.subscriptions.filter(
            status__in=['active', 'trialing']
        ).first()
        
        if active_subscription:
            return active_subscription.can_use_ai_analysis()
        
        # Free tier users - check against free plan limits
        from api.models import SubscriptionPlan
        free_plan = SubscriptionPlan.objects.filter(plan_type='free', is_active=True).first()
        
        if free_plan:
            # For free users, implement daily usage tracking with cache
            from django.core.cache import cache
            from datetime import date
            
            today = date.today().isoformat()
            cache_key = f"ai_usage_{request.user.id}_{today}"
            usage_count = cache.get(cache_key, 0)
            
            return usage_count < free_plan.ai_analysis_limit
        
        # Default to deny if no plan found
        return False
    
    def increment_usage(self, user):
        """Increment AI usage for free tier users."""
        active_subscription = user.subscriptions.filter(
            status__in=['active', 'trialing']
        ).first()
        
        if active_subscription:
            active_subscription.increment_ai_usage()
        else:
            # Free tier - use cache for daily tracking
            from django.core.cache import cache
            from datetime import date
            
            today = date.today().isoformat()
            cache_key = f"ai_usage_{user.id}_{today}"
            usage_count = cache.get(cache_key, 0)
            cache.set(cache_key, usage_count + 1, 86400)  # 24 hours


class CanModifyMeal(BasePermission):
    """
    Permission to check if user can modify a meal.
    Prevents modification of meals older than 30 days.
    """
    
    message = "Cannot modify meals older than 30 days."
    
    def has_object_permission(self, request, view, obj):
        """Check if user can modify the meal."""
        # Owner check
        if obj.user != request.user:
            return False
        
        # Allow read operations
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check age of meal (example: 30 days)
        from django.utils import timezone
        from datetime import timedelta
        
        age_limit = timezone.now() - timedelta(days=30)
        return obj.created_at >= age_limit