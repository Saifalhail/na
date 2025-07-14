# API Tests Documentation

This directory contains comprehensive unit tests for all models in the Nutrition AI backend.

## Test Structure

```
api/tests/
├── __init__.py              # Makes tests directory a Python package
├── test_user_models.py      # Tests for User, UserProfile, DietaryRestriction
├── test_food_models.py      # Tests for FoodItem, Meal, MealItem, MealAnalysis
├── test_other_models.py     # Tests for APIUsageLog, NutritionalInfo, FavoriteMeal, etc.
├── test_utils.py            # Test utilities and helper functions
└── README.md               # This file
```

## Running Tests

### Using Django's test command:

```bash
# Activate virtual environment first
.\venv\Scripts\Activate.ps1  # Windows PowerShell
source venv/bin/activate      # Linux/Mac

# Run all tests
python manage.py test

# Run all API tests
python manage.py test api

# Run specific test module
python manage.py test api.tests.test_user_models

# Run specific test class
python manage.py test api.tests.test_user_models.UserModelTest

# Run specific test method
python manage.py test api.tests.test_user_models.UserModelTest.test_create_user_with_email

# Run with verbose output
python manage.py test api -v 2

# Keep test database between runs (faster)
python manage.py test --keepdb
```

### Using the custom test runner:

```bash
# Run all tests
python run_tests.py

# Run specific tests
python run_tests.py api.tests.test_food_models

# Run with coverage report
python run_tests.py --coverage

# Verbose output
python run_tests.py -v
```

## Test Coverage

To generate a coverage report:

```bash
# Install coverage.py
pip install coverage

# Run tests with coverage
coverage run --source='.' manage.py test api
coverage report
coverage html  # Generates HTML report in htmlcov/

# Or use the custom runner
python run_tests.py --coverage
```

## Test Utilities

The `test_utils.py` module provides helpful utilities:

### TestDataBuilder

A class with static methods for creating test data:

```python
from api.tests.test_utils import TestDataBuilder

# Create a user
user = TestDataBuilder.create_user()

# Create a user with profile
user, profile = TestDataBuilder.create_user_with_profile(
    profile_data={'height': Decimal('175.00')}
)

# Create food items
apple = TestDataBuilder.create_food_item(name='Apple', calories=Decimal('52.00'))

# Create meals with items
meal, items = TestDataBuilder.create_meal_with_items(user=user)
```

### Helper Functions

```python
from api.tests.test_utils import assert_decimal_equal, create_test_image

# Assert decimal values are equal
assert_decimal_equal(self, actual_value, expected_value, places=2)

# Create a test image
image = create_test_image(name='food.jpg')
```

## Test Categories

### Model Tests

Each model has comprehensive tests covering:

1. **Creation and Validation**
   - Valid data creation
   - Required fields
   - Field constraints
   - Default values

2. **Relationships**
   - Foreign keys
   - One-to-one relationships
   - Many-to-many relationships
   - Cascade behavior

3. **Model Methods**
   - String representation
   - Custom methods
   - Properties
   - Calculated fields

4. **Business Logic**
   - Save method overrides
   - Signal handlers
   - Validation logic

### Example Test Structure

```python
class UserModelTest(TestCase):
    def setUp(self):
        """Set up test data."""
        self.valid_user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
        }

    def test_create_user_with_email(self):
        """Test creating a user with email as primary field."""
        user = User.objects.create_user(**self.valid_user_data)

        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        self.assertFalse(user.is_verified)  # Check defaults
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Clarity**: Test names should clearly describe what they test
3. **Coverage**: Aim for >80% test coverage
4. **Performance**: Use `setUpTestData` for read-only test data
5. **Assertions**: Use specific assertions (assertEqual, assertTrue, etc.)
6. **Edge Cases**: Test boundary conditions and error cases

## Common Test Patterns

### Testing Model Validation

```python
def test_field_validation(self):
    """Test field validation."""
    model = MyModel(invalid_field='invalid_value')

    with self.assertRaises(ValidationError):
        model.full_clean()
```

### Testing Unique Constraints

```python
def test_unique_constraint(self):
    """Test unique constraint."""
    MyModel.objects.create(unique_field='value')

    with self.assertRaises(IntegrityError):
        MyModel.objects.create(unique_field='value')
```

### Testing Relationships

```python
def test_foreign_key_relationship(self):
    """Test foreign key relationship."""
    parent = ParentModel.objects.create()
    child = ChildModel.objects.create(parent=parent)

    self.assertEqual(child.parent, parent)
    self.assertEqual(parent.children.count(), 1)
```

## Debugging Tests

```bash
# Run tests with Python debugger
python manage.py test --pdb

# Run specific test with debugging
python manage.py test api.tests.test_user_models.UserModelTest.test_create_user_with_email --pdb

# Print SQL queries during tests
python manage.py test --debug-sql
```

## Continuous Integration

Tests are automatically run on:

- Pull requests
- Commits to main branch
- Before deployment

Ensure all tests pass before merging code!
