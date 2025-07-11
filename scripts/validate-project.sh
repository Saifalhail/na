#!/bin/bash

# Project validation script for Nutrition AI
# Checks for common issues and ensures project is properly configured

# Source common configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/common.sh"

# Define Windows mount and WSL home paths
WINDOWS_MOUNT="/mnt/c/Users/Saif-/OneDrive/Desktop/development/na"
WSL_HOME="/home/saifalhail/development/na"

echo ""
log_header "🔍 Nutrition AI Project Validator"
log_header "=================================="
echo ""

ISSUES=0
WARNINGS=0

# Check WSL environment
log_step "Checking WSL environment..."
if [[ -f /proc/version ]] && grep -q microsoft /proc/version; then
    log_success "Running in WSL environment"
else
    log_error "Not running in WSL - some features may not work correctly"
    ISSUES=$((ISSUES + 1))
fi

# Check project directories
log_step "Checking project directories..."
log_info "Project root: $PROJECT_ROOT"

if [ "$PROJECT_ROOT" = "$WINDOWS_MOUNT" ]; then
    log_success "Using Windows mount directory (good for OneDrive sync)"
    if [ -d "$WSL_HOME" ]; then
        log_warning "Duplicate project found at: $WSL_HOME"
        log_info "Consider removing it to avoid confusion"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    log_warning "Using WSL home directory - changes won't sync to OneDrive"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Node.js and npm
log_step "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION installed"
else
    log_error "Node.js not found"
    ISSUES=$((ISSUES + 1))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "npm $NPM_VERSION installed"
else
    log_error "npm not found"
    ISSUES=$((ISSUES + 1))
fi

# Check Python
log_step "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d ' ' -f 2)
    log_success "Python $PYTHON_VERSION installed"
else
    log_error "Python 3 not found"
    ISSUES=$((ISSUES + 1))
fi

# Check backend setup
log_step "Checking backend setup..."
cd "$BACKEND_DIR"

if [ -f "venv/bin/activate" ] || [ -f "venv/Scripts/activate" ]; then
    if [ -f "venv/bin/activate" ]; then
        log_success "Python virtual environment exists (Linux-style)"
    else
        log_success "Python virtual environment exists (Windows-style)"
        log_info "Consider running ./scripts/setup-backend.sh to convert to Linux-style"
    fi
else
    log_error "Python virtual environment not found"
    log_info "Run: ./scripts/setup-backend.sh"
    ISSUES=$((ISSUES + 1))
fi

if [ -f ".env" ]; then
    log_success "Backend .env file exists"
else
    log_warning "Backend .env file not found"
    log_info "Create one from .env.example"
    WARNINGS=$((WARNINGS + 1))
fi

# Check frontend setup
log_step "Checking frontend setup..."
cd "$FRONTEND_DIR"

if [ -d "node_modules" ]; then
    log_success "Node modules installed"
else
    log_error "Node modules not found"
    log_info "Run: npm install"
    ISSUES=$((ISSUES + 1))
fi

if [ -f ".env" ]; then
    log_success "Frontend .env file exists"
    
    # Check social auth setting
    if grep -q "EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=true" .env; then
        log_info "Social auth is enabled (Google Sign-In will be available)"
    else
        log_info "Social auth is disabled (Google Sign-In will be hidden)"
    fi
else
    log_warning "Frontend .env file not found"
    log_info "Create one from .env.example"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for native modules
log_step "Checking for incompatible native modules..."
NATIVE_MODULES_FOUND=0

if [ -f "package.json" ]; then
    if grep -q "react-native-mmkv" package.json; then
        log_error "react-native-mmkv found in package.json"
        log_info "This native module won't work in Expo Go"
        ISSUES=$((ISSUES + 1))
        NATIVE_MODULES_FOUND=1
    fi
    
    if grep -q "@react-native-google-signin/google-signin" package.json; then
        log_error "Native Google Sign-In found in package.json"
        log_info "Project should use expo-auth-session instead"
        ISSUES=$((ISSUES + 1))
        NATIVE_MODULES_FOUND=1
    fi
fi

if [ $NATIVE_MODULES_FOUND -eq 0 ]; then
    log_success "No incompatible native modules found"
fi

# Check for Expo-friendly modules
log_step "Checking Expo-compatible modules..."
if [ -f "package.json" ]; then
    if grep -q "expo-auth-session" package.json; then
        log_success "expo-auth-session installed (for Google Sign-In)"
    else
        log_warning "expo-auth-session not found"
        log_info "Run: npm install expo-auth-session expo-web-browser"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check TypeScript
log_step "Checking TypeScript..."
cd "$FRONTEND_DIR"
if npm run type-check > /dev/null 2>&1; then
    log_success "TypeScript compilation successful"
else
    log_warning "TypeScript compilation has errors"
    log_info "Run: npm run type-check"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for running processes
log_step "Checking for running processes..."
if ps aux | grep -E "expo|metro" | grep -v grep > /dev/null; then
    log_warning "Expo/Metro processes are running"
    log_info "This might cause port conflicts"
    WARNINGS=$((WARNINGS + 1))
else
    log_success "No conflicting processes found"
fi

# Summary
echo ""
log_header "📊 Validation Summary"
log_header "===================="
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    log_success "✨ Everything looks good! Your project is ready."
    echo ""
    log_info "Start development with:"
    echo "   ./scripts/dev-start.sh phone"
    echo ""
elif [ $ISSUES -eq 0 ]; then
    log_warning "⚠️  Found $WARNINGS warning(s) but no critical issues."
    echo ""
    log_info "The project should work, but consider addressing the warnings."
    echo ""
else
    log_error "❌ Found $ISSUES critical issue(s) and $WARNINGS warning(s)"
    echo ""
    log_info "Please fix the critical issues before proceeding."
    echo ""
fi

# Helpful commands
log_header "📝 Useful Commands"
echo ""
echo "  Setup everything:       ./scripts/setup-everything.sh"
echo "  Start development:      ./scripts/dev-start.sh phone"
echo "  Start Expo safely:      ./scripts/start-expo-safe.sh"
echo "  Fix dual directories:   ./scripts/sync-directories.sh"
echo "  Backend only:           ./scripts/setup-backend.sh"
echo ""

exit $ISSUES
