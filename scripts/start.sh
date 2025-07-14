#!/bin/bash

# Nutrition AI - Unified Startup Script
# Usage: ./start.sh [backend|frontend|clean|help]
# Automatically configures for your environment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }
log_success() { echo -e "${CYAN}[SUCCESS]${NC} $1"; }

echo "🍎 Nutrition AI - Cross-Platform Startup"
echo "======================================="

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Platform detection
detect_platform() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if grep -q Microsoft /proc/version 2>/dev/null; then
            echo "wsl"
        elif [ -f /.dockerenv ]; then
            echo "docker"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

PLATFORM=$(detect_platform)
log_info "Detected platform: $PLATFORM"

# Simplified dependency check
check_dependencies() {
    local python_found=false
    local node_found=false
    
    # Check for Python (any version 3.x)
    for cmd in python3 python python3.12 python3.11 python3.10; do
        if command -v $cmd >/dev/null 2>&1; then
            python_found=true
            break
        fi
    done
    
    # Check for Node.js
    if command -v node >/dev/null 2>&1; then
        node_found=true
    fi
    
    if ! $python_found || ! $node_found; then
        log_error "Missing dependencies!"
        ! $python_found && log_error "  ❌ Python 3.x not found"
        ! $node_found && log_error "  ❌ Node.js not found"
        echo ""
        log_info "Quick install:"
        log_info "  Ubuntu/WSL: sudo apt update && sudo apt install -y python3 python3-venv nodejs npm"
        log_info "  macOS: brew install python node"
        return 1
    fi
    
    return 0
}

# Kill existing processes
cleanup_processes() {
    log_info "Stopping existing processes..."
    pkill -f "manage.py runserver" 2>/dev/null || true
    pkill -f "expo start" 2>/dev/null || true
    pkill -f "metro" 2>/dev/null || true
    
    # Kill ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    
    sleep 1
}

# Clean caches
clean_caches() {
    log_info "Cleaning caches..."
    
    # Backend caches
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    rm -rf backend/.pytest_cache backend/htmlcov 2>/dev/null || true
    
    # Frontend caches
    rm -rf frontend/.metro-cache frontend/.expo frontend/node_modules/.cache 2>/dev/null || true
    
    # Clear saved IPs
    rm -f .backend_ip 2>/dev/null || true
    
    log_success "✅ Caches cleaned"
}

# Check project structure
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    log_error "Backend or frontend directory missing!"
    log_error "Make sure you're in the project root directory"
    exit 1
fi

# Make scripts executable
chmod +x backend.sh frontend.sh 2>/dev/null || true

# Start backend wrapper
start_backend() {
    log_info "Starting backend..."
    if [ -f "./backend.sh" ]; then
        ./backend.sh
    else
        log_error "backend.sh not found!"
        log_error "Please ensure backend.sh exists in the project root"
        exit 1
    fi
}

# Start frontend wrapper
start_frontend() {
    log_info "Starting frontend..."
    if [ -f "./frontend.sh" ]; then
        ./frontend.sh
    else
        log_error "frontend.sh not found!"
        log_error "Please ensure frontend.sh exists in the project root"
        exit 1
    fi
}

# Start both services
start_all() {
    log_info "🚀 Starting Nutrition AI (Backend + Frontend)..."
    
    # Start backend first
    log_info "Starting backend service..."
    ./backend.sh &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    log_info "Waiting for backend to start..."
    sleep 5
    
    # Check if backend is running
    if ! ps -p $BACKEND_PID > /dev/null; then
        log_error "Backend failed to start!"
        exit 1
    fi
    
    # Start frontend
    log_info "Starting frontend service..."
    ./frontend.sh &
    FRONTEND_PID=$!
    
    # Save PIDs
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
    
    echo ""
    log_success "🎉 Nutrition AI is running!"
    log_info "📱 Backend: http://127.0.0.1:8000"
    log_info "📱 Frontend: Check terminal for QR code"
    log_info "Press Ctrl+C to stop both services"
    
    # Wait for both processes
    wait
}

# Handle commands
case "${1:-start}" in
    "backend")
        cleanup_processes
        if ! check_dependencies; then
            exit 1
        fi
        start_backend
        ;;
    
    "frontend")
        cleanup_processes
        if ! check_dependencies; then
            exit 1
        fi
        start_frontend
        ;;
    
    "clean")
        cleanup_processes
        clean_caches
        log_success "🧹 Cleanup complete!"
        ;;
    
    "help"|"--help"|"-h")
        echo "🍎 Nutrition AI Startup Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no command)  Start entire app (backend + frontend)"
        echo "  backend       Start only Django backend server"
        echo "  frontend      Start only Expo React Native app"
        echo "  clean         Stop all processes and clean caches"
        echo "  help          Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0            # Start everything"
        echo "  $0 backend    # Start backend only"
        echo "  $0 frontend   # Start frontend only"
        echo "  $0 clean      # Clean up and stop everything"
        ;;
    
    ""|"start"|*)
        cleanup_processes
        if ! check_dependencies; then
            exit 1
        fi
        start_all
        ;;
esac

# Cleanup on exit
cleanup() {
    log_info "Shutting down..."
    cleanup_processes
    rm -f .backend.pid .frontend.pid
}

trap cleanup EXIT