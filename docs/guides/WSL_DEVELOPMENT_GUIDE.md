# WSL Development Guide for Nutrition AI

This guide documents the complete WSL setup and development workflow for the Nutrition AI project, including directory management and recent fixes.

## 📁 Directory Structure

The project exists in two potential locations:

1. **Windows Mount (Preferred)**: `/mnt/c/Users/Saif-/OneDrive/Desktop/development/na`
   - ✅ Syncs with OneDrive automatically
   - ✅ Accessible from Windows for Git commits
   - ✅ Preferred for development

2. **WSL Home**: `/home/saifalhail/development/na`
   - ⚠️ Does not sync with OneDrive
   - ⚠️ Can cause confusion with duplicate code
   - 🔧 Consider removing or symlinking

### Managing Dual Directories

```bash
# Option 1: Remove WSL home directory (Recommended)
rm -rf /home/saifalhail/development/na

# Option 2: Create symlink to Windows mount
ln -s /mnt/c/Users/Saif-/OneDrive/Desktop/development/na /home/saifalhail/development/na

# Option 3: Use sync script when needed
./scripts/sync-directories.sh
```

## 🚀 Quick Start

```bash
# Always work from Windows mount directory
cd /mnt/c/Users/Saif-/OneDrive/Desktop/development/na

# Quick start (Recommended)
./scripts/quick-start.sh

# Or start with safety checks
./scripts/start-expo-safe.sh
```

## 🔧 Recent Fixes (January 11, 2025)

### 1. Fixed MMKV Native Module Error

- **Problem**: `react-native-mmkv` doesn't work in Expo Go
- **Solution**: Completely removed MMKV, now using AsyncStorage
- **Files Changed**:
  - Removed: All MMKV-related files
  - Updated: `src/store/persist.ts`, `src/utils/storage.ts`
  - All storage now uses `@react-native-async-storage/async-storage`

### 2. Fixed Google Sign-In Native Module Error

- **Problem**: `@react-native-google-signin/google-signin` doesn't work in Expo Go
- **Solution**: Replaced with `expo-auth-session` for web-based OAuth
- **Files Changed**:
  - `src/components/auth/SocialLoginButton.tsx` - Complete rewrite
  - `src/screens/LoginScreen.tsx` - Added conditional rendering
  - `package.json` - Removed native package, added expo packages
  - `jest.setup.js` - Updated mocks

### 3. Fixed Path Issues in Scripts

- **Problem**: Scripts hardcoded to `/home/saifalhail/development/na`
- **Solution**: Created flexible path management
- **New Files**:
  - `scripts/common.sh` - Centralized configuration
  - `scripts/quick-start.sh` - One-command start
  - `scripts/validate-project.sh` - Project health check
- **Updated**: All existing scripts to use common.sh

## 📦 Current Dependencies

All dependencies are now Expo Go compatible:

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.1.2",
    "expo-auth-session": "^6.2.1",
    "expo-web-browser": "^14.2.0",
    "expo-crypto": "^14.1.5"
    // ... other Expo-compatible packages
  }
}
```

Removed packages:

- ❌ `react-native-mmkv`
- ❌ `@react-native-google-signin/google-signin`

## ⚙️ Environment Configuration

### Frontend .env

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_API_VERSION=v1

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here

# Environment
EXPO_PUBLIC_ENVIRONMENT=development

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=false  # Set to true to enable Google Sign-In
EXPO_PUBLIC_ENABLE_AI_ANALYSIS=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
```

## 🛠️ Development Workflow

### Starting Development

1. **Backend** (Django):

   ```bash
   cd backend
   source venv/bin/activate
   python manage.py runserver 0.0.0.0:8000
   ```

2. **Frontend** (Expo):

   ```bash
   cd frontend
   npx expo start --clear --tunnel
   ```

3. **Both Together**:
   ```bash
   ./scripts/dev-start.sh phone
   ```

### Common Commands

```bash
# Validate project setup
./scripts/validate-project.sh

# Clear all caches
./scripts/clear-metro-cache.sh

# Fix permissions issues
sudo chown -R $(whoami):$(whoami) .

# Check for native module issues
grep -r "react-native-mmkv\|@react-native-google-signin" src/
```

## 🐛 Troubleshooting

### Expo Go Errors

If you see native module errors:

1. **Clear phone app data**:
   - Android: Settings → Apps → Expo Go → Storage → Clear Data
   - iOS: Delete and reinstall Expo Go

2. **Clear all caches**:

   ```bash
   rm -rf .metro-cache .expo/* node_modules/.cache
   rm -rf /tmp/metro-* /tmp/haste-map-*
   rm -rf ~/.expo/native-modules-cache/*
   ```

3. **Ensure correct directory**:
   ```bash
   pwd  # Should show /mnt/c/Users/Saif-/OneDrive/Desktop/development/na
   ```

### WSL-Specific Issues

1. **Permission errors**:

   ```bash
   # Fix ownership
   sudo chown -R $(whoami):$(whoami) .

   # Fix permissions
   find . -type d -exec chmod 755 {} \;
   find . -type f -exec chmod 644 {} \;
   ```

2. **Path not found errors**:
   - Always use the Windows mount path
   - Run `source scripts/common.sh` to set correct paths

3. **Metro bundler issues**:

   ```bash
   # Kill all Metro processes
   pkill -f metro

   # Clear watchman
   watchman watch-del-all
   ```

## 📝 Script Reference

### Core Scripts

- **`scripts/common.sh`**: Shared configuration and functions
- **`scripts/quick-start.sh`**: Fast startup with minimal checks
- **`scripts/start-expo-safe.sh`**: Start with all safety checks
- **`scripts/validate-project.sh`**: Comprehensive project validation
- **`scripts/dev-start.sh`**: Start both backend and frontend
- **`scripts/sync-directories.sh`**: Sync between WSL paths

### Setup Scripts

- **`scripts/setup-everything.sh`**: Complete environment setup
- **`scripts/setup-backend.sh`**: Python/Django setup
- **`scripts/setup-network.sh`**: Network optimization

## 🔄 Git Workflow

Always commit from the Windows mount directory:

```bash
cd /mnt/c/Users/Saif-/OneDrive/Desktop/development/na
git add .
git commit -m "Your message"
git push
```

## 📱 Mobile Testing

1. **Start Expo**:

   ```bash
   ./scripts/quick-start.sh
   ```

2. **Scan QR code** with Expo Go app

3. **If errors persist**:
   - Clear Expo Go app data
   - Restart Metro bundler
   - Check `./scripts/validate-project.sh`

## 🐳 Docker (Future)

Docker configuration exists in `backend/` directory:

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`

Currently using WSL for development, Docker setup pending.

## 📋 Daily Checklist

Before starting development:

1. ✅ Check you're in correct directory
2. ✅ Pull latest changes: `git pull`
3. ✅ Run validation: `./scripts/validate-project.sh`
4. ✅ Start with: `./scripts/quick-start.sh`
5. ✅ Clear phone app if needed

## 🔗 Related Documentation

- [EXPO_GO_CHANGES.md](../EXPO_GO_CHANGES.md) - Detailed native module fixes
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - General development guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
