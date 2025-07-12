#!/bin/bash

# Nutrition AI - Simple Startup Script
# Usage: ./start.sh [backend|frontend|clean|help]

# Remove set -e to handle errors properly

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "🍎 Nutrition AI Startup"
echo "======================="

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Platform detection and cross-platform support
PLATFORM="unknown"
PYTHON_CMD="python3"
VENV_PYTHON="venv/bin/python"
VENV_PIP="venv/bin/pip"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    PLATFORM="windows"
    PYTHON_CMD="python"
    VENV_PYTHON="venv/Scripts/python.exe"
    VENV_PIP="venv/Scripts/pip.exe"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if grep -q Microsoft /proc/version 2>/dev/null; then
        PLATFORM="wsl"
    else
        PLATFORM="linux"
    fi
else
    PLATFORM="unix"
fi

log_info "Detected platform: $PLATFORM"

# System dependency check function
check_system_dependencies() {
    local missing_deps=()
    
    # Check Python
    if ! command -v $PYTHON_CMD >/dev/null 2>&1; then
        missing_deps+=("$PYTHON_CMD")
    fi
    
    # Check Node.js for frontend
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    # Platform-specific checks
    if [[ "$PLATFORM" != "windows" ]]; then
        # Unix-like systems need build tools
        if ! command -v gcc >/dev/null 2>&1 && ! command -v clang >/dev/null 2>&1; then
            missing_deps+=("build-essential")
        fi
        
        # Check for pip3 specifically on Linux/WSL
        if ! command -v pip3 >/dev/null 2>&1; then
            missing_deps+=("python3-pip")
        fi
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing system dependencies: ${missing_deps[*]}"
        echo ""
        if [[ "$PLATFORM" == "windows" ]]; then
            log_info "Windows Installation Guide:"
            log_info "  • Python: https://python.org/downloads/"
            log_info "  • Node.js: https://nodejs.org/en/download/"
            log_info "  • Git: https://git-scm.com/download/win"
        else
            log_info "Installation commands:"
            log_info "  Ubuntu/Debian: sudo apt update && sudo apt install -y python3 python3-pip python3-venv python3-full build-essential nodejs npm"
            log_info "  CentOS/RHEL: sudo yum install python3 python3-pip nodejs npm gcc gcc-c++ make"
            log_info "  macOS: brew install python node"
        fi
        return 1
    fi
    
    log_info "✅ System dependencies satisfied"
    return 0
}

