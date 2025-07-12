"""
Signal handlers for notification-related events.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from api.models import Notification
from api.tasks.email_tasks import send_email_notification
from api.tasks.sms_tasks import send_sms_notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def handle_notification_created(sender, instance, created, **kwargs):
    """
    Handle notification creation and trigger appropriate sending mechanisms.
    
    Args:
        sender: The model class (Notification)
        instance: The actual notification instance
        created: Boolean indicating if this is a new instance
        **kwargs: Additional arguments
    """
    if not created:
        return
    
    # Only process pending notifications
    if instance.status != 'pending':
        return
    
    # Trigger appropriate sending based on channel
    try:
        if instance.channel == 'email':
            # Send email notification asynchronously
            send_email_notification.delay(instance.id)
            logger.info(f"Queued email notification {instance.id} for {instance.user.email}")
            
        elif instance.channel == 'sms':
            # Send SMS notification asynchronously
            send_sms_notification.delay(instance.id)
            logger.info(f"Queued SMS notification {instance.id} for {instance.user.email}")
            
        elif instance.channel == 'push':
            # Push notifications are handled by push notification service
            # which should be triggered separately
            logger.info(f"Push notification {instance.id} created for {instance.user.email}")
            
        elif instance.channel == 'in_app':
            # In-app notifications are automatically available
            # Can trigger WebSocket notification here if needed
            instance.status = 'sent'
            instance.save()
            logger.info(f"In-app notification {instance.id} created for {instance.user.email}")
            
    except Exception as e:
        logger.error(f"Error processing notification {instance.id}: {e}")
        instance.status = 'failed'
        instance.error_message = str(e)
        instance.save()