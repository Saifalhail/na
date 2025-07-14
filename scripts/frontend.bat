@echo off
REM Nutrition AI Frontend - Windows Batch Script
REM Usage: frontend.bat

echo.
echo Nutrition AI Frontend (Windows Batch)
echo =====================================
echo.

REM Run PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -File "%~dp0frontend.ps1" %*