"""
Celery tasks for notifications and reminders.
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Avg, Sum, Count, Value, DecimalField
from django.db.models.functions import Coalesce
from datetime import datetime, timedelta
import logging

from api.models import Notification, Meal, UserProfile
from api.tasks.email_tasks import send_email_notification

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def send_daily_nutrition_summary():
    """
    Send daily nutrition summary to all active users who have enabled it.
    Runs daily at 8 PM user's local time.
    """
    # Get current time in UTC
    now = timezone.now()
    
    # Get users who want daily summaries
    users = User.objects.filter(
        is_active=True,
        profile__email_daily_summary=True,
        profile__receive_email_notifications=True
    ).select_related('profile')
    
    for user in users:
        try:
            # Calculate user's local time based on timezone
            # For now, we'll use a simple approach - this can be enhanced with user timezone support
            
            # Get today's meals
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            meals = Meal.objects.filter(
                user=user,
                consumed_at__range=(today_start, today_end)
            ).aggregate(
                total_calories=Coalesce(Sum('meal_items__calories'), Value(0), output_field=DecimalField()),
                total_protein=Coalesce(Sum('meal_items__protein'), Value(0), output_field=DecimalField()),
                total_carbs=Coalesce(Sum('meal_items__carbohydrates'), Value(0), output_field=DecimalField()),
                total_fat=Coalesce(Sum('meal_items__fat'), Value(0), output_field=DecimalField()),
                meal_count=Count('id')
            )
            
            # Only send if user logged meals today
            if meals['meal_count'] > 0:
                # Create notification
                notification = Notification.objects.create(
                    user=user,
                    type='daily_summary',
                    title='Your Daily Nutrition Summary',
                    message=f"You logged {meals['meal_count']} meals today with {meals['total_calories'] or 0:.0f} calories.",
                    channel='email',
                    priority='medium',
                    data={
                        'date': str(now.date()),
                        'total_calories': float(meals['total_calories'] or 0),
                        'total_protein': float(meals['total_protein'] or 0),
                        'total_carbs': float(meals['total_carbs'] or 0),
                        'total_fat': float(meals['total_fat'] or 0),
                        'meal_count': meals['meal_count'],
                        'calorie_goal': float(user.profile.daily_calorie_goal or 2000),
                        'protein_goal': float(user.profile.daily_protein_goal or 50),
                        'carbs_goal': float(user.profile.daily_carbs_goal or 250),
                        'fat_goal': float(user.profile.daily_fat_goal or 65),
                    }
                )
                
                # Send email notification
                send_email_notification.delay(notification.id)
                
                logger.info(f"Daily summary created for {user.email}")
                
        except Exception as e:
            logger.error(f"Failed to create daily summary for {user.email}: {str(e)}")


@shared_task
def send_weekly_progress_report():
    """
    Send weekly progress report to all active users who have enabled it.
    Runs on Sundays at 10 AM user's local time.
    """
    now = timezone.now()
    week_start = now - timedelta(days=7)
    
    # Get users who want weekly reports
    users = User.objects.filter(
        is_active=True,
        profile__email_weekly_report=True,
        profile__receive_email_notifications=True
    ).select_related('profile')
    
    for user in users:
        try:
            # Get week's meal statistics
            week_stats = Meal.objects.filter(
                user=user,
                consumed_at__range=(week_start, now)
            ).aggregate(
                avg_calories=Coalesce(Avg('meal_items__calories'), Value(0), output_field=DecimalField()),
                total_calories=Coalesce(Sum('meal_items__calories'), Value(0), output_field=DecimalField()),
                total_protein=Coalesce(Sum('meal_items__protein'), Value(0), output_field=DecimalField()),
                total_carbs=Coalesce(Sum('meal_items__carbohydrates'), Value(0), output_field=DecimalField()),
                total_fat=Coalesce(Sum('meal_items__fat'), Value(0), output_field=DecimalField()),
                meal_count=Count('id'),
                days_logged=Count('consumed_at__date', distinct=True)
            )
            
            # Only send if user logged meals this week
            if week_stats['meal_count'] > 0:
                # Calculate adherence to goals
                daily_goal = float(user.profile.daily_calorie_goal or 2000)
                expected_calories = daily_goal * 7
                adherence = (week_stats['total_calories'] / expected_calories * 100) if expected_calories > 0 else 0
                
                # Create notification
                notification = Notification.objects.create(
                    user=user,
                    type='weekly_report',
                    title='Your Weekly Nutrition Report',
                    message=f"You logged {week_stats['meal_count']} meals across {week_stats['days_logged']} days this week.",
                    channel='email',
                    priority='medium',
                    data={
                        'week_start': str(week_start.date()),
                        'week_end': str(now.date()),
                        'avg_daily_calories': float(week_stats['avg_calories'] or 0),
                        'total_calories': float(week_stats['total_calories'] or 0),
                        'total_protein': float(week_stats['total_protein'] or 0),
                        'total_carbs': float(week_stats['total_carbs'] or 0),
                        'total_fat': float(week_stats['total_fat'] or 0),
                        'meal_count': week_stats['meal_count'],
                        'days_logged': week_stats['days_logged'],
                        'goal_adherence': round(adherence, 1),
                    }
                )
                
                # Send email notification
                send_email_notification.delay(notification.id)
                
                logger.info(f"Weekly report created for {user.email}")
                
        except Exception as e:
            logger.error(f"Failed to create weekly report for {user.email}: {str(e)}")


@shared_task
def send_meal_reminders():
    """
    Send meal reminders based on user preferences.
    Runs every hour to check for users who need reminders.
    """
    now = timezone.now()
    current_hour = now.hour
    current_minute = now.minute
    
    # Find users with meal reminders set for this time
    # This is a simplified version - in production, you'd want to handle timezones properly
    users = UserProfile.objects.filter(
        user__is_active=True,
        receive_push_notifications=True
    ).exclude(
        meal_reminder_times=[]
    ).select_related('user')
    
    for profile in users:
        try:
            # Check if current time matches any reminder time
            for reminder_time in profile.meal_reminder_times:
                try:
                    # Parse time string (format: "HH:MM")
                    hour, minute = map(int, reminder_time.split(':'))
                    
                    # Check if it's time for this reminder (within 5 minutes)
                    if hour == current_hour and abs(minute - current_minute) <= 5:
                        # Check if user hasn't logged a meal in the last 2 hours
                        recent_meal = Meal.objects.filter(
                            user=profile.user,
                            consumed_at__gte=now - timedelta(hours=2)
                        ).exists()
                        
                        if not recent_meal:
                            # Create reminder notification
                            notification = Notification.objects.create(
                                user=profile.user,
                                type='meal_reminder',
                                title='Time to log your meal!',
                                message="Don't forget to log your meal to track your nutrition goals.",
                                channel='in_app',
                                priority='medium',
                                data={
                                    'reminder_time': reminder_time,
                                    'timestamp': str(now),
                                }
                            )
                            
                            # If push notifications are enabled, send push
                            # For now, we'll just log it
                            logger.info(f"Meal reminder created for {profile.user.email} at {reminder_time}")
                            
                except ValueError:
                    logger.error(f"Invalid reminder time format for user {profile.user.email}: {reminder_time}")
                    
        except Exception as e:
            logger.error(f"Failed to process meal reminders for {profile.user.email}: {str(e)}")


@shared_task
def check_and_notify_achievements(user_id):
    """
    Check user achievements and send notifications.
    Called after meal logging or other relevant actions.
    
    Args:
        user_id: ID of the User object
    """
    try:
        user = User.objects.get(id=user_id)
        now = timezone.now()
        
        # Check various achievements
        
        # 1. Check daily goal achievement
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_meals = Meal.objects.filter(
            user=user,
            consumed_at__gte=today_start
        ).aggregate(
            total_calories=Coalesce(Sum('meal_items__calories'), Value(0), output_field=DecimalField()),
            total_protein=Coalesce(Sum('meal_items__protein'), Value(0), output_field=DecimalField())
        )
        
        profile = user.profile
        
        # Check if calorie goal is met
        if profile.daily_calorie_goal and today_meals['total_calories']:
            goal_percentage = (today_meals['total_calories'] / profile.daily_calorie_goal) * 100
            
            if 90 <= goal_percentage <= 110:  # Within 10% of goal
                # Check if notification already sent today
                existing = Notification.objects.filter(
                    user=user,
                    type='goal_achieved',
                    created_at__gte=today_start,
                    data__goal_type='daily_calories'
                ).exists()
                
                if not existing:
                    Notification.objects.create(
                        user=user,
                        type='goal_achieved',
                        title='Daily Calorie Goal Achieved! 🎯',
                        message=f"Great job! You've reached {goal_percentage:.0f}% of your daily calorie goal.",
                        channel='in_app',
                        priority='high',
                        data={
                            'goal_type': 'daily_calories',
                            'goal_value': float(profile.daily_calorie_goal),
                            'achieved_value': float(today_meals['total_calories']),
                            'percentage': float(round(goal_percentage, 1)),
                        }
                    )
        
        # 2. Check streak milestones
        # Count consecutive days with meals logged
        consecutive_days = 0
        check_date = now.date()
        
        while True:
            has_meal = Meal.objects.filter(
                user=user,
                consumed_at__date=check_date
            ).exists()
            
            if has_meal:
                consecutive_days += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        # Check for milestone streaks (7, 30, 100 days)
        streak_milestones = [7, 30, 100, 365]
        for milestone in streak_milestones:
            if consecutive_days == milestone:
                Notification.objects.create(
                    user=user,
                    type='streak_milestone',
                    title=f'{milestone}-Day Streak! 🔥',
                    message=f"Amazing! You've logged meals for {milestone} consecutive days.",
                    channel='in_app',
                    priority='high',
                    data={
                        'streak_days': consecutive_days,
                        'milestone': milestone,
                    }
                )
                break
                
        logger.info(f"Achievement check completed for {user.email}")
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        
    except Exception as e:
        logger.error(f"Failed to check achievements for user {user_id}: {str(e)}")


@shared_task
def cleanup_old_notifications():
    """
    Clean up old notifications.
    Runs daily to remove notifications older than 30 days.
    """
    cutoff_date = timezone.now() - timedelta(days=30)
    
    # Delete old read notifications
    deleted_count = Notification.objects.filter(
        status='read',
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old read notifications")
    
    # Archive old sent notifications
    archived_count = Notification.objects.filter(
        status='sent',
        created_at__lt=cutoff_date
    ).update(status='archived')
    
    logger.info(f"Archived {archived_count} old sent notifications")