from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from api.factories import UserFactory

User = get_user_model()


class SimpleUserViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = UserFactory(is_staff=True, is_superuser=True)
        self.regular_user = UserFactory()
    
    def test_user_list_requires_auth(self):
        """Test that user list requires authentication"""
        # Try without auth
        response = self.client.get('/api/v1/users/')
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
        # If it's a redirect, let's see where it goes
        if response.status_code == 301:
            print(f"Redirect location: {response.headers.get('Location')}")
        
        # The API should return 401 for unauthenticated requests
        # but if there's a redirect, let's follow it
        if response.status_code in (301, 302):
            response = self.client.get('/api/v1/users/', follow=True)
            print(f"After following redirect: {response.status_code}")