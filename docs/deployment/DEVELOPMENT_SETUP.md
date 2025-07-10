# Development Environment Setup

This guide explains how to set up the Nutrition AI project for local development.

## Prerequisites

- Python 3.10+
- Node.js 18+ (LTS)
- PostgreSQL 13+
- Git
- VS Code or your preferred IDE

## Backend Setup

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd na/backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Database Setup

Create PostgreSQL database:
```sql
CREATE DATABASE nutritiondb;
CREATE USER nutrition_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nutritiondb TO nutrition_user;
```

### 5. Environment Configuration

Create `.env` file:
```bash
cp .env.example .env
```

Configure your `.env`:
```env
# Database
DATABASE_URL=postgresql://nutrition_user:your_password@localhost:5432/nutritiondb

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
DJANGO_ENVIRONMENT=development

# AI Service
GEMINI_API_KEY=your-gemini-api-key

# Cache
REDIS_URL=redis://localhost:6379/0

# Email (for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 6. Run Migrations

```bash
python manage.py migrate
```

### 7. Create Superuser

```bash
python manage.py createsuperuser
```

### 8. Start Development Server

```bash
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000`

## Frontend Setup

### 1. Navigate to Frontend

```bash
cd ../frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env` file:
```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
```

### 4. Start Development Server

```bash
npx expo start
```

Scan the QR code with Expo Go app or run on emulator.

## Testing Setup

### Backend Tests

```bash
cd backend
python run_tests.py --coverage
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Common Development Tasks

### Running with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Operations

```bash
# Create migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset database
python manage.py flush

# Load fixture data
python manage.py loaddata fixtures/sample_data.json
```

### Code Quality

```bash
# Backend
black . --check
isort . --check-only
flake8

# Frontend
npm run lint
npm run type-check
npm run format:check
```

## IDE Setup

### VS Code Extensions

Recommended extensions:
- Python
- Django
- React Native Tools
- TypeScript and JavaScript Language Features
- Prettier
- ESLint

### VS Code Settings

Add to `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "editor.formatOnSave": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists and user has permissions

### Frontend Build Issues

1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear Expo cache: `npx expo start --clear`
3. Check Node.js version compatibility

### Import Errors

1. Ensure virtual environment is activated
2. Check PYTHONPATH includes backend directory
3. Verify all dependencies are installed

### Port Conflicts

- Backend default: 8000
- Frontend default: 8081
- Change ports in run commands if conflicts occur

## Development Workflow

1. **Pull latest changes**: `git pull origin main`
2. **Update dependencies**: `pip install -r requirements.txt && npm install`
3. **Run migrations**: `python manage.py migrate`
4. **Start services**: Backend and frontend servers
5. **Run tests**: Ensure all tests pass before committing
6. **Code review**: Create PR for review

For additional help, see the [troubleshooting guide](../guides/TROUBLESHOOTING.md).