# Nutrition AI - Quick Start Guide

## 🚀 Starting the Application

Just run:
```bash
./start.sh
```

This will start both the backend (Django) and frontend (React Native Expo).

## 📱 Access Points

- **Backend API**: http://127.0.0.1:8000
- **Frontend**: Scan the QR code with Expo Go app on your phone

## 🛠️ Common Commands

```bash
# Start everything (default)
./start.sh

# Quick backend restart (for development)
./start.sh backend-fast

# Start only backend
./start.sh backend

# Start only frontend  
./start.sh frontend

# Clean up and stop everything
./start.sh clean

# Show help
./start.sh help
```

## 🔑 Demo Login

- **Email**: demo@nutritionai.com
- **Password**: demo123456

## ⚡ Tips for Development

1. Use `./start.sh backend-fast` for quick backend restarts during development
2. If something goes wrong, run `./start.sh clean` to clean up
3. The script automatically handles all dependencies and setup

## 🐛 Troubleshooting

If the app is slow to start:
- First run takes longer as it installs dependencies
- Subsequent runs should be much faster
- Use `backend-fast` mode to skip dependency checks

If you encounter errors:
1. Run `./start.sh clean`
2. Try starting again with `./start.sh`
3. Check that you have Python 3, Node.js, and npm installed