"""
Progressive loading utilities for mobile applications.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from django.core.cache import cache
from django.db.models import QuerySet
from django.utils import timezone

logger = logging.getLogger(__name__)


class ProgressiveLoader:
    """
    Implement progressive loading for mobile applications.
    Load data in chunks with priority-based ordering.
    """

    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 50

    @staticmethod
    def paginate_queryset(
        queryset: QuerySet, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE
    ) -> Dict[str, Any]:
        """
        Paginate a queryset with progressive loading metadata.

        Args:
            queryset: Django queryset to paginate
            page: Page number (1-based)
            page_size: Number of items per page

        Returns:
            Dictionary with paginated data and metadata
        """
        page_size = min(page_size, ProgressiveLoader.MAX_PAGE_SIZE)
        offset = (page - 1) * page_size

        # Get total count efficiently
        total_count = queryset.count()

        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1

        # Get page data
        page_data = list(queryset[offset : offset + page_size])

        return {
            "data": page_data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_previous": has_previous,
                "next_page": page + 1 if has_next else None,
                "previous_page": page - 1 if has_previous else None,
            },
        }

    @staticmethod
    def get_priority_ordered_data(
        queryset: QuerySet,
        priority_field: str = "created_at",
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> List[Any]:
        """
        Get data ordered by priority for progressive loading.

        Args:
            queryset: Django queryset
            priority_field: Field to order by (default: created_at)
            limit: Maximum items to return

        Returns:
            List of prioritized items
        """
        return list(queryset.order_by(f"-{priority_field}")[:limit])

    @staticmethod
    def create_progressive_response(
        data: List[Any], serializer_class, context: Dict = None, chunk_size: int = 10
    ) -> Dict[str, Any]:
        """
        Create a progressive response with chunked data.

        Args:
            data: Data to serialize
            serializer_class: Serializer class to use
            context: Serializer context
            chunk_size: Size of each chunk

        Returns:
            Dictionary with chunked data
        """
        chunks = []
        for i in range(0, len(data), chunk_size):
            chunk = data[i : i + chunk_size]
            serialized_chunk = serializer_class(chunk, many=True, context=context).data
            chunks.append(
                {
                    "chunk_id": i // chunk_size,
                    "items": serialized_chunk,
                    "count": len(serialized_chunk),
                }
            )

        return {
            "chunks": chunks,
            "total_chunks": len(chunks),
            "total_items": len(data),
            "chunk_size": chunk_size,
        }


class DeltaSync:
    """
    Implement delta synchronization for mobile applications.
    Only sync changes since last sync.
    """

    @staticmethod
    def get_cache_key(user_id: int, resource: str) -> str:
        """Generate cache key for delta sync."""
        return f"delta_sync_{user_id}_{resource}"

    @staticmethod
    def get_last_sync_timestamp(user_id: int, resource: str) -> Optional[datetime]:
        """
        Get the last sync timestamp for a user and resource.

        Args:
            user_id: User ID
            resource: Resource name (meals, notifications, etc.)

        Returns:
            Last sync timestamp or None
        """
        cache_key = DeltaSync.get_cache_key(user_id, resource)
        timestamp_str = cache.get(cache_key)

        if timestamp_str:
            try:
                return datetime.fromisoformat(timestamp_str)
            except ValueError:
                logger.warning(f"Invalid timestamp in cache: {timestamp_str}")

        return None

    @staticmethod
    def update_last_sync_timestamp(
        user_id: int, resource: str, timestamp: datetime = None
    ) -> None:
        """
        Update the last sync timestamp for a user and resource.

        Args:
            user_id: User ID
            resource: Resource name
            timestamp: Sync timestamp (default: now)
        """
        if timestamp is None:
            timestamp = timezone.now()

        cache_key = DeltaSync.get_cache_key(user_id, resource)
        cache.set(cache_key, timestamp.isoformat(), 86400 * 7)  # Cache for 7 days

    @staticmethod
    def get_delta_queryset(
        queryset: QuerySet,
        user_id: int,
        resource: str,
        timestamp_field: str = "updated_at",
    ) -> QuerySet:
        """
        Get a queryset filtered for delta sync.

        Args:
            queryset: Base queryset
            user_id: User ID
            resource: Resource name
            timestamp_field: Field to filter by (default: updated_at)

        Returns:
            Filtered queryset with only changed items
        """
        last_sync = DeltaSync.get_last_sync_timestamp(user_id, resource)

        if last_sync:
            filter_kwargs = {f"{timestamp_field}__gt": last_sync}
            return queryset.filter(**filter_kwargs)
        else:
            # First sync - return all items
            return queryset

    @staticmethod
    def create_delta_response(
        queryset: QuerySet,
        user_id: int,
        resource: str,
        serializer_class,
        context: Dict = None,
        timestamp_field: str = "updated_at",
    ) -> Dict[str, Any]:
        """
        Create a delta sync response.

        Args:
            queryset: Base queryset
            user_id: User ID
            resource: Resource name
            serializer_class: Serializer class
            context: Serializer context
            timestamp_field: Timestamp field for filtering

        Returns:
            Delta sync response
        """
        last_sync = DeltaSync.get_last_sync_timestamp(user_id, resource)
        current_sync = timezone.now()

        # Get changed items
        delta_queryset = DeltaSync.get_delta_queryset(
            queryset, user_id, resource, timestamp_field
        )

        # Serialize data
        serialized_data = serializer_class(
            delta_queryset, many=True, context=context
        ).data

        # Update sync timestamp
        DeltaSync.update_last_sync_timestamp(user_id, resource, current_sync)

        return {
            "data": serialized_data,
            "delta_info": {
                "last_sync": last_sync.isoformat() if last_sync else None,
                "current_sync": current_sync.isoformat(),
                "is_full_sync": last_sync is None,
                "items_changed": len(serialized_data),
            },
        }


class SmartCaching:
    """
    Smart caching with TTL and invalidation for mobile apps.
    """

    @staticmethod
    def get_cache_key(prefix: str, user_id: int, **kwargs) -> str:
        """Generate cache key with consistent format."""
        parts = [prefix, str(user_id)]

        for key, value in sorted(kwargs.items()):
            parts.append(f"{key}_{value}")

        return "_".join(parts)

    @staticmethod
    def cache_with_ttl(
        cache_key: str, data: Any, ttl: int = 300, tags: List[str] = None
    ) -> bool:
        """
        Cache data with TTL and optional tags.

        Args:
            cache_key: Cache key
            data: Data to cache
            ttl: Time to live in seconds
            tags: Optional tags for cache invalidation

        Returns:
            True if cached successfully
        """
        try:
            # Prepare cache data with metadata
            cache_data = {
                "data": data,
                "cached_at": timezone.now().isoformat(),
                "ttl": ttl,
                "tags": tags or [],
            }

            cache.set(cache_key, cache_data, ttl)

            # Store tag mappings for invalidation
            if tags:
                for tag in tags:
                    tag_key = f"cache_tag_{tag}"
                    tagged_keys = cache.get(tag_key, set())
                    tagged_keys.add(cache_key)
                    cache.set(tag_key, tagged_keys, ttl + 300)  # Tags live longer

            return True

        except Exception as e:
            logger.error(f"Failed to cache data: {e}")
            return False

    @staticmethod
    def get_cached_data(cache_key: str) -> Optional[Any]:
        """
        Get cached data if still valid.

        Args:
            cache_key: Cache key

        Returns:
            Cached data or None
        """
        try:
            cache_data = cache.get(cache_key)
            if cache_data and isinstance(cache_data, dict):
                return cache_data.get("data")

        except Exception as e:
            logger.error(f"Failed to retrieve cached data: {e}")

        return None

    @staticmethod
    def invalidate_by_tag(tag: str) -> int:
        """
        Invalidate all cache entries with a specific tag.

        Args:
            tag: Tag to invalidate

        Returns:
            Number of entries invalidated
        """
        try:
            tag_key = f"cache_tag_{tag}"
            tagged_keys = cache.get(tag_key, set())

            if tagged_keys:
                # Delete all tagged cache entries
                cache.delete_many(list(tagged_keys))

                # Delete the tag mapping
                cache.delete(tag_key)

                logger.info(
                    f"Invalidated {len(tagged_keys)} cache entries for tag: {tag}"
                )
                return len(tagged_keys)

        except Exception as e:
            logger.error(f"Failed to invalidate cache by tag: {e}")

        return 0

    @staticmethod
    def invalidate_user_cache(user_id: int, resource: str = None) -> int:
        """
        Invalidate all cache entries for a user.

        Args:
            user_id: User ID
            resource: Optional specific resource to invalidate

        Returns:
            Number of entries invalidated
        """
        if resource:
            return SmartCaching.invalidate_by_tag(f"user_{user_id}_{resource}")
        else:
            return SmartCaching.invalidate_by_tag(f"user_{user_id}")


class MobileDataOptimizer:
    """
    Optimize data specifically for mobile consumption.
    """

    @staticmethod
    def optimize_image_urls(data: Dict[str, Any], base_url: str = "") -> Dict[str, Any]:
        """
        Optimize image URLs for mobile consumption.

        Args:
            data: Data containing image URLs
            base_url: Base URL for relative paths

        Returns:
            Data with optimized image URLs
        """
        if isinstance(data, dict):
            optimized = {}
            for key, value in data.items():
                if (
                    key.endswith("_image")
                    or key.endswith("_photo")
                    or "image" in key.lower()
                ):
                    if isinstance(value, str) and value:
                        # Add thumbnail and optimized versions
                        optimized[key] = value
                        optimized[f"{key}_thumbnail"] = f"{value}?size=thumbnail"
                        optimized[f"{key}_medium"] = f"{value}?size=medium"
                    else:
                        optimized[key] = value
                elif isinstance(value, (dict, list)):
                    optimized[key] = MobileDataOptimizer.optimize_image_urls(
                        value, base_url
                    )
                else:
                    optimized[key] = value
            return optimized

        elif isinstance(data, list):
            return [
                MobileDataOptimizer.optimize_image_urls(item, base_url) for item in data
            ]

        else:
            return data

    @staticmethod
    def compress_data_for_mobile(data: Any, compression_level: str = "standard") -> Any:
        """
        Compress data for mobile transmission.

        Args:
            data: Data to compress
            compression_level: Compression level (light, standard, aggressive)

        Returns:
            Compressed data
        """
        if compression_level == "light":
            # Just remove null values
            return MobileDataOptimizer._remove_null_values(data)

        elif compression_level == "standard":
            # Remove nulls and empty strings
            return MobileDataOptimizer._remove_empty_values(data)

        elif compression_level == "aggressive":
            # Remove nulls, empty values, and optimize field names
            compressed = MobileDataOptimizer._remove_empty_values(data)
            return MobileDataOptimizer._optimize_field_names(compressed)

        else:
            return data

    @staticmethod
    def _remove_null_values(data: Any) -> Any:
        """Remove null values from data structure."""
        if isinstance(data, dict):
            return {
                key: MobileDataOptimizer._remove_null_values(value)
                for key, value in data.items()
                if value is not None
            }
        elif isinstance(data, list):
            return [
                MobileDataOptimizer._remove_null_values(item)
                for item in data
                if item is not None
            ]
        else:
            return data

    @staticmethod
    def _remove_empty_values(data: Any) -> Any:
        """Remove null and empty values from data structure."""
        if isinstance(data, dict):
            return {
                key: MobileDataOptimizer._remove_empty_values(value)
                for key, value in data.items()
                if value is not None and value != "" and value != []
            }
        elif isinstance(data, list):
            return [
                MobileDataOptimizer._remove_empty_values(item)
                for item in data
                if item is not None and item != "" and item != []
            ]
        else:
            return data

    @staticmethod
    def _optimize_field_names(data: Any) -> Any:
        """Optimize field names for mobile (shorter names)."""
        field_mappings = {
            "created_at": "ca",
            "updated_at": "ua",
            "deleted_at": "da",
            "total_calories": "cal",
            "nutritional_info": "nutr",
            "description": "desc",
            "thumbnail_url": "thumb",
            "image_url": "img",
        }

        if isinstance(data, dict):
            optimized = {}
            for key, value in data.items():
                new_key = field_mappings.get(key, key)
                optimized[new_key] = MobileDataOptimizer._optimize_field_names(value)
            return optimized

        elif isinstance(data, list):
            return [MobileDataOptimizer._optimize_field_names(item) for item in data]

        else:
            return data
