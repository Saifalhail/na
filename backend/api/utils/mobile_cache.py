"""
Mobile-specific caching utilities for improved performance.
"""

import hashlib
import json
import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


class MobileCacheManager:
    """
    Manage mobile-specific caching for API responses and data.
    """

    # Cache timeouts (in seconds)
    DASHBOARD_CACHE_TIMEOUT = 300  # 5 minutes
    MEAL_LIST_CACHE_TIMEOUT = 600  # 10 minutes
    USER_PROFILE_CACHE_TIMEOUT = 1800  # 30 minutes
    SYNC_DATA_CACHE_TIMEOUT = 180  # 3 minutes
    NOTIFICATION_CACHE_TIMEOUT = 120  # 2 minutes

    @staticmethod
    def generate_cache_key(key_type: str, user_id: int, **kwargs) -> str:
        """
        Generate a consistent cache key for mobile data.

        Args:
            key_type: Type of cache key (dashboard, meals, profile, etc.)
            user_id: User ID
            **kwargs: Additional parameters for key generation

        Returns:
            String cache key
        """
        # Sort kwargs for consistent key generation
        params = sorted(kwargs.items())
        param_string = "_".join(f"{k}_{v}" for k, v in params)

        # Create base key
        base_key = f"mobile_{key_type}_user_{user_id}"
        if param_string:
            base_key += f"_{param_string}"

        # Hash if too long
        if len(base_key) > 200:
            base_key = hashlib.md5(base_key.encode()).hexdigest()

        return base_key

    @staticmethod
    def cache_dashboard_data(user_id: int, data: Dict[str, Any]) -> bool:
        """
        Cache dashboard data for a user.

        Args:
            user_id: User ID
            data: Dashboard data to cache

        Returns:
            True if cached successfully
        """
        cache_key = MobileCacheManager.generate_cache_key("dashboard", user_id)

        try:
            # Add timestamp for cache validation
            cached_data = {
                "data": data,
                "cached_at": timezone.now().isoformat(),
                "version": 1,
            }

            cache.set(
                cache_key, cached_data, MobileCacheManager.DASHBOARD_CACHE_TIMEOUT
            )
            logger.debug(f"Cached dashboard data for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cache dashboard data: {e}")
            return False

    @staticmethod
    def get_dashboard_data(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get cached dashboard data for a user.

        Args:
            user_id: User ID

        Returns:
            Cached dashboard data or None
        """
        cache_key = MobileCacheManager.generate_cache_key("dashboard", user_id)

        try:
            cached_data = cache.get(cache_key)
            if cached_data and isinstance(cached_data, dict):
                # Check if cache is still valid
                cached_at = timezone.fromisoformat(cached_data.get("cached_at", ""))
                if timezone.now() - cached_at < timedelta(
                    seconds=MobileCacheManager.DASHBOARD_CACHE_TIMEOUT
                ):
                    logger.debug(f"Retrieved cached dashboard data for user {user_id}")
                    return cached_data["data"]

        except Exception as e:
            logger.error(f"Failed to retrieve cached dashboard data: {e}")

        return None

    @staticmethod
    def cache_meal_list(
        user_id: int, meals_data: List[Dict], filters: Dict = None
    ) -> bool:
        """
        Cache meal list data for a user.

        Args:
            user_id: User ID
            meals_data: List of meal data
            filters: Optional filters applied to the list

        Returns:
            True if cached successfully
        """
        filter_hash = ""
        if filters:
            filter_string = json.dumps(filters, sort_keys=True)
            filter_hash = hashlib.md5(filter_string.encode()).hexdigest()[:8]

        cache_key = MobileCacheManager.generate_cache_key(
            "meals", user_id, filters=filter_hash
        )

        try:
            cached_data = {
                "data": meals_data,
                "cached_at": timezone.now().isoformat(),
                "filters": filters,
                "count": len(meals_data),
            }

            cache.set(
                cache_key, cached_data, MobileCacheManager.MEAL_LIST_CACHE_TIMEOUT
            )
            logger.debug(f"Cached {len(meals_data)} meals for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cache meal list: {e}")
            return False

    @staticmethod
    def get_meal_list(user_id: int, filters: Dict = None) -> Optional[List[Dict]]:
        """
        Get cached meal list for a user.

        Args:
            user_id: User ID
            filters: Optional filters to match

        Returns:
            Cached meal list or None
        """
        filter_hash = ""
        if filters:
            filter_string = json.dumps(filters, sort_keys=True)
            filter_hash = hashlib.md5(filter_string.encode()).hexdigest()[:8]

        cache_key = MobileCacheManager.generate_cache_key(
            "meals", user_id, filters=filter_hash
        )

        try:
            cached_data = cache.get(cache_key)
            if cached_data and isinstance(cached_data, dict):
                logger.debug(f"Retrieved cached meal list for user {user_id}")
                return cached_data["data"]

        except Exception as e:
            logger.error(f"Failed to retrieve cached meal list: {e}")

        return None

    @staticmethod
    def cache_user_profile(user_id: int, profile_data: Dict[str, Any]) -> bool:
        """
        Cache user profile data.

        Args:
            user_id: User ID
            profile_data: Profile data to cache

        Returns:
            True if cached successfully
        """
        cache_key = MobileCacheManager.generate_cache_key("profile", user_id)

        try:
            cached_data = {
                "data": profile_data,
                "cached_at": timezone.now().isoformat(),
            }

            cache.set(
                cache_key, cached_data, MobileCacheManager.USER_PROFILE_CACHE_TIMEOUT
            )
            logger.debug(f"Cached profile data for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cache profile data: {e}")
            return False

    @staticmethod
    def get_user_profile(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get cached user profile data.

        Args:
            user_id: User ID

        Returns:
            Cached profile data or None
        """
        cache_key = MobileCacheManager.generate_cache_key("profile", user_id)

        try:
            cached_data = cache.get(cache_key)
            if cached_data and isinstance(cached_data, dict):
                logger.debug(f"Retrieved cached profile data for user {user_id}")
                return cached_data["data"]

        except Exception as e:
            logger.error(f"Failed to retrieve cached profile data: {e}")

        return None

    @staticmethod
    def invalidate_user_cache(user_id: int, cache_types: List[str] = None) -> int:
        """
        Invalidate cached data for a user.

        Args:
            user_id: User ID
            cache_types: List of cache types to invalidate (default: all)

        Returns:
            Number of cache keys invalidated
        """
        if cache_types is None:
            cache_types = ["dashboard", "meals", "profile", "sync", "notifications"]

        invalidated = 0

        for cache_type in cache_types:
            try:
                # For simple cache types
                cache_key = MobileCacheManager.generate_cache_key(cache_type, user_id)
                if cache.delete(cache_key):
                    invalidated += 1

                # For cache types with filters (like meals)
                if cache_type == "meals":
                    # Delete common meal cache variations
                    for filter_variation in [
                        "",
                        "breakfast",
                        "lunch",
                        "dinner",
                        "recent",
                    ]:
                        var_key = MobileCacheManager.generate_cache_key(
                            cache_type, user_id, filters=filter_variation
                        )
                        if cache.delete(var_key):
                            invalidated += 1

            except Exception as e:
                logger.error(
                    f"Failed to invalidate {cache_type} cache for user {user_id}: {e}"
                )

        logger.info(f"Invalidated {invalidated} cache keys for user {user_id}")
        return invalidated

    @staticmethod
    def cache_sync_data(
        user_id: int, sync_data: Dict[str, Any], last_sync: str = None
    ) -> bool:
        """
        Cache sync data for mobile synchronization.

        Args:
            user_id: User ID
            sync_data: Sync data to cache
            last_sync: Last sync timestamp

        Returns:
            True if cached successfully
        """
        cache_key = MobileCacheManager.generate_cache_key(
            "sync", user_id, last_sync=last_sync or "full"
        )

        try:
            cached_data = {
                "data": sync_data,
                "cached_at": timezone.now().isoformat(),
                "last_sync": last_sync,
            }

            cache.set(
                cache_key, cached_data, MobileCacheManager.SYNC_DATA_CACHE_TIMEOUT
            )
            logger.debug(f"Cached sync data for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cache sync data: {e}")
            return False

    @staticmethod
    def get_sync_data(user_id: int, last_sync: str = None) -> Optional[Dict[str, Any]]:
        """
        Get cached sync data.

        Args:
            user_id: User ID
            last_sync: Last sync timestamp to match

        Returns:
            Cached sync data or None
        """
        cache_key = MobileCacheManager.generate_cache_key(
            "sync", user_id, last_sync=last_sync or "full"
        )

        try:
            cached_data = cache.get(cache_key)
            if cached_data and isinstance(cached_data, dict):
                # Only return if last_sync matches
                if cached_data.get("last_sync") == last_sync:
                    logger.debug(f"Retrieved cached sync data for user {user_id}")
                    return cached_data["data"]

        except Exception as e:
            logger.error(f"Failed to retrieve cached sync data: {e}")

        return None


class MobileCacheDecorator:
    """
    Decorator for caching mobile API responses.
    """

    @staticmethod
    def cache_response(cache_type: str, timeout: int = 300, key_func=None):
        """
        Decorator to cache API responses.

        Args:
            cache_type: Type of cache
            timeout: Cache timeout in seconds
            key_func: Function to generate cache key
        """

        def decorator(view_func):
            def wrapper(self, request, *args, **kwargs):
                # Generate cache key
                if key_func:
                    cache_key = key_func(request, *args, **kwargs)
                else:
                    cache_key = MobileCacheManager.generate_cache_key(
                        cache_type,
                        request.user.id,
                        path=request.path,
                        method=request.method,
                    )

                # Try to get cached response
                cached_response = cache.get(cache_key)
                if cached_response:
                    logger.debug(f"Returning cached response for {cache_key}")
                    return cached_response

                # Get fresh response
                response = view_func(self, request, *args, **kwargs)

                # Cache successful responses only
                if hasattr(response, "status_code") and response.status_code == 200:
                    cache.set(cache_key, response, timeout)
                    logger.debug(f"Cached response for {cache_key}")

                return response

            return wrapper

        return decorator


class MobileQueryOptimizer:
    """
    Optimize database queries for mobile endpoints.
    """

    @staticmethod
    def get_optimized_meals_queryset(user, limit=50, include_items=True):
        """
        Get optimized meals queryset for mobile.

        Args:
            user: User instance
            limit: Number of meals to fetch
            include_items: Whether to prefetch meal items

        Returns:
            Optimized queryset
        """
        queryset = user.meals.select_related()

        if include_items:
            queryset = queryset.prefetch_related("mealitem_set__food_item")

        return queryset.order_by("-consumed_at")[:limit]

    @staticmethod
    def get_optimized_notifications_queryset(user, limit=20):
        """
        Get optimized notifications queryset for mobile.

        Args:
            user: User instance
            limit: Number of notifications to fetch

        Returns:
            Optimized queryset
        """
        return user.notifications.select_related().order_by("-created_at")[:limit]

    @staticmethod
    def get_user_subscription_info(user):
        """
        Get optimized user subscription information.

        Args:
            user: User instance

        Returns:
            Dictionary with subscription info
        """
        # Try to get from cache first
        cached_subscription = MobileCacheManager.get_user_profile(user.id)
        if cached_subscription and "subscription_status" in cached_subscription:
            return cached_subscription["subscription_status"]

        # Query database with optimization
        active_subscription = (
            user.subscriptions.select_related("plan")
            .filter(status__in=["active", "trialing"])
            .first()
        )

        subscription_info = {
            "is_active": bool(active_subscription),
            "plan_name": (
                active_subscription.plan.name if active_subscription else "Free"
            ),
            "plan_type": (
                active_subscription.plan.plan_type if active_subscription else "free"
            ),
            "status": active_subscription.status if active_subscription else "inactive",
        }

        if active_subscription:
            subscription_info.update(
                {
                    "current_period_end": active_subscription.current_period_end,
                    "ai_analyses_used": active_subscription.ai_analyses_used,
                    "ai_analyses_limit": active_subscription.plan.ai_analysis_limit,
                    "can_use_ai": active_subscription.can_use_ai_analysis(),
                }
            )

        return subscription_info
