# Nutrition AI - Unified Startup Script for Windows
# Usage: .\start.ps1 [backend|frontend|clean|help]

param(
    [string]$Command = "start"
)

# Colors for output
$Host.UI.RawUI.ForegroundColor = "White"

function Write-Info { Write-Host "[INFO]" -ForegroundColor Green -NoNewline; Write-Host " $args" }
function Write-Error { Write-Host "[ERROR]" -ForegroundColor Red -NoNewline; Write-Host " $args" }
function Write-Warn { Write-Host "[WARN]" -ForegroundColor Yellow -NoNewline; Write-Host " $args" }
function Write-Success { Write-Host "[SUCCESS]" -ForegroundColor Cyan -NoNewline; Write-Host " $args" }

Write-Host "🍎 Nutrition AI - Cross-Platform Startup (Windows)" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Get project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Platform detection
Write-Info "Detected platform: Windows PowerShell"

# Check dependencies
function Test-Dependencies {
    $pythonFound = $false
    $nodeFound = $false
    
    # Check for Python
    $pythonCmds = @("python", "python3", "py")
    foreach ($cmd in $pythonCmds) {
        if (Get-Command $cmd -ErrorAction SilentlyContinue) {
            $pythonFound = $true
            break
        }
    }
    
    # Check for Node.js
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeFound = $true
    }
    
    if (-not $pythonFound -or -not $nodeFound) {
        Write-Error "Missing dependencies!"
        if (-not $pythonFound) { Write-Error "  ❌ Python 3.x not found" }
        if (-not $nodeFound) { Write-Error "  ❌ Node.js not found" }
        Write-Host ""
        Write-Info "Quick install:"
        Write-Info "  Python: https://python.org/downloads/"
        Write-Info "  Node.js: https://nodejs.org/"
        return $false
    }
    
    return $true
}

# Kill existing processes
function Stop-AllProcesses {
    Write-Info "Stopping existing processes..."
    
    # Stop Python processes
    Get-Process -Name "python*" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*manage.py*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Stop Node processes
    Get-Process -Name "node*" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*expo*" -or $_.CommandLine -like "*metro*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Kill ports
    $ports = @(8000, 8081, 19000, 19001, 19002)
    foreach ($port in $ports) {
        $tcpConnections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($conn in $tcpConnections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    
    Start-Sleep -Seconds 1
}

# Clean caches
function Clear-AllCaches {
    Write-Info "Cleaning caches..."
    
    # Backend caches
    Get-ChildItem -Path . -Include "*.pyc", "__pycache__" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse
    Remove-Item -Path "backend\.pytest_cache", "backend\htmlcov" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Frontend caches
    Remove-Item -Path "frontend\.metro-cache", "frontend\.expo", "frontend\node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Clear saved IPs
    Remove-Item -Path ".backend_ip" -Force -ErrorAction SilentlyContinue
    
    Write-Success "✅ Caches cleaned"
}

# Check project structure
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Error "Backend or frontend directory missing!"
    Write-Error "Make sure you're in the project root directory"
    exit 1
}

# Start backend wrapper
function Start-Backend {
    Write-Info "Starting backend..."
    $backendScript = Join-Path $PSScriptRoot "backend.ps1"
    if (Test-Path $backendScript) {
        & $backendScript
    } else {
        Write-Error "backend.ps1 not found!"
        exit 1
    }
}

# Start frontend wrapper
function Start-Frontend {
    Write-Info "Starting frontend..."
    $frontendScript = Join-Path $PSScriptRoot "frontend.ps1"
    if (Test-Path $frontendScript) {
        & $frontendScript
    } else {
        Write-Error "frontend.ps1 not found!"
        exit 1
    }
}

# Start both services
function Start-All {
    Write-Info "🚀 Starting Nutrition AI (Backend + Frontend)..."
    
    # Start backend in new window
    Write-Info "Starting backend service in new window..."
    $backendScript = Join-Path $PSScriptRoot "backend.ps1"
    Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$backendScript`"" -WorkingDirectory $ProjectRoot
    
    # Wait for backend to be ready
    Write-Info "Waiting for backend to start..."
    Start-Sleep -Seconds 5
    
    # Check if backend is responding
    $backendReady = $false
    for ($i = 0; $i -lt 10; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health/" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $backendReady = $true
                break
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }
    
    if (-not $backendReady) {
        Write-Warn "Backend may not be fully started yet"
    }
    
    # Start frontend in new window
    Write-Info "Starting frontend service in new window..."
    $frontendScript = Join-Path $PSScriptRoot "frontend.ps1"
    Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$frontendScript`"" -WorkingDirectory $ProjectRoot
    
    Write-Host ""
    Write-Success "🎉 Nutrition AI is starting!"
    Write-Info "📱 Backend: http://127.0.0.1:8000"
    Write-Info "📱 Frontend: Check the new window for QR code"
    Write-Info "Close both PowerShell windows to stop the services"
}

# Handle commands
switch ($Command.ToLower()) {
    "backend" {
        Stop-AllProcesses
        if (Test-Dependencies) {
            Start-Backend
        } else {
            exit 1
        }
    }
    
    "frontend" {
        Stop-AllProcesses
        if (Test-Dependencies) {
            Start-Frontend
        } else {
            exit 1
        }
    }
    
    "clean" {
        Stop-AllProcesses
        Clear-AllCaches
        Write-Success "🧹 Cleanup complete!"
    }
    
    { $_ -in "help", "--help", "-h", "/?" } {
        Write-Host "🍎 Nutrition AI Startup Script" -ForegroundColor Green
        Write-Host ""
        Write-Host "Usage: .\start.ps1 [command]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  (no command)  Start entire app (backend + frontend)"
        Write-Host "  backend       Start only Django backend server"
        Write-Host "  frontend      Start only Expo React Native app"
        Write-Host "  clean         Stop all processes and clean caches"
        Write-Host "  help          Show this help message"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\start.ps1            # Start everything"
        Write-Host "  .\start.ps1 backend    # Start backend only"
        Write-Host "  .\start.ps1 frontend   # Start frontend only"
        Write-Host "  .\start.ps1 clean      # Clean up and stop everything"
    }
    
    default {
        Stop-AllProcesses
        if (Test-Dependencies) {
            Start-All
        } else {
            exit 1
        }
    }
}