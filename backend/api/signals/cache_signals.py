"""
Cache invalidation signals to keep user cache fresh.
"""

import logging

from django.contrib.auth import get_user_model
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from api.models import UserProfile
from api.services.user_cache_service import user_cache_service

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def invalidate_user_cache_on_user_save(sender, instance, **kwargs):
    """
    Invalidate user cache when User model is saved.
    """
    try:
        user_cache_service.invalidate_user_cache(instance.id)
        logger.debug(f"Invalidated cache for user {instance.id} after User save")
    except Exception as e:
        logger.error(f"Error invalidating user cache on User save: {e}")


@receiver(post_save, sender=UserProfile)
def invalidate_user_cache_on_profile_save(sender, instance, **kwargs):
    """
    Invalidate user cache when UserProfile model is saved.
    """
    try:
        user_cache_service.invalidate_user_cache(instance.user_id)
        logger.debug(
            f"Invalidated cache for user {instance.user_id} after UserProfile save"
        )
    except Exception as e:
        logger.error(f"Error invalidating user cache on UserProfile save: {e}")


@receiver(post_delete, sender=UserProfile)
def invalidate_user_cache_on_profile_delete(sender, instance, **kwargs):
    """
    Invalidate user cache when UserProfile model is deleted.
    """
    try:
        user_cache_service.invalidate_user_cache(instance.user_id)
        logger.debug(
            f"Invalidated cache for user {instance.user_id} after UserProfile delete"
        )
    except Exception as e:
        logger.error(f"Error invalidating user cache on UserProfile delete: {e}")


# If subscription models exist, add cache invalidation for them too
try:
    from api.models import Subscription

    @receiver(post_save, sender=Subscription)
    def invalidate_user_cache_on_subscription_save(sender, instance, **kwargs):
        """
        Invalidate user cache when Subscription model is saved.
        """
        try:
            user_cache_service.invalidate_user_cache(instance.user_id)
            logger.debug(
                f"Invalidated cache for user {instance.user_id} after Subscription save"
            )
        except Exception as e:
            logger.error(f"Error invalidating user cache on Subscription save: {e}")

    @receiver(post_delete, sender=Subscription)
    def invalidate_user_cache_on_subscription_delete(sender, instance, **kwargs):
        """
        Invalidate user cache when Subscription model is deleted.
        """
        try:
            user_cache_service.invalidate_user_cache(instance.user_id)
            logger.debug(
                f"Invalidated cache for user {instance.user_id} after Subscription delete"
            )
        except Exception as e:
            logger.error(f"Error invalidating user cache on Subscription delete: {e}")

except ImportError:
    # Subscription model doesn't exist yet
    logger.debug("Subscription model not found - skipping subscription cache signals")
    pass
