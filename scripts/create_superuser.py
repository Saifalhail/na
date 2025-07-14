#!/usr/bin/env python
"""
Script to create a Django superuser for the Nutrition AI backend.
Can be run from any directory - it will find the correct Django project.
"""

import os
import sys
import django
from pathlib import Path

# Configuration - CHANGE THESE VALUES BEFORE RUNNING
SUPERUSER_CONFIG = {
    'username': 'admin',
    'email': 'admin@nutritionai.com',
    'password': 'your-secure-password-123',
    'first_name': 'Admin',
    'last_name': 'User'
}

def setup_django():
    """Setup Django environment"""
    # Find the backend directory
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent / 'backend'
    
    # Add backend directory to Python path
    sys.path.insert(0, str(backend_dir))
    
    # Set Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.development')
    
    # Setup Django
    django.setup()

def create_superuser():
    """Create the superuser"""
    from django.contrib.auth import get_user_model
    from django.db import IntegrityError
    
    User = get_user_model()
    
    print(f"Creating superuser with username: {SUPERUSER_CONFIG['username']}")
    print(f"Email: {SUPERUSER_CONFIG['email']}")
    
    try:
        # Check if user already exists
        if User.objects.filter(username=SUPERUSER_CONFIG['username']).exists():
            print(f"\n⚠️  User '{SUPERUSER_CONFIG['username']}' already exists!")
            
            response = input("Do you want to update the existing user? (y/n): ").lower()
            if response == 'y':
                user = User.objects.get(username=SUPERUSER_CONFIG['username'])
                user.email = SUPERUSER_CONFIG['email']
                user.first_name = SUPERUSER_CONFIG['first_name']
                user.last_name = SUPERUSER_CONFIG['last_name']
                user.is_staff = True
                user.is_superuser = True
                user.is_active = True
                user.set_password(SUPERUSER_CONFIG['password'])
                user.save()
                print("✅ User updated successfully!")
            else:
                print("Operation cancelled.")
                return
        else:
            # Create new superuser
            user = User.objects.create_superuser(
                username=SUPERUSER_CONFIG['username'],
                email=SUPERUSER_CONFIG['email'],
                password=SUPERUSER_CONFIG['password'],
                first_name=SUPERUSER_CONFIG['first_name'],
                last_name=SUPERUSER_CONFIG['last_name']
            )
            print("✅ Superuser created successfully!")
        
        # Create user profile if it doesn't exist
        try:
            from api.models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'date_of_birth': '1990-01-01',
                    'height': 170,
                    'weight': 70,
                    'activity_level': 'moderate',
                    'dietary_preference': 'none',
                    'is_premium': True  # Give admin premium access
                }
            )
            if created:
                print("✅ User profile created with premium access!")
            else:
                # Update existing profile to have premium access
                profile.is_premium = True
                profile.save()
                print("✅ User profile updated with premium access!")
        except Exception as e:
            print(f"⚠️  Could not create/update user profile: {e}")
        
        print(f"\n🎉 Success! You can now login at: http://127.0.0.1:8000/admin/")
        print(f"Username: {SUPERUSER_CONFIG['username']}")
        print(f"Password: [the password you configured]")
        
    except IntegrityError as e:
        print(f"❌ Error creating user: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def main():
    """Main function"""
    print("=== Nutrition AI Superuser Creation Script ===\n")
    
    # Check if we should use custom values
    if len(sys.argv) > 1:
        print("Custom arguments detected:")
        if len(sys.argv) >= 4:
            SUPERUSER_CONFIG['username'] = sys.argv[1]
            SUPERUSER_CONFIG['email'] = sys.argv[2]
            SUPERUSER_CONFIG['password'] = sys.argv[3]
            print(f"Using custom username: {SUPERUSER_CONFIG['username']}")
            print(f"Using custom email: {SUPERUSER_CONFIG['email']}")
        else:
            print("Usage: python create_superuser.py [username] [email] [password]")
            print("Using default values from script...")
    
    try:
        setup_django()
        create_superuser()
    except Exception as e:
        print(f"❌ Failed to setup Django environment: {e}")
        print("\nMake sure you have:")
        print("1. Activated your virtual environment")
        print("2. Installed all requirements (pip install -r requirements.txt)")
        print("3. Run migrations (python manage.py migrate)")

if __name__ == "__main__":
    main()