# PowerShell script to start frontend in Windows
Write-Host "Nutrition AI Frontend (Windows)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Navigate to frontend
Set-Location "$PSScriptRoot\..\frontend"

# Get WSL IP
$wslIp = (wsl hostname -I 2>$null) -split ' ' | Select-Object -First 1
if (-not $wslIp) { $wslIp = "172.25.29.233" }

# Check if node_modules exists
$nodeModulesExists = Test-Path node_modules
$needsSetup = $false
$forceClean = $false

if (-not $nodeModulesExists) {
    Write-Host "Node modules not found. Installation required." -ForegroundColor Yellow
    $needsSetup = $true
} else {
    # Check if we can access node_modules (permission check)
    try {
        $testPath = Join-Path node_modules ".bin" "eslint"
        if (Test-Path $testPath) {
            $acl = Get-Acl $testPath -ErrorAction Stop
            Write-Host "Node modules found and accessible." -ForegroundColor Green
        }
    } catch {
        Write-Host "Permission error detected. WSL node_modules found." -ForegroundColor Yellow
        Write-Host "Clean install required for Windows compatibility." -ForegroundColor Yellow
        $forceClean = $true
        $needsSetup = $true
    }
}

if ($needsSetup -or $forceClean) {
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    
    # Force remove with system commands if needed
    if (Test-Path node_modules) {
        Write-Host "Removing node_modules (this may take a moment)..." -ForegroundColor Yellow
        cmd /c "rmdir /s /q node_modules" 2>$null
        Start-Sleep -Seconds 2
    }
    
    Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .metro-cache -ErrorAction SilentlyContinue
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
    
    Write-Host "Installing fresh dependencies for Windows..." -ForegroundColor Yellow
    npm install --force
}

# Update .env with WSL backend
Write-Host "Updating .env with WSL backend IP: $wslIp" -ForegroundColor Green
@"
# API Configuration
EXPO_PUBLIC_API_URL=http://${wslIp}:8000
EXPO_PUBLIC_API_VERSION=v1

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here

# Environment
EXPO_PUBLIC_ENVIRONMENT=development

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=true
EXPO_PUBLIC_ENABLE_AI_ANALYSIS=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_DEMO_MODE=true
"@ | Out-File -FilePath .env -Encoding UTF8

# Menu
Write-Host ""
Write-Host "How would you like to start?" -ForegroundColor Yellow
Write-Host "1) Android Emulator/Device"
Write-Host "2) Web Browser"
Write-Host "3) Expo Go (QR Code)"
Write-Host "4) Clear cache and start"
Write-Host "5) Reinstall dependencies (clean install)"
Write-Host ""

$choice = Read-Host "Select option (1-5)"

switch ($choice) {
    "1" {
        Write-Host "Starting for Android..." -ForegroundColor Green
        npx expo start --android
    }
    "2" {
        Write-Host "Starting web version..." -ForegroundColor Green
        npx expo start --web
    }
    "3" {
        Write-Host "Starting with QR code..." -ForegroundColor Green
        npx expo start
    }
    "4" {
        Write-Host "Clearing cache and starting..." -ForegroundColor Green
        npx expo start -c
    }
    "5" {
        Write-Host "Performing clean install..." -ForegroundColor Yellow
        
        # Force remove with system commands
        if (Test-Path node_modules) {
            Write-Host "Removing node_modules (this may take a moment)..." -ForegroundColor Yellow
            cmd /c "rmdir /s /q node_modules" 2>$null
            Start-Sleep -Seconds 2
        }
        
        Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force .metro-cache -ErrorAction SilentlyContinue
        Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
        
        Write-Host "Installing fresh dependencies..." -ForegroundColor Yellow
        npm install --force
        
        Write-Host "Dependencies installed. Starting Expo..." -ForegroundColor Green
        npx expo start
    }
    default {
        Write-Host "Invalid option!" -ForegroundColor Red
        exit 1
    }
}