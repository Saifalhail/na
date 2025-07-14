@echo off
REM Nutrition AI - Unified Startup Script for Windows
REM Usage: start.bat [backend|frontend|clean|help]

echo.
echo Nutrition AI Startup (Windows Batch)
echo ====================================
echo.

REM Run PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*