"""
Service fallback mechanisms for when primary services are unavailable.

This module provides fallback responses and degraded functionality
when circuit breakers are open or services are failing.
"""

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class ServiceFallbackHandler:
    """Handles fallback responses when services are unavailable."""
    
    @staticmethod
    def get_ai_analysis_fallback(image_data: bytes, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Provide fallback response when AI analysis service is unavailable.
        
        Returns a basic response that allows the application to continue
        functioning while the AI service recovers.
        """
        logger.warning("AI analysis service unavailable - providing fallback response")
        
        return {
            "success": False,
            "error": "AI analysis service temporarily unavailable",
            "fallback": True,
            "data": {
                "total_calories": None,
                "protein": None,
                "carbs": None,
                "fat": None,
                "fiber": None,
                "sugar": None,
                "sodium": None,
                "items": [],
                "servings": 1,
                "serving_size": "Unknown",
                "confidence": 0.0,
                "message": "Please try again later or manually enter nutrition information"
            },
            "suggestions": [
                "Try uploading the image again in a few minutes",
                "Ensure the image is clear and well-lit", 
                "Consider manually entering nutrition information",
                "Check if you have an internet connection"
            ]
        }
    
    @staticmethod
    def get_nutrition_recalculation_fallback(items: list) -> Dict[str, Any]:
        """
        Provide fallback nutrition recalculation when AI service is down.
        
        Performs basic mathematical aggregation of existing nutrition data.
        """
        logger.warning("AI recalculation service unavailable - using basic aggregation")
        
        total_calories = sum(item.get('calories', 0) for item in items)
        total_protein = sum(item.get('protein', 0) for item in items)
        total_carbs = sum(item.get('carbs', 0) for item in items) 
        total_fat = sum(item.get('fat', 0) for item in items)
        total_fiber = sum(item.get('fiber', 0) for item in items)
        total_sugar = sum(item.get('sugar', 0) for item in items)
        total_sodium = sum(item.get('sodium', 0) for item in items)
        
        return {
            "success": True,
            "fallback": True,
            "data": {
                "total_calories": total_calories,
                "protein": total_protein,
                "carbs": total_carbs,
                "fat": total_fat,
                "fiber": total_fiber,
                "sugar": total_sugar,
                "sodium": total_sodium,
                "confidence": 0.8,  # High confidence in basic math
                "message": "Calculated using basic aggregation - AI verification unavailable"
            }
        }
    
    @staticmethod
    def get_push_notification_fallback() -> Dict[str, Any]:
        """
        Fallback for when push notification service is unavailable.
        """
        logger.warning("Push notification service unavailable")
        
        return {
            "success": False,
            "fallback": True,
            "message": "Notification service temporarily unavailable",
            "delivery_status": "failed"
        }
    
    @staticmethod 
    def get_malware_scan_fallback() -> Dict[str, Any]:
        """
        Fallback for when malware scanning service is unavailable.
        
        Returns a "clean" result with warning about service availability.
        """
        logger.warning("Malware scanning service unavailable - allowing upload with warning")
        
        return {
            "is_clean": True,
            "scanner": "fallback",
            "scan_time": 0.0,
            "details": "Malware scanning temporarily unavailable - proceeding with caution",
            "fallback": True,
            "confidence": 0.0
        }


def with_service_fallback(fallback_func):
    """
    Decorator to add service fallback handling to functions.
    
    Args:
        fallback_func: Function to call when circuit breaker is open
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Check if it's a circuit breaker error
                if "Circuit breaker" in str(e) and "is open" in str(e):
                    logger.warning(f"Service unavailable, using fallback: {e}")
                    return fallback_func(*args, **kwargs)
                else:
                    # Re-raise other exceptions
                    raise
        return wrapper
    return decorator


# Pre-configured fallback decorators for common services
ai_analysis_fallback = with_service_fallback(ServiceFallbackHandler.get_ai_analysis_fallback)
nutrition_recalc_fallback = with_service_fallback(ServiceFallbackHandler.get_nutrition_recalculation_fallback)
push_notification_fallback = with_service_fallback(ServiceFallbackHandler.get_push_notification_fallback)
malware_scan_fallback = with_service_fallback(ServiceFallbackHandler.get_malware_scan_fallback)