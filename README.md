Nutrition AI (NA)
An intelligent mobile application that provides instant nutritional analysis of meals from a single photo. This project leverages a powerful vision AI to deliver a fast, intuitive, and accurate user experience.

Key Features
📸 AI-Powered Analysis: Instantly identifies food items, estimates portion sizes, and provides a detailed nutritional breakdown (calories, protein, carbs, fat) from an image.

🎯 Guided Camera Capture: A "face verification" style UI that uses device sensors to guide the user to take the perfect, AI-optimized photo (correct angle, scale, and lighting).

👆 Interactive Results UI: Presents nutritional data in an intuitive "bubbles" format, allowing users to easily tap and correct any value for immediate recalculation.

🧠 Context-Aware Engine: Enhances AI accuracy by using metadata like meal type, cuisine style, and location to make smarter initial guesses.

📖 User History & Favorites: Allows users to log their meals, view their nutritional history over time, and save favorite meals for quick re-logging.

Technology Stack
Category

Technology

Backend

Python, Django, Django Rest Framework (DRF)

Frontend

TypeScript, React Native (with Expo)

Database

PostgreSQL

AI Service

Google Gemini Pro & Gemini Pro Vision

Deployment

Docker, Heroku (or similar PaaS), AWS S3

Testing

Postman

Monitoring

Sentry

Project Structure
The repository is organized with a comprehensive documentation system and clean separation of concerns:

```
na/
├── backend/              # Django REST API
│   ├── api/             # Main application code
│   ├── core/            # Django project settings
│   ├── requirements.txt # Python dependencies
│   └── .env.example     # Environment template
├── frontend/            # React Native mobile app
│   ├── src/             # Source code
│   ├── App.tsx          # Main app component
│   └── package.json     # Node dependencies
├── docs/                # 📚 Comprehensive documentation
│   ├── api/             # API reference and guides
│   ├── testing/         # Testing documentation
│   ├── deployment/      # Setup and deployment guides
│   ├── frontend/        # Frontend architecture docs
│   ├── development/     # Development workflows
│   ├── guides/          # Troubleshooting and guides
│   └── PROJECT_PLAN.md  # Master development roadmap
└── README.md           # This file
```

Getting Started: Local Development Setup
Follow these steps to set up and run the project on your local machine.

Prerequisites
Python 3.10+

Node.js LTS (which includes npm)

PostgreSQL

Git

Expo Go app on your iOS or Android device.

1. Clone the Repository
git clone <your-repository-url>
cd na

2. Backend Setup (Django)
Navigate to the backend directory:

cd backend

Create and activate a virtual environment:

python -m venv venv
.\venv\Scripts\Activate.ps1

Install Python dependencies:

pip install -r requirements.txt

Set up the database:

Create a new PostgreSQL database named nutritiondb.

Create a .env file from the example: copy .env.example .env.

Edit the .env file with your database credentials and your GEMINI_API_KEY.

Run database migrations:

python manage.py migrate

3. Frontend Setup (Expo)
Navigate to the frontend directory:

# From the root 'na' directory
cd frontend

Install Node.js dependencies:

npm install

Set up environment variables:

The frontend directory should contain a .env file with the following line, pointing to your local backend server:

EXPO_PUBLIC_API_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)

Usage
To run the application, you need to start both the backend and frontend servers in separate terminals.

Start the Backend Server:

# In na/backend/
.\venv\Scripts\Activate.ps1
python manage.py runserver

The Django API will be running at http://127.0.0.1:8000.

Start the Frontend Server:

# In na/frontend/
npm start

Scan the QR code with the Expo Go app on your mobile device to launch the app.

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

### Quick Access
- **🚀 [Getting Started](docs/deployment/DEVELOPMENT_SETUP.md)** - Complete setup guide
- **📖 [API Reference](docs/api/README.md)** - Complete API documentation  
- **🧪 [Testing Guide](docs/testing/README.md)** - Testing procedures
- **❓ [Troubleshooting](docs/guides/TROUBLESHOOTING.md)** - Common issues and solutions

### API Documentation
- **📱 [Interactive API Docs](http://127.0.0.1:8000/api/docs/)** - Live Swagger UI (when running)
- **📮 [Postman Collection](docs/api/POSTMAN_GUIDE.md)** - API testing guide
- **🔗 [Integration Guide](docs/api/API_INTEGRATION.md)** - How to integrate with the API
- **⚠️ [Error Codes](docs/api/API_ERROR_CODES.md)** - Error handling reference

## 🗺️ Development Roadmap

This project follows a comprehensive development plan outlined in [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md):

### Current Status
- ✅ **Phase 1-3**: Backend Foundation, Features & Optimization (Complete)
- ✅ **Phase 4**: Frontend Foundation & Components (Complete)  
- ⏳ **Phase 5**: Frontend Features Implementation (In Progress)
- ⏳ **Phase 6**: Frontend Polish & Optimization (Planned)
- ⏳ **Phase 7**: Deployment & Operations (Planned)

### Key Achievements
- **Backend**: 79.1% test pass rate with comprehensive API coverage
- **Frontend**: Complete component library and architecture foundation
- **Documentation**: Organized, comprehensive documentation system
- **Testing**: Automated monitoring and reporting

## 🤖 AI-Powered Development

This project uses AI-assisted development following strict protocols:

- **Development Guide**: [docs/development/CLAUDE.md](docs/development/CLAUDE.md)
- **Backend-First Approach**: Complete backend before frontend features
- **Security-First Design**: Comprehensive security measures from the start
- **Test-Driven Development**: 80%+ coverage requirement

Contributing
This project is currently under active development. For bug reports or feature requests, please open an issue on the project's GitHub repository.

License
This project is licensed under the MIT License. See the LICENSE file for details.