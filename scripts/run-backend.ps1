# Quick Backend Runner - When you already have everything set up
# Usage: From backend directory with venv activated: .\run-backend.ps1

$Host.UI.RawUI.ForegroundColor = "White"

Write-Host "🍎 Nutrition AI Backend - Quick Start" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "manage.py")) {
    Write-Host "[ERROR] Not in backend directory! Run this from the backend folder." -ForegroundColor Red
    exit 1
}

# Check if virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "[WARN] Virtual environment not activated!" -ForegroundColor Yellow
    Write-Host "[INFO] Trying to activate it..." -ForegroundColor Green
    
    if (Test-Path "venv\Scripts\Activate.ps1") {
        & ".\venv\Scripts\Activate.ps1"
    } else {
        Write-Host "[ERROR] Virtual environment not found!" -ForegroundColor Red
        exit 1
    }
}

# Run migrations if needed
Write-Host "[INFO] Checking database..." -ForegroundColor Green
python manage.py migrate --noinput 2>$null

# Create demo user if needed
python manage.py create_demo_user 2>$null

# Get local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "169.254.*" -and 
    $_.IPAddress -ne "127.0.0.1" -and
    $_.InterfaceAlias -notlike "*Loopback*"
} | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "✅ Starting Django server..." -ForegroundColor Green
Write-Host "📱 Access URLs:" -ForegroundColor Cyan
Write-Host "   Local: http://127.0.0.1:8000" -ForegroundColor White
if ($localIP) {
    Write-Host "   Network: http://${localIP}:8000" -ForegroundColor White
}
Write-Host "   Admin: http://127.0.0.1:8000/admin" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Demo credentials:" -ForegroundColor Cyan
Write-Host "   Email: demo@nutritionai.com" -ForegroundColor White
Write-Host "   Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the server
python manage.py runserver 0.0.0.0:8000