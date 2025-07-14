# 🍎 Nutrition AI - Development Environment Setup

Complete WSL-optimized development environment for the Nutrition AI mobile application.

## 🚀 Quick Start

```bash
# Navigate to project directory
cd /home/saifalhail/development/na

# 1. Set up the development environment
./setup-backend.sh       # Set up Python/Django backend
./setup-android.sh       # Set up Android emulator (optional)
./setup-network.sh       # Configure network for phone connectivity

# 2. Start development servers
./dev-start.sh           # Starts both frontend and backend together

# 3. Choose your development target
./dev-start.sh phone     # For phone development (tunnel mode)
./dev-start.sh emulator  # For Android emulator
./dev-start.sh web       # For web browser
./dev-start.sh lan       # For same network (LAN mode)
```

## 📱 Development Options

### Phone Development (Recommended)

```bash
./dev-start.sh phone
```

- ✅ Uses tunnel mode - works anywhere with internet
- ✅ No network configuration needed
- ✅ Scan QR code with Expo Go app
- ✅ Best for real device testing

### Android Emulator

```bash
./setup-android.sh      # One-time setup
./dev-start.sh emulator
```

- Requires Android Studio on Windows or WSL
- Best performance for debugging
- No phone needed

### Web Development

```bash
./dev-start.sh web
```

- Runs in web browser
- Good for UI development and testing
- Fastest iteration cycle

## 🛠️ Setup Scripts Overview

| Script             | Purpose                           | When to Run                     |
| ------------------ | --------------------------------- | ------------------------------- |
| `setup-backend.sh` | Python environment + Django setup | First time + dependency changes |
| `setup-android.sh` | Android SDK configuration         | If using emulator               |
| `setup-network.sh` | WSL network optimization          | Network connectivity issues     |
| `dev-start.sh`     | Start both frontend + backend     | Daily development               |

## 🔧 Individual Component Setup

### Backend Only

```bash
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### Frontend Only

```bash
cd frontend

# Different modes:
npx expo start --clear           # Default mode
npx expo start --tunnel --clear  # Tunnel mode (for phone)
npx expo start --android --clear # Android emulator
npx expo start --web --clear     # Web browser
```

## 📊 Development URLs

### Frontend (Expo)

- **Metro Bundler**: http://localhost:8081
- **Expo DevTools**: http://localhost:19002

### Backend (Django)

- **API Server**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/docs/

## 🐛 Troubleshooting Guide

### 1. Phone Can't Connect to Metro

```bash
# Run network diagnostics
./network-test.sh

# Use tunnel mode (bypasses network issues)
./dev-start.sh phone

# Or manually:
cd frontend
npx expo start --tunnel --clear
```

### 2. Android Emulator Not Working

```bash
# Reconfigure Android SDK
./setup-android.sh

# For Windows Android Studio + WSL:
# 1. Install Android Studio on Windows
# 2. Create AVD in Android Studio
# 3. Start AVD from Android Studio
# 4. Run: ./dev-start.sh emulator
```

### 3. Backend Setup Issues

```bash
# Install required system packages
sudo apt update
sudo apt install python3.12-venv python3-pip

# Then run setup again
./setup-backend.sh
```

### 4. Port Conflicts

```bash
# Kill existing processes
pkill -f "python.*manage.py.*runserver"
pkill -f "expo.*start"

# Check what's using ports
lsof -i :8000  # Backend port
lsof -i :8081  # Frontend port
```

### 5. WSL Network Issues

**For Phone Development**, configure Windows Firewall:

```powershell
# Run in PowerShell as Administrator on Windows
New-NetFirewallRule -DisplayName "Metro Bundler" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
New-NetFirewallRule -DisplayName "Django API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
New-NetFirewallRule -DisplayName "Expo DevTools" -Direction Inbound -Protocol TCP -LocalPort 19000-19007 -Action Allow
```

**Or use tunnel mode** (recommended):

```bash
./dev-start.sh phone  # Bypasses all network configuration
```

## 📱 Mobile Testing Options

### Option 1: Expo Go App (Easiest)

1. Install Expo Go from app store
2. Run `./dev-start.sh phone`
3. Scan QR code with Expo Go

### Option 2: Android Emulator

1. Install Android Studio on Windows
2. Create Virtual Device (AVD)
3. Run `./dev-start.sh emulator`

### Option 3: iOS Simulator (macOS only)

1. Install Xcode
2. Run `./dev-start.sh`
3. Press 'i' in Metro terminal

## 🔄 Development Workflow

### Daily Development

```bash
# 1. Open WSL terminal
wsl

