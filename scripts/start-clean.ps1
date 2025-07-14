# Nutrition AI - Clean Startup Script for Windows
param([string]$Command = "start")

Write-Host "Nutrition AI Startup (Windows)" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Check project structure
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "[ERROR] Backend or frontend directory missing!" -ForegroundColor Red
    exit 1
}

function Start-Backend {
    Write-Host "[INFO] Starting backend in new window..." -ForegroundColor Green
    Start-Process cmd -ArgumentList "/c", "cd backend && venv\Scripts\activate.bat && python manage.py runserver 0.0.0.0:8000"
}

function Start-Frontend {
    Write-Host "[INFO] Starting frontend in new window..." -ForegroundColor Green
    Start-Process cmd -ArgumentList "/c", "cd frontend && npx expo start --clear"
}

switch ($Command.ToLower()) {
    "backend" {
        Start-Backend
        Write-Host "[INFO] Backend starting in new window" -ForegroundColor Green
    }
    
    "frontend" {
        Start-Frontend
        Write-Host "[INFO] Frontend starting in new window" -ForegroundColor Green
    }
    
    "help" {
        Write-Host "Usage: .\start-clean.ps1 [command]" -ForegroundColor Cyan
        Write-Host "Commands:" -ForegroundColor Cyan
        Write-Host "  (no command)  Start entire app" -ForegroundColor White
        Write-Host "  backend       Start only backend" -ForegroundColor White
        Write-Host "  frontend      Start only frontend" -ForegroundColor White
        Write-Host "  help          Show this help" -ForegroundColor White
    }
    
    default {
        Write-Host "[INFO] Starting full application..." -ForegroundColor Green
        Start-Backend
        Start-Sleep -Seconds 3
        Start-Frontend
        Write-Host ""
        Write-Host "[SUCCESS] Nutrition AI is starting!" -ForegroundColor Green
        Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor Cyan
        Write-Host "Frontend: Check new window for QR code" -ForegroundColor Cyan
    }
}