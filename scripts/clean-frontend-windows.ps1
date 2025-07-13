# Quick cleanup script for Windows frontend
Write-Host "Cleaning frontend for Windows..." -ForegroundColor Yellow

Set-Location "$PSScriptRoot\..\frontend"

Write-Host "Removing WSL artifacts..." -ForegroundColor Yellow

# Force remove using Windows commands
cmd /c "rmdir /s /q node_modules" 2>$null
cmd /c "rmdir /s /q .expo" 2>$null
cmd /c "rmdir /s /q .metro-cache" 2>$null
cmd /c "del /f /q package-lock.json" 2>$null

Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "Now run: .\scripts\frontend-windows.ps1" -ForegroundColor Cyan