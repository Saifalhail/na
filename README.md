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
The repository is organized into distinct backend, frontend, and documentation directories to maintain a clean separation of concerns.

na/
├── .gitignore
├── backend/
│   ├── api/
│   ├── core/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── App.tsx
│   ├── package.json
│   └── .env
├── docs/
│   └── POSTMAN_GUIDE.md
├── CLAUDE.md
└── PROJECT_PLAN.md
└── README.md (This file)

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

API Documentation
The backend API is documented in two ways:

Live Swagger UI: Once the backend server is running, navigate to http://127.0.0.1:8000/api/docs/ in your browser for an interactive API schema.

Postman Guide: Refer to docs/POSTMAN_GUIDE.md for detailed instructions and examples on how to test the endpoints using Postman.

Development Roadmap
This project follows a phased development plan outlined in PROJECT_PLAN.md. The key phases are:

✅ Core MVP: Establish the basic capture-analyze-display loop.

▶️ Interactive Analysis: Integrate the live AI and build the interactive UI.

Guided Capture: Implement the sensor-guided camera experience.

Persistence & Accounts: Add user authentication and history.

Deployment: Prepare and deploy the application for production.

AI Agent Protocol
All automated development is governed by the rules and protocols defined in CLAUDE.md. This ensures consistency and adherence to the project plan.

Contributing
This project is currently under active development. For bug reports or feature requests, please open an issue on the project's GitHub repository.

License
This project is licensed under the MIT License. See the LICENSE file for details.