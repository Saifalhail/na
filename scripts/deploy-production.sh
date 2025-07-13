#!/bin/bash

# Production Deployment Orchestrator for Nutrition AI
# This script coordinates the entire production deployment process
# Usage: ./scripts/deploy-production.sh [deploy|rollback|setup|health]

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
APP_NAME="nutrition-ai"
DEPLOYMENT_USER="${DEPLOYMENT_USER:-deploy}"
LOG_FILE="/var/log/${APP_NAME}/orchestrator.log"

# Environment settings
ENVIRONMENT="${ENVIRONMENT:-production}"
DOMAIN="${DOMAIN:-yourdomain.com}"
API_DOMAIN="${API_DOMAIN:-api.yourdomain.com}"

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

print_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🍎 Nutrition AI                            ║"
    echo "║                Production Deployment Manager                  ║"
    echo "║                                                               ║"
    echo "║  Environment: $ENVIRONMENT"
    echo "║  Domain: $DOMAIN"
    echo "║  API Domain: $API_DOMAIN"
    echo "║  User: $USER"
    echo "║  Timestamp: $(date -Iseconds)"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_system_requirements() {
    log "Checking system requirements..."
    
    # Check if running as correct user
    if [[ $USER != "$DEPLOYMENT_USER" ]] && [[ $USER != "root" ]]; then
        warning "Not running as deployment user ($DEPLOYMENT_USER), some operations may require sudo"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "git" "certbot")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            if [[ $cmd == "certbot" ]]; then
                warning "Certbot not found, SSL management will be skipped"
            else
                error "Required command not found: $cmd"
            fi
        fi
    done
    
    # Check project structure
    if [[ ! -d "$BACKEND_DIR" ]]; then
        error "Backend directory not found: $BACKEND_DIR"
    fi
    
    if [[ ! -f "$BACKEND_DIR/docker-compose.prod.yml" ]]; then
        error "Production docker-compose file not found"
    fi
    
    # Check environment file
    if [[ ! -f "$BACKEND_DIR/.env.prod" ]]; then
        error "Production environment file not found: $BACKEND_DIR/.env.prod"
    fi
    
    success "System requirements check passed"
}

setup_logging() {
    log "Setting up logging..."
    
    # Create log directory
    sudo mkdir -p "$(dirname "$LOG_FILE")" || mkdir -p "$(dirname "$LOG_FILE")"
    
    # Set permissions if possible
    if [[ $USER == "root" ]] || sudo -n true 2>/dev/null; then
        sudo chown -R "$USER:$USER" "$(dirname "$LOG_FILE")" 2>/dev/null || true
    fi
    
    success "Logging setup completed"
}

validate_ssl_certificates() {
    log "Validating SSL certificates..."
    
    local ssl_dir="$BACKEND_DIR/ssl"
    
    if [[ -f "$ssl_dir/cert.pem" ]] && [[ -f "$ssl_dir/key.pem" ]]; then
        # Check certificate validity
        local cert_expiry
        cert_expiry=$(openssl x509 -enddate -noout -in "$ssl_dir/cert.pem" 2>/dev/null | cut -d= -f2 || echo "")
        
        if [[ -n "$cert_expiry" ]]; then
            local expiry_epoch
            expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null || echo "0")
            local current_epoch
            current_epoch=$(date +%s)
            local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [[ $days_left -lt 30 ]]; then
                warning "SSL certificate expires in $days_left days, consider renewal"
            else
                info "SSL certificate valid for $days_left days"
            fi
        fi
        
        success "SSL certificates found and validated"
    else
        warning "SSL certificates not found, HTTPS will not be available"
        info "Run: ./scripts/ssl-setup.sh to configure SSL certificates"
    fi
}

run_ssl_setup() {
    log "Running SSL certificate setup..."
    
    if [[ -f "$SCRIPT_DIR/ssl-setup.sh" ]]; then
        bash "$SCRIPT_DIR/ssl-setup.sh" "$DOMAIN" "$API_DOMAIN"
        success "SSL setup completed"
    else
        warning "SSL setup script not found, skipping SSL configuration"
    fi
}