# Progress indicator for long-running operations
show_progress() {
    local pid=$1
    local message="$2"
    local spinner="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local i=0
    
    echo -n "$message "
    while kill -0 $pid 2>/dev/null; do
        printf "\b${spinner:$i:1}"
        sleep 0.1
        i=$(( (i + 1) % ${#spinner} ))
    done
    printf "\b✓\n"
}

# Auto-fix common issues
auto_fix_python_issues() {
    log_info "Attempting to auto-fix Python environment issues..."
    
    # Try to install python3-full if missing
    if [[ "$PLATFORM" != "windows" ]] && ! python3 -c "import ensurepip" 2>/dev/null; then
        log_info "Installing python3-full package..."
        if command -v apt >/dev/null 2>&1; then
            sudo apt update && sudo apt install -y python3-full
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y python3-devel
        fi
    fi
    
    # Try to upgrade pip in virtual environment if it exists
    if [ -f "$VENV_PYTHON" ]; then
        log_info "Upgrading pip in virtual environment..."
        $VENV_PYTHON -m pip install --upgrade pip --disable-pip-version-check 2>/dev/null || true
    fi
}

# Check project structure
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    log_error "Backend or frontend directory missing!"
    exit 1
fi

# Function to kill existing processes
cleanup_processes() {
    log_info "Stopping existing processes..."
    pkill -f "manage.py runserver" 2>/dev/null || true
    pkill -f "expo start" 2>/dev/null || true
    pkill -f "metro" 2>/dev/null || true
    
    # Kill ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    lsof -ti:19000 | xargs kill -9 2>/dev/null || true
    
    sleep 2
}

# Function to clean caches
clean_caches() {
    log_info "Cleaning caches..."
    
    # Python caches
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Frontend caches
    rm -rf frontend/.metro-cache frontend/.expo frontend/node_modules/.cache 2>/dev/null || true
    
    # Backend caches
    rm -rf backend/htmlcov backend/.pytest_cache 2>/dev/null || true
    
    log_info "Caches cleaned"
}

# Function to start backend
start_backend() {
    log_info "Starting Backend (Django)..."
    
    cd backend
    
    # Check Python (platform-specific)
    if ! command -v $PYTHON_CMD >/dev/null 2>&1; then
        log_error "Python not found!"
        if [[ "$PLATFORM" == "windows" ]]; then
            log_error "Install Python from: https://python.org/downloads/"
        else
            log_error "Install with: sudo apt install python3 python3-venv python3-pip python3-full"
        fi
        return 1
    fi
    
    # Create virtual environment if needed
    if [ ! -d "venv" ]; then
        log_info "Creating virtual environment..."
        if ! $PYTHON_CMD -m venv venv; then
            log_error "Failed to create virtual environment"
            return 1
        fi
    fi
    
    # Check if virtual environment was created properly (platform-specific)
    VENV_ACTIVATE="venv/bin/activate"
    if [[ "$PLATFORM" == "windows" ]]; then
        VENV_ACTIVATE="venv/Scripts/activate"
    fi
    
    if [ ! -f "$VENV_ACTIVATE" ]; then
        log_error "Virtual environment activation script not found!"
        log_info "Trying to recreate virtual environment..."
        rm -rf venv
        if ! $PYTHON_CMD -m venv venv; then
            log_error "Failed to create virtual environment. Check if python3-venv is installed."
            return 1
        fi
    fi
    
    # Activate virtual environment
    log_info "Activating virtual environment..."
    if ! source "$VENV_ACTIVATE"; then
        log_error "Failed to activate virtual environment"
        return 1
    fi
    
    # Verify activation worked
    if [ -z "$VIRTUAL_ENV" ]; then
        log_error "Virtual environment activation failed"
        return 1
    fi
    
    log_info "Virtual environment activated: $VIRTUAL_ENV"
    
    # Install dependencies
    if [ ! -f "venv/.installed" ] || [ "requirements.txt" -nt "venv/.installed" ]; then
        log_info "Installing dependencies..."
        
        # Use explicit virtual environment python and pip to avoid externally-managed-environment errors
        if ! $VENV_PYTHON -m pip install --upgrade pip; then
            log_warn "Failed to upgrade pip normally, trying auto-fix..."
            auto_fix_python_issues
            
            if ! $VENV_PYTHON -m pip install --upgrade pip --break-system-packages; then
                log_error "Failed to upgrade pip even after auto-fix attempts"
                log_info "Manual fix: sudo apt install python3-full python3-dev build-essential"
                return 1
            fi
        fi
        
        if ! $VENV_PYTHON -m pip install -r requirements.txt; then
            log_warn "Failed to install dependencies normally, trying auto-fix..."
            auto_fix_python_issues
            
            if ! $VENV_PYTHON -m pip install -r requirements.txt --break-system-packages; then
                log_error "Failed to install dependencies even after auto-fix attempts"
                log_info "Manual fix: Check if all system dependencies are installed"
                log_info "  Ubuntu: sudo apt install python3-full python3-dev build-essential libpq-dev"
                return 1
            fi
        fi
        
        touch venv/.installed
        log_info "Dependencies installed successfully"
    fi
    
    # Create .env if missing
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        log_info "Creating .env file..."
        cp .env.example .env
        log_warn "Please update .env with your configuration"
    fi
    
    # Run migrations
    $VENV_PYTHON manage.py migrate --noinput 2>/dev/null || log_warn "Migrations failed - continuing anyway"
    
    # Get local IP for mobile access
    LOCAL_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -n1 || echo "127.0.0.1")
    
    log_info "Backend starting on:"
    log_info "  Local: http://127.0.0.1:8000"
    log_info "  Mobile: http://$LOCAL_IP:8000"
    
    # Start Django server
    $VENV_PYTHON manage.py runserver 0.0.0.0:8000 &
    BACKEND_PID=$!
    
    cd ..
    
    # Wait and check if it started
    sleep 3
    if ps -p $BACKEND_PID > /dev/null; then
        log_info "✅ Backend started successfully (PID: $BACKEND_PID)"
        echo $BACKEND_PID > backend.pid
    else
        log_error "❌ Backend failed to start"
        exit 1
    fi
}

# Function to start frontend
start_frontend() {
    log_info "Starting Frontend (Expo)..."
    
    cd frontend
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js not found! Install from: https://nodejs.org/"
        exit 1
    fi
    
    # Install dependencies if needed or package.json changed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log_info "Installing/updating dependencies..."
        npm install
    fi
    
    # Create .env if missing
    if [ ! -f ".env" ]; then
        LOCAL_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -n1 || echo "127.0.0.1")
        log_info "Creating .env file..."
        cat > .env << EOF
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_API_URL_PHYSICAL=http://$LOCAL_IP:8000
EXPO_PUBLIC_ENV=development
EOF
    fi
    
    # Enhanced cache clearing for WSL/OneDrive environments
    log_info "Clearing Metro cache and temporary files..."
    rm -rf .metro-cache .expo node_modules/.cache 2>/dev/null || true
    npm cache clean --force 2>/dev/null || true
    
    # WSL/OneDrive specific optimizations
    if [[ "$PLATFORM" == "wsl" ]] || [[ "$(pwd)" =~ OneDrive ]]; then
        log_info "Detected WSL/OneDrive environment, applying optimizations..."
        
        # Clear additional cache directories that can cause issues
        rm -rf ~/.expo ~/.npm/_cacache 2>/dev/null || true
        
        # Set WSL-specific environment variables for Metro
        export EXPO_USE_TUNNEL=true
        export METRO_CACHE=.metro-cache
        export WATCHMAN_DISABLE_WATCH_REMOVAL=true
    fi
    
    log_info "Frontend starting with tunnel mode for phone access..."
    log_info "📱 Scan QR code with Expo Go app on your phone"
    
    # Enhanced startup command with WSL-specific options
    EXPO_OPTS="--tunnel --clear"
    
    # Add reset cache flag for WSL/OneDrive to prevent bundling issues
    if [[ "$PLATFORM" == "wsl" ]] || [[ "$(pwd)" =~ OneDrive ]]; then
        EXPO_OPTS="$EXPO_OPTS --reset-cache"
        log_info "Using enhanced WSL/OneDrive cache clearing..."
    fi
    
    # Start Expo with enhanced options
    log_info "Starting with options: $EXPO_OPTS"
    npx expo start $EXPO_OPTS &
    FRONTEND_PID=$!
    
    cd ..
    
    # Give it more time to start up in WSL environment
    STARTUP_WAIT=5
    if [[ "$PLATFORM" == "wsl" ]]; then
        STARTUP_WAIT=8
        log_info "Giving extra startup time for WSL environment..."
    fi
    
    sleep $STARTUP_WAIT
    if ps -p $FRONTEND_PID > /dev/null; then
        log_info "✅ Frontend started successfully (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > frontend.pid
    else
        log_error "❌ Frontend failed to start"
        log_warn "If you see Metro bundler errors, try:"
        log_warn "  1. Clearing node_modules: rm -rf frontend/node_modules && cd frontend && npm install"
        log_warn "  2. Using manual start: cd frontend && npx expo start --clear --reset-cache"
        exit 1
    fi
}

# Handle commands
case "${1:-start}" in
    "backend")
        cleanup_processes
        
        # Check system dependencies
        if ! check_system_dependencies; then
            exit 1
        fi
        
        if start_backend; then
            log_info "🎉 Backend only mode - Django running on http://127.0.0.1:8000"
            log_info "Press Ctrl+C to stop"
            wait
        else
            log_error "❌ Backend failed to start"
            log_info "Try: sudo apt install python3-venv python3-pip python3-dev"
            exit 1
        fi
        ;;
    "frontend")
        cleanup_processes
        
        # Check system dependencies
        if ! check_system_dependencies; then
            exit 1
        fi
        
        if start_frontend; then
            log_info "🎉 Frontend only mode - Scan QR code with Expo Go"
            log_info "Press Ctrl+C to stop"
            wait
        else
            log_error "❌ Frontend failed to start"
            exit 1
        fi
        ;;
    "clean")
        cleanup_processes
        clean_caches
        log_info "🧹 Cleanup complete!"
        ;;
    "docker"|"prod"|"production")
        log_info "🐳 Starting production Docker environment..."
        
        # Check if Docker is installed
        if ! command -v docker >/dev/null 2>&1; then
            log_error "Docker not found! Install Docker first: https://docs.docker.com/get-docker/"
            exit 1
        fi
        
        if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
            log_error "Docker Compose not found! Install Docker Compose or use newer Docker with built-in compose"
            exit 1
        fi
        
        # Check if docker directory and production compose file exist
        if [ ! -d "docker" ] || [ ! -f "docker/docker-compose.prod.yml" ]; then
            log_error "Docker production files not found!"
            log_error "Expected: docker/docker-compose.prod.yml"
            exit 1
        fi
        
        # Check for required .env file
        if [ ! -f "docker/.env.prod" ]; then
            log_warn "Creating docker/.env.prod template..."
            log_warn "Please configure production environment variables!"
            cat > docker/.env.prod << 'EOF'
