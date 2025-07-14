@echo off
REM Batch script to create Django superuser for Windows
REM Update these values before running

REM User configuration - CHANGE THESE VALUES
set USERNAME=admin
set EMAIL=admin@nutritionai.com
set PASSWORD=your-secure-password-123

echo Creating Django Superuser for Nutrition AI...
echo Username: %USERNAME%
echo Email: %EMAIL%
echo.

REM Navigate to backend directory
cd /d "%~dp0\..\backend"

REM Check if virtual environment exists
if exist "venv_windows\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv_windows\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found. Please run backend setup first.
    pause
    exit /b 1
)

REM Set environment variables for non-interactive superuser creation
set DJANGO_SUPERUSER_USERNAME=%USERNAME%
set DJANGO_SUPERUSER_EMAIL=%EMAIL%
set DJANGO_SUPERUSER_PASSWORD=%PASSWORD%

echo Creating superuser...
python manage.py createsuperuser --noinput

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Superuser created successfully!
    echo You can now login at: http://127.0.0.1:8000/admin/
    echo Username: %USERNAME%
    echo Password: [the password you set above]
) else (
    echo.
    echo Failed to create superuser. The user might already exist.
    echo Try changing the username or deleting the existing user first.
)

REM Clean up environment variables
set DJANGO_SUPERUSER_USERNAME=
set DJANGO_SUPERUSER_EMAIL=
set DJANGO_SUPERUSER_PASSWORD=

echo.
pause