run_backend_deployment() {
    log "Running backend deployment..."
    
    cd "$BACKEND_DIR"
    
    # Make deploy script executable
    chmod +x scripts/deploy.sh
    
    # Run the backend deployment
    bash scripts/deploy.sh deploy
    
    success "Backend deployment completed"
}

run_health_checks() {
    log "Running comprehensive health checks..."
    
    # Basic connectivity test
    local protocols=("http" "https")
    local domains=("localhost" "$DOMAIN" "$API_DOMAIN")
    
    for protocol in "${protocols[@]}"; do
        for domain in "${domains[@]}"; do
            if [[ $domain == "localhost" ]] || [[ $protocol == "http" && $domain != "localhost" ]]; then
                continue  # Skip http for external domains
            fi
            
            local url="$protocol://$domain/api/health/"
            if curl -f -s --max-time 10 "$url" > /dev/null 2>&1; then
                success "Health check passed: $url"
            else
                warning "Health check failed: $url"
            fi
        done
    done
    
    # Run backend health checks
    cd "$BACKEND_DIR"
    bash scripts/deploy.sh health
    
    success "Health checks completed"
}

deploy_application() {
    log "Starting full application deployment..."
    
    # Validate SSL certificates
    validate_ssl_certificates
    
    # Run backend deployment
    run_backend_deployment
    
    # Run health checks
    run_health_checks
    
    # Display deployment summary
    display_deployment_summary
    
    success "🚀 Application deployment completed successfully!"
}

rollback_application() {
    log "Starting application rollback..."
    
    cd "$BACKEND_DIR"
    bash scripts/deploy.sh rollback
    
    # Run health checks after rollback
    run_health_checks
    
    success "🔄 Application rollback completed successfully!"
}

setup_production_environment() {
    log "Setting up production environment..."
    
    # Run server setup if available
    if [[ -f "$SCRIPT_DIR/server-setup.sh" ]]; then
        bash "$SCRIPT_DIR/server-setup.sh"
    else
        warning "Server setup script not found, manual server configuration required"
    fi
    
    # Run SSL setup
    run_ssl_setup
    
    # Deploy application
    deploy_application
    
    success "🎉 Production environment setup completed!"
}

display_deployment_summary() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   Deployment Summary                          ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  Application: $APP_NAME"
    echo "║  Environment: $ENVIRONMENT"
    echo "║  Deployed at: $(date -Iseconds)"
    echo "║                                                               ║"
    echo "║  🌐 Web Access:                                               ║"
    echo "║     Main Site: https://$DOMAIN"
    echo "║     API: https://$API_DOMAIN"
    echo "║     Admin: https://$API_DOMAIN/admin"
    echo "║                                                               ║"
    echo "║  📊 Health Endpoints:                                         ║"
    echo "║     Health: https://$API_DOMAIN/api/health/"
    echo "║     Readiness: https://$API_DOMAIN/api/readiness/"
    echo "║     Metrics: https://$API_DOMAIN/api/metrics/"
    echo "║                                                               ║"
    echo "║  📁 Logs Location: $LOG_FILE"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy    - Full application deployment (default)"
    echo "  rollback  - Rollback to previous version"
    echo "  setup     - Initial production environment setup"
    echo "  health    - Run health checks only"
    echo "  ssl       - Setup/renew SSL certificates"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT      - Deployment environment (default: production)"
    echo "  DOMAIN          - Main domain (default: yourdomain.com)"
    echo "  API_DOMAIN      - API domain (default: api.yourdomain.com)"
    echo "  DEPLOYMENT_USER - Deployment user (default: deploy)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy                    # Full deployment"
    echo "  $0 setup                     # Initial setup"
    echo "  DOMAIN=myapp.com $0 deploy   # Deploy to custom domain"
    echo ""
}

main() {
    # Setup logging first
    setup_logging
    
    # Print banner
    print_banner
    
    # Check system requirements
    check_system_requirements
    
    # Parse command
    local command="${1:-deploy}"
    
    case "$command" in
        "deploy")
            deploy_application
            ;;
        "rollback")
            rollback_application
            ;;
        "setup")
            setup_production_environment
            ;;
        "health")
            run_health_checks
            ;;
        "ssl")
            run_ssl_setup
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
    
    log "Orchestrator completed successfully"
}

# Create log directory on script start
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# Run main function with all arguments
main "$@"