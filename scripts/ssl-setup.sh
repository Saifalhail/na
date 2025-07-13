#!/bin/bash

# SSL Certificate Management Script for Nutrition AI
# Automated Let's Encrypt certificate generation, renewal, and management
# Usage: ./scripts/ssl-setup.sh [domain] [api-domain] [command]

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
BACKEND_DIR="$PROJECT_ROOT/backend"
SSL_DIR="$BACKEND_DIR/ssl"
LOG_FILE="/var/log/nutrition-ai/ssl-setup.log"

# Default domains (can be overridden by arguments)
DOMAIN="${1:-yourdomain.com}"
API_DOMAIN="${2:-api.yourdomain.com}"
COMMAND="${3:-setup}"

# Let's Encrypt settings
LETSENCRYPT_DIR="/etc/letsencrypt"
CERTBOT_OPTS="--non-interactive --agree-tos"
EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"
STAGING="${SSL_STAGING:-false}"

# Certificate settings
CERT_RENEWAL_DAYS=30
CERT_CHECK_INTERVAL=86400  # 24 hours

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

print_ssl_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🔒 SSL Certificate Manager                ║"
    echo "║                     Let's Encrypt Automation                 ║"
    echo "║                                                               ║"
    echo "║  Primary Domain: $DOMAIN"
    echo "║  API Domain: $API_DOMAIN"
    echo "║  Email: $EMAIL"
    echo "║  Staging Mode: $STAGING"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_ssl_prerequisites() {
    log "Checking SSL prerequisites..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        warning "Certbot not found, installing..."
        install_certbot
    fi
    
    # Check if running as root or can sudo
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        error "This script requires root privileges or passwordless sudo access"
    fi
    
    # Check domain accessibility
    check_domain_accessibility
    
    # Create SSL directory
    mkdir -p "$SSL_DIR"
    
    success "SSL prerequisites check passed"
}

install_certbot() {
    log "Installing Certbot..."
    
    if command -v apt &> /dev/null; then
        # Ubuntu/Debian
        sudo apt update
        sudo apt install -y certbot
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y certbot
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y certbot
    else
        error "Unsupported package manager. Please install certbot manually."
    fi
    
    success "Certbot installed successfully"
}

check_domain_accessibility() {
    log "Checking domain accessibility..."
    
    for domain in "$DOMAIN" "$API_DOMAIN"; do
        if ping -c 1 "$domain" &> /dev/null; then
            success "Domain accessible: $domain"
        else
            warning "Domain not accessible: $domain"
            info "Ensure DNS is properly configured before requesting certificates"
        fi
    done
}

generate_certificates() {
    log "Generating SSL certificates..."
    
    # Build certbot command
    local certbot_cmd="certbot certonly $CERTBOT_OPTS"
    
    # Add staging flag if enabled
    if [[ "$STAGING" == "true" ]]; then
        certbot_cmd="$certbot_cmd --staging"
        warning "Using Let's Encrypt staging environment"
    fi
    
    # Add email
    certbot_cmd="$certbot_cmd --email $EMAIL"
    
    # Use standalone mode (requires port 80 to be free)
    certbot_cmd="$certbot_cmd --standalone"
    
    # Add domains
    certbot_cmd="$certbot_cmd -d $DOMAIN -d $API_DOMAIN"
    
    log "Running: $certbot_cmd"
    
    # Stop nginx temporarily if running
    local nginx_was_running=false
    if docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" ps nginx | grep -q "Up"; then
        log "Stopping nginx for certificate generation..."
        docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" stop nginx
        nginx_was_running=true
    fi
    
    # Generate certificates
    if sudo $certbot_cmd; then
        success "Certificates generated successfully"
        
        # Copy certificates to project SSL directory
        copy_certificates_to_project
        
        # Restart nginx if it was running
        if [[ "$nginx_was_running" == "true" ]]; then
            log "Restarting nginx..."
            docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" start nginx
        fi
    else
        error "Certificate generation failed"
    fi
}

