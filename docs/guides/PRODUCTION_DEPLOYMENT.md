# Production Deployment Guide

Complete guide for deploying the Nutrition AI backend to production with Docker, security, monitoring, and best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Environment Configuration](#environment-configuration)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Database Setup](#database-setup)
6. [Deployment Process](#deployment-process)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling & Performance](#scaling--performance)
10. [Security Hardening](#security-hardening)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Production Server:**

- **CPU:** 4 cores (8 recommended)
- **RAM:** 8GB (16GB recommended)
- **Storage:** 100GB SSD (500GB recommended)
- **Network:** 1Gbps connection
- **OS:** Ubuntu 22.04 LTS or CentOS 8+

**Required Software:**

- Docker 24.0+
- Docker Compose 2.20+
- PostgreSQL 15+ (if using external database)
- Redis 7+ (if using external cache)
- Nginx (handled by Docker)

### Domain & DNS Setup

1. **Domain Requirements:**
   - Primary domain: `yourdomain.com`
   - API subdomain: `api.yourdomain.com`
   - Admin subdomain: `admin.yourdomain.com` (optional)

2. **DNS Configuration:**
   ```
   A    yourdomain.com        → YOUR_SERVER_IP
   A    api.yourdomain.com    → YOUR_SERVER_IP
   AAAA yourdomain.com        → YOUR_SERVER_IPv6 (if available)
   ```

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git unzip htop

# Create deployment user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

# Switch to deployment user
sudo su - deploy
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

## Environment Configuration

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-username/nutrition-ai.git
cd nutrition-ai/backend

# Checkout production branch (if different from main)
git checkout production
```

### 2. Environment Variables

```bash
# Copy production environment template
cp .env.production.example .env.prod

# Edit environment variables
nano .env.prod
```

**Critical Variables to Update:**

```bash
# Security (MUST CHANGE)
SECRET_KEY=your-unique-50-character-secret-key
JWT_SIGNING_KEY=your-unique-jwt-signing-key

# Domain Configuration
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Database Credentials
DB_NAME=nutrition_ai_prod
DB_USER=nutrition_user
DB_PASSWORD=your-strong-database-password

# API Keys
GEMINI_API_KEY=your-production-gemini-api-key
STRIPE_SECRET_KEY=sk_live_your-production-stripe-key
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Email Configuration
EMAIL_HOST=smtp.your-provider.com
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your-email-password
```

### 3. Generate Secret Keys

```bash
# Generate Django secret key
python -c "import secrets; print(secrets.token_urlsafe(50))"

# Generate JWT signing key
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot

# Generate SSL certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# Copy certificates to project
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown deploy:deploy ssl/*

# Setup auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

### Option 2: Self-Signed (Development Only)

```bash
# Generate self-signed certificate (NOT for production)
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

## Database Setup

### Option 1: Docker PostgreSQL (Default)

The default docker-compose.prod.yml includes PostgreSQL. No additional setup required.

### Option 2: External PostgreSQL

If using external PostgreSQL (recommended for large deployments):

```bash
# Connect to your PostgreSQL server
psql -h your-db-host -U postgres

# Create database and user
CREATE DATABASE nutrition_ai_prod;
CREATE USER nutrition_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE nutrition_ai_prod TO nutrition_user;
ALTER USER nutrition_user CREATEDB;  -- For migrations

# Update .env.prod
DB_HOST=your-external-db-host
DB_PORT=5432
```

## Deployment Process

### 1. Pre-Deployment Checks

```bash
# Validate environment configuration
./scripts/deploy.sh health

# Check Docker configuration
docker-compose -f docker-compose.prod.yml config

# Test database connection
docker-compose -f docker-compose.prod.yml run --rm web python manage.py check --settings=core.settings.production
```

### 2. Initial Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run full deployment
./scripts/deploy.sh deploy
```

**Deployment Process:**

1. ✅ Prerequisites check
2. ✅ Database backup creation
3. ✅ Media files backup
4. ✅ Docker image build
5. ✅ Service restart with zero downtime
6. ✅ Database migrations
7. ✅ Static files collection
8. ✅ Health checks
9. ✅ Cache warming
10. ✅ Post-deployment tasks

### 3. Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test API endpoints
curl -f https://api.yourdomain.com/api/health/
curl -f https://api.yourdomain.com/api/readiness/
```

## Monitoring & Health Checks

### 1. Health Check Endpoints

```bash
# Basic health check
GET /api/health/
# Returns: {"status": "healthy", "timestamp": "..."}

# Readiness check (validates all dependencies)
GET /api/readiness/
# Returns: {"status": "ready", "checks": {...}}

# Application metrics
GET /api/metrics/
# Returns: {"system": {...}, "application": {...}}
```

### 2. Monitoring Setup

**Sentry Integration:**

```bash
# Sentry automatically captures errors when configured
# View errors at: https://sentry.io/organizations/your-org/projects/
```

**Health Check Monitoring:**

```bash
# Setup external monitoring (example with UptimeRobot)
# Monitor these endpoints:
# - https://api.yourdomain.com/api/health/
# - https://api.yourdomain.com/api/readiness/
```

### 3. Log Monitoring

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f web

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f celery
docker-compose -f docker-compose.prod.yml logs -f nginx

# Monitor log files
tail -f logs/django.log
tail -f /var/log/nginx/access.log
```

## Backup & Recovery

### 1. Automated Backups

```bash
# Create backup manually
./scripts/deploy.sh backup

# Setup automated daily backups
sudo crontab -e
# Add this line for 2 AM daily backups:
# 0 2 * * * cd /home/deploy/nutrition-ai/backend && ./scripts/deploy.sh backup
```

### 2. Backup Verification

```bash
# List available backups
ls -la /var/backups/nutrition-ai/

# Verify backup integrity
gunzip -t /var/backups/nutrition-ai/db_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Disaster Recovery

```bash
# Rollback to previous backup
./scripts/deploy.sh rollback

# Manual database restore
gunzip < backup.sql.gz | docker-compose -f docker-compose.prod.yml exec -T db psql -U nutrition_user -d nutrition_ai_prod
```

## Scaling & Performance

### 1. Horizontal Scaling

**Load Balancer Configuration:**

```nginx
upstream backend {
    server server1.yourdomain.com:443;
    server server2.yourdomain.com:443;
    server server3.yourdomain.com:443;
}
```

### 2. Vertical Scaling

**Update Docker Compose:**

```yaml
# In docker-compose.prod.yml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
        reservations:
          cpus: "1.0"
          memory: 2G
```

### 3. Database Optimization

```bash
# Enable connection pooling
# Add to .env.prod:
DB_CONN_MAX_AGE=600
DB_CONN_HEALTH_CHECKS=True

# Setup read replicas (optional)
DB_READ_REPLICA_HOST=replica.yourdomain.com
```

## Security Hardening

### 1. Server Security

```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Setup fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Setup automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

### 2. Application Security

```bash
# Security headers are already configured in nginx.prod.conf
# Additional security measures:

# Enable security middleware in settings
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Regular security updates
docker-compose -f docker-compose.prod.yml pull
./scripts/deploy.sh deploy
```

### 3. Database Security

```bash
# PostgreSQL security (if using external DB)
# In postgresql.conf:
ssl = on
ssl_cert_file = '/path/to/cert.pem'
ssl_key_file = '/path/to/key.pem'

# Restrict connections in pg_hba.conf:
hostssl all all 0.0.0.0/0 md5
```

## Troubleshooting

### Common Issues

**1. Container Won't Start:**

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs web

# Common solutions:
# - Check environment variables in .env.prod
# - Verify database connectivity
# - Check disk space: df -h
```

**2. Database Connection Issues:**

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec web python manage.py dbshell --settings=core.settings.production

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

**3. SSL Certificate Issues:**

```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal
```

**4. Performance Issues:**

```bash
# Check system resources
htop
docker stats

# Analyze slow queries
docker-compose -f docker-compose.prod.yml exec db psql -U nutrition_user -d nutrition_ai_prod -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Emergency Procedures

**1. Service Recovery:**

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

**2. Database Recovery:**

```bash
# Restore from backup
./scripts/deploy.sh rollback

# Manual recovery
gunzip < /var/backups/nutrition-ai/db_backup_latest.sql.gz | \
docker-compose -f docker-compose.prod.yml exec -T db psql -U nutrition_user -d nutrition_ai_prod
```

## Post-Deployment Checklist

- [ ] All services running without errors
- [ ] Health checks passing
- [ ] SSL certificates valid and auto-renewing
- [ ] Database backups scheduled and tested
- [ ] Monitoring alerts configured
- [ ] Log rotation configured
- [ ] Security updates scheduled
- [ ] Performance baselines established
- [ ] Disaster recovery plan tested
- [ ] Team access and documentation updated

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**

- [ ] Review application logs for errors
- [ ] Check system resource usage
- [ ] Verify backup completion
- [ ] Review security alerts

**Monthly:**

- [ ] Update dependencies
- [ ] Security patches
- [ ] Performance review
- [ ] Capacity planning review

**Quarterly:**

- [ ] Disaster recovery testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Infrastructure review

---

**Need Help?**

- 📧 Technical Support: tech@yourdomain.com
- 📚 Documentation: https://docs.yourdomain.com
- 🐛 Bug Reports: https://github.com/your-org/nutrition-ai/issues
- 💬 Community: https://discord.gg/your-community
