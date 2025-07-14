"""
User caching service for performance optimization.
"""

import logging
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)


class UserCacheService:
    """
    Service for caching user-related data with TTL management.
    """

    # Cache TTL settings (in seconds)
    USER_TIER_TTL = 300  # 5 minutes
    USER_PROFILE_TTL = 600  # 10 minutes
    USER_PERMISSIONS_TTL = 300  # 5 minutes

    def __init__(self):
        """Initialize the cache service."""
        self.cache_prefix = "user_cache"

    def _get_cache_key(self, key_type: str, user_id: int, suffix: str = "") -> str:
        """
        Generate cache key for user data.

        Args:
            key_type: Type of cache (tier, profile, permissions)
            user_id: User ID
            suffix: Optional suffix for the key

        Returns:
            Cache key string
        """
        base_key = f"{self.cache_prefix}:{key_type}:{user_id}"
        return f"{base_key}:{suffix}" if suffix else base_key

    def get_user_tier(self, user_id: int) -> Optional[str]:
        """
        Get user tier from cache.

        Args:
            user_id: User ID

        Returns:
            User tier string or None if not cached
        """
        cache_key = self._get_cache_key("tier", user_id)
        return cache.get(cache_key)

    def set_user_tier(self, user_id: int, tier: str) -> None:
        """
        Cache user tier.

        Args:
            user_id: User ID
            tier: User tier (free, premium, professional)
        """
        cache_key = self._get_cache_key("tier", user_id)
        cache.set(cache_key, tier, self.USER_TIER_TTL)
        logger.debug(f"Cached user tier for user {user_id}: {tier}")

    def get_user_permissions(self, user_id: int) -> Optional[Dict[str, bool]]:
        """
        Get user permissions from cache.

        Args:
            user_id: User ID

        Returns:
            Dict of permissions or None if not cached
        """
        cache_key = self._get_cache_key("permissions", user_id)
        return cache.get(cache_key)

    def set_user_permissions(self, user_id: int, permissions: Dict[str, bool]) -> None:
        """
        Cache user permissions.

        Args:
            user_id: User ID
            permissions: Dict of permission flags
        """
        cache_key = self._get_cache_key("permissions", user_id)
        cache.set(cache_key, permissions, self.USER_PERMISSIONS_TTL)
        logger.debug(f"Cached user permissions for user {user_id}")

    def get_user_profile_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get user profile data from cache.

        Args:
            user_id: User ID

        Returns:
            Dict of profile data or None if not cached
        """
        cache_key = self._get_cache_key("profile", user_id)
        return cache.get(cache_key)

    def set_user_profile_data(self, user_id: int, profile_data: Dict[str, Any]) -> None:
        """
        Cache user profile data.

        Args:
            user_id: User ID
            profile_data: Dict of profile information
        """
        cache_key = self._get_cache_key("profile", user_id)
        cache.set(cache_key, profile_data, self.USER_PROFILE_TTL)
        logger.debug(f"Cached user profile data for user {user_id}")

    def invalidate_user_cache(self, user_id: int) -> None:
        """
        Invalidate all cached data for a user.

        Args:
            user_id: User ID
        """
        cache_keys = [
            self._get_cache_key("tier", user_id),
            self._get_cache_key("permissions", user_id),
            self._get_cache_key("profile", user_id),
        ]

        cache.delete_many(cache_keys)
        logger.info(f"Invalidated all cache for user {user_id}")

    def warm_user_cache(self, user_id: int) -> Dict[str, Any]:
        """
        Warm the cache for a user by loading all their data.

        Args:
            user_id: User ID

        Returns:
            Dict with cached data
        """
        try:
            user = User.objects.select_related("profile").get(id=user_id)

            # Cache user tier
            self.set_user_tier(user_id, user.account_type)

            # Cache user permissions
            permissions = {
                "is_premium": user.account_type in ["premium", "professional"],
                "is_professional": user.account_type == "professional",
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "two_factor_enabled": user.two_factor_enabled,
            }
            self.set_user_permissions(user_id, permissions)

            # Cache profile data if exists
            if hasattr(user, "profile"):
                profile_data = {
                    "daily_calorie_goal": user.profile.daily_calorie_goal,
                    "daily_protein_goal": (
                        float(user.profile.daily_protein_goal)
                        if user.profile.daily_protein_goal
                        else None
                    ),
                    "daily_carbs_goal": (
                        float(user.profile.daily_carbs_goal)
                        if user.profile.daily_carbs_goal
                        else None
                    ),
                    "daily_fat_goal": (
                        float(user.profile.daily_fat_goal)
                        if user.profile.daily_fat_goal
                        else None
                    ),
                    "measurement_system": user.profile.measurement_system,
                    "activity_level": user.profile.activity_level,
                }
                self.set_user_profile_data(user_id, profile_data)

            logger.info(f"Warmed cache for user {user_id}")

            return {
                "tier": user.account_type,
                "permissions": permissions,
                "profile": profile_data if hasattr(user, "profile") else None,
            }

        except User.DoesNotExist:
            logger.error(f"User {user_id} not found for cache warming")
            return {}
        except Exception as e:
            logger.error(f"Error warming cache for user {user_id}: {e}")
            return {}

    def get_or_set_user_tier(self, user_id: int) -> str:
        """
        Get user tier from cache or database, caching the result.

        Args:
            user_id: User ID

        Returns:
            User tier string
        """
        # Try cache first
        tier = self.get_user_tier(user_id)
        if tier:
            return tier

        # Cache miss - get from database
        try:
            user = User.objects.only("account_type").get(id=user_id)
            self.set_user_tier(user_id, user.account_type)
            return user.account_type
        except User.DoesNotExist:
            # Default to free for non-existent users
            self.set_user_tier(user_id, "free")
            return "free"

    def is_premium_user(self, user_id: int) -> bool:
        """
        Check if user is premium (cached).

        Args:
            user_id: User ID

        Returns:
            True if user is premium or professional
        """
        tier = self.get_or_set_user_tier(user_id)
        return tier in ["premium", "professional"]

    def get_cache_stats(self) -> Dict[str, int]:
        """
        Get cache statistics (if supported by cache backend).

        Returns:
            Dict with cache statistics
        """
        try:
            # This works with Redis and Memcached
            if hasattr(cache, "_cache") and hasattr(cache._cache, "get_stats"):
                return cache._cache.get_stats()
            else:
                return {"cache_type": "django_cache", "stats_unavailable": True}
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}


# Global service instance
user_cache_service = UserCacheService()