copy_certificates_to_project() {
    log "Copying certificates to project directory..."
    
    local cert_dir="$LETSENCRYPT_DIR/live/$DOMAIN"
    
    if [[ -d "$cert_dir" ]]; then
        # Copy certificate files
        sudo cp "$cert_dir/fullchain.pem" "$SSL_DIR/cert.pem"
        sudo cp "$cert_dir/privkey.pem" "$SSL_DIR/key.pem"
        
        # Set proper permissions
        sudo chown "$USER:$USER" "$SSL_DIR"/*.pem
        sudo chmod 644 "$SSL_DIR/cert.pem"
        sudo chmod 600 "$SSL_DIR/key.pem"
        
        success "Certificates copied to $SSL_DIR"
    else
        error "Certificate directory not found: $cert_dir"
    fi
}

renew_certificates() {
    log "Renewing SSL certificates..."
    
    # Check if renewal is needed
    if ! check_certificate_expiry; then
        info "Certificate renewal not needed yet"
        return 0
    fi
    
    # Stop nginx temporarily if running
    local nginx_was_running=false
    if docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" ps nginx | grep -q "Up"; then
        log "Stopping nginx for certificate renewal..."
        docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" stop nginx
        nginx_was_running=true
    fi
    
    # Renew certificates
    if sudo certbot renew $CERTBOT_OPTS; then
        success "Certificates renewed successfully"
        
        # Copy renewed certificates
        copy_certificates_to_project
        
        # Restart nginx if it was running
        if [[ "$nginx_was_running" == "true" ]]; then
            log "Restarting nginx with new certificates..."
            docker-compose -f "$BACKEND_DIR/docker-compose.prod.yml" restart nginx
        fi
        
        # Send renewal notification
        send_renewal_notification
    else
        error "Certificate renewal failed"
    fi
}

check_certificate_expiry() {
    log "Checking certificate expiry..."
    
    local cert_file="$SSL_DIR/cert.pem"
    
    if [[ ! -f "$cert_file" ]]; then
        warning "Certificate file not found: $cert_file"
        return 1  # Needs renewal/generation
    fi
    
    # Get certificate expiry date
    local expiry_date
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2 || echo "")
    
    if [[ -z "$expiry_date" ]]; then
        warning "Could not read certificate expiry date"
        return 1
    fi
    
    # Calculate days until expiry
    local expiry_epoch
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
    local current_epoch
    current_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    info "Certificate expires in $days_left days"
    
    if [[ $days_left -le $CERT_RENEWAL_DAYS ]]; then
        warning "Certificate needs renewal (expires in $days_left days)"
        return 1  # Needs renewal
    fi
    
    success "Certificate is valid for $days_left more days"
    return 0  # No renewal needed
}

send_renewal_notification() {
    log "Sending renewal notification..."
    
    # Send webhook notification if configured
    if [[ -n "${SSL_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SSL_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{
                 \"text\": \"🔒 SSL certificates renewed for $DOMAIN\",
                 \"timestamp\": \"$(date -Iseconds)\",
                 \"domain\": \"$DOMAIN\",
                 \"api_domain\": \"$API_DOMAIN\"
             }" \
             &> /dev/null || warning "Failed to send webhook notification"
    fi
    
    # Log to syslog
    logger "SSL certificates renewed for $DOMAIN"
    
    success "Renewal notification sent"
}

setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    local renewal_script="/usr/local/bin/ssl-renewal-$DOMAIN"
    
    sudo tee "$renewal_script" > /dev/null << EOF
#!/bin/bash
# Automatic SSL certificate renewal for $DOMAIN
cd "$PROJECT_ROOT"
bash "$SCRIPT_DIR/ssl-setup.sh" "$DOMAIN" "$API_DOMAIN" renew
EOF
    
    sudo chmod +x "$renewal_script"
    
    # Setup cron job for automatic renewal (daily check)
    local cron_entry="0 2 * * * $renewal_script >> /var/log/nutrition-ai/ssl-renewal.log 2>&1"
    
    # Add to crontab if not already present
    if ! sudo crontab -l 2>/dev/null | grep -q "$renewal_script"; then
        (sudo crontab -l 2>/dev/null; echo "$cron_entry") | sudo crontab -
        success "Automatic renewal cron job added"
    else
        info "Automatic renewal cron job already exists"
    fi
    
    # Create renewal log file
    sudo mkdir -p "$(dirname "/var/log/nutrition-ai/ssl-renewal.log")"
    sudo touch "/var/log/nutrition-ai/ssl-renewal.log"
    
    success "Automatic renewal setup completed"
}

validate_certificates() {
    log "Validating SSL certificates..."
    
    local cert_file="$SSL_DIR/cert.pem"
    local key_file="$SSL_DIR/key.pem"
    
    # Check if files exist
    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        error "Certificate files not found in $SSL_DIR"
    fi
    
    # Validate certificate
    if openssl x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
        success "Certificate file is valid"
    else
        error "Certificate file is invalid"
    fi
    
    # Validate private key
    if openssl rsa -in "$key_file" -check -noout > /dev/null 2>&1; then
        success "Private key file is valid"
    else
        error "Private key file is invalid"
    fi
    
    # Check if certificate and key match
    local cert_hash
    local key_hash
    cert_hash=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    key_hash=$(openssl rsa -noout -modulus -in "$key_file" | openssl md5)
    
    if [[ "$cert_hash" == "$key_hash" ]]; then
        success "Certificate and private key match"
    else
        error "Certificate and private key do not match"
    fi
    
    # Display certificate information
    info "Certificate information:"
    openssl x509 -in "$cert_file" -text -noout | grep -E "(Subject:|DNS:|Not After)" | sed 's/^/    /'
}

show_ssl_usage() {
    echo "Usage: $0 [domain] [api-domain] [command]"
    echo ""
    echo "Arguments:"
    echo "  domain       - Primary domain (default: yourdomain.com)"
    echo "  api-domain   - API subdomain (default: api.yourdomain.com)"
    echo "  command      - Action to perform (default: setup)"
    echo ""
    echo "Commands:"
    echo "  setup        - Generate certificates and setup auto-renewal"
    echo "  generate     - Generate new certificates only"
    echo "  renew        - Renew existing certificates"
    echo "  validate     - Validate existing certificates"
    echo "  check        - Check certificate expiry"
    echo "  install      - Install certbot"
    echo ""
    echo "Environment Variables:"
    echo "  SSL_EMAIL         - Email for Let's Encrypt (default: admin@domain)"
    echo "  SSL_STAGING       - Use staging environment (default: false)"
    echo "  SSL_WEBHOOK_URL   - Webhook URL for notifications"
    echo ""
    echo "Examples:"
    echo "  $0 myapp.com api.myapp.com setup"
    echo "  SSL_STAGING=true $0 test.com api.test.com generate"
    echo "  $0 example.com api.example.com renew"
    echo ""
}

main() {
    # Setup logging
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    
    # Print banner
    print_ssl_banner
    
    case "$COMMAND" in
        "setup")
            check_ssl_prerequisites
            generate_certificates
            setup_auto_renewal
            validate_certificates
            success "🔒 SSL setup completed successfully!"
            ;;
        "generate")
            check_ssl_prerequisites
            generate_certificates
            validate_certificates
            success "🔒 SSL certificates generated successfully!"
            ;;
        "renew")
            renew_certificates
            validate_certificates
            success "🔒 SSL certificates renewed successfully!"
            ;;
        "validate")
            validate_certificates
            success "🔒 SSL certificate validation completed!"
            ;;
        "check")
            check_certificate_expiry
            success "🔒 SSL certificate check completed!"
            ;;
        "install")
            install_certbot
            success "🔒 Certbot installation completed!"
            ;;
        "help"|"-h"|"--help")
            show_ssl_usage
            ;;
        *)
            error "Unknown command: $COMMAND"
            show_ssl_usage
            exit 1
            ;;
    esac
    
    log "SSL setup script completed"
}

# Run main function
main "$@"