@echo off
echo.
echo Nutrition AI Backend
echo ===================
echo.

cd /d "%~dp0\..\backend"

if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing dependencies...
    python -m pip install -r requirements.txt
)

echo.
echo Running migrations...
python manage.py migrate --noinput

echo.
echo Starting server...
echo Access at: http://127.0.0.1:8000
echo.
echo Press Ctrl+C to stop
echo.

python manage.py runserver 0.0.0.0:8000