#!/bin/bash

# Test runner script for Nutrition AI backend
# Usage: ./scripts/run_tests.sh [test_type] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
TEST_TYPE=${1:-all}
ENVIRONMENT=${ENVIRONMENT:-testing}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
PARALLEL=${PARALLEL:-auto}

echo "🧪 Running tests for Nutrition AI backend..."
echo "📊 Test type: $TEST_TYPE"
echo "🌍 Environment: $ENVIRONMENT"
echo "📈 Coverage threshold: $COVERAGE_THRESHOLD%"

# Load environment variables
cd "$PROJECT_DIR"
if [ -f ".env.testing" ]; then
    source ".env.testing"
    echo "✅ Loaded testing environment variables"
fi

# Activate virtual environment if exists
if [ -f "venv/bin/activate" ]; then
    source "venv/bin/activate"
    echo "✅ Activated virtual environment"
fi

# Install test dependencies
echo "📦 Installing test dependencies..."
pip install -q pytest pytest-django pytest-cov coverage factory-boy

# Set Django settings
export DJANGO_SETTINGS_MODULE=core.settings.testing

# Function to run unit tests
run_unit_tests() {
    echo "🔬 Running unit tests..."
    pytest api/tests/ -m "unit" --cov=api --cov-report=term-missing --cov-report=html --cov-report=xml --cov-fail-under="$COVERAGE_THRESHOLD" -n "$PARALLEL"
}

# Function to run integration tests
run_integration_tests() {
    echo "🔗 Running integration tests..."
    pytest api/tests/ -m "integration" --cov=api --cov-report=term-missing --cov-report=html --cov-report=xml --cov-fail-under="$COVERAGE_THRESHOLD" -n "$PARALLEL"
}

# Function to run performance tests
run_performance_tests() {
    echo "⚡ Running performance tests..."
    pytest api/tests/test_performance.py -v --tb=short
}

# Function to run security tests
run_security_tests() {
    echo "🔒 Running security tests..."
    
    # Install security tools
    pip install -q bandit safety
    
    # Run Bandit security linter
    echo "🔍 Running Bandit security scan..."
    bandit -r . -x "*/tests/*,*/venv/*,*/migrations/*" -f json -o security_report.json
    bandit -r . -x "*/tests/*,*/venv/*,*/migrations/*" -f txt
    
    # Run Safety check for vulnerable dependencies
    echo "🛡️ Checking for vulnerable dependencies..."
    safety check --json --output safety_report.json
    safety check
    
    # Run Django security check
    echo "🔐 Running Django security check..."
    python manage.py check --deploy --settings=core.settings.production
}

# Function to run all tests
run_all_tests() {
    echo "🚀 Running all tests..."
    
    # Clean previous coverage data
    coverage erase
    
    # Run all pytest tests with coverage
    pytest api/tests/ --cov=api --cov-report=term-missing --cov-report=html --cov-report=xml --cov-fail-under="$COVERAGE_THRESHOLD" -n "$PARALLEL"
    
    # Generate detailed coverage report
    echo "📊 Generating detailed coverage report..."
    coverage report --show-missing
    coverage html
    
    # Run performance tests
    run_performance_tests
    
    # Run security tests
    run_security_tests
}

# Function to run specific test file or class
run_specific_test() {
    local test_path="$1"
    echo "🎯 Running specific test: $test_path"
    pytest "$test_path" -v --tb=short --cov=api --cov-report=term-missing
}

# Function to run tests with debugging
run_debug_tests() {
    echo "🐛 Running tests in debug mode..."
    pytest api/tests/ -v -s --tb=long --pdb-trace
}

# Function to check test health
check_test_health() {
    echo "💊 Checking test health..."
    
    # Check for duplicate test names
    echo "🔍 Checking for duplicate test names..."
    find api/tests/ -name "test_*.py" -exec grep -H "def test_" {} \; | cut -d: -f2 | sort | uniq -d
    
    # Check for tests without assertions
    echo "🔍 Checking for tests without assertions..."
    grep -r "def test_" api/tests/ | while read -r line; do
        file=$(echo "$line" | cut -d: -f1)
        test_name=$(echo "$line" | cut -d: -f2 | sed 's/def //' | sed 's/(.*$//')
        if ! grep -A 20 "$test_name" "$file" | grep -q "assert"; then
            echo "⚠️ Test $test_name in $file has no assertions"
        fi
    done
    
    # Count tests by type
    echo "📊 Test statistics:"
    echo "Unit tests: $(grep -r '@pytest.mark.unit' api/tests/ | wc -l)"
    echo "Integration tests: $(grep -r '@pytest.mark.integration' api/tests/ | wc -l)"
    echo "Slow tests: $(grep -r '@pytest.mark.slow' api/tests/ | wc -l)"
    echo "Total test functions: $(grep -r 'def test_' api/tests/ | wc -l)"
}

# Main execution based on test type
case $TEST_TYPE in
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "performance")
        run_performance_tests
        ;;
    "security")
        run_security_tests
        ;;
    "debug")
        run_debug_tests
        ;;
    "health")
        check_test_health
        ;;
    "all")
        run_all_tests
        ;;
    *)
        # Assume it's a specific test path
        if [ -f "$TEST_TYPE" ] || [ -d "$TEST_TYPE" ]; then
            run_specific_test "$TEST_TYPE"
        else
            echo "❌ Unknown test type: $TEST_TYPE"
            echo "Available options: unit, integration, performance, security, debug, health, all, or specific test path"
            exit 1
        fi
        ;;
esac

# Final report
echo "✅ Test execution completed!"

# Check if coverage reports were generated
if [ -f "coverage.xml" ]; then
    echo "📊 Coverage report generated: coverage.xml"
fi

if [ -d "htmlcov" ]; then
    echo "🌐 HTML coverage report available at: htmlcov/index.html"
fi

if [ -f "security_report.json" ]; then
    echo "🔒 Security report generated: security_report.json"
fi