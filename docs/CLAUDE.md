AI Agent Protocol: Nutrition AI App (Project Claude)
This document outlines the operational directives and development protocols for the AI agent assigned to this project. Adherence to these rules is mandatory to ensure code quality, consistency, and alignment with the project plan.

## Current Status (Updated: 2025-01-09)
**Phase 1: Backend Foundation & Security - COMPLETED ✅**
**Phase 2: Backend Features & AI Integration - IN PROGRESS 🚧**

### Phase 1 Completed Work:
1. **JWT Authentication System**: Full authentication flow with registration, login, email verification, password reset, and token refresh with rotation
2. **Comprehensive Error Handling**: Custom exceptions, global error handler, structured logging with correlation IDs
3. **Security Middleware**: Rate limiting, security headers, HTTPS enforcement, audit logging
4. **Model Factories**: Complete test factories for all models using Factory Boy
5. **API Documentation**: Enhanced DRF Spectacular configuration, comprehensive Postman guide, API changelog

### Phase 2 Progress:
1. **AI Endpoints Updated** ✅: Migrated from legacy models to new Meal/MealItem architecture
   - Created new AI views at `/api/v1/ai/analyze/` and `/api/v1/ai/recalculate/`
   - Implemented comprehensive serializers for AI analysis
   - Legacy endpoints maintained for backward compatibility
2. **Enhanced GeminiService** ✅: Added retry logic, caching, context support, and better error handling
   - Implemented intelligent retry with exponential backoff
   - Added Redis caching for AI responses
   - Enhanced prompt engineering with context awareness
   - Better error categorization (rate limits, auth errors, etc.)
3. **MealViewSet Implementation** ✅: Complete meal management functionality
   - Full CRUD operations for meals with proper permissions
   - Advanced filtering and search capabilities
   - Favorite meals system with quick logging
   - Meal duplication and similarity finding
   - Comprehensive statistics endpoint
   - Created test suite for meal endpoints
   - Updated POSTMAN_GUIDE.md with all meal endpoints
4. **Backend Improvements Completed** ✅:
   - **Testing**: Added comprehensive tests for AI endpoints and GeminiService
   - **Rate Limiting**: Implemented rate limiting on AI endpoints (10/min for analyze, 20/min for recalculate)
   - **Input Validation**: Enhanced image validation (size, format, dimensions)
   - **Redis Caching**: Configured Redis with fallback to dummy cache
   - **Query Optimization**: Fixed N+1 queries in MealViewSet with proper prefetch/select_related
   - **API Monitoring**: Added APIUsageLog tracking for all AI endpoints
   - **Health Checks**: Enhanced Gemini API health check with cached connectivity test

### Next Steps:
1. Add OAuth2 social login (Google)
2. Implement two-factor authentication
3. Complete test coverage for all endpoints
4. Set up Celery for background tasks
5. Implement user nutrition goals and tracking

1. Core Directives
Follow the Plan: The primary source of truth is the DEVELOPMENT_PLAN.md. Always work on the current, active phase and step. Do not skip steps or work ahead unless explicitly instructed.

Isolate Work: Complete and test backend work before starting dependent frontend work. Use Postman and the auto-generated API docs to validate backend changes in isolation.

Commit Atomically: Each significant change or completed feature should result in a single, well-documented Git commit. Do not group unrelated changes into one commit.

Document as You Go: All code must be commented. All new API endpoints must be documented in docs/POSTMAN_GUIDE.md. All new environment variables must be added to the .env.example files.

Security First: Never commit secrets, API keys, or personal data. Use the .env files for all sensitive information.

2. Project Context & Tech Stack
Objective: Build a mobile app that uses AI to analyze food images for nutritional content.

Backend: Python, Django, Django Rest Framework, PostgreSQL.

Frontend: TypeScript, React Native, Expo.

AI Model: Google Gemini Pro Vision.

3. Development Workflow
State Your Intent: Before writing any code, state which step of the DEVELOPMENT_PLAN.md you are beginning to work on.

Backend First: For any feature involving both frontend and backend, complete the backend portion first.

Modify/create Django models.

Create/update API views and serializers.

Update urls.py.

Write tests or validate endpoints using Postman.

Frontend Second: Once the backend API is confirmed to be working, begin the frontend implementation.

Create/update API service calls in src/api/.

Build/update screens in src/screens/.

Create/update reusable components in src/components/.

Commit and Summarize: After completing a step, commit the changes with a clear commit message following the "Conventional Commits" standard (e.g., feat: implement user authentication endpoint). Provide a brief summary of the work completed.

4. Coding Standards
General
All code must be in English.

Use comments to explain why code exists, not just what it does.

Keep functions small and focused on a single responsibility.

Python (Backend)
Follow the PEP 8 style guide.

Use type hints for all function definitions.
-e.g., def analyze_image(image_data: bytes) -> dict:

All API views must be class-based views (CBVs) inheriting from DRF's generic views.

Use serializers to validate and handle all incoming and outgoing data.

TypeScript (Frontend)
Follow the Airbnb JavaScript Style Guide.

Use functional components with Hooks. Class components are forbidden.

Define types or interfaces for all props, API responses, and complex objects.

Structure files logically. Place components used by only one screen in a subfolder within that screen's folder.

5. Tool Usage Protocol
Git:

Work on a feature branch for each new feature (e.g., feature/guided-capture).

Commit messages must be in the format: type(scope): subject.

feat: A new feature.

fix: A bug fix.

docs: Documentation only changes.

style: Code style changes (formatting, etc.).

refactor: A code change that neither fixes a bug nor adds a feature.

chore: Changes to the build process or auxiliary tools.

Postman:

After creating or modifying an endpoint, export the request and add it to the project's Postman collection.

Update docs/POSTMAN_GUIDE.md with any changes.

API Docs (Swagger):

After modifying an endpoint, refresh the /api/docs/ page to ensure the auto-generated schema is correct. Add docstrings to views and serializers to enhance the documentation.

6. Communication Protocol
Clarification: If any part of the development plan is ambiguous, ask for clarification before proceeding. State the ambiguity clearly.

Reporting Errors: If you encounter an error you cannot solve, provide the full error message, the code block that caused it, and the steps you have already taken to debug it.

Progress Updates: At the end of a work session, provide a summary of the steps completed and state the next step you will work on in the following session.