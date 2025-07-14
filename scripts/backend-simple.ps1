# Simplified Backend Script for Windows
param([string]$Command = "")

Write-Host "Nutrition AI Backend (Simplified)" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Get to backend directory
$BackendPath = Join-Path (Split-Path -Parent $PSScriptRoot) "backend"
Set-Location $BackendPath
Write-Host "[INFO] Working directory: $BackendPath" -ForegroundColor Green

# Check if venv exists and activate it
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "[INFO] Activating existing virtual environment..." -ForegroundColor Green
    & ".\venv\Scripts\Activate.ps1"
} else {
    Write-Host "[WARN] No virtual environment found!" -ForegroundColor Yellow
    Write-Host "[INFO] Creating virtual environment..." -ForegroundColor Green
    python -m venv venv
    & ".\venv\Scripts\Activate.ps1"
    
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Green
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
}

# Quick check for Django
$djangoCheck = python -c "import django; print('Django OK')" 2>$null
if (-not $djangoCheck) {
    Write-Host "[INFO] Installing requirements..." -ForegroundColor Green
    python -m pip install -r requirements.txt
}

# Run migrations
Write-Host "[INFO] Running migrations..." -ForegroundColor Green
python manage.py migrate --noinput

# Create demo user
python manage.py create_demo_user 2>$null

# Get IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "169.254.*" -and 
    $_.IPAddress -ne "127.0.0.1" -and
    $_.InterfaceAlias -notlike "*Loopback*"
} | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "Starting server..." -ForegroundColor Green
Write-Host "Access at:" -ForegroundColor Cyan
Write-Host "   http://127.0.0.1:8000" -ForegroundColor White
if ($localIP) {
    Write-Host "   http://$($localIP):8000" -ForegroundColor White
}
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start server
python manage.py runserver 0.0.0.0:8000