# Production Environment Variables
DB_NAME=nutritiondb_prod
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
SECRET_KEY=your_production_secret_key_here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
GEMINI_API_KEY=your_gemini_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=your_s3_bucket
SENTRY_DSN=your_sentry_dsn_here
EOF
            log_error "Please edit docker/.env.prod with your production values"
            exit 1
        fi
        
        cd docker
        
        # Use docker-compose or docker compose based on availability
        if command -v docker-compose >/dev/null 2>&1; then
            DOCKER_COMPOSE="docker-compose"
        else
            DOCKER_COMPOSE="docker compose"
        fi
        
        log_info "Building and starting production services..."
        $DOCKER_COMPOSE -f docker-compose.prod.yml --env-file .env.prod up --build -d
        
        if [ $? -eq 0 ]; then
            log_info "🎉 Production environment started successfully!"
            log_info "📊 View logs: $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f"
            log_info "🛑 Stop: $DOCKER_COMPOSE -f docker-compose.prod.yml down"
            log_info "🔄 Restart: $DOCKER_COMPOSE -f docker-compose.prod.yml restart"
        else
            log_error "❌ Failed to start production environment"
            exit 1
        fi
        ;;
    "help"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start both backend and frontend (default)"
        echo "  backend   Start only Django backend"
        echo "  frontend  Start only Expo frontend"
        echo "  docker    Start production Docker environment"
        echo "  clean     Clean caches and stop processes"
        echo "  help      Show this help"
        echo ""
        echo "Examples:"
        echo "  $0              # Start everything"
        echo "  $0 frontend     # Frontend only"
        echo "  $0 docker       # Production Docker"
        echo "  $0 clean        # Clean up"
        ;;
    "start"|*)
        cleanup_processes
        
        # Check system dependencies
        if ! check_system_dependencies; then
            exit 1
        fi
        
        log_info "🚀 Starting both backend and frontend..."
        
        # Start backend first
        if start_backend; then
            log_info "✅ Backend started successfully"
        else
            log_error "❌ Backend failed to start"
            log_info "Try: sudo apt install python3-venv python3-pip python3-dev"
            exit 1
        fi
        
        # Wait a moment
        sleep 3
        
        # Start frontend
        if start_frontend; then
            log_info "✅ Frontend started successfully"
        else
            log_error "❌ Frontend failed to start"
            exit 1
        fi
        
        echo ""
        log_info "🎉 Both services started successfully!"
        log_info "📱 Backend: http://127.0.0.1:8000"
        log_info "📱 Frontend: Scan QR code with Expo Go app"
        log_info "Press Ctrl+C to stop both services"
        
        # Wait for both processes
        wait
        ;;
esac

# Cleanup on exit
cleanup() {
    log_info "Shutting down..."
    cleanup_processes
    rm -f backend.pid frontend.pid
}

trap cleanup EXIT