#!/bin/bash

# Setup Script Permissions for Nutrition AI
# Makes all deployment scripts executable with proper permissions

set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log "Setting up script permissions for Nutrition AI deployment scripts..."

# Make all scripts executable
chmod +x "$SCRIPT_DIR"/*.sh
chmod +x "$SCRIPT_DIR/../backend/scripts/deploy.sh" 2>/dev/null || true

# Create logs directories
sudo mkdir -p /var/log/nutrition-ai 2>/dev/null || mkdir -p /var/log/nutrition-ai 2>/dev/null || true

# Set ownership if possible
if command -v sudo &> /dev/null && sudo -n true 2>/dev/null; then
    sudo chown -R "$USER:$USER" /var/log/nutrition-ai 2>/dev/null || true
fi

success "Script permissions configured successfully!"

echo ""
echo "Available deployment scripts:"
echo "  🚀 ./scripts/deploy-production.sh  - Main production deployment orchestrator"
echo "  🔒 ./scripts/ssl-setup.sh          - SSL certificate management"
echo "  🖥️  ./scripts/server-setup.sh       - Initial server configuration"
echo "  💾 ./scripts/backup-manager.sh     - Comprehensive backup solution"
echo "  🏥 ./scripts/health-monitor.sh     - Health monitoring and alerting"
echo ""
echo "Quick start:"
echo "  1. Run server setup:    ./scripts/server-setup.sh"
echo "  2. Setup SSL:          ./scripts/ssl-setup.sh yourdomain.com api.yourdomain.com"
echo "  3. Deploy application: ./scripts/deploy-production.sh"
echo ""