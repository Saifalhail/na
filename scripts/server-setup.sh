#!/bin/bash

# Production Server Setup Script for Nutrition AI
# Automated server configuration, security hardening, and environment preparation
# Usage: ./scripts/server-setup.sh [--skip-docker] [--skip-security] [--skip-firewall]

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="nutrition-ai"
DEPLOYMENT_USER="${DEPLOYMENT_USER:-deploy}"
LOG_FILE="/var/log/${APP_NAME}/server-setup.log"

# Parse command line arguments
SKIP_DOCKER=false
SKIP_SECURITY=false
SKIP_FIREWALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-security)
            SKIP_SECURITY=true
            shift
            ;;
        --skip-firewall)
            SKIP_FIREWALL=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${PURPLE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

print_setup_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                 🚀 Production Server Setup                   ║"
    echo "║                   Nutrition AI Infrastructure                 ║"
    echo "║                                                               ║"
    echo "║  Target User: $DEPLOYMENT_USER"
    echo "║  OS: $(lsb_release -d 2>/dev/null | cut -f2 || uname -s)"
    echo "║  Kernel: $(uname -r)"
    echo "║  Architecture: $(uname -m)"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root_privileges() {
    log "Checking root privileges..."
    
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        error "This script requires root privileges or passwordless sudo access"
    fi
    
    success "Root privileges confirmed"
}

detect_os() {
    log "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
        info "Detected OS: $PRETTY_NAME"
    else
        error "Cannot detect operating system"
    fi
    
    # Verify supported OS
    case "$OS_ID" in
        ubuntu|debian)
            PACKAGE_MANAGER="apt"
            ;;
        centos|rhel|fedora)
            PACKAGE_MANAGER="yum"
            if command -v dnf &> /dev/null; then
                PACKAGE_MANAGER="dnf"
            fi
            ;;
        *)
            warning "OS not explicitly supported, proceeding with best effort"
            PACKAGE_MANAGER="apt"  # Default fallback
            ;;
    esac
    
    success "OS detection completed"
}

update_system() {
    log "Updating system packages..."
    
    case "$PACKAGE_MANAGER" in
        apt)
            sudo apt update
            sudo apt upgrade -y
            sudo apt autoremove -y
            ;;
        yum)
            sudo yum update -y
            sudo yum autoremove -y
            ;;
        dnf)
            sudo dnf update -y
            sudo dnf autoremove -y
            ;;
    esac
    
    success "System packages updated"
}

install_essential_packages() {
    log "Installing essential packages..."
    
    local packages=(
        "curl"
        "wget"
        "git"
        "unzip"
        "htop"
        "vim"
        "nano"
        "tree"
        "jq"
        "certbot"
        "fail2ban"
        "ufw"
        "logrotate"
        "cron"
        "rsync"
    )
    
    case "$PACKAGE_MANAGER" in
        apt)
            sudo apt install -y "${packages[@]}"
            # Additional Ubuntu/Debian specific packages
            sudo apt install -y software-properties-common apt-transport-https ca-certificates gnupg lsb-release
            ;;
        yum)
            sudo yum install -y "${packages[@]}"
            # Additional CentOS/RHEL specific packages
            sudo yum install -y yum-utils device-mapper-persistent-data lvm2
            ;;
        dnf)
            sudo dnf install -y "${packages[@]}"
            # Additional Fedora specific packages
            sudo dnf install -y dnf-plugins-core
            ;;
    esac
    
    success "Essential packages installed"
}

create_deployment_user() {
    log "Creating deployment user..."
    
    # Check if user already exists
    if id "$DEPLOYMENT_USER" &>/dev/null; then
        info "User $DEPLOYMENT_USER already exists"
    else
        # Create user
        sudo useradd -m -s /bin/bash "$DEPLOYMENT_USER"
        info "User $DEPLOYMENT_USER created"
    fi
    
    # Add to sudo group
    sudo usermod -aG sudo "$DEPLOYMENT_USER"
    
    # Setup SSH directory
    sudo mkdir -p "/home/$DEPLOYMENT_USER/.ssh"
    sudo chown "$DEPLOYMENT_USER:$DEPLOYMENT_USER" "/home/$DEPLOYMENT_USER/.ssh"
    sudo chmod 700 "/home/$DEPLOYMENT_USER/.ssh"
    
    # Copy current user's SSH keys if they exist
    if [[ -f "$HOME/.ssh/authorized_keys" ]]; then
        sudo cp "$HOME/.ssh/authorized_keys" "/home/$DEPLOYMENT_USER/.ssh/"
        sudo chown "$DEPLOYMENT_USER:$DEPLOYMENT_USER" "/home/$DEPLOYMENT_USER/.ssh/authorized_keys"
        sudo chmod 600 "/home/$DEPLOYMENT_USER/.ssh/authorized_keys"
        info "SSH keys copied to deployment user"
    fi
    
    success "Deployment user setup completed"
}

