"""
Caching utilities for the API.
"""

import hashlib
import json
import logging
from typing import Any, Callable, Optional

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Centralized cache management with consistent key naming and timeout handling.
    """

    # Cache timeouts (in seconds)
    TIMEOUT_SHORT = 300  # 5 minutes
    TIMEOUT_MEDIUM = 1800  # 30 minutes
    TIMEOUT_LONG = 3600  # 1 hour
    TIMEOUT_DAILY = 86400  # 24 hours

    # Cache key prefixes
    PREFIX_USER_PROFILE = "user_profile"
    PREFIX_MEAL_STATS = "meal_stats"
    PREFIX_NOTIFICATION_COUNT = "notification_count"
    PREFIX_AI_ANALYSIS = "ai_analysis"
    PREFIX_FAVORITE_MEALS = "favorite_meals"

    @classmethod
    def _generate_key(cls, prefix: str, *args, **kwargs) -> str:
        """
        Generate a consistent cache key based on prefix and arguments.
        """
        # Create a hash of all arguments for consistency
        key_data = {"args": args, "kwargs": sorted(kwargs.items()) if kwargs else {}}
        key_hash = hashlib.md5(
            json.dumps(key_data, sort_keys=True).encode()
        ).hexdigest()
        return f"{prefix}:{key_hash}"

    @classmethod
    def get(cls, prefix: str, *args, **kwargs) -> Optional[Any]:
        """
        Get value from cache.
        """
        key = cls._generate_key(prefix, *args, **kwargs)
        try:
            return cache.get(key)
        except Exception as e:
            logger.warning(f"Cache get failed for key {key}: {e}")
            return None

    @classmethod
    def set(cls, prefix: str, value: Any, timeout: int, *args, **kwargs) -> bool:
        """
        Set value in cache with timeout.
        """
        key = cls._generate_key(prefix, *args, **kwargs)
        try:
            cache.set(key, value, timeout)
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False

    @classmethod
    def delete(cls, prefix: str, *args, **kwargs) -> bool:
        """
        Delete value from cache.
        """
        key = cls._generate_key(prefix, *args, **kwargs)
        try:
            cache.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False

    @classmethod
    def get_or_set(
        cls, prefix: str, default_func: Callable, timeout: int, *args, **kwargs
    ) -> Any:
        """
        Get value from cache or set it using the default function.
        """
        key = cls._generate_key(prefix, *args, **kwargs)
        try:
            # Try to get from cache first
            value = cache.get(key)
            if value is not None:
                return value

            # If not in cache, call the default function
            value = default_func()
            cache.set(key, value, timeout)
            return value
        except Exception as e:
            logger.warning(f"Cache get_or_set failed for key {key}: {e}")
            # If cache fails, just return the computed value
            return default_func()


def cached_method(prefix: str, timeout: int = CacheManager.TIMEOUT_MEDIUM):
    """
    Decorator for caching method results.
    """

    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            # Use method arguments as cache key components
            cache_args = args[1:]  # Skip 'self'
            return CacheManager.get_or_set(
                prefix, lambda: func(*args, **kwargs), timeout, *cache_args, **kwargs
            )

        return wrapper

    return decorator


def invalidate_user_cache(user_id: int):
    """
    Invalidate all cache entries for a specific user.
    """
    prefixes = [
        CacheManager.PREFIX_USER_PROFILE,
        CacheManager.PREFIX_MEAL_STATS,
        CacheManager.PREFIX_NOTIFICATION_COUNT,
        CacheManager.PREFIX_FAVORITE_MEALS,
    ]

    for prefix in prefixes:
        CacheManager.delete(prefix, user_id=user_id)


def invalidate_meal_cache(user_id: int):
    """
    Invalidate meal-related cache entries for a specific user.
    """
    prefixes = [
        CacheManager.PREFIX_MEAL_STATS,
        CacheManager.PREFIX_FAVORITE_MEALS,
    ]

    for prefix in prefixes:
        CacheManager.delete(prefix, user_id=user_id)


def invalidate_notification_cache(user_id: int):
    """
    Invalidate notification-related cache entries for a specific user.
    """
    CacheManager.delete(CacheManager.PREFIX_NOTIFICATION_COUNT, user_id=user_id)
