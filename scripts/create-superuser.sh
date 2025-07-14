#!/bin/bash
# Bash script to create Django superuser for Linux/WSL
# Update these values before running

# User configuration - CHANGE THESE VALUES
USERNAME="admin"
EMAIL="admin@admin.com"
PASSWORD="admin123"
FIRST_NAME="Admin"
LAST_NAME="User"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating Django Superuser for Nutrition AI...${NC}"
echo -e "${YELLOW}Username: $USERNAME${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/../backend"

# Navigate to backend directory
cd "$BACKEND_DIR" || {
    echo -e "${RED}Failed to navigate to backend directory${NC}"
    exit 1
}

# Check if virtual environment exists and activate it
if [ -d "venv_linux" ]; then
    echo -e "${CYAN}Activating Linux virtual environment...${NC}"
    source venv_linux/bin/activate
elif [ -d "venv" ]; then
    echo -e "${CYAN}Activating virtual environment...${NC}"
    source venv/bin/activate
else
    echo -e "${RED}Virtual environment not found. Please run backend setup first.${NC}"
    exit 1
fi

# Export environment variables for non-interactive superuser creation
export DJANGO_SUPERUSER_USERNAME="$USERNAME"
export DJANGO_SUPERUSER_EMAIL="$EMAIL"
export DJANGO_SUPERUSER_PASSWORD="$PASSWORD"
export DJANGO_SUPERUSER_FIRST_NAME="$FIRST_NAME"
export DJANGO_SUPERUSER_LAST_NAME="$LAST_NAME"

echo -e "${CYAN}Creating superuser...${NC}"

# Run the Django command
python manage.py createsuperuser --noinput --first_name="$FIRST_NAME" --last_name="$LAST_NAME"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Superuser created successfully!${NC}"
    echo -e "${GREEN}You can now login at: http://127.0.0.1:8000/admin/${NC}"
    echo -e "${YELLOW}Username: $USERNAME${NC}"
    echo -e "${YELLOW}Password: [the password you set above]${NC}"
else
    echo -e "\n${RED}Failed to create superuser. The user might already exist.${NC}"
    echo -e "${YELLOW}Try changing the username or deleting the existing user first.${NC}"
    
    # Offer to delete existing user
    echo -e "\n${YELLOW}Would you like to delete the existing user and create a new one? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${CYAN}Attempting to delete existing user...${NC}"
        python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
try:
    user = User.objects.get(username='$USERNAME')
    user.delete()
    print("User deleted successfully")
except User.DoesNotExist:
    print("User does not exist")
EOF
        # Try creating again
        python manage.py createsuperuser --noinput --first_name="$FIRST_NAME" --last_name="$LAST_NAME"
        if [ $? -eq 0 ]; then
            echo -e "\n${GREEN}Superuser created successfully after deletion!${NC}"
        else
            echo -e "\n${RED}Still failed to create superuser. Please check the error messages.${NC}"
        fi
    fi
fi

# Clean up environment variables
unset DJANGO_SUPERUSER_USERNAME
unset DJANGO_SUPERUSER_EMAIL
unset DJANGO_SUPERUSER_PASSWORD
unset DJANGO_SUPERUSER_FIRST_NAME
unset DJANGO_SUPERUSER_LAST_NAME