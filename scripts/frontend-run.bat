@echo off
echo.
echo Nutrition AI Frontend
echo ====================
echo.

cd /d "%~dp0\..\frontend"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Clearing cache...
rd /s /q ".metro-cache" 2>nul
rd /s /q ".expo" 2>nul

echo.
echo Starting Expo...
echo.
echo Instructions:
echo 1. Install Expo Go app on your phone
echo 2. Scan the QR code that appears
echo.

call npx expo start --clear