install_docker() {
    if [[ "$SKIP_DOCKER" == "true" ]]; then
        info "Skipping Docker installation"
        return 0
    fi
    
    log "Installing Docker..."
    
    # Remove old versions
    case "$PACKAGE_MANAGER" in
        apt)
            sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
            ;;
        yum|dnf)
            sudo $PACKAGE_MANAGER remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
            ;;
    esac
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
        
        # Add deployment user to docker group
        sudo usermod -aG docker "$DEPLOYMENT_USER"
        
        success "Docker installed"
    else
        info "Docker already installed"
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        local compose_version="v2.24.0"
        sudo curl -L "https://github.com/docker/compose/releases/download/$compose_version/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        success "Docker Compose installed"
    else
        info "Docker Compose already installed"
    fi
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    success "Docker setup completed"
}

configure_firewall() {
    if [[ "$SKIP_FIREWALL" == "true" ]]; then
        info "Skipping firewall configuration"
        return 0
    fi
    
    log "Configuring firewall..."
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Set default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (preserve current connection)
    sudo ufw allow ssh
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow specific application ports if needed
    # sudo ufw allow 8000/tcp  # Django development (optional)
    
    # Enable UFW
    sudo ufw --force enable
    
    # Configure fail2ban
    if command -v fail2ban-server &> /dev/null; then
        sudo systemctl start fail2ban
        sudo systemctl enable fail2ban
        
        # Create jail for SSH
        sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF
        
        sudo systemctl restart fail2ban
        success "Fail2ban configured"
    fi
    
    success "Firewall configuration completed"
}

setup_security_hardening() {
    if [[ "$SKIP_SECURITY" == "true" ]]; then
        info "Skipping security hardening"
        return 0
    fi
    
    log "Applying security hardening..."
    
    # SSH hardening
    local ssh_config="/etc/ssh/sshd_config"
    if [[ -f "$ssh_config" ]]; then
        # Backup original config
        sudo cp "$ssh_config" "${ssh_config}.backup"
        
        # Apply SSH hardening
        sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' "$ssh_config"
        sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' "$ssh_config"
        sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' "$ssh_config"
        sudo sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' "$ssh_config"
        
        # Add additional security settings
        if ! grep -q "AllowUsers" "$ssh_config"; then
            echo "AllowUsers $DEPLOYMENT_USER" | sudo tee -a "$ssh_config"
        fi
        
        # Restart SSH service
        sudo systemctl restart ssh 2>/dev/null || sudo systemctl restart sshd
        
        success "SSH hardening applied"
    fi
    
    # Set up automatic security updates
    case "$PACKAGE_MANAGER" in
        apt)
            sudo apt install -y unattended-upgrades
            echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee /etc/apt/apt.conf.d/50unattended-upgrades-no-reboot
            sudo systemctl enable unattended-upgrades
            ;;
        yum|dnf)
            sudo $PACKAGE_MANAGER install -y yum-cron 2>/dev/null || true
            sudo systemctl enable yum-cron 2>/dev/null || true
            ;;
    esac
    
    success "Security hardening completed"
}