# 2. Navigate to project
cd /home/saifalhail/development/na

# 3. Start development environment
./dev-start.sh phone  # or emulator/web/lan

# 4. Develop and test
# Both frontend and backend are running
# Changes auto-reload in Metro bundler
```

### Making Changes

- **Frontend**: Edit files in `frontend/src/`
- **Backend**: Edit files in `backend/`
- **API Changes**: Restart backend only
- **Metro Issues**: Stop and restart `dev-start.sh`

## 🏗️ Project Structure

```
/home/saifalhail/development/na/
├── backend/              # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env             # Backend configuration
│   └── venv/            # Python virtual environment
├── frontend/            # React Native Expo app
│   ├── package.json
│   ├── App.tsx
│   ├── .env            # Frontend configuration
│   └── node_modules/
├── dev-start.sh        # 🔥 Main development script
├── setup-backend.sh    # Backend setup
├── setup-android.sh    # Android emulator setup
├── setup-network.sh    # Network configuration
├── expo-start.sh      # Frontend-only startup
├── network-test.sh    # Network diagnostics
└── DEV-SETUP.md      # This guide
```

## ⚡ Performance Tips

1. **Use WSL native filesystem** (current setup) - 10x faster than OneDrive
2. **Use tunnel mode** for phone development - bypasses network issues
3. **Clear Metro cache** when encountering weird issues:
   ```bash
   cd frontend
   npx expo start --clear --reset-cache
   ```
4. **Use emulator** for intensive debugging sessions
5. **Web mode** for quick UI iterations

## 🎯 Development Modes Comparison

| Mode                 | Use Case            | Setup Effort | Performance | Network Required |
| -------------------- | ------------------- | ------------ | ----------- | ---------------- |
| **Phone (Tunnel)**   | Real device testing | Easy         | Good        | Any internet     |
| **Phone (LAN)**      | Real device testing | Medium       | Better      | Same WiFi        |
| **Android Emulator** | Development/Debug   | Medium       | Best        | None             |
| **Web Browser**      | UI Development      | Easy         | Fastest     | None             |

## 🔧 Environment Configuration

### Backend Environment (.env)

```bash
# Located in: backend/.env
# Copy from: backend/.env.example

SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
GEMINI_API_KEY=your-gemini-key
```

### Frontend Environment (.env)

```bash
# Located in: frontend/.env
# Copy from: frontend/.env.example

EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_ENVIRONMENT=development
```

## 📞 Getting Help

### Quick Diagnostics

```bash
./network-test.sh        # Network connectivity check
tail -f /tmp/backend.log  # Backend logs
tail -f /tmp/frontend.log # Frontend logs
```

### Common Solutions

1. **Metro won't start**: Use `./dev-start.sh` instead of manual commands
2. **Phone can't connect**: Use `./dev-start.sh phone` (tunnel mode)
3. **Emulator issues**: Run `./setup-android.sh` first
4. **Backend errors**: Check `backend/.env` configuration
5. **Weird caching issues**: Restart `dev-start.sh` with cache clearing

---

## ✨ What's Special About This Setup

- **WSL Native Filesystem**: No more OneDrive permission issues
- **Unified Development**: One command starts everything
- **Multiple Target Support**: Phone, emulator, web - all ready
- **Smart Network Handling**: Tunnel mode bypasses WSL networking complexities
- **Comprehensive Diagnostics**: Built-in troubleshooting tools

**Ready to start? Run `./dev-start.sh phone` and you're coding! 🚀**
