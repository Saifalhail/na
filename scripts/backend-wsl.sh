#!/bin/bash

# Backend WSL Startup Script
# Optimized for Windows Subsystem for Linux

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "🍎 Nutrition AI Backend (WSL)"
echo "============================="

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/backend"

# Kill any existing Django processes
pkill -f "manage.py runserver" 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Check Python
if ! command -v python3 >/dev/null 2>&1; then
    log_error "Python3 not found! Install with: sudo apt install python3 python3-venv python3-pip"
    exit 1
fi

# Create virtual environment if needed
if [ ! -d "venv" ]; then
    log_info "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
log_info "Activating virtual environment..."
source venv/bin/activate

# Install minimal dependencies for quick start
if ! python -c "import django" 2>/dev/null; then
    log_info "Installing dependencies (first time setup)..."
    pip install --upgrade pip
    
    # Install minimal requirements first for faster startup
    if [ -f "requirements-minimal.txt" ]; then
        pip install -r requirements-minimal.txt
    else
        # Install essential packages only
        pip install Django==5.2.4 djangorestframework==3.16.0 django-cors-headers==4.7.0 django-environ==0.12.0
    fi
fi

# Create .env if missing
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    log_info "Creating .env file..."
    cp .env.example .env
fi

# Get local IP for mobile access
LOCAL_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -n1 || echo "127.0.0.1")

# Run migrations
log_info "Running migrations..."
# First check for migration conflicts and resolve them automatically
if python manage.py migrate --noinput 2>&1 | grep -q "Conflicting migrations detected"; then
    log_warn "Migration conflicts detected, attempting automatic merge..."
    if python manage.py makemigrations --merge --noinput; then
        log_info "Migration conflicts resolved, applying migrations..."
        python manage.py migrate --noinput
    else
        log_error "Failed to resolve migration conflicts automatically"
        exit 1
    fi
elif ! python manage.py migrate --noinput; then
    log_warn "Some migrations failed, retrying..."
    python manage.py migrate --noinput || log_warn "Migrations still failing - check database connectivity"
fi

# Create demo user
python manage.py create_demo_user 2>/dev/null || true

log_info "✅ Backend starting on:"
log_info "   Local: http://127.0.0.1:8000"
log_info "   Network: http://$LOCAL_IP:8000"
log_info "   Admin: http://127.0.0.1:8000/admin"
log_info ""
log_info "Demo credentials: demo@example.com / demo123"
log_info "Press Ctrl+C to stop"

# Start Django
python manage.py runserver 0.0.0.0:8000