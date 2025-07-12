"""
SMS notification service using Twilio.

This service handles sending SMS notifications to users.
"""
import os
import logging
from typing import Optional, Dict, Any
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

logger = logging.getLogger(__name__)


class SMSService:
    """
    Service for sending SMS notifications via Twilio.
    """
    
    def __init__(self):
        """Initialize Twilio client if credentials are configured."""
        self.enabled = False
        self.client = None
        self.from_number = None
        
        # Get Twilio credentials from settings
        account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        self.from_number = getattr(settings, 'TWILIO_FROM_NUMBER', None)
        
        if account_sid and auth_token and self.from_number:
            try:
                self.client = Client(account_sid, auth_token)
                self.enabled = True
                logger.info("SMS service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.enabled = False
        else:
            logger.warning("Twilio credentials not configured, SMS service disabled")
    
    def send_sms(
        self, 
        to_number: str, 
        message: str,
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an SMS message.
        
        Args:
            to_number: Phone number to send to (E.164 format)
            message: SMS message content (max 1600 chars)
            callback_url: Optional webhook URL for delivery status
            
        Returns:
            Dict with status and message details
        """
        if not self.enabled:
            logger.warning("SMS service is not enabled")
            return {
                'success': False,
                'error': 'SMS service not configured',
                'sid': None
            }
        
        # Validate message length
        if len(message) > 1600:
            logger.error("SMS message too long (max 1600 characters)")
            return {
                'success': False,
                'error': 'Message too long',
                'sid': None
            }
        
        try:
            # Send SMS via Twilio
            kwargs = {
                'body': message,
                'from_': self.from_number,
                'to': to_number
            }
            
            if callback_url:
                kwargs['status_callback'] = callback_url
            
            message_obj = self.client.messages.create(**kwargs)
            
            logger.info(f"SMS sent successfully to {to_number}, SID: {message_obj.sid}")
            
            return {
                'success': True,
                'sid': message_obj.sid,
                'status': message_obj.status,
                'to': message_obj.to,
                'from': message_obj.from_,
                'price': message_obj.price,
                'price_unit': message_obj.price_unit
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {to_number}: {e}")
            return {
                'success': False,
                'error': str(e),
                'sid': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_number}: {e}")
            return {
                'success': False,
                'error': 'Unexpected error occurred',
                'sid': None
            }
    
    def validate_phone_number(self, phone_number: str) -> bool:
        """
        Validate if a phone number is in E.164 format.
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not phone_number:
            return False
        
        # Basic E.164 validation
        # Must start with + and contain only digits
        if not phone_number.startswith('+'):
            return False
        
        # Remove + and check if rest are digits
        digits = phone_number[1:]
        if not digits.isdigit():
            return False
        
        # E.164 numbers are max 15 digits (excluding +)
        if len(digits) > 15 or len(digits) < 10:
            return False
        
        return True
    
    def format_phone_number(self, phone_number: str, country_code: str = '+1') -> Optional[str]:
        """
        Format a phone number to E.164 format.
        
        Args:
            phone_number: Phone number to format
            country_code: Default country code if not present
            
        Returns:
            Formatted phone number or None if invalid
        """
        if not phone_number:
            return None
        
        # Remove all non-digit characters except +
        cleaned = ''.join(char for char in phone_number if char.isdigit() or char == '+')
        
        # If already in E.164 format, validate and return
        if cleaned.startswith('+'):
            if self.validate_phone_number(cleaned):
                return cleaned
            return None
        
        # Add country code if not present
        if len(cleaned) == 10:  # US phone number without country code
            formatted = country_code + cleaned
        else:
            # Assume number includes country code without +
            formatted = '+' + cleaned
        
        # Validate the formatted number
        if self.validate_phone_number(formatted):
            return formatted
        
        return None
    
    def get_message_status(self, message_sid: str) -> Optional[Dict[str, Any]]:
        """
        Get the status of a sent message.
        
        Args:
            message_sid: Twilio message SID
            
        Returns:
            Message status details or None if error
        """
        if not self.enabled:
            return None
        
        try:
            message = self.client.messages.get(message_sid).fetch()
            
            return {
                'sid': message.sid,
                'status': message.status,
                'error_code': message.error_code,
                'error_message': message.error_message,
                'date_sent': message.date_sent,
                'date_updated': message.date_updated,
                'price': message.price,
                'price_unit': message.price_unit
            }
            
        except Exception as e:
            logger.error(f"Error fetching message status for {message_sid}: {e}")
            return None


# Global SMS service instance
sms_service = SMSService()