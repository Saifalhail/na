"""
Celery tasks for SMS notifications.
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from django.conf import settings
import logging

from api.models import Notification
from api.services.sms_service import sms_service

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 1 minute
    retry_backoff=True,
    retry_jitter=True
)
def send_sms_notification(self, notification_id):
    """
    Send SMS notification to user.
    
    Args:
        notification_id: ID of the Notification object
        
    Returns:
        Dict with sending status
    """
    try:
        # Get notification
        notification = Notification.objects.select_related('user', 'user__profile').get(
            id=notification_id
        )
        
        # Check if notification should be sent via SMS
        if notification.channel != 'sms':
            logger.warning(f"Notification {notification_id} is not an SMS notification")
            return {'success': False, 'error': 'Not an SMS notification'}
        
        # Check if user has SMS notifications enabled
        profile = notification.user.profile
        if not getattr(profile, 'receive_sms_notifications', False):
            logger.info(f"User {notification.user.email} has SMS notifications disabled")
            notification.status = 'skipped'
            notification.save()
            return {'success': False, 'error': 'SMS notifications disabled for user'}
        
        # Get user's phone number
        phone_number = getattr(profile, 'phone_number', None)
        if not phone_number:
            logger.warning(f"User {notification.user.email} has no phone number")
            notification.status = 'failed'
            notification.error_message = 'No phone number configured'
            notification.save()
            return {'success': False, 'error': 'No phone number'}
        
        # Format phone number
        formatted_phone = sms_service.format_phone_number(phone_number)
        if not formatted_phone:
            logger.error(f"Invalid phone number for user {notification.user.email}: {phone_number}")
            notification.status = 'failed'
            notification.error_message = 'Invalid phone number format'
            notification.save()
            return {'success': False, 'error': 'Invalid phone number'}
        
        # Prepare SMS message
        # SMS messages should be concise
        message = f"{notification.title}\n{notification.message}"
        
        # Truncate if too long (SMS limit is 160 chars for single message)
        if len(message) > 160:
            message = message[:157] + "..."
        
        # Send SMS
        result = sms_service.send_sms(
            to_number=formatted_phone,
            message=message,
            callback_url=getattr(settings, 'TWILIO_STATUS_CALLBACK_URL', None)
        )
        
        if result['success']:
            notification.status = 'sent'
            notification.sent_at = timezone.now()
            notification.metadata = notification.metadata or {}
            notification.metadata['sms_sid'] = result['sid']
            notification.metadata['sms_status'] = result.get('status')
            notification.save()
            
            logger.info(f"SMS notification {notification_id} sent successfully to {formatted_phone}")
            return {
                'success': True,
                'sid': result['sid'],
                'to': formatted_phone
            }
        else:
            # Retry on certain errors
            error = result.get('error', 'Unknown error')
            if self.request.retries < self.max_retries:
                logger.warning(f"SMS sending failed, retrying: {error}")
                raise self.retry(exc=Exception(error))
            
            # Max retries reached
            notification.status = 'failed'
            notification.error_message = error
            notification.save()
            
            logger.error(f"Failed to send SMS notification {notification_id}: {error}")
            return {'success': False, 'error': error}
            
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
        return {'success': False, 'error': 'Notification not found'}
        
    except Exception as e:
        logger.error(f"Unexpected error sending SMS notification {notification_id}: {str(e)}")
        
        # Retry if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        # Update notification status
        try:
            notification = Notification.objects.get(id=notification_id)
            notification.status = 'failed'
            notification.error_message = str(e)
            notification.save()
        except:
            pass
        
        return {'success': False, 'error': str(e)}


@shared_task
def send_bulk_sms_notifications(notification_ids):
    """
    Send multiple SMS notifications in bulk.
    
    Args:
        notification_ids: List of notification IDs
        
    Returns:
        Dict with results for each notification
    """
    results = {}
    
    for notification_id in notification_ids:
        try:
            result = send_sms_notification.delay(notification_id)
            results[notification_id] = {
                'task_id': result.id,
                'status': 'queued'
            }
        except Exception as e:
            logger.error(f"Failed to queue SMS for notification {notification_id}: {e}")
            results[notification_id] = {
                'status': 'error',
                'error': str(e)
            }
    
    return results


@shared_task
def check_sms_delivery_status(message_sid):
    """
    Check the delivery status of an SMS message.
    
    Args:
        message_sid: Twilio message SID
        
    Returns:
        Dict with message status
    """
    try:
        status = sms_service.get_message_status(message_sid)
        
        if status:
            # Update notification if we can find it
            try:
                notification = Notification.objects.filter(
                    metadata__sms_sid=message_sid
                ).first()
                
                if notification:
                    notification.metadata['sms_status'] = status['status']
                    notification.metadata['sms_error_code'] = status.get('error_code')
                    notification.metadata['sms_error_message'] = status.get('error_message')
                    
                    # Update notification status based on SMS status
                    if status['status'] == 'delivered':
                        notification.status = 'delivered'
                    elif status['status'] in ['failed', 'undelivered']:
                        notification.status = 'failed'
                        notification.error_message = status.get('error_message', 'SMS delivery failed')
                    
                    notification.save()
                    logger.info(f"Updated notification status for SMS {message_sid}: {status['status']}")
                    
            except Exception as e:
                logger.error(f"Error updating notification for SMS {message_sid}: {e}")
            
            return status
        else:
            return {'error': 'Could not fetch SMS status'}
            
    except Exception as e:
        logger.error(f"Error checking SMS status for {message_sid}: {e}")
        return {'error': str(e)}


# Import timezone
from django.utils import timezone