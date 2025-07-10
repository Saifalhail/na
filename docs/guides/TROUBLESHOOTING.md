# Troubleshooting Guide - Nutrition AI

Common issues and solutions for the Nutrition AI application.

## Table of Contents

- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Database Issues](#database-issues)
- [Docker Issues](#docker-issues)
- [API Issues](#api-issues)
- [Testing Issues](#testing-issues)
- [Performance Issues](#performance-issues)

## Backend Issues

### Django Server Won't Start

**Symptom**: `python manage.py runserver` fails
```
Django version 4.2, using settings 'core.settings.development'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
Error: [Errno 48] Address already in use
```

**Solutions**:
1. **Kill existing process**:
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

2. **Use different port**:
   ```bash
   python manage.py runserver 8001
   ```

3. **Check for background processes**:
   ```bash
   ps aux | grep python
   ```

### Environment Variables Not Loading

**Symptom**: `KeyError` for environment variables

**Solutions**:
1. **Check .env file exists**:
   ```bash
   ls -la backend/.env
   ```

2. **Verify .env format**:
   ```env
   # No spaces around =
   SECRET_KEY=your-secret-key
   # Not: SECRET_KEY = your-secret-key
   ```

3. **Check python-decouple installation**:
   ```bash
   pip list | grep decouple
   ```

### Import Errors

**Symptom**: `ModuleNotFoundError: No module named 'api'`

**Solutions**:
1. **Activate virtual environment**:
   ```bash
   source venv/bin/activate  # macOS/Linux
   venv\Scripts\activate     # Windows
   ```

2. **Check PYTHONPATH**:
   ```bash
   export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
   ```

3. **Reinstall dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Frontend Issues

### Expo CLI Issues

**Symptom**: Legacy expo-cli warnings or Node.js compatibility errors

**Solutions**:
1. **Remove global expo-cli**:
   ```bash
   npm uninstall -g expo-cli
   ```

2. **Use local CLI**:
   ```bash
   npx expo start
   ```

3. **Clear Expo cache**:
   ```bash
   npx expo start --clear
   ```

### React Version Conflicts

**Symptom**: Peer dependency warnings during npm install

**Solutions**:
1. **Use legacy peer deps**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Clean install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check version compatibility**:
   ```bash
   npx expo doctor
   ```

### TypeScript Errors

**Symptom**: TS errors in components or types

**Solutions**:
1. **Check tsconfig.json**:
   ```json
   {
     "extends": "expo/tsconfig.base",
     "compilerOptions": {
       "strict": true
     }
   }
   ```

2. **Regenerate types**:
   ```bash
   npm run type-check
   ```

3. **Clear TypeScript cache**:
   ```bash
   rm -rf node_modules/.cache
   ```

## Database Issues

### Connection Refused

**Symptom**: `django.db.utils.OperationalError: could not connect to server`

**Solutions**:
1. **Check PostgreSQL status**:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Ubuntu
   sudo systemctl status postgresql
   
   # Windows
   net start postgresql-x64-13
   ```

2. **Verify database exists**:
   ```sql
   \l                    -- List databases
   \c nutritiondb        -- Connect to database
   ```

3. **Check credentials**:
   ```bash
   psql -U nutrition_user -d nutritiondb -h localhost
   ```

### Migration Errors

**Symptom**: `django.db.migrations.exceptions.InconsistentMigrationHistory`

**Solutions**:
1. **Reset migrations**:
   ```bash
   python manage.py migrate --fake api zero
   python manage.py migrate
   ```

2. **Clear migration files**:
   ```bash
   find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
   find . -path "*/migrations/*.pyc" -delete
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Check for conflicts**:
   ```bash
   python manage.py showmigrations
   ```

## Docker Issues

### Container Build Failures

**Symptom**: Docker build fails with dependency errors

**Solutions**:
1. **Clear Docker cache**:
   ```bash
   docker system prune -a
   ```

2. **Rebuild without cache**:
   ```bash
   docker-compose build --no-cache
   ```

3. **Check Dockerfile syntax**:
   ```dockerfile
   # Ensure proper layer ordering
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   ```

### Volume Mount Issues

**Symptom**: Code changes not reflected in container

**Solutions**:
1. **Check docker-compose.yml**:
   ```yaml
   volumes:
     - ./backend:/app
     - /app/venv  # Exclude venv
   ```

2. **Restart containers**:
   ```bash
   docker-compose restart
   ```

## API Issues

### CORS Errors

**Symptom**: Browser blocks API requests

**Solutions**:
1. **Check CORS settings**:
   ```python
   # settings.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://127.0.0.1:3000",
   ]
   ```

2. **Verify middleware order**:
   ```python
   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',
       'django.middleware.common.CommonMiddleware',
       # ...
   ]
   ```

### Authentication Errors

**Symptom**: 401 Unauthorized on API calls

**Solutions**:
1. **Check token format**:
   ```javascript
   headers: {
     'Authorization': 'Bearer ' + token
   }
   ```

2. **Verify token expiry**:
   ```bash
   # Decode JWT token
   echo "your-jwt-token" | base64 -d
   ```

3. **Check authentication classes**:
   ```python
   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework_simplejwt.authentication.JWTAuthentication',
       ],
   }
   ```

## Testing Issues

### Test Database Errors

**Symptom**: Tests fail with database creation errors

**Solutions**:
1. **Grant test database permissions**:
   ```sql
   ALTER USER nutrition_user CREATEDB;
   ```

2. **Use in-memory database**:
   ```python
   # settings/testing.py
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.sqlite3',
           'NAME': ':memory:',
       }
   }
   ```

### Factory Boy Errors

**Symptom**: `AttributeError` in factory classes

**Solutions**:
1. **Check factory definitions**:
   ```python
   class UserFactory(factory.django.DjangoModelFactory):
       class Meta:
           model = User
       
       email = factory.Faker('email')
   ```

2. **Verify model imports**:
   ```python
   from api.models import User, Meal
   ```

## Performance Issues

### Slow API Responses

**Symptom**: API endpoints taking > 1 second

**Solutions**:
1. **Check database queries**:
   ```python
   # Add logging
   LOGGING = {
       'loggers': {
           'django.db.backends': {
               'level': 'DEBUG',
           }
       }
   }
   ```

2. **Optimize queries**:
   ```python
   # Use select_related and prefetch_related
   Meal.objects.select_related('user').prefetch_related('meal_items')
   ```

3. **Add caching**:
   ```python
   from django.core.cache import cache
   
   def get_meals(user_id):
       cache_key = f'user_meals_{user_id}'
       meals = cache.get(cache_key)
       if not meals:
           meals = Meal.objects.filter(user_id=user_id)
           cache.set(cache_key, meals, 300)  # 5 minutes
       return meals
   ```

### Memory Issues

**Symptom**: High memory usage or out of memory errors

**Solutions**:
1. **Check for memory leaks**:
   ```python
   import tracemalloc
   tracemalloc.start()
   # ... your code ...
   current, peak = tracemalloc.get_traced_memory()
   print(f"Current memory usage: {current / 1024 / 1024:.1f} MB")
   ```

2. **Optimize queryset evaluation**:
   ```python
   # Use iterator for large datasets
   for obj in Model.objects.iterator():
       process(obj)
   ```

## Getting Help

### Log Analysis

1. **Check Django logs**:
   ```bash
   tail -f backend/logs/django.log
   ```

2. **Check system logs**:
   ```bash
   # macOS
   tail -f /var/log/system.log
   
   # Ubuntu
   journalctl -f
   ```

### Debug Mode

Enable debug mode temporarily:
```python
# settings.py
DEBUG = True
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

### Support Channels

1. **Check documentation**: Review relevant guide first
2. **Search issues**: Look through existing GitHub issues
3. **Create issue**: Provide detailed reproduction steps
4. **Community**: Join project Discord/Slack if available

For complex issues, include:
- Error logs
- Environment details (OS, Python/Node versions)
- Steps to reproduce
- Expected vs actual behavior