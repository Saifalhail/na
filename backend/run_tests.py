#!/usr/bin/env python
"""
Test runner script for the Nutrition AI backend.

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py api.tests          # Run all API tests
    python run_tests.py api.tests.test_user_models  # Run specific test module
    python run_tests.py --coverage         # Run with coverage report
"""
import os
import sys
import argparse


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description='Run tests for Nutrition AI backend')
    parser.add_argument('test_path', nargs='?', default='api', 
                        help='Specific test module or package to run')
    parser.add_argument('--coverage', action='store_true',
                        help='Run tests with coverage report')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Verbose output')
    
    args = parser.parse_args()
    
    # Set Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.testing')
    
    # Add project directory to Python path
    project_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, project_dir)
    
    # Import Django and setup
    import django
    django.setup()
    
    # Import test runner
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner(
        verbosity=2 if args.verbose else 1,
        interactive=True,
        keepdb=False
    )
    
    # Run tests
    if args.coverage:
        try:
            import coverage
            cov = coverage.Coverage(source=['api'])
            cov.start()
            
            failures = test_runner.run_tests([args.test_path])
            
            cov.stop()
            cov.save()
            
            print("\n\nCoverage Report:")
            print("=" * 70)
            cov.report()
            
            # Generate HTML report
            cov.html_report(directory='htmlcov')
            print("\nDetailed HTML coverage report generated in 'htmlcov' directory")
            
        except ImportError:
            print("Coverage.py not installed. Install with: pip install coverage")
            failures = test_runner.run_tests([args.test_path])
    else:
        failures = test_runner.run_tests([args.test_path])
    
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()