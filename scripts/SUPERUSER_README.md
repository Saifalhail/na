# Django Superuser Creation Scripts

This directory contains scripts to help you create a Django superuser for the Nutrition AI admin panel.

## Available Scripts

1. **create-superuser.sh** (Linux/WSL)
2. **create-superuser.ps1** (Windows PowerShell)
3. **create-superuser.bat** (Windows Command Prompt)
4. **create_superuser.py** (Cross-platform Python)

## Usage Instructions

### 1. Update Credentials

Before running any script, open it and update these values:
- **USERNAME**: Default is "admin"
- **EMAIL**: Default is "admin@nutritionai.com"
- **PASSWORD**: Default is "your-secure-password-123" (CHANGE THIS!)

### 2. Running the Scripts

#### On Windows (PowerShell):
```powershell
cd scripts
.\create-superuser.ps1
```

#### On Windows (Command Prompt):
```cmd
cd scripts
create-superuser.bat
```

#### On Linux/WSL:
```bash
cd scripts
./create-superuser.sh
```

#### Using Python (Any Platform):
```bash
# Default values from script
python scripts/create_superuser.py

# Or with custom values
python scripts/create_superuser.py myusername myemail@example.com mypassword123
```

## Important Notes

1. **Backend must be set up first**: Make sure you have:
   - Virtual environment created and activated
   - Dependencies installed (`pip install -r requirements.txt`)
   - Database migrations run (`python manage.py migrate`)

2. **Script Features**:
   - Creates superuser with admin privileges
   - Automatically creates user profile with premium access
   - Handles existing users (offers to update)
   - Non-interactive (no prompts during creation)

3. **After Creation**:
   - Login at: http://127.0.0.1:8000/admin/
   - Use the username and password you configured

## Troubleshooting

### "User already exists" error:
- Change the username in the script, or
- Use the Python script which offers to update existing users

### "Virtual environment not found" error:
- Make sure you've run the backend setup first
- Check that you're in the correct directory

### "Module not found" errors:
- Activate your virtual environment first
- Install requirements: `pip install -r backend/requirements.txt`

## Security Note

⚠️ **IMPORTANT**: Never commit these scripts with real passwords! Always use strong, unique passwords for production environments.