setup_application_directories() {
    log "Setting up application directories..."
    
    # Create application directories
    local app_dirs=(
        "/opt/$APP_NAME"
        "/var/log/$APP_NAME"
        "/var/backups/$APP_NAME"
        "/etc/$APP_NAME"
    )
    
    for dir in "${app_dirs[@]}"; do
        sudo mkdir -p "$dir"
        sudo chown "$DEPLOYMENT_USER:$DEPLOYMENT_USER" "$dir"
        sudo chmod 755 "$dir"
    done
    
    # Setup log rotation
    sudo tee "/etc/logrotate.d/$APP_NAME" > /dev/null << EOF
/var/log/$APP_NAME/*.log {
    daily
    rotate 30
    compress
    delaycompress
    copytruncate
    notifempty
    missingok
    su $DEPLOYMENT_USER $DEPLOYMENT_USER
}
EOF
    
    success "Application directories setup completed"
}

setup_system_monitoring() {
    log "Setting up system monitoring..."
    
    # Install monitoring tools
    case "$PACKAGE_MANAGER" in
        apt)
            sudo apt install -y htop iotop netstat-net-tools
            ;;
        yum|dnf)
            sudo $PACKAGE_MANAGER install -y htop iotop net-tools
            ;;
    esac
    
    # Create system monitoring script
    sudo tee "/usr/local/bin/system-health-check" > /dev/null << 'EOF'
#!/bin/bash
# System health check script for Nutrition AI

echo "=== System Health Check - $(date) ==="
echo "Uptime: $(uptime)"
echo "Load Average: $(cat /proc/loadavg)"
echo "Memory Usage: $(free -h | grep Mem)"
echo "Disk Usage: $(df -h / | tail -1)"
echo "Docker Status: $(systemctl is-active docker)"
echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=================================="
EOF
    
    sudo chmod +x /usr/local/bin/system-health-check
    
    # Setup health check cron job
    local cron_entry="*/15 * * * * /usr/local/bin/system-health-check >> /var/log/$APP_NAME/system-health.log 2>&1"
    (sudo crontab -l 2>/dev/null | grep -v system-health-check; echo "$cron_entry") | sudo crontab -
    
    success "System monitoring setup completed"
}

clone_project() {
    log "Cloning project repository..."
    
    local project_dir="/opt/$APP_NAME"
    
    # Change to deployment user for git operations
    sudo -u "$DEPLOYMENT_USER" bash << EOF
cd "$project_dir"
if [[ ! -d ".git" ]]; then
    echo "Please manually clone your repository to $project_dir"
    echo "Example: git clone https://github.com/your-repo/nutrition-ai.git ."
else
    echo "Git repository already present"
fi
EOF
    
    success "Project cloning information provided"
}

show_setup_summary() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                     Setup Summary                             ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  ✅ System packages updated"
    echo "║  ✅ Essential packages installed"
    echo "║  ✅ Deployment user created: $DEPLOYMENT_USER"
    
    if [[ "$SKIP_DOCKER" != "true" ]]; then
        echo "║  ✅ Docker and Docker Compose installed"
    fi
    
    if [[ "$SKIP_FIREWALL" != "true" ]]; then
        echo "║  ✅ Firewall configured (UFW + Fail2ban)"
    fi
    
    if [[ "$SKIP_SECURITY" != "true" ]]; then
        echo "║  ✅ Security hardening applied"
    fi
    
    echo "║  ✅ Application directories created"
    echo "║  ✅ System monitoring setup"
    echo "║  ✅ Log rotation configured"
    echo "║"
    echo "║  📁 Project Directory: /opt/$APP_NAME"
    echo "║  📄 Log Directory: /var/log/$APP_NAME"
    echo "║  💾 Backup Directory: /var/backups/$APP_NAME"
    echo "║"
    echo "║  🔑 Next Steps:"
    echo "║    1. Clone your repository to /opt/$APP_NAME"
    echo "║    2. Configure environment variables"
    echo "║    3. Run SSL setup: ./scripts/ssl-setup.sh"
    echo "║    4. Deploy application: ./scripts/deploy-production.sh"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --skip-docker      Skip Docker installation"
    echo "  --skip-security    Skip security hardening"
    echo "  --skip-firewall    Skip firewall configuration"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOYMENT_USER    Deployment user name (default: deploy)"
    echo ""
    echo "This script will:"
    echo "  - Update system packages"
    echo "  - Install essential tools and dependencies"
    echo "  - Create deployment user with SSH access"
    echo "  - Install Docker and Docker Compose"
    echo "  - Configure firewall and security settings"
    echo "  - Setup application directories and logging"
    echo "  - Configure system monitoring"
    echo ""
}

main() {
    # Setup logging
    sudo mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || mkdir -p "$(dirname "$LOG_FILE")"
    
    # Print banner
    print_setup_banner
    
    # Check prerequisites
    check_root_privileges
    detect_os
    
    # Main setup steps
    update_system
    install_essential_packages
    create_deployment_user
    install_docker
    configure_firewall
    setup_security_hardening
    setup_application_directories
    setup_system_monitoring
    clone_project
    
    # Show summary
    show_setup_summary
    
    success "🚀 Server setup completed successfully!"
    info "Please log out and log back in as the $DEPLOYMENT_USER user to continue with deployment"
}

# Create log directory on script start
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# Run main function with all arguments
main "$@"