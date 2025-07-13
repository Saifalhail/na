#!/bin/bash

# Enhanced Backup Manager for Nutrition AI
# Comprehensive backup solution with SSL certificates, database, media files, and off-site storage
# Usage: ./scripts/backup-manager.sh [create|restore|verify|cleanup|list] [options]

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
APP_NAME="nutrition-ai"
LOG_FILE="/var/log/${APP_NAME}/backup.log"

# Backup configuration
BACKUP_ROOT="/var/backups/${APP_NAME}"
LOCAL_BACKUP_DIR="$BACKUP_ROOT/local"
REMOTE_BACKUP_DIR="$BACKUP_ROOT/remote"
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_RETENTION_WEEKLY=${BACKUP_RETENTION_WEEKLY:-12}
BACKUP_RETENTION_MONTHLY=${BACKUP_RETENTION_MONTHLY:-12}

# Remote backup configuration (optional)
REMOTE_BACKUP_ENABLED=${REMOTE_BACKUP_ENABLED:-false}
S3_BUCKET=${S3_BUCKET:-""}
RSYNC_TARGET=${RSYNC_TARGET:-""}

# Backup components
BACKUP_DATABASE=${BACKUP_DATABASE:-true}
BACKUP_MEDIA=${BACKUP_MEDIA:-true}
BACKUP_SSL=${BACKUP_SSL:-true}
BACKUP_CONFIG=${BACKUP_CONFIG:-true}
BACKUP_LOGS=${BACKUP_LOGS:-false}

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

print_backup_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   💾 Backup Manager                          ║"
    echo "║                  Nutrition AI Infrastructure                  ║"
    echo "║                                                               ║"
    echo "║  Backup Root: $BACKUP_ROOT"
    echo "║  Retention: $BACKUP_RETENTION_DAYS days"
    echo "║  Remote Backup: $REMOTE_BACKUP_ENABLED"
    echo "║  Components: DB=$BACKUP_DATABASE Media=$BACKUP_MEDIA SSL=$BACKUP_SSL"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_backup_prerequisites() {
    log "Checking backup prerequisites..."
    
    # Check if running as deployment user or root
    if [[ $USER != "deploy" ]] && [[ $USER != "root" ]] && ! sudo -n true 2>/dev/null; then
        error "This script requires deployment user privileges or sudo access"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "tar" "gzip" "date")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
        fi
    done
    
    # Check if project exists
    if [[ ! -d "$BACKEND_DIR" ]]; then
        error "Backend directory not found: $BACKEND_DIR"
    fi
    
    # Create backup directories
    sudo mkdir -p "$LOCAL_BACKUP_DIR" "$REMOTE_BACKUP_DIR" 2>/dev/null || mkdir -p "$LOCAL_BACKUP_DIR" "$REMOTE_BACKUP_DIR"
    
    # Set permissions
    if command -v sudo &> /dev/null && sudo -n true 2>/dev/null; then
        sudo chown -R "$USER:$USER" "$BACKUP_ROOT" 2>/dev/null || true
    fi
    
    success "Backup prerequisites check passed"
}

generate_backup_timestamp() {
    echo "$(date +'%Y%m%d_%H%M%S')"
}

create_database_backup() {
    if [[ "$BACKUP_DATABASE" != "true" ]]; then
        info "Database backup disabled, skipping"
        return 0
    fi
    
    log "Creating database backup..."
    
    local timestamp=$(generate_backup_timestamp)
    local backup_file="$LOCAL_BACKUP_DIR/db_backup_${timestamp}.sql"
    
    # Source environment variables
    if [[ -f "$BACKEND_DIR/.env.prod" ]]; then
        source "$BACKEND_DIR/.env.prod"
    else
        warning ".env.prod not found, using defaults"
        DB_USER=${DB_USER:-postgres}
        DB_NAME=${DB_NAME:-nutritiondb}
    fi
    
    cd "$BACKEND_DIR"
    
    # Create database backup
    if docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>/dev/null; then
        # Compress backup
        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"
        
        # Verify backup integrity
        if [[ -f "$compressed_file" ]] && [[ $(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file" 2>/dev/null) -gt 100 ]]; then
            success "Database backup created: $(basename "$compressed_file")"
            echo "$compressed_file"
        else
            error "Database backup verification failed"
        fi
    else
        error "Database backup creation failed"
    fi
}

create_media_backup() {
    if [[ "$BACKUP_MEDIA" != "true" ]]; then
        info "Media backup disabled, skipping"
        return 0
    fi
    
    log "Creating media files backup..."
    
    local timestamp=$(generate_backup_timestamp)
    local backup_file="$LOCAL_BACKUP_DIR/media_backup_${timestamp}.tar.gz"
    local media_dir="$BACKEND_DIR/media"
    
    if [[ -d "$media_dir" ]] && [[ $(find "$media_dir" -type f | wc -l) -gt 0 ]]; then
        cd "$BACKEND_DIR"
        
        # Create compressed media backup
        if tar -czf "$backup_file" -C . media/; then
            success "Media backup created: $(basename "$backup_file")"
            echo "$backup_file"
        else
            error "Media backup creation failed"
        fi
    else
        warning "No media files found or media directory empty"
        return 0
    fi
}

create_ssl_backup() {
    if [[ "$BACKUP_SSL" != "true" ]]; then
        info "SSL backup disabled, skipping"
        return 0
    fi
    
    log "Creating SSL certificates backup..."
    
    local timestamp=$(generate_backup_timestamp)
    local backup_file="$LOCAL_BACKUP_DIR/ssl_backup_${timestamp}.tar.gz"
    local ssl_sources=()
    
    # Check for SSL certificates in various locations
    if [[ -d "$BACKEND_DIR/ssl" ]]; then
        ssl_sources+=("$BACKEND_DIR/ssl")
    fi
    
    if [[ -d "/etc/letsencrypt" ]]; then
        ssl_sources+=("/etc/letsencrypt")
    fi
    
    if [[ ${#ssl_sources[@]} -gt 0 ]]; then
        # Create SSL backup with proper permissions handling
        if sudo tar -czf "$backup_file" "${ssl_sources[@]}" 2>/dev/null; then
            # Fix ownership if created by sudo
            sudo chown "$USER:$USER" "$backup_file" 2>/dev/null || true
            success "SSL backup created: $(basename "$backup_file")"
            echo "$backup_file"
        else
            warning "SSL backup creation failed or no SSL certificates found"
            return 0
        fi
    else
        warning "No SSL certificates found to backup"
        return 0
    fi
}

create_config_backup() {
    if [[ "$BACKUP_CONFIG" != "true" ]]; then
        info "Configuration backup disabled, skipping"
        return 0
    fi
    
    log "Creating configuration backup..."
    
    local timestamp=$(generate_backup_timestamp)
    local backup_file="$LOCAL_BACKUP_DIR/config_backup_${timestamp}.tar.gz"
    local config_files=()
    
    # Collect configuration files
    if [[ -f "$BACKEND_DIR/.env.prod" ]]; then
        config_files+=("$BACKEND_DIR/.env.prod")
    fi
    
    if [[ -f "$BACKEND_DIR/docker-compose.prod.yml" ]]; then
        config_files+=("$BACKEND_DIR/docker-compose.prod.yml")
    fi
    
    if [[ -d "$BACKEND_DIR/nginx" ]]; then
        config_files+=("$BACKEND_DIR/nginx")
    fi
    
    if [[ ${#config_files[@]} -gt 0 ]]; then
        # Create relative paths for tar
        cd "$PROJECT_ROOT"
        local relative_files=()
        for file in "${config_files[@]}"; do
            relative_files+=("${file#$PROJECT_ROOT/}")
        done
        
        if tar -czf "$backup_file" "${relative_files[@]}"; then
            success "Configuration backup created: $(basename "$backup_file")"
            echo "$backup_file"
        else
            error "Configuration backup creation failed"
        fi
    else
        warning "No configuration files found to backup"
        return 0
    fi
}

create_logs_backup() {
    if [[ "$BACKUP_LOGS" != "true" ]]; then
        info "Logs backup disabled, skipping"
        return 0
    fi
    
    log "Creating logs backup..."
    
    local timestamp=$(generate_backup_timestamp)
    local backup_file="$LOCAL_BACKUP_DIR/logs_backup_${timestamp}.tar.gz"
    local log_dirs=()
    
    # Collect log directories
    if [[ -d "/var/log/${APP_NAME}" ]]; then
        log_dirs+=("/var/log/${APP_NAME}")
    fi
    
    if [[ -d "$BACKEND_DIR/logs" ]]; then
        log_dirs+=("$BACKEND_DIR/logs")
    fi
    
    if [[ ${#log_dirs[@]} -gt 0 ]]; then
        if sudo tar -czf "$backup_file" "${log_dirs[@]}" 2>/dev/null; then
            sudo chown "$USER:$USER" "$backup_file" 2>/dev/null || true
            success "Logs backup created: $(basename "$backup_file")"
            echo "$backup_file"
        else
            warning "Logs backup creation failed"
            return 0
        fi
    else
        warning "No log directories found to backup"
        return 0
    fi
}

create_manifest() {
    local backup_files=("$@")
    local timestamp=$(generate_backup_timestamp)
    local manifest_file="$LOCAL_BACKUP_DIR/backup_manifest_${timestamp}.json"
    
    log "Creating backup manifest..."
    
    # Generate manifest
    cat > "$manifest_file" << EOF
{
    "backup_timestamp": "$(date -Iseconds)",
    "app_name": "$APP_NAME",
    "backup_version": "1.0",
    "components": {
        "database": $BACKUP_DATABASE,
        "media": $BACKUP_MEDIA,
        "ssl": $BACKUP_SSL,
        "config": $BACKUP_CONFIG,
        "logs": $BACKUP_LOGS
    },
    "files": [
EOF
    
    # Add file information
    local first=true
    for file in "${backup_files[@]}"; do
        if [[ -f "$file" ]]; then
            if [[ "$first" != "true" ]]; then
                echo "," >> "$manifest_file"
            fi
            first=false
            
            local filename=$(basename "$file")
            local filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            local checksum=$(sha256sum "$file" | cut -d' ' -f1)
            
            cat >> "$manifest_file" << EOF
        {
            "filename": "$filename",
            "path": "$file",
            "size": $filesize,
            "checksum": "$checksum"
        }
EOF
        fi
    done
    
    cat >> "$manifest_file" << EOF

    ],
    "retention_policy": {
        "daily": $BACKUP_RETENTION_DAYS,
        "weekly": $BACKUP_RETENTION_WEEKLY,
        "monthly": $BACKUP_RETENTION_MONTHLY
    }
}
EOF
    
    success "Backup manifest created: $(basename "$manifest_file")"
    echo "$manifest_file"
}

upload_to_remote() {
    if [[ "$REMOTE_BACKUP_ENABLED" != "true" ]]; then
        info "Remote backup disabled, skipping upload"
        return 0
    fi
    
    local files=("$@")
    log "Uploading backups to remote storage..."
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            local filename=$(basename "$file")
            
            # Upload to S3 if configured
            if [[ -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
                if aws s3 cp "$file" "s3://$S3_BUCKET/backups/$APP_NAME/$(date +'%Y/%m')/$filename"; then
                    success "Uploaded to S3: $filename"
                else
                    warning "Failed to upload to S3: $filename"
                fi
            fi
            
            # Upload via rsync if configured
            if [[ -n "$RSYNC_TARGET" ]] && command -v rsync &> /dev/null; then
                if rsync -avz "$file" "$RSYNC_TARGET/$(date +'%Y/%m')/"; then
                    success "Uploaded via rsync: $filename"
                else
                    warning "Failed to upload via rsync: $filename"
                fi
            fi
        fi
    done
}

create_full_backup() {
    log "Starting full backup creation..."
    
    local backup_files=()
    
    # Create individual component backups
    if db_backup=$(create_database_backup); then
        backup_files+=("$db_backup")
    fi
    
    if media_backup=$(create_media_backup); then
        backup_files+=("$media_backup")
    fi
    
    if ssl_backup=$(create_ssl_backup); then
        backup_files+=("$ssl_backup")
    fi
    
    if config_backup=$(create_config_backup); then
        backup_files+=("$config_backup")
    fi
    
    if logs_backup=$(create_logs_backup); then
        backup_files+=("$logs_backup")
    fi
    
    # Create manifest
    if manifest_file=$(create_manifest "${backup_files[@]}"); then
        backup_files+=("$manifest_file")
    fi
    
    # Upload to remote storage
    upload_to_remote "${backup_files[@]}"
    
    # Display backup summary
    display_backup_summary "${backup_files[@]}"
    
    success "Full backup creation completed"
}

display_backup_summary() {
    local files=("$@")
    local total_size=0
    
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                     Backup Summary                           ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            local filename=$(basename "$file")
            local filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            local human_size=$(numfmt --to=iec "$filesize" 2>/dev/null || echo "${filesize}B")
            total_size=$((total_size + filesize))
            
            printf "║  ✅ %-40s %10s ║\n" "$filename" "$human_size"
        fi
    done
    
    local total_human=$(numfmt --to=iec "$total_size" 2>/dev/null || echo "${total_size}B")
    echo "║                                                               ║"
    printf "║  📊 Total Backup Size: %-37s ║\n" "$total_human"
    printf "║  📁 Backup Location: %-39s ║\n" "$LOCAL_BACKUP_DIR"
    printf "║  ⏰ Created: %-47s ║\n" "$(date)"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Clean daily backups older than retention period
    find "$LOCAL_BACKUP_DIR" -name "*_backup_*.gz" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    find "$LOCAL_BACKUP_DIR" -name "backup_manifest_*.json" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Keep weekly backups (every 7 days for the retention period)
    # This is a simplified approach - in production, you might want more sophisticated logic
    
    success "Old backups cleaned up"
}

list_backups() {
    log "Listing available backups..."
    
    echo -e "${BLUE}Available Backups:${NC}"
    echo "=================="
    
    if [[ -d "$LOCAL_BACKUP_DIR" ]]; then
        local manifests=($(find "$LOCAL_BACKUP_DIR" -name "backup_manifest_*.json" | sort -r))
        
        if [[ ${#manifests[@]} -gt 0 ]]; then
            for manifest in "${manifests[@]}"; do
                if [[ -f "$manifest" ]]; then
                    local timestamp=$(jq -r '.backup_timestamp // "Unknown"' "$manifest" 2>/dev/null || echo "Unknown")
                    local filename=$(basename "$manifest")
                    echo "  📄 $filename - $timestamp"
                    
                    # Show files in this backup
                    jq -r '.files[]? | "    └─ " + .filename + " (" + (.size | tostring) + " bytes)"' "$manifest" 2>/dev/null || echo "    └─ (manifest format error)"
                fi
            done
        else
            echo "  No backups found"
        fi
    else
        echo "  Backup directory not found: $LOCAL_BACKUP_DIR"
    fi
}

verify_backup() {
    local manifest_file="$1"
    
    if [[ ! -f "$manifest_file" ]]; then
        error "Manifest file not found: $manifest_file"
    fi
    
    log "Verifying backup: $(basename "$manifest_file")"
    
    # Verify each file in the manifest
    local verification_failed=false
    
    while IFS= read -r file_info; do
        local filename=$(echo "$file_info" | jq -r '.filename')
        local expected_checksum=$(echo "$file_info" | jq -r '.checksum')
        local file_path=$(echo "$file_info" | jq -r '.path')
        
        if [[ -f "$file_path" ]]; then
            local actual_checksum=$(sha256sum "$file_path" | cut -d' ' -f1)
            
            if [[ "$actual_checksum" == "$expected_checksum" ]]; then
                success "Verified: $filename"
            else
                error "Checksum mismatch: $filename"
                verification_failed=true
            fi
        else
            error "File missing: $filename"
            verification_failed=true
        fi
    done < <(jq -c '.files[]?' "$manifest_file" 2>/dev/null || echo '{}')
    
    if [[ "$verification_failed" == "true" ]]; then
        error "Backup verification failed"
    else
        success "Backup verification completed successfully"
    fi
}

show_backup_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  create       - Create full backup (default)"
    echo "  list         - List available backups"
    echo "  verify FILE  - Verify backup integrity using manifest file"
    echo "  cleanup      - Clean up old backups based on retention policy"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_RETENTION_DAYS     - Daily backup retention (default: 30)"
    echo "  BACKUP_RETENTION_WEEKLY   - Weekly backup retention (default: 12)"
    echo "  BACKUP_RETENTION_MONTHLY  - Monthly backup retention (default: 12)"
    echo "  REMOTE_BACKUP_ENABLED     - Enable remote backup (default: false)"
    echo "  S3_BUCKET                - S3 bucket for remote backup"
    echo "  RSYNC_TARGET             - Rsync target for remote backup"
    echo "  BACKUP_DATABASE          - Backup database (default: true)"
    echo "  BACKUP_MEDIA             - Backup media files (default: true)"
    echo "  BACKUP_SSL               - Backup SSL certificates (default: true)"
    echo "  BACKUP_CONFIG            - Backup configuration (default: true)"
    echo "  BACKUP_LOGS              - Backup logs (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 create                              # Create full backup"
    echo "  $0 verify backup_manifest_*.json      # Verify backup"
    echo "  REMOTE_BACKUP_ENABLED=true $0 create  # Create and upload backup"
    echo ""
}

main() {
    # Setup logging
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    
    # Print banner
    print_backup_banner
    
    # Check prerequisites
    check_backup_prerequisites
    
    # Parse command
    local command="${1:-create}"
    
    case "$command" in
        "create")
            create_full_backup
            cleanup_old_backups
            success "💾 Backup process completed successfully!"
            ;;
        "list")
            list_backups
            ;;
        "verify")
            if [[ -n "${2:-}" ]]; then
                verify_backup "$2"
            else
                error "Please specify a manifest file to verify"
            fi
            ;;
        "cleanup")
            cleanup_old_backups
            success "🧹 Backup cleanup completed!"
            ;;
        "help"|"-h"|"--help")
            show_backup_usage
            ;;
        *)
            error "Unknown command: $command"
            show_backup_usage
            exit 1
            ;;
    esac
    
    log "Backup manager completed successfully"
}

# Create backup directories on script start
mkdir -p "$LOCAL_BACKUP_DIR" "$REMOTE_BACKUP_DIR" 2>/dev/null || true

# Run main function with all arguments
main "$@"