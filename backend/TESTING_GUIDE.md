# Testing Guide for Nutrition AI Backend

This guide explains how to run tests for the Nutrition AI backend using the updated pytest-based test runner.

## Setup Instructions

### 1. Install Dependencies

First, ensure you have all test dependencies installed:

```bash
pip install -r requirements.txt
```

Key testing dependencies include:
- `pytest==8.3.4` - Core testing framework
- `pytest-django==4.10.0` - Django integration for pytest
- `pytest-cov==6.0.0` - Coverage reporting
- `pytest-xdist==3.6.1` - Parallel test execution
- `factory-boy==3.3.1` - Test data factories
- `faker==33.7.0` - Fake data generation

### 2. Environment Setup

The test runner automatically sets up the Django environment for testing:
- Sets `DJANGO_SETTINGS_MODULE` to `core.settings.testing`
- Sets `DJANGO_ENVIRONMENT` to `testing`
- Configures the test database (SQLite in-memory by default)

## Running Tests

### Basic Usage

```bash
# Run all tests
python run_tests.py

# Run tests in a specific file
python run_tests.py api/tests/test_user_models.py

# Run tests in a specific directory
python run_tests.py api/tests/

# Run a specific test class
python run_tests.py api/tests/test_user_models.py::UserModelTest

# Run a specific test method
python run_tests.py api/tests/test_user_models.py::UserModelTest::test_create_user_with_email
```

### Test Selection Options

```bash
# Run tests matching a keyword pattern
python run_tests.py -k "user or auth"

# Run only unit tests (if marked)
python run_tests.py -m unit

# Skip slow tests
python run_tests.py -m "not slow"

# Combine markers
python run_tests.py -m "unit and not slow"
```

### Coverage Reports

```bash
# Run with coverage report
python run_tests.py --coverage

# Generate HTML coverage report
python run_tests.py --coverage --html

# Generate XML coverage report (for CI/CD)
python run_tests.py --coverage --xml
```

Coverage reports will be generated in:
- Terminal output (with missing lines)
- `htmlcov/` directory (HTML report)
- `coverage.xml` (XML report)

### Performance Options

```bash
# Run tests in parallel (uses all CPU cores)
python run_tests.py --parallel

# Run tests in parallel with specific number of workers
python run_tests.py --parallel 4

# Show the 10 slowest tests
python run_tests.py --durations 10
```

### Debugging Options

```bash
# Drop into debugger on failures
python run_tests.py --pdb

# Drop into debugger at start of each test
python run_tests.py --pdb-trace

# Show local variables in tracebacks
python run_tests.py --showlocals

# Stop after first failure
python run_tests.py --failfast
```

### Database Options

```bash
# Force recreate test database (default: reuse)
python run_tests.py --create-db
```

### Output Options

```bash
# Verbose output
python run_tests.py -v

# Very verbose output
python run_tests.py -vv

# Quiet mode
python run_tests.py -q

# Disable warnings
python run_tests.py --no-warnings
```

## Test Organization

Tests are organized in the `api/tests/` directory:

```
api/tests/
├── __init__.py              # Empty (no imports)
├── factories.py             # Factory Boy factories for test data
├── test_user_models.py      # User and UserProfile model tests
├── test_food_models.py      # Food-related model tests
├── test_other_models.py     # Other model tests
├── test_auth_views.py       # Authentication view tests
├── test_meal_views.py       # Meal management view tests
├── test_ai_views.py         # AI/Gemini integration view tests
├── test_gemini_service.py   # Gemini service tests
└── test_utils.py            # Utility function tests
```

## Test Configuration

The test configuration is defined in `pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = core.settings.testing
python_files = test_*.py
python_classes = Test*
python_functions = test_*
testpaths = api/tests
addopts = 
    --reuse-db
    --nomigrations
    --strict-markers
    -v
    --tb=short
    --disable-warnings
```

## Writing Tests

### Test Markers

You can mark tests for better organization:

```python
import pytest

@pytest.mark.unit
def test_simple_calculation():
    assert 1 + 1 == 2

@pytest.mark.integration
def test_api_endpoint(client):
    response = client.get('/api/v1/health/')
    assert response.status_code == 200

@pytest.mark.slow
def test_complex_operation():
    # Long running test
    pass
```

### Using Factories

Use Factory Boy factories for test data:

```python
from api.tests.factories import UserFactory, MealFactory

def test_user_creation():
    user = UserFactory(email="test@example.com")
    assert user.email == "test@example.com"

def test_meal_with_user():
    meal = MealFactory()
    assert meal.user is not None
```

## Common Issues and Solutions

### Issue: Import Errors

If you encounter import errors, ensure:
1. You're using absolute imports (`from api.models import ...`)
2. The `api/tests/__init__.py` file is empty
3. Your PYTHONPATH includes the backend directory

### Issue: Database Errors

If you encounter database errors:
1. Use `--create-db` to force recreate the test database
2. Check that migrations are up to date
3. Ensure PostgreSQL is running (if using PostgreSQL for tests)

### Issue: Slow Tests

To speed up tests:
1. Use `--parallel` for parallel execution
2. Mark slow tests with `@pytest.mark.slow` and skip them with `-m "not slow"`
3. Use `--reuse-db` (default) to avoid recreating the database

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Run all tests with XML coverage report
python run_tests.py --coverage --xml --no-warnings

# Run with specific verbosity for CI logs
python run_tests.py -v --coverage
```

## Best Practices

1. **Keep tests fast**: Mark slow tests and run them separately
2. **Use fixtures**: Share common test setup using pytest fixtures
3. **Test isolation**: Each test should be independent
4. **Clear test names**: Use descriptive test function names
5. **Use factories**: Create test data with factories instead of fixtures
6. **Coverage goals**: Aim for >80% coverage on critical code paths

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [pytest-django Documentation](https://pytest-django.readthedocs.io/)
- [Factory Boy Documentation](https://factoryboy.readthedocs.io/)
- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)