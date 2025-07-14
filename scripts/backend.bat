@echo off
REM Nutrition AI Backend - Windows Batch Script
REM Usage: backend.bat

echo.
echo Nutrition AI Backend (Windows Batch)
echo ====================================
echo.

REM Run PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -File "%~dp0backend.ps1" %*