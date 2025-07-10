#!/bin/bash

# Deploy script for Nutrition AI backend
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$PROJECT_DIR/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_DIR/.env.$ENVIRONMENT"
    echo "✅ Loaded $ENVIRONMENT environment variables"
else
    echo "❌ Environment file .env.$ENVIRONMENT not found!"
    exit 1
fi

# Validate required environment variables
REQUIRED_VARS=("DATABASE_URL" "SECRET_KEY" "REDIS_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set!"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t nutrition-ai-backend:$ENVIRONMENT --target production "$PROJECT_DIR"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" down --remove-orphans || true

# Start database and redis first
echo "🗄️ Starting database and redis..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d db redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
    if docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME"; then
        echo "✅ Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" run --rm web python manage.py migrate --settings=core.settings.production

# Collect static files
if [ "$ENVIRONMENT" = "production" ]; then
    echo "📁 Collecting static files..."
    docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" run --rm web python manage.py collectstatic --noinput --settings=core.settings.production
fi

# Start all services
echo "🚀 Starting all services..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d

# Wait for web service to be healthy
echo "⏳ Waiting for web service to be healthy..."
for i in {1..60}; do
    if curl -f "http://localhost:8000/api/health/" >/dev/null 2>&1; then
        echo "✅ Web service is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Web service failed to become healthy within 60 seconds"
        docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" logs web
        exit 1
    fi
    sleep 1
done

# Run health checks
echo "🔍 Running health checks..."
HEALTH_URL="http://localhost:8000/api/health/"
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

# Create backup of current database (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "💾 Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$PROJECT_DIR/backups/$BACKUP_FILE"
    echo "✅ Database backup created: $BACKUP_FILE"
fi

# Clean up old Docker images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "🎉 Deployment to $ENVIRONMENT completed successfully!"

# Display service status
echo "📊 Service status:"
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps