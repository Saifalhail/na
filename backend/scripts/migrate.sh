#!/bin/bash

# Database migration script for Nutrition AI backend
# Usage: ./scripts/migrate.sh [environment]

set -e

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🗄️ Running database migrations for $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$PROJECT_DIR/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_DIR/.env.$ENVIRONMENT"
    echo "✅ Loaded $ENVIRONMENT environment variables"
else
    echo "⚠️ Environment file .env.$ENVIRONMENT not found, using default .env"
    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
    fi
fi

# Set Django settings based on environment
case $ENVIRONMENT in
    "production")
        DJANGO_SETTINGS="core.settings.production"
        ;;
    "staging")
        DJANGO_SETTINGS="core.settings.production"
        ;;
    "testing")
        DJANGO_SETTINGS="core.settings.testing"
        ;;
    *)
        DJANGO_SETTINGS="core.settings.development"
        ;;
esac

echo "📊 Using Django settings: $DJANGO_SETTINGS"

# Check if we're in Docker or local environment
if [ -f "/.dockerenv" ]; then
    # We're inside Docker container
    PYTHON_CMD="python"
    DB_CHECK_CMD="python manage.py dbshell --command='SELECT 1;'"
else
    # Local environment
    if [ -f "$PROJECT_DIR/venv/bin/activate" ]; then
        source "$PROJECT_DIR/venv/bin/activate"
        echo "✅ Activated virtual environment"
    fi
    PYTHON_CMD="python"
    
    # Check if using Docker Compose
    if command -v docker-compose &> /dev/null && [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
        USE_DOCKER=true
        PYTHON_CMD="docker-compose -f $PROJECT_DIR/docker-compose.yml exec web python"
        DB_CHECK_CMD="docker-compose -f $PROJECT_DIR/docker-compose.yml exec db pg_isready"
    fi
fi

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    
    if [ "$USE_DOCKER" = true ]; then
        for i in {1..30}; do
            if $DB_CHECK_CMD &> /dev/null; then
                echo "✅ Database is ready"
                return 0
            fi
            sleep 1
        done
    else
        # For local development, try to connect with Django
        for i in {1..30}; do
            if $PYTHON_CMD manage.py dbshell --command='SELECT 1;' &> /dev/null; then
                echo "✅ Database is ready"
                return 0
            fi
            sleep 1
        done
    fi
    
    echo "❌ Database not ready after 30 seconds"
    exit 1
}

# Function to create backup
create_backup() {
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "💾 Creating database backup before migration..."
        BACKUP_DIR="$PROJECT_DIR/backups"
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/pre_migration_$(date +%Y%m%d_%H%M%S).sql"
        
        if [ "$USE_DOCKER" = true ]; then
            docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
        else
            pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        fi
        
        echo "✅ Backup created: $BACKUP_FILE"
    fi
}

# Function to check for migration conflicts
check_migrations() {
    echo "🔍 Checking for migration conflicts..."
    
    if $PYTHON_CMD manage.py showmigrations --plan --settings="$DJANGO_SETTINGS" | grep -q "CONFLICT"; then
        echo "❌ Migration conflicts detected!"
        echo "Please resolve conflicts before proceeding:"
        $PYTHON_CMD manage.py showmigrations --plan --settings="$DJANGO_SETTINGS"
        exit 1
    fi
    
    echo "✅ No migration conflicts found"
}

# Function to apply migrations
apply_migrations() {
    echo "📊 Applying database migrations..."
    
    # Show migration plan
    echo "Migration plan:"
    $PYTHON_CMD manage.py showmigrations --plan --settings="$DJANGO_SETTINGS"
    
    # Apply migrations
    $PYTHON_CMD manage.py migrate --settings="$DJANGO_SETTINGS" --verbosity=2
    
    echo "✅ Migrations applied successfully"
}

# Function to verify migrations
verify_migrations() {
    echo "✅ Verifying migrations..."
    
    # Check if all migrations are applied
    UNAPPLIED=$($PYTHON_CMD manage.py showmigrations --settings="$DJANGO_SETTINGS" | grep "[ ]" | wc -l)
    
    if [ "$UNAPPLIED" -gt 0 ]; then
        echo "❌ $UNAPPLIED unapplied migrations found!"
        $PYTHON_CMD manage.py showmigrations --settings="$DJANGO_SETTINGS"
        exit 1
    fi
    
    echo "✅ All migrations are applied"
}

# Main execution
cd "$PROJECT_DIR"

wait_for_db
create_backup
check_migrations
apply_migrations
verify_migrations

echo "🎉 Database migration completed successfully for $ENVIRONMENT environment!"

# Run additional commands for specific environments
if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
    echo "🔧 Running additional production setup..."
    
    # Create superuser if it doesn't exist (interactive in production)
    if [ "$ENVIRONMENT" != "production" ]; then
        echo "👤 Creating admin user (if not exists)..."
        $PYTHON_CMD manage.py shell --settings="$DJANGO_SETTINGS" -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@nutritionai.com').exists():
    User.objects.create_superuser('admin@nutritionai.com', 'admin123')
    print('Admin user created')
else:
    print('Admin user already exists')
"
    fi
fi