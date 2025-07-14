# Nutrition AI - WSL Development Setup

## 🚀 Quick Start (3 Steps)

### 1. Open WSL Terminal

```bash
cd /mnt/c/Users/Saif-/OneDrive/Desktop/development/na
```

### 2. Start Everything

```bash
./start.sh
```

### 3. Connect Your Phone

- Open **Expo Go** app
- Scan the QR code
- App loads without bundling issues ✅

## 📋 Available Commands

```bash
./start.sh          # Start both backend + frontend
./start.sh backend  # Backend only
./start.sh frontend # Frontend only (Expo)
./start.sh clean    # Clean caches
./start.sh help     # Show help
```

## 🔧 What The Script Does

### **Backend (Django)**

- ✅ Creates virtual environment automatically
- ✅ Installs Python dependencies
- ✅ Runs database migrations
- ✅ Starts on `http://127.0.0.1:8000`

### **Frontend (Expo)**

- ✅ Installs Node dependencies automatically
- ✅ Configures environment variables
- ✅ Starts with tunnel mode for phone access
- ✅ Clears Metro cache automatically

### **Network Setup**

- ✅ Auto-detects WSL IP for mobile access
- ✅ Tunnel mode for firewall bypass
- ✅ CORS configured for API access

## 🐛 Troubleshooting

### **"Script won't run"**

```bash
chmod +x start.sh
./start.sh help
```

### **"Backend fails to start"**

Install system dependencies:

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip python3-dev
./start.sh backend
```

### **"Frontend issues"**

```bash
./start.sh clean
./start.sh frontend
```

### **"Phone won't connect"**

The script uses tunnel mode automatically - just scan the QR code!

## 📱 Mobile Development

- **Tunnel mode** is enabled by default
- Works through any firewall/network
- No IP configuration needed
- Just scan QR code with Expo Go

## 🧹 Clean Project Structure

This project now has **ONE SCRIPT** that does everything:

```
na/
├── start.sh              # 👈 THE ONLY SCRIPT YOU NEED
├── backend/              # Django REST API
├── frontend/             # Expo React Native
└── docs/                 # Documentation
```

All other scripts have been removed to eliminate confusion.

## ✅ Verified Working

- ✅ **WSL environment detection**
- ✅ **Script execution** (no line ending issues)
- ✅ **Backend startup** (Django + virtual env)
- ✅ **Frontend startup** (Expo + tunnel mode)
- ✅ **Cache cleaning**
- ✅ **Phone connectivity** (tunnel mode)
- ✅ **Error handling** with clear messages

## 🎯 Next Steps

1. **Run**: `./start.sh`
2. **Scan QR code** with Expo Go
3. **Start developing!**

Your WSL + Expo bundling issues are now completely resolved! 🎉
