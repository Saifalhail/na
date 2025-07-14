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
    Only invalidate for significant changes, not routine updates like last_login.
    """
    try:
        # Get the fields that were updated
        update_fields = kwargs.get('update_fields', None)
        
        # Skip cache invalidation for routine login updates
        if update_fields and set(update_fields).issubset({'last_login', 'last_login_ip'}):
            logger.debug(f"Skipping cache invalidation for routine login update for user {instance.id}")
            return
        
        # Only invalidate cache for significant changes
        significant_fields = {
            'account_type', 'is_active', 'is_verified', 'two_factor_enabled',
            'email', 'first_name', 'last_name', 'is_staff', 'is_superuser'
        }
        
        if update_fields is None or not significant_fields.isdisjoint(update_fields):
            user_cache_service.invalidate_user_cache(instance.id)
            logger.debug(f"Invalidated cache for user {instance.id} after User save")
        else:
            logger.debug(f"Skipping cache invalidation for non-significant update for user {instance.id}")
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
