# 🍎 Nutrition AI - Complete Development Guide

**Comprehensive guide for developing the Nutrition AI mobile application with React Native frontend and Django backend.**

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Development Environment](#development-environment)
4. [Daily Development Workflow](#daily-development-workflow)
5. [Testing & Debugging](#testing--debugging)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

## 🚀 Quick Start

```bash
# 1. Open WSL terminal
wsl

# 2. Navigate to project
cd /home/saifalhail/development/na

# 3. Set up environment (first time only)
./setup-backend.sh

# 4. Start development
./dev-start.sh phone    # For phone (recommended)
./dev-start.sh emulator # For Android emulator
./dev-start.sh web      # For web browser
```

## 📊 Project Overview

### Architecture

- **Frontend**: React Native with Expo (TypeScript)
- **Backend**: Django REST Framework (Python)
- **Database**: SQLite (development), PostgreSQL (production)
- **AI Integration**: Google Gemini Vision API
- **Authentication**: JWT with 2FA support
- **Real-time**: WebSocket support for notifications

### Key Features

- 📸 AI-powered food image analysis
- 🎯 Interactive nutritional results
- 👆 Guided camera capture
- 📱 Comprehensive meal tracking
- 🔐 Secure authentication with 2FA
- 🌐 Offline-first architecture

## 🛠️ Development Environment

### File Structure

```
/home/saifalhail/development/na/
├── backend/                 # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                # Backend configuration
│   ├── venv/               # Python virtual environment
│   └── api/                # Django apps
├── frontend/               # React Native Expo app
│   ├── App.tsx
│   ├── package.json
│   ├── .env               # Frontend configuration
│   ├── src/               # Application source code
│   └── node_modules/
├── scripts/               # Development scripts
├── docs/                  # Project documentation
└── *.sh                   # Setup and development scripts
```

### Development Scripts

| Script                | Purpose                        | Usage                           |
| --------------------- | ------------------------------ | ------------------------------- |
| `setup-backend.sh`    | Python environment setup       | First time + dependency changes |
| `setup-android.sh`    | Android emulator configuration | If using emulator               |
| `setup-network.sh`    | Network optimization for WSL   | Network connectivity issues     |
| `dev-start.sh`        | Start both frontend + backend  | Daily development               |
| `setup-everything.sh` | Complete environment setup     | New machines                    |

## 📱 Development Options

### Option 1: Phone Development (Recommended)

```bash
./dev-start.sh phone
```

**Benefits:**

- ✅ Real device testing
- ✅ No network configuration needed (tunnel mode)
- ✅ Best for UX testing
- ✅ Works from any internet connection

**How to use:**

1. Install Expo Go from app store
2. Run the command above
3. Scan QR code with Expo Go

### Option 2: Android Emulator

```bash
./setup-android.sh      # One-time setup
./dev-start.sh emulator
```

**Benefits:**

- ✅ No phone needed
- ✅ Debugging tools available
- ✅ Consistent test environment
- ✅ Fast development cycle

**Prerequisites:**

- Android Studio installed on Windows
- At least one AVD (Android Virtual Device) created

### Option 3: Web Browser

```bash
./dev-start.sh web
```

**Benefits:**

- ✅ Fastest reload cycle
- ✅ Browser dev tools
- ✅ Good for UI development
- ✅ No device setup needed

**Limitations:**

- ❌ No native features (camera, etc.)
- ❌ Different styling behavior

## 🔄 Daily Development Workflow

### Starting Development

```bash
# Open WSL terminal
wsl

# Navigate to project
cd /home/saifalhail/development/na

# Start development environment
./dev-start.sh phone  # or emulator/web
```

### Making Changes

**Frontend Development:**

- Edit files in `frontend/src/`
- Changes auto-reload in Metro bundler
- TypeScript compilation happens automatically

**Backend Development:**

- Edit files in `backend/`
- Django auto-reloads on file changes
- Database migrations: `python3 manage.py makemigrations && python3 manage.py migrate`

### Stopping Development

- Press `Ctrl+C` in the terminal running `dev-start.sh`
- Both frontend and backend servers stop automatically

## 🧪 Testing & Debugging

### Backend Testing

```bash
cd backend
source venv/bin/activate
python3 manage.py test

# With coverage
python3 -m pytest --cov=. --cov-report=html
```

### Frontend Testing

```bash
cd frontend
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Debugging

**Backend Debugging:**

- Check logs: `tail -f /tmp/backend.log`
- Django admin: http://localhost:8000/admin/
- API documentation: http://localhost:8000/api/docs/

**Frontend Debugging:**

- Metro bundler: http://localhost:8081
- Expo DevTools: http://localhost:19002
- React Native Debugger (if installed)

## 🌐 Development URLs

### Frontend (Expo)

- **Metro Bundler**: http://localhost:8081
- **Expo DevTools**: http://localhost:19002
- **Web Version**: http://localhost:8081 (when using web mode)

### Backend (Django)

- **API Server**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/docs/
- **API Schema**: http://localhost:8000/api/schema/

## 🔧 Configuration

### Environment Variables

**Backend (.env):**

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
GEMINI_API_KEY=your-gemini-api-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
```

**Frontend (.env):**

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

### Package Management

**Backend Dependencies:**

```bash
cd backend
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt
```

**Frontend Dependencies:**

```bash
cd frontend
npm install package-name
# or
npm install package-name --save-dev  # for dev dependencies
```

## 🚨 Troubleshooting

### Common Issues

**1. Virtual Environment Issues**

```bash
# Fix: Recreate environment
./setup-backend.sh
```

**2. Port Conflicts**

```bash
# Kill existing processes
pkill -f "python3.*manage.py.*runserver"
pkill -f "expo.*start"
```

**3. Phone Connection Issues**

```bash
# Use tunnel mode (bypasses network issues)
./dev-start.sh phone
```

**4. Node Modules Issues**

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**5. Database Issues**

```bash
cd backend
source venv/bin/activate
python3 manage.py migrate
```

### Detailed Troubleshooting

See `TROUBLESHOOTING.md` for comprehensive troubleshooting guide with solutions to specific error messages.

## 🎯 Performance Tips

1. **Use WSL native filesystem** (current setup) - 10x faster than Windows mounts
2. **Use tunnel mode** for phone development - bypasses network complexity
3. **Clear Metro cache** when having weird issues:
   ```bash
   cd frontend
   npx expo start --clear --reset-cache
   ```
4. **Use emulator** for intensive debugging sessions
5. **Web mode** for quick UI iterations

## 🔐 Security Considerations

### Development Security

- Keep `.env` files out of version control
- Use development API keys (not production)
- Backend runs on localhost only by default
- JWT tokens have reasonable expiry times

### Production Considerations

- Use environment-specific configurations
- Enable HTTPS in production
- Configure proper CORS origins
- Use secure database credentials

## 📚 Additional Resources

### Documentation

- **API Reference**: `docs/api/README.md`
- **Frontend Architecture**: `docs/frontend/FRONTEND_ARCHITECTURE.md`
- **Component Library**: `docs/frontend/COMPONENT_LIBRARY.md`
- **Testing Guide**: `docs/testing/README.md`

### External Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Google Gemini API](https://ai.google.dev/docs)

## 🆘 Getting Help

### Quick Diagnostics

```bash
./network-test.sh        # Network connectivity check
tail -f /tmp/backend.log  # Backend logs
tail -f /tmp/frontend.log # Frontend logs
```

### Support

1. Check `TROUBLESHOOTING.md` for common issues
2. Review logs for specific error messages
3. Ensure all prerequisites are installed
4. Try recreating the environment with setup scripts

---

**Happy coding! 🚀 Ready to build the future of nutrition tracking!**
