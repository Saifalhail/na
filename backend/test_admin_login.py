#!/usr/bin/env python3
"""
Test script to verify admin login functionality.
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to the path
sys.path.insert(0, '/mnt/c/Users/salhail/Desktop/na/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.development')
django.setup()

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model

User = get_user_model()

def test_admin_login():
    """Test admin login functionality."""
    print("Testing admin login functionality...")
    
    # Clear any existing sessions
    Session.objects.all().delete()
    print("✓ Cleared existing sessions")
    
    # Check if admin user exists
    try:
        admin_user = User.objects.get(email='admin@nutritionai.com')
        print(f"✓ Admin user found: {admin_user.email}")
        print(f"  - Is superuser: {admin_user.is_superuser}")
        print(f"  - Is staff: {admin_user.is_staff}")
        print(f"  - Is active: {admin_user.is_active}")
        print(f"  - Is verified: {admin_user.is_verified}")
    except User.DoesNotExist:
        print("✗ Admin user not found")
        return False
    
    # Test authentication
    authenticated_user = authenticate(
        username='admin@nutritionai.com',
        password='admin123'
    )
    
    if authenticated_user:
        print(f"✓ Authentication successful: {authenticated_user.email}")
        print(f"  - Can access admin: {authenticated_user.is_staff and authenticated_user.is_superuser}")
    else:
        print("✗ Authentication failed")
        return False
    
    # Test password verification
    if admin_user.check_password('admin123'):
        print("✓ Password verification successful")
    else:
        print("✗ Password verification failed")
        return False
    
    # Create a mock request to test login
    factory = RequestFactory()
    request = factory.get('/admin/')
    request.user = AnonymousUser()
    
    # Add session to request
    from django.contrib.sessions.middleware import SessionMiddleware
    middleware = SessionMiddleware(lambda x: None)
    middleware.process_request(request)
    request.session.save()
    
    # Test login
    from django.contrib.auth import login as auth_login
    auth_login(request, authenticated_user)
    
    print("✓ Login process completed successfully")
    print(f"  - User in session: {request.user.is_authenticated}")
    print(f"  - User email: {request.user.email if request.user.is_authenticated else 'Not authenticated'}")
    
    return True

if __name__ == "__main__":
    success = test_admin_login()
    if success:
        print("\n✓ All admin login tests passed!")
        print("Admin credentials: admin@nutritionai.com / admin123")
        print("Admin URL: http://172.25.29.233:8000/admin/")
    else:
        print("\n✗ Admin login tests failed!")
        sys.exit(1)