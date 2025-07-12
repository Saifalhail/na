# 🔧 Troubleshooting Guide - Nutrition AI

> **Last Updated**: January 11, 2025  
> **Recent Fixes**: MMKV and Google Sign-In native module errors resolved

**Solutions for common development issues and error messages.**

## 🚨 Most Common Issues (Fixed January 11, 2025)

### ❌ "Failed to create a new MMKV instance"

**Symptoms:**
```
Error: Failed to create a new MMKV instance: The native MMKV Module could not be found.
```

**Root Cause:** MMKV is a native module that doesn't work in Expo Go

**Solution:** Already fixed! The project now uses AsyncStorage instead.

If you still see this error:
1. Clear Expo Go app data on your phone
2. Use the correct directory:
   ```bash
   cd /mnt/c/Users/Saif-/OneDrive/Desktop/development/na
   ./scripts/quick-start.sh
   ```

### ❌ "RNGoogleSignin could not be found"

**Symptoms:**
```
Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found
```

**Root Cause:** Native Google Sign-In module doesn't work in Expo Go

**Solution:** Already fixed! Now using `expo-auth-session` for web-based OAuth.

If you still see this error:
1. Clear Expo Go app data on your phone
2. Make sure you're using the updated code
3. Run: `npm install` to get the new dependencies

## 📁 Directory Issues

### ❌ Dual Directory Confusion

**Symptoms:**
- Changes not reflecting
- Old errors persisting
- Different behavior in different terminals

**Root Cause:** Project exists in two locations:
- `/mnt/c/Users/Saif-/OneDrive/Desktop/development/na` (Windows mount)
- `/home/saifalhail/development/na` (WSL home)

**Solution:**
```bash
# Always use Windows mount
cd /mnt/c/Users/Saif-/OneDrive/Desktop/development/na

# Remove WSL home copy
rm -rf ~/development/na

# Or create symlink
ln -s /mnt/c/Users/Saif-/OneDrive/Desktop/development/na ~/development/na
```

## 🔧 Development Environment Issues

### ❌ "venv/bin/activate: No such file or directory"

**Symptoms:**
```bash
./setup-backend.sh: line 56: venv/bin/activate: No such file or directory
```

**Root Cause:** Windows virtual environment copied to WSL (has `Scripts/` instead of `bin/`)

**Solution:**
```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### ❌ Permission Errors in WSL

**Symptoms:**
- `Permission denied` errors
- Can't create or modify files
- Scripts won't execute

**Solution:**
```bash
# Fix ownership
sudo chown -R $(whoami):$(whoami) .

# Fix file permissions
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Make scripts executable
chmod +x scripts/*.sh
```

## 📱 Expo/Metro Issues

### ❌ Metro Bundler Cache Issues

**Symptoms:**
- Old code running
- Changes not reflecting
- Random module errors

**Solution:**
```bash
# Use the cache clearing script
./scripts/clear-metro-cache.sh

# Or manually:
rm -rf .metro-cache
rm -rf .expo/*
rm -rf node_modules/.cache
rm -rf /tmp/metro-*
rm -rf ~/.expo/native-modules-cache/*
```

### ❌ "Module not found" Errors

**Common missing modules and fixes:**

```bash
# General fix
rm -rf node_modules package-lock.json
npm install

# If specific module missing
npm install [module-name]
```

### ❌ Expo Go Connection Issues

**Symptoms:**
- Can't scan QR code
- "Network response timed out"
- Connection refused

**Solution:**
```bash
# Always use tunnel mode
npx expo start --clear --tunnel

# Or use the script
./scripts/quick-start.sh
```

## 🐍 Python/Django Issues

### ❌ ImportError in Django

**Symptoms:**
- `ModuleNotFoundError`
- Import errors when running Django

**Solution:**
```bash
cd backend
source venv/bin/activate  # Make sure venv is activated
pip install -r requirements.txt
python manage.py migrate
```

### ❌ Database Errors

**Solution:**
```bash
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser  # If needed
```

## 🌐 Network Issues

### ❌ API Connection Failed

**Symptoms:**
- Frontend can't reach backend
- "Network request failed"

**Solution:**
1. Check backend is running:
   ```bash
   cd backend
   python manage.py runserver 0.0.0.0:8000
   ```

2. Update frontend `.env`:
   ```bash
   EXPO_PUBLIC_API_URL=http://[YOUR-WSL-IP]:8000
   ```

3. Get WSL IP:
   ```bash
   ip addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1
   ```

## 🔍 Validation & Debugging

### Run Complete Validation
```bash
./scripts/validate-project.sh
```

### Check for Native Modules
```bash
# In frontend directory
grep -r "react-native-mmkv\|@react-native-google-signin" src/
```

### View Running Processes
```bash
# Check Expo/Metro
ps aux | grep -E "expo|metro" | grep -v grep

# Kill all Expo processes
pkill -f expo
```

## 💡 Quick Fixes Checklist

When something goes wrong, try these in order:

1. ✅ **Correct Directory?**
   ```bash
   pwd  # Should be /mnt/c/Users/Saif-/OneDrive/Desktop/development/na
   ```

2. ✅ **Clear Caches**
   ```bash
   ./scripts/clear-metro-cache.sh
   ```

3. ✅ **Clear Phone App**
   - Settings → Apps → Expo Go → Clear Data

4. ✅ **Reinstall Dependencies**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

5. ✅ **Validate Setup**
   ```bash
   ./scripts/validate-project.sh
   ```

6. ✅ **Fresh Start**
   ```bash
   ./scripts/quick-start.sh
   ```

## 📞 Getting Help

If issues persist:

1. Check the [Session Summary](../SESSION_SUMMARY_2025_01_11.md) for recent fixes
2. Review [WSL Development Guide](./WSL_DEVELOPMENT_GUIDE.md)
3. Look at [EXPO_GO_CHANGES.md](../../EXPO_GO_CHANGES.md) for native module solutions

## 🎯 Prevention Tips

1. **Always work from Windows mount path**
2. **Clear Expo Go app regularly**
3. **Run validation before starting**
4. **Keep dependencies updated**
5. **Commit working states frequently**

---

**Remember**: Most issues are now fixed. If you see old errors, you're likely in the wrong directory or have cached data!