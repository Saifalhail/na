# Secrets Management Guide

This document outlines the secrets required for CI/CD pipelines and deployment of the Nutrition AI backend.

## Required Secrets for GitHub Actions

### Database Configuration
- `STAGING_DATABASE_URL`: PostgreSQL connection string for staging environment
- `PRODUCTION_DATABASE_URL`: PostgreSQL connection string for production environment
- `DB_USER`: Database username for production
- `DB_PASSWORD`: Database password for production
- `DB_NAME`: Database name for production

### Application Secrets
- `STAGING_SECRET_KEY`: Django secret key for staging
- `PRODUCTION_SECRET_KEY`: Django secret key for production
- `GEMINI_API_KEY`: Google Gemini API key for AI services

### AWS Configuration
- `AWS_ACCESS_KEY_ID`: AWS access key for S3 storage
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for S3 storage
- `STAGING_S3_BUCKET`: S3 bucket name for staging static files
- `PRODUCTION_S3_BUCKET`: S3 bucket name for production static files

### Deployment Configuration
- `STAGING_HOST`: Staging server hostname/IP
- `STAGING_USER`: SSH username for staging deployment
- `STAGING_SSH_KEY`: SSH private key for staging deployment
- `STAGING_URL`: Staging application URL for health checks

- `PRODUCTION_HOST`: Production server hostname/IP
- `PRODUCTION_USER`: SSH username for production deployment
- `PRODUCTION_SSH_KEY`: SSH private key for production deployment
- `PRODUCTION_URL`: Production application URL for health checks

### Monitoring & Notifications
- `SENTRY_DSN`: Sentry error tracking DSN
- `SLACK_WEBHOOK`: Slack webhook URL for deployment notifications

### Environment Variables
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## Setting Up Secrets in GitHub

1. Navigate to your repository on GitHub
2. Go to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with the appropriate name and value

## Environment-Specific .env Files

### Staging Environment (.env.staging)
```env
DEBUG=False
SECRET_KEY=${STAGING_SECRET_KEY}
DATABASE_URL=${STAGING_DATABASE_URL}
REDIS_URL=redis://redis:6379/0
GEMINI_API_KEY=${GEMINI_API_KEY}
ALLOWED_HOSTS=${STAGING_HOST}
CORS_ALLOWED_ORIGINS=https://${STAGING_HOST}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_STORAGE_BUCKET_NAME=${STAGING_S3_BUCKET}
SENTRY_DSN=${SENTRY_DSN}
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
```

### Production Environment (.env.production)
```env
DEBUG=False
SECRET_KEY=${PRODUCTION_SECRET_KEY}
DATABASE_URL=${PRODUCTION_DATABASE_URL}
REDIS_URL=redis://redis:6379/0
GEMINI_API_KEY=${GEMINI_API_KEY}
ALLOWED_HOSTS=${PRODUCTION_HOST}
CORS_ALLOWED_ORIGINS=https://${PRODUCTION_HOST}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_STORAGE_BUCKET_NAME=${PRODUCTION_S3_BUCKET}
SENTRY_DSN=${SENTRY_DSN}
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
```

## Security Best Practices

1. **Never commit secrets to version control**
2. **Rotate secrets regularly** (at least every 90 days)
3. **Use environment-specific secrets** (different for staging/production)
4. **Limit secret access** to only necessary personnel
5. **Monitor secret usage** and set up alerts for unauthorized access
6. **Use strong, randomly generated secrets**

## Secret Generation Commands

### Generate Django Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Generate Database Password
```bash
openssl rand -base64 32
```

### Generate SSH Key Pair
```bash
ssh-keygen -t ed25519 -C "nutrition-ai-deploy" -f ~/.ssh/nutrition_ai_deploy
```

## Local Development

For local development, copy `.env.example` to `.env` and fill in the required values:

```bash
cd backend
cp .env.example .env
# Edit .env with your local configuration
```

## Deployment Verification

After setting up secrets, verify the deployment pipeline:

1. **Test staging deployment**:
   - Push to `develop` branch
   - Check GitHub Actions logs
   - Verify staging environment health

2. **Test production deployment**:
   - Create a manual workflow dispatch
   - Monitor deployment process
   - Verify production environment health

## Troubleshooting

### Common Issues

1. **Missing secrets**: Check GitHub Actions logs for undefined variables
2. **Invalid SSH keys**: Ensure private key format is correct (begins with `-----BEGIN OPENSSH PRIVATE KEY-----`)
3. **Database connection issues**: Verify database URL format and credentials
4. **Permission issues**: Check SSH key permissions and user access on target servers

### Debug Commands

```bash
# Test database connection
python manage.py dbshell --command="SELECT version();"

# Test Redis connection
python manage.py shell -c "from django.core.cache import cache; print(cache.get('test', 'Redis working'))"

# Test AI service
python manage.py shell -c "from api.services.gemini_service import GeminiService; print(GeminiService().health_check())"
```