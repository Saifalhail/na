# 🍎 Nutrition AI - Quick Start Guide

## 🚀 Quick Start Options

### Option 1: Full Stack (WSL/Linux/Mac)
```bash
./start.sh
```
This starts both backend and frontend together.

### Option 2: Hybrid Mode (Recommended for Windows)
Best for Android development and Windows users.

**Step 1: Start Backend in WSL**
```bash
# In WSL terminal
cd /mnt/c/Users/[username]/Desktop/na
./scripts/backend-wsl.sh
```

**Step 2: Start Frontend in PowerShell**
```powershell
# In PowerShell (as Administrator first time)
cd C:\Users\[username]\Desktop\na

# First time only - allow scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Start frontend
.\scripts\frontend-windows.ps1
```

## 📱 Access Points

- **Backend API**: http://localhost:8000
- **Frontend Web**: http://localhost:8081
- **Admin Panel**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/docs

## 🔑 Demo Login

```
Email: demo@example.com
Password: demo123
```

## 📁 Project Scripts

```
na/
├── start.sh                    # Full stack starter (WSL/Linux/Mac)
└── scripts/
    ├── backend-wsl.sh         # Backend for WSL
    └── frontend-windows.ps1   # Frontend for Windows PowerShell
```

## ⚡ Common Commands

### Using Main Script
```bash
# Start everything
./start.sh

# Backend only
./start.sh backend

# Frontend only  
./start.sh frontend

# Clean restart
./start.sh clean
```

### Hybrid Mode Commands
```bash
# Backend (WSL)
./scripts/backend-wsl.sh

# Frontend (PowerShell)
.\scripts\frontend-windows.ps1
```

## 🛠️ First Time Setup

### Prerequisites
- Python 3.8+ (WSL/Linux)
- Node.js 18+ (Windows)
- Git
- Android Studio (optional, for emulator)

### Environment Setup
The scripts automatically:
- Create virtual environment
- Install dependencies
- Setup database
- Create demo user
- Configure API connections

## 🆘 Troubleshooting

### Permission Errors (Windows)
```powershell
# Remove WSL artifacts
Remove-Item -Recurse -Force frontend\node_modules
# Re-run frontend script
.\scripts\frontend-windows.ps1
```

### Backend Connection Failed
1. Check WSL is running: `wsl --status`
2. Verify backend is running on port 8000
3. Frontend script auto-detects WSL IP

### Port Already in Use
```bash
# WSL
pkill -f "manage.py runserver"

# PowerShell
netstat -ano | findstr :8081
taskkill /PID [PID] /F
```

### Metro Bundler Issues
```powershell
# Clear cache
npx expo start -c
```

## 💡 Development Tips

1. **Hybrid Mode Benefits**:
   - Android emulator works properly
   - No WSL/Windows permission conflicts
   - Better performance

2. **Keep Terminals Open**:
   - WSL terminal for backend
   - PowerShell for frontend
   - Both support hot reload

3. **Mobile Testing**:
   - Use Expo Go app for quick testing
   - Android emulator for full features
   - Frontend script handles IP configuration

## 📚 Next Steps

- [API Documentation](docs/api/API_REFERENCE.md)
- [Development Guide](docs/guides/DEVELOPMENT_GUIDE.md)
- [Testing Guide](docs/guides/TESTING_GUIDE.md)
- [Production Deployment](docs/guides/PRODUCTION_DEPLOYMENT.md)