# API Changelog

This document tracks all changes to the Nutrition AI API, including new features, improvements, bug fixes, and breaking changes.

## Versioning Strategy

The API follows [Semantic Versioning](https://semver.org/) principles:

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backward compatible manner
- **PATCH** version when you make backward compatible bug fixes

## Current Version: v1.0.0

### Base URL
- **Development:** `http://127.0.0.1:8000/api/v1/`
- **Production:** `https://api.nutritionai.com/v1/`

### API Documentation
- **Swagger UI:** `/api/docs/`
- **ReDoc:** `/api/redoc/`
- **OpenAPI Schema:** `/api/schema/`

---

## Version History

### v1.0.0 (2025-01-10) - Initial Release

#### Added
- **Image Analysis Endpoint**
  - `POST /api/v1/analyze-image/`
  - Accepts food images and returns nutritional analysis using Google Gemini Pro Vision
  - Supports JPEG and PNG formats up to 10MB
  - Returns detailed ingredient breakdown with individual nutritional data

- **Nutrition Data Management**
  - `GET /api/v1/nutrition/{id}/`
  - Retrieve specific nutrition analysis results
  - Includes complete ingredient list and nutritional breakdown

- **Nutrition Recalculation**
  - `POST /api/v1/nutrition/{id}/recalculate/`
  - Recalculate nutrition values for different serving sizes
  - Support for updating individual ingredient quantities

- **Ingredient Management**
  - `GET /api/v1/nutrition/{nutrition_data_id}/ingredients/`
  - List all ingredients for a specific nutrition analysis
  - Individual ingredient nutritional data

- **Image-less Recalculation**
  - `POST /api/v1/recalculate/`
  - Calculate nutrition from ingredient list without image
  - Useful for recipe-based calculations

#### Features
- **AI-Powered Analysis:** Google Gemini Pro Vision integration for accurate food recognition
- **Comprehensive Nutrition Data:** Calories, protein, carbohydrates, fat, fiber, sugar, and sodium
- **Per-Ingredient Breakdown:** Individual nutritional analysis for each detected ingredient
- **Flexible Serving Sizes:** Dynamic recalculation for different portion sizes
- **Image Validation:** Automatic image format and size validation
- **Error Handling:** Standardized error responses with detailed error codes
- **API Documentation:** Auto-generated OpenAPI 3.0 documentation

#### Security
- **CORS Configuration:** Secure cross-origin resource sharing
- **Input Validation:** Comprehensive request validation and sanitization
- **File Upload Security:** Size limits and format restrictions for image uploads
- **Environment-based Configuration:** Separate settings for development, testing, and production

#### Performance
- **Retry Logic:** Automatic retry with exponential backoff for AI service calls
- **Response Validation:** Structured validation of AI service responses
- **Optimized Database Schema:** Efficient models with proper relationships and indexes

#### Infrastructure
- **Multi-Environment Support:** Development, testing, and production configurations
- **Structured Logging:** Comprehensive logging with request tracking
- **Health Checks:** System health monitoring endpoints
- **Error Tracking:** Detailed error logging with unique request IDs

---

## Upcoming Releases

### v1.1.0 (Planned)
- **Authentication System**
  - User registration and login
  - JWT token-based authentication
  - Password reset functionality
  - User profile management

- **Meal Management**
  - Save and retrieve meal history
  - Favorite meals functionality
  - Meal search and filtering

### v1.2.0 (Planned)
- **Enhanced AI Features**
  - Context-aware analysis (meal type, cuisine)
  - Confidence scores for ingredient detection
  - Cooking method detection

- **Background Processing**
  - Asynchronous image processing
  - Nutritional data aggregation
  - Daily summary generation

### v2.0.0 (Planned)
- **Breaking Changes**
  - Updated response format for better consistency
  - Enhanced authentication requirements
  - Deprecated endpoint removal

- **New Features**
  - Real-time nutrition tracking
  - Goal setting and progress monitoring
  - Social features (meal sharing)

---

## Migration Guides

### From Development to v1.0.0
This is the initial release, so no migration is required.

### Future Migrations
Migration guides will be provided for each major version change that includes breaking changes.

---

## Deprecation Notices

### Current Deprecations
None at this time.

### Future Deprecations
Deprecation notices will be announced at least 6 months before removal of any features.

---

## Error Code Changes

### v1.0.0
- Introduced standardized error code system
- All errors now include `error_code`, `timestamp`, and `request_id`
- See [API Error Codes](./API_ERROR_CODES.md) for complete reference

---

## Rate Limiting

### v1.0.0
- **Anonymous Users:** 100 requests per hour
- **Authenticated Users:** 1000 requests per hour (v1.1.0+)
- **Image Analysis:** 50 requests per hour per user

---

## Changelog Format

Each version entry includes:

- **Added:** New features and capabilities
- **Changed:** Modifications to existing functionality
- **Deprecated:** Features marked for future removal
- **Removed:** Features removed in this version
- **Fixed:** Bug fixes and patches
- **Security:** Security-related changes

---

## Questions and Support

For questions about API changes or migration assistance:

- **Documentation:** Check the latest API documentation at `/api/docs/`
- **GitHub Issues:** Report issues at the project repository
- **Email Support:** contact@nutritionai.com

---

*Last Updated: January 10, 2025*