#!/usr/bin/env python
"""
Test runner script for the Nutrition AI backend using pytest.

This script provides a unified interface for running tests with pytest,
handling Django setup, coverage reporting, and various test options.

Usage:
    python run_tests.py                           # Run all tests
    python run_tests.py api/tests/test_user_models.py  # Run specific test file
    python run_tests.py -k "test_create_user"     # Run tests matching pattern
    python run_tests.py --coverage                # Run with coverage report
    python run_tests.py --coverage --html         # Generate HTML coverage report
    python run_tests.py -m unit                   # Run only unit tests
    python run_tests.py -m "not slow"             # Skip slow tests
    python run_tests.py --verbose                 # Verbose output
    python run_tests.py --create-db               # Force recreate test database
    python run_tests.py --parallel                # Run tests in parallel
    python run_tests.py --pdb                     # Drop into debugger on failures

Examples:
    # Run all tests with coverage
    python run_tests.py --coverage

    # Run specific test module with verbose output
    python run_tests.py api/tests/test_auth_views.py -v

    # Run tests matching a pattern
    python run_tests.py -k "auth or user" --verbose

    # Run fast tests only (exclude slow tests)
    python run_tests.py -m "not slow"

    # Debug a failing test
    python run_tests.py api/tests/test_meal_views.py::TestMealViewSet::test_create_meal --pdb
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path


def setup_django_environment():
    """Set up Django environment for testing."""
    # Get the backend directory
    backend_dir = Path(__file__).parent.absolute()

    # Add backend directory to Python path
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    # Set Django settings module for testing
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.testing")

    # Ensure we're in testing environment
    os.environ["DJANGO_ENVIRONMENT"] = "testing"

    # Import and setup Django
    try:
        import django

        django.setup()
    except ImportError:
        print("Error: Django is not installed. Please install requirements:")
        print("  pip install -r requirements.txt")
        sys.exit(1)


def check_pytest_installed():
    """Check if pytest and related packages are installed."""
    try:
        import pytest
        import pytest_cov
        import pytest_django
    except ImportError as e:
        print(f"Error: Required test package not installed: {e}")
        print("\nPlease install test requirements:")
        print("  pip install pytest pytest-django pytest-cov factory-boy")
        sys.exit(1)


def build_pytest_command(args):
    """Build the pytest command with appropriate arguments."""
    # Use python -m pytest to ensure we use the correct Python interpreter
    cmd = [sys.executable, "-m", "pytest"]

    # Add test path or use default
    if args.test_path:
        cmd.append(args.test_path)

    # Add keyword filter
    if args.keyword:
        cmd.extend(["-k", args.keyword])

    # Add marker filter
    if args.marker:
        cmd.extend(["-m", args.marker])

    # Add verbosity
    if args.verbose:
        cmd.append("-vv")
    elif not args.quiet:
        cmd.append("-v")

    # Add quiet mode
    if args.quiet:
        cmd.append("-q")

    # Add coverage options
    if args.coverage:
        cmd.extend(["--cov=api", "--cov-report=term-missing"])
        if args.html:
            cmd.append("--cov-report=html")
        if args.xml:
            cmd.append("--cov-report=xml")

    # Database options
    if args.create_db:
        cmd.append("--create-db")
    else:
        cmd.append("--reuse-db")

    # Add parallel execution
    if args.parallel:
        # Use number of CPU cores by default
        import multiprocessing

        num_workers = (
            args.parallel
            if isinstance(args.parallel, int)
            else multiprocessing.cpu_count()
        )
        cmd.extend(["-n", str(num_workers)])

    # Add debugging options
    if args.pdb:
        cmd.append("--pdb")

    if args.pdb_trace:
        cmd.append("--trace")

    # Show local variables in tracebacks
    if args.showlocals:
        cmd.append("--showlocals")

    # Fail fast
    if args.failfast:
        cmd.append("-x")

    # Show N slowest tests
    if args.durations:
        cmd.extend(["--durations", str(args.durations)])

    # Disable warnings
    if args.no_warnings:
        cmd.append("--disable-warnings")

    # Add any extra pytest arguments
    if args.pytest_args:
        cmd.extend(args.pytest_args)

    return cmd


def run_tests(cmd):
    """Run the pytest command and return the exit code."""
    print(f"Running command: {' '.join(cmd)}")
    print("-" * 70)

    # Change to backend directory
    backend_dir = Path(__file__).parent.absolute()
    os.chdir(backend_dir)

    # Run pytest
    result = subprocess.run(cmd)

    return result.returncode


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(
        description="Run tests for Nutrition AI backend using pytest",
        epilog=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Test selection arguments
    parser.add_argument(
        "test_path",
        nargs="?",
        help="Specific test file, directory, or module to run (e.g., api/tests/test_user_models.py)",
    )
    parser.add_argument(
        "-k", "--keyword", help="Only run tests matching the given substring expression"
    )
    parser.add_argument(
        "-m",
        "--marker",
        help='Only run tests matching given mark expression (e.g., "unit", "not slow")',
    )

    # Output arguments
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Increase verbosity"
    )
    parser.add_argument("-q", "--quiet", action="store_true", help="Decrease verbosity")
    parser.add_argument(
        "--showlocals", action="store_true", help="Show local variables in tracebacks"
    )

    # Coverage arguments
    parser.add_argument(
        "--coverage",
        "--cov",
        action="store_true",
        help="Run tests with coverage report",
    )
    parser.add_argument(
        "--html",
        action="store_true",
        help="Generate HTML coverage report (requires --coverage)",
    )
    parser.add_argument(
        "--xml",
        action="store_true",
        help="Generate XML coverage report (requires --coverage)",
    )

    # Database arguments
    parser.add_argument(
        "--create-db", action="store_true", help="Force recreate the test database"
    )

    # Performance arguments
    parser.add_argument(
        "--parallel",
        "-n",
        nargs="?",
        const=True,
        help="Run tests in parallel (optionally specify number of workers)",
    )
    parser.add_argument(
        "--durations", type=int, metavar="N", help="Show N slowest tests"
    )

    # Debugging arguments
    parser.add_argument(
        "--pdb", action="store_true", help="Drop into debugger on failures or errors"
    )
    parser.add_argument(
        "--pdb-trace",
        "--trace",
        action="store_true",
        help="Drop into debugger at start of each test",
    )
    parser.add_argument(
        "-x", "--failfast", action="store_true", help="Stop after first failure"
    )

    # Other arguments
    parser.add_argument("--no-warnings", action="store_true", help="Disable warnings")

    # Catch-all for additional pytest arguments
    parser.add_argument(
        "pytest_args",
        nargs=argparse.REMAINDER,
        help="Additional arguments to pass to pytest",
    )

    args = parser.parse_args()

    # Check prerequisites
    check_pytest_installed()

    # Setup Django
    setup_django_environment()

    # Build and run pytest command
    cmd = build_pytest_command(args)
    exit_code = run_tests(cmd)

    # Exit with same code as pytest
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
