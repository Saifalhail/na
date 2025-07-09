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
    Permission for premium features.
    """
    
    def has_permission(self, request, view):
        """Check if user has premium account."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has premium profile attribute
        if hasattr(request.user, 'profile'):
            return getattr(request.user.profile, 'is_premium', False)
        
        return False


class CanAccessAIFeatures(BasePermission):
    """
    Permission to check if user can access AI features.
    Could be based on subscription, usage limits, etc.
    """
    
    message = "AI features require a premium subscription or you've exceeded your daily limit."
    
    def has_permission(self, request, view):
        """Check if user can access AI features."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # For now, allow all authenticated users
        # In production, check subscription status, usage limits, etc.
        return True
        
        # Example implementation with usage limits:
        # from django.core.cache import cache
        # from datetime import date
        # 
        # # Check daily usage limit
        # today = date.today().isoformat()
        # cache_key = f"ai_usage_{request.user.id}_{today}"
        # usage_count = cache.get(cache_key, 0)
        # 
        # # Free tier: 10 AI analyses per day
        # # Premium: unlimited
        # if hasattr(request.user, 'profile') and request.user.profile.is_premium:
        #     return True
        # 
        # return usage_count < 10


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