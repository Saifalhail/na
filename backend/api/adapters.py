"""
Custom adapters for django-allauth to integrate with our app.
"""
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from rest_framework import status
from rest_framework.response import Response
from .models import UserProfile


class AccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter to handle email verification and other account-related tasks.
    """
    
    def get_email_confirmation_url(self, request, emailconfirmation):
        """Construct the email confirmation URL."""
        # Use frontend URL for email confirmation
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8081')
        key = emailconfirmation.key
        return f"{frontend_url}/auth/verify-email/{key}"
    
    def get_password_reset_url(self, request, user, token):
        """Construct the password reset URL."""
        # Use frontend URL for password reset
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8081')
        return f"{frontend_url}/auth/reset-password/{token}"
    
    def save_user(self, request, user, form, commit=True):
        """
        Save a new user instance and create associated profile.
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Set additional fields from the registration form if available
        if hasattr(form, 'cleaned_data'):
            data = form.cleaned_data
            user.first_name = data.get('first_name', '')
            user.last_name = data.get('last_name', '')
        
        if commit:
            user.save()
            # Create user profile
            if not hasattr(user, 'profile'):
                UserProfile.objects.create(user=user)
        
        return user
    
    def is_open_for_signup(self, request):
        """
        Check whether account signup is currently open.
        """
        return getattr(settings, 'ACCOUNT_ALLOW_REGISTRATION', True)


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter to handle OAuth providers.
    """
    
    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a social provider,
        but before the login is actually processed.
        """
        # Check if email already exists
        if sociallogin.is_existing:
            return
        
        # If email verification is required, check if email is verified
        if sociallogin.account.provider == 'google':
            # Google emails are pre-verified
            sociallogin.account.extra_data['email_verified'] = True
    
    def save_user(self, request, sociallogin, form=None):
        """
        Save a new user instance from social login.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Extract additional data from social provider
        data = sociallogin.account.extra_data
        
        # Update user fields from social data
        if 'given_name' in data:
            user.first_name = data['given_name']
        if 'family_name' in data:
            user.last_name = data['family_name']
        if 'picture' in data and hasattr(user, 'profile'):
            # Store the picture URL in profile (we'll handle download later)
            user.profile.social_avatar_url = data['picture']
            user.profile.save()
        
        user.save()
        
        # Create user profile if it doesn't exist
        if not hasattr(user, 'profile'):
            UserProfile.objects.create(user=user)
        
        return user
    
    def is_auto_signup_allowed(self, request, sociallogin):
        """
        Returns True if auto signup is allowed for social login.
        """
        # Allow auto signup for verified social accounts
        email = sociallogin.account.extra_data.get('email', '')
        email_verified = sociallogin.account.extra_data.get('email_verified', False)
        
        return email and email_verified
    
    def populate_user(self, request, sociallogin, data):
        """
        Hook for populating a user instance from social provider data.
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Set email as verified for social signups
        if sociallogin.account.provider == 'google':
            user.is_verified = True
        
        return user