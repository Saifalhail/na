"""
Main test module that imports all test cases.
This allows running all tests with: python manage.py test api
"""

# Import all test cases
from api.tests.test_user_models import *
from api.tests.test_food_models import *
from api.tests.test_other_models import *

# Make test utilities available
from api.tests.test_utils import *
