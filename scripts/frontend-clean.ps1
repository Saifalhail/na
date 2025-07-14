# Nutrition AI Frontend - Windows PowerShell Script
# Clean version without special characters

Write-Host "Nutrition AI Frontend (Windows)" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

# Get project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Navigate to frontend directory
$FrontendPath = Join-Path $ProjectRoot "frontend"
if (-not (Test-Path $FrontendPath)) {
    Write-Host "[ERROR] Frontend directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $FrontendPath

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "[INFO] Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Node.js version: $(node --version)" -ForegroundColor Green
Write-Host "[INFO] npm version: $(npm --version)" -ForegroundColor Green

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Green
    npm install
}

# Find backend URL
Write-Host "[INFO] Looking for backend server..." -ForegroundColor Green
$BackendIP = "127.0.0.1"

# Test if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "[SUCCESS] Found backend at: http://127.0.0.1:8000" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Backend not found. Start it with: .\scripts\run-backend.bat" -ForegroundColor Yellow
}

# Update .env file
Write-Host "[INFO] Updating .env file..." -ForegroundColor Green
@"
# API Configuration
EXPO_PUBLIC_API_URL=http://$BackendIP:8000
EXPO_PUBLIC_API_URL_ANDROID=http://$BackendIP:8000
EXPO_PUBLIC_API_URL_IOS=http://$BackendIP:8000
EXPO_PUBLIC_API_URL_PHYSICAL=http://$BackendIP:8000
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_ENABLE_DEMO_MODE=true
EXPO_PUBLIC_API_TIMEOUT=10000
EXPO_PUBLIC_CONNECTIVITY_TEST_TIMEOUT=5000
"@ | Out-File -FilePath ".env" -Encoding UTF8

# Clear cache
Write-Host "[INFO] Clearing Metro cache..." -ForegroundColor Green
Remove-Item -Path ".metro-cache", ".expo", "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[INFO] Starting Expo development server..." -ForegroundColor Green
Write-Host "[INFO] Backend API: http://$BackendIP:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mobile App Instructions:" -ForegroundColor Cyan
Write-Host "1. Install 'Expo Go' app on your phone" -ForegroundColor White
Write-Host "2. Make sure your phone is on the same WiFi network" -ForegroundColor White
Write-Host "3. Scan the QR code that appears below" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start Expo
npx expo start --clear