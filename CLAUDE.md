# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Nutrition AI** mobile application with AI-powered food analysis capabilities, consisting of:

- **Frontend**: React Native with Expo (TypeScript)
- **Backend**: Django REST Framework (Python)
- **Database**: SQLite (development), PostgreSQL (production)
- **AI Integration**: Google Gemini Vision API for food image analysis
- **Authentication**: JWT with 2FA support via TOTP
- **Real-time Features**: WebSocket support for notifications

## Essential Development Commands

### Quick Start (WSL Environment)
```bash
# Start both backend and frontend
./start.sh

# Start individual services
./start.sh backend   # Django API server only
./start.sh frontend  # Expo development server only
./start.sh clean     # Clean caches and restart
```

### Backend Commands
```bash
cd backend

# Environment setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Database operations
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Development server
python manage.py runserver 127.0.0.1:8000

# Testing
python run_tests.py                    # Run all tests
python run_tests.py --coverage         # With coverage
python run_tests.py --parallel         # Parallel execution
python run_tests.py api/tests/test_*.py # Specific tests
```

### Frontend Commands
```bash
cd frontend

# Environment setup
npm install

# Development
npm start                    # Start Expo development server
npm run start:force          # Start with cache clearing
npm run type-check           # TypeScript checking
npm run lint                 # ESLint
npm run lint:fix             # Auto-fix linting issues

# Testing
npm test                     # Run Jest tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage

# Build validation
npm run validate             # Type-check + lint + test
npm run validate:quick       # Type-check + lint only
```

## High-Level Architecture

### Backend Architecture (Django)

The backend follows Django REST Framework patterns with these key architectural decisions:

**Core Structure:**
- `core/` - Django project settings and configuration
- `api/` - Main Django app containing all business logic
- Settings are split by environment: `base.py`, `development.py`, `production.py`, `testing.py`

**Key Models:**
- `User` (Custom user model with email auth)
- `UserProfile` (Extended user data with nutrition preferences)
- `Meal` & `MealItem` (Meal tracking with nutritional data)
- `FoodItem` (Food database with nutritional information)
- `MealAnalysis` (AI analysis results storage)
- `Subscription` & `Payment` (Premium features and billing)
- `DeviceToken` & `PushNotification` (Mobile push notifications)

**Authentication Flow:**
- JWT-based authentication with refresh tokens
- Optional 2FA using TOTP (Time-based One-Time Password)
- Firebase authentication integration for social login
- SMS-based verification for phone numbers

**AI Integration:**
- Google Gemini Vision API for food image analysis
- Progressive analysis with confidence routing
- Caching layer for visual similarity detection
- Malware scanning for uploaded images

### Frontend Architecture (React Native/Expo)

**State Management:**
- Zustand for global state management
- Stores: `authStore`, `userStore`, `mealStore`, `uiStore`, `notificationStore`, `twoFactorStore`
- Persistent storage with AsyncStorage adapter

**Navigation Structure:**
```
AuthStack (before login)
├── Welcome
├── Login
├── Register
├── ForgotPassword
└── TwoFactorSetup

MainStack (after login)
├── HomeTabs
│   ├── Home
│   ├── History
│   ├── Favorites
│   └── Settings
├── Camera
├── AnalysisResults
├── Profile
└── Notifications
```

**Key Services:**
- API client with retry logic and offline queue
- Push notification service (Expo)
- Camera service with smart guidance
- Analytics and crash reporting
- Deep linking support

**Component Architecture:**
- Base components in `components/base/` (Button, Card, Modal, etc.)
- Feature-specific components in `components/camera/`, `components/auth/`, etc.
- Consistent theming system with light/dark mode support

## Development Environment

This project is optimized for **WSL (Windows Subsystem for Linux)** development:

### File Locations
```
Project root: /mnt/c/Users/salhail/Desktop/na/
- Backend files: backend/
- Frontend files: frontend/
- Documentation: docs/
- Scripts: scripts/
```

### Asset Files
```
Logo files: frontend/assets/
- logo.png - Full logo (used in splash screens, login screens)
- logo_cropped.png - Cropped/compact logo (used in headers, small spaces)

Usage:
- Full logo: require('../assets/logo.png') - for splash, auth screens
- Cropped logo: require('../../assets/logo_cropped.png') - for headers, navigation
Note: Use relative paths, no alias needed
```

### Environment Variables

**Backend (backend/.env):**
```
SECRET_KEY=<django-secret-key>
DEBUG=True
GEMINI_API_KEY=<google-gemini-api-key>
DATABASE_URL=sqlite:///db.sqlite3
STRIPE_SECRET_KEY=<stripe-secret-key>
TWILIO_ACCOUNT_SID=<twilio-sid>
```

**Frontend (frontend/.env):**
```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_ENVIRONMENT=development
```

### Network Configuration
- Backend runs on `127.0.0.1:8000`
- Frontend Metro bundler on `localhost:8081`
- Expo dev tools on `localhost:19002`
- Uses tunnel mode for mobile device connectivity

## Testing Strategy

### Backend Testing
- **Framework**: pytest with pytest-django
- **Location**: `backend/api/tests/`
- **Factories**: Factory Boy for test data generation
- **Coverage**: Aim for >80% on critical paths
- **Database**: SQLite in-memory for tests

### Frontend Testing
- **Framework**: Jest with React Native Testing Library
- **Location**: `frontend/src/**/__tests__/`
- **Types**: Unit tests for components and utilities
- **Mocking**: API calls and native modules

## Important Development Notes

### Security Considerations
- JWT tokens are stored securely with automatic refresh
- All file uploads are scanned for malware
- Rate limiting on API endpoints
- CORS properly configured for development and production
- 2FA implementation using standard TOTP protocols

### Performance Optimizations
- Image optimization and progressive loading
- Visual similarity caching for AI analysis
- Offline-first architecture with sync capabilities
- Circuit breaker pattern for external API calls
- Database indexes on frequently queried fields

### Mobile-Specific Features
- Camera integration with smart photo guidance
- Push notifications via Expo
- Offline meal logging with sync
- Device token management
- Deep linking for notifications

## Common Development Patterns

### Adding New API Endpoints
1. Create view in `backend/api/views/`
2. Add serializer in `backend/api/serializers/`
3. Define URL in appropriate `urls.py`
4. Add tests in `backend/api/tests/test_*.py`
5. Update API documentation

### Adding New Frontend Screens
1. Create screen component in `frontend/src/screens/`
2. Add to navigation types in `navigation/types.ts`
3. Register in appropriate navigator
4. Add corresponding API calls in `services/api/endpoints/`
5. Create tests in `__tests__/` directory

### Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate

# For production
python manage.py migrate --check  # Verify before deploy
```

## Build and Deployment

### Frontend Build
```bash
cd frontend
npx expo build:android  # Android APK
npx expo build:ios      # iOS build
```

### Backend Deployment
- Production uses Gunicorn + Nginx
- PostgreSQL database
- Redis for caching and WebSocket support
- Environment-specific settings in `core/settings/`

## Troubleshooting Commands

### Clear All Caches
```bash
./start.sh clean  # Cleans both frontend and backend caches
```

### Reset Development Environment
```bash
cd backend && rm -rf venv/ && cd ../frontend && rm -rf node_modules/
./start.sh  # Will recreate everything
```

### Database Reset
```bash
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

## Key External Integrations

- **Google Gemini Vision API**: Food image analysis
- **Stripe**: Payment processing
- **Twilio**: SMS notifications
- **Firebase**: Social authentication and push notifications
- **Expo**: Mobile development and deployment platform