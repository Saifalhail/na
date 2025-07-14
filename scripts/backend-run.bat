@echo off
echo.
echo Nutrition AI Backend
echo ===================
echo.

cd /d "%~dp0\..\backend"

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo.
    echo Starting Django server...
    echo Access at: http://127.0.0.1:8000
    echo.
    python manage.py runserver 0.0.0.0:8000
) else (
    echo ERROR: Virtual environment not found!
    echo Run from project root: cd backend
    echo Then: python -m venv venv
    echo Then: venv\Scripts\activate
    echo Then: pip install -r requirements.txt
    pause
)