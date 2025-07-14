#!/bin/bash

# Production Deployment Script for Nutrition AI Backend
# This script handles secure production deployment with health checks

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_USER="${DEPLOYMENT_USER:-deploy}"
APP_NAME="nutrition-ai"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOG_FILE="/var/log/${APP_NAME}/deployment.log"
MAX_ROLLBACK_VERSIONS=3

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

check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as correct user
    if [[ $USER != "$DEPLOYMENT_USER" ]]; then
        error "Must run as $DEPLOYMENT_USER user"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "psql" "redis-cli")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
        fi
    done
    
    # Check environment file
    if [[ ! -f ".env.prod" ]]; then
        error "Production environment file not found: .env.prod"
    fi
    
    # Validate critical environment variables
    source .env.prod
    
    # Define all required environment variables
    local required_vars=(
        "SECRET_KEY"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "DB_HOST"
        "DOMAIN"
        "API_DOMAIN"
        "SSL_EMAIL"
        "GEMINI_API_KEY"
        "REDIS_URL"
        "ALLOWED_HOSTS"
        "CORS_ALLOWED_ORIGINS"
    )
    
    # Additional production-specific variables
    local production_vars=(
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_STORAGE_BUCKET_NAME"
        "STRIPE_SECRET_KEY"
        "SENTRY_DSN"
        "TWILIO_ACCOUNT_SID"
        "TWILIO_AUTH_TOKEN"
    )
    
    # Check required variables
    log "Validating required environment variables..."
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable not set: $var"
        fi
        
        # Check for placeholder values
        if [[ "${!var}" == *"your-"* ]] || [[ "${!var}" == *"CHANGE"* ]] || [[ "${!var}" == *"example.com"* ]]; then
            error "Environment variable contains placeholder value: $var=${!var}"
        fi
    done
    
    # Check production variables (warn if missing)
    for var in "${production_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            warning "Production environment variable not set: $var"
        fi
    done
    
    # Validate specific formats
    if [[ ! "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        error "Invalid email format for SSL_EMAIL: $SSL_EMAIL"
    fi
    
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        error "Invalid domain format: $DOMAIN"
    fi
    
    # Ensure SECRET_KEY is sufficiently complex
    if [[ ${#SECRET_KEY} -lt 50 ]]; then
        error "SECRET_KEY must be at least 50 characters long"
    fi
    
    success "Prerequisites check passed"
}

backup_database() {
    log "Creating database backup..."
    
    # Create backup directory
    sudo mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    local backup_file="$BACKUP_DIR/db_backup_$(date +'%Y%m%d_%H%M%S').sql"
    
    # Create database backup
    if docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file"; then
        success "Database backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        success "Backup compressed: ${backup_file}.gz"
        
        # Clean old backups (keep last 7 days)
        find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
        log "Old backups cleaned"
    else
        error "Database backup failed"
    fi
}

backup_media() {
    log "Creating media files backup..."
    
    local media_backup="$BACKUP_DIR/media_backup_$(date +'%Y%m%d_%H%M%S').tar.gz"
    
    if [[ -d "media" ]]; then
        tar -czf "$media_backup" media/
        success "Media backup created: $media_backup"
        
        # Clean old media backups (keep last 3)
        ls -t "$BACKUP_DIR"/media_backup_*.tar.gz | tail -n +4 | xargs -r rm
        log "Old media backups cleaned"
    else
        warning "No media directory found, skipping media backup"
    fi
}

health_check() {
    log "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost/api/health/" > /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10s..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

readiness_check() {
    log "Performing readiness check..."
    
    local response
    response=$(curl -f -s "http://localhost/api/readiness/" || echo "failed")
    
    if [[ $response == *"ready"* ]]; then
        success "Readiness check passed"
        return 0
    else
        error "Readiness check failed: $response"
    fi
}

deploy_application() {
    log "Deploying application..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f docker-compose.prod.yml pull
    
    # Build application with no cache for fresh deployment
    log "Building application..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Stop current services gracefully
    log "Stopping current services..."
    docker-compose -f docker-compose.prod.yml down --timeout 30
    
    # Start database and redis first
    log "Starting database and cache services..."
    docker-compose -f docker-compose.prod.yml up -d db redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 20
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.prod.yml run --rm web python manage.py migrate --settings=core.settings.production
    
    # Collect static files
    log "Collecting static files..."
    docker-compose -f docker-compose.prod.yml run --rm web python manage.py collectstatic --noinput --settings=core.settings.production
    
    # Start all services
    log "Starting all services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    success "Application deployment completed"
}

post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    # Clear caches
    log "Clearing application caches..."
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli FLUSHDB
    
    # Update search indexes (if any)
    # docker-compose -f docker-compose.prod.yml run --rm web python manage.py update_index --settings=core.settings.production
    
    # Send deployment notification (if configured)
    if [[ -n "${DEPLOYMENT_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$DEPLOYMENT_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"🚀 Nutrition AI deployment completed successfully\", \"timestamp\":\"$(date -Iseconds)\"}" \
             || warning "Failed to send deployment notification"
    fi
    
    success "Post-deployment tasks completed"
}

rollback() {
    log "Initiating rollback..."
    
    # Get list of available backups
    local backup_files=($(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null || true))
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        error "No database backups found for rollback"
    fi
    
    # Use most recent backup
    local latest_backup="${backup_files[0]}"
    log "Rolling back to backup: $latest_backup"
    
    # Stop services
    docker-compose -f docker-compose.prod.yml down
    
    # Restore database
    log "Restoring database..."
    zcat "$latest_backup" | docker-compose -f docker-compose.prod.yml run --rm -T db psql -U "$DB_USER" -d "$DB_NAME"
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d
    
    success "Rollback completed"
}

main() {
    log "Starting production deployment for $APP_NAME"
    log "Deployment user: $USER"
    log "Timestamp: $(date -Iseconds)"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            backup_database
            backup_media
            deploy_application
            health_check
            readiness_check
            post_deployment_tasks
            success "🚀 Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            health_check
            success "🔄 Rollback completed successfully!"
            ;;
        "health")
            health_check
            readiness_check
            success "✅ Health checks passed!"
            ;;
        "backup")
            backup_database
            backup_media
            success "💾 Backup completed successfully!"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|backup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment with backups and health checks"
            echo "  rollback - Rollback to previous database backup"
            echo "  health   - Run health and readiness checks"
            echo "  backup   - Create database and media backups"
            exit 1
            ;;
    esac
}

# Ensure log directory exists
sudo mkdir -p "$(dirname "$LOG_FILE")"
sudo chown "$USER:$USER" "$(dirname "$LOG_FILE")"

# Run main function with all arguments
main "$@"