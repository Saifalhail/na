#!/bin/bash

# Comprehensive Test Execution Script for Nutrition AI Project
# Usage: ./TEST_EXECUTION_SCRIPT.sh [backend|frontend|both]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to run backend tests
run_backend_tests() {
    print_status "Running Backend Tests..."
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found in backend directory"
        return 1
    fi
    
    # Activate virtual environment and run tests
    print_status "Activating Python virtual environment..."
    
    if [ -f "venv/Scripts/python.exe" ]; then
        # Windows virtual environment
        PYTHON_CMD="./venv/Scripts/python.exe"
    elif [ -f "venv/bin/python" ]; then
        # Unix virtual environment
        PYTHON_CMD="./venv/bin/python"
    else
        print_error "Python executable not found in virtual environment"
        return 1
    fi
    
    print_status "Running pytest with coverage..."
    
    $PYTHON_CMD -m pytest \
        --cov=api \
        --cov-report=html \
        --cov-report=term-missing \
        --cov-report=xml \
        --tb=short \
        -v
    
    BACKEND_EXIT_CODE=$?
    
    if [ $BACKEND_EXIT_CODE -eq 0 ]; then
        print_success "Backend tests completed successfully"
    else
        print_warning "Backend tests completed with some failures (exit code: $BACKEND_EXIT_CODE)"
    fi
    
    print_status "Backend coverage report generated in htmlcov/index.html"
    
    cd ..
    return $BACKEND_EXIT_CODE
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "Running Frontend Tests..."
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found, running npm install..."
        npm install
    fi
    
    print_status "Running Jest tests..."
    
    npm test -- --watchAll=false --coverage=false --verbose
    
    FRONTEND_EXIT_CODE=$?
    
    if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
        print_success "Frontend tests completed successfully"
    else
        print_warning "Frontend tests completed with some failures (exit code: $FRONTEND_EXIT_CODE)"
    fi
    
    cd ..
    return $FRONTEND_EXIT_CODE
}

# Function to generate summary report
generate_summary() {
    print_status "Generating Test Summary..."
    
    echo ""
    echo "================================="
    echo "     TEST EXECUTION SUMMARY     "
    echo "================================="
    echo ""
    
    if [ "$1" = "both" ] || [ "$1" = "backend" ]; then
        if [ ${BACKEND_RESULT:-1} -eq 0 ]; then
            print_success "Backend Tests: PASSED"
        else
            print_warning "Backend Tests: SOME FAILURES"
        fi
    fi
    
    if [ "$1" = "both" ] || [ "$1" = "frontend" ]; then
        if [ ${FRONTEND_RESULT:-1} -eq 0 ]; then
            print_success "Frontend Tests: PASSED"
        else
            print_warning "Frontend Tests: SOME FAILURES"
        fi
    fi
    
    echo ""
    echo "Reports generated:"
    echo "- Backend coverage: backend/htmlcov/index.html"
    echo "- Test status: TESTING_STATUS_REPORT.md"
    echo ""
}

# Main execution logic
main() {
    local test_type=${1:-both}
    
    echo ""
    echo "========================================="
    echo "    NUTRITION AI PROJECT TEST RUNNER    "
    echo "========================================="
    echo ""
    
    case $test_type in
        "backend")
            run_backend_tests
            BACKEND_RESULT=$?
            generate_summary "backend"
            exit $BACKEND_RESULT
            ;;
        "frontend")
            run_frontend_tests
            FRONTEND_RESULT=$?
            generate_summary "frontend"
            exit $FRONTEND_RESULT
            ;;
        "both")
            print_status "Running tests for both backend and frontend..."
            
            run_backend_tests
            BACKEND_RESULT=$?
            
            run_frontend_tests
            FRONTEND_RESULT=$?
            
            generate_summary "both"
            
            # Exit with error if either test suite failed
            if [ $BACKEND_RESULT -ne 0 ] || [ $FRONTEND_RESULT -ne 0 ]; then
                exit 1
            else
                exit 0
            fi
            ;;
        *)
            echo "Usage: $0 [backend|frontend|both]"
            echo ""
            echo "Options:"
            echo "  backend   - Run only backend tests"
            echo "  frontend  - Run only frontend tests" 
            echo "  both      - Run both backend and frontend tests (default)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"