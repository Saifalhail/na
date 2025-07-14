# PowerShell script to create Django superuser for Windows
# Update these values before running
USERNAME="admin"
EMAIL="admin@admin.com"
PASSWORD="admin123"

Write-Host "Creating Django Superuser for Nutrition AI..." -ForegroundColor Green
Write-Host "Username: $USERNAME" -ForegroundColor Yellow
Write-Host "Email: $EMAIL" -ForegroundColor Yellow

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\..\backend"

# Check if virtual environment exists
if (Test-Path "venv_windows\Scripts\activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & .\venv_windows\Scripts\Activate.ps1
} else {
    Write-Host "Virtual environment not found. Please run backend setup first." -ForegroundColor Red
    exit 1
}

# Create superuser using environment variables to avoid interactive prompts
$env:DJANGO_SUPERUSER_USERNAME = $USERNAME
$env:DJANGO_SUPERUSER_EMAIL = $EMAIL  
$env:DJANGO_SUPERUSER_PASSWORD = $PASSWORD

Write-Host "Creating superuser..." -ForegroundColor Cyan

# Run the Django command
python manage.py createsuperuser --noinput

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuperuser created successfully!" -ForegroundColor Green
    Write-Host "You can now login at: http://127.0.0.1:8000/admin/" -ForegroundColor Green
    Write-Host "Username: $USERNAME" -ForegroundColor Yellow
    Write-Host "Password: [the password you set above]" -ForegroundColor Yellow
} else {
    Write-Host "`nFailed to create superuser. The user might already exist." -ForegroundColor Red
    Write-Host "Try changing the username or deleting the existing user first." -ForegroundColor Yellow
}

# Clean up environment variables
Remove-Item Env:\DJANGO_SUPERUSER_USERNAME -ErrorAction SilentlyContinue
Remove-Item Env:\DJANGO_SUPERUSER_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:\DJANGO_SUPERUSER_PASSWORD -ErrorAction SilentlyContinue