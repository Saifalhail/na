from rest_framework import permissions


class IsUserOwnerOrStaff(permissions.BasePermission):
    """
    Custom permission to only allow owners of a user object to view it,
    or staff members to view any user.
    """
    
    def has_permission(self, request, view):
        # Authenticated users only
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Staff can view any user
        if request.user.is_staff:
            return True
            
        # Check if the object is the user themselves
        if hasattr(obj, 'user'):
            # For UserProfile objects
            return obj.user == request.user
        else:
            # For User objects
            return obj == request.user