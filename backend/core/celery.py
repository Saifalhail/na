"""
Celery configuration for Nutrition AI backend.
"""

import os

from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")

# Create the Celery app
app = Celery("nutrition_ai")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery beat schedule for periodic tasks
app.conf.beat_schedule = {
    # Daily nutrition summary at 8 PM
    "daily-nutrition-summary": {
        "task": "api.tasks.notification_tasks.send_daily_nutrition_summary",
        "schedule": crontab(hour=20, minute=0),
        "options": {"queue": "notifications"},
    },
    # Weekly progress report on Sundays at 10 AM
    "weekly-progress-report": {
        "task": "api.tasks.notification_tasks.send_weekly_progress_report",
        "schedule": crontab(hour=10, minute=0, day_of_week=0),
        "options": {"queue": "notifications"},
    },
    # Clean up old API logs every day at 2 AM
    "cleanup-api-logs": {
        "task": "api.tasks.maintenance_tasks.cleanup_old_api_logs",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "maintenance"},
    },
    # Check and send meal reminders every hour
    "meal-reminders": {
        "task": "api.tasks.notification_tasks.send_meal_reminders",
        "schedule": crontab(minute=0),  # Every hour
        "options": {"queue": "notifications"},
    },
}

# Celery configuration
app.conf.update(
    # Broker settings
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.TIME_ZONE,
    enable_utc=True,
    # Task routing
    task_routes={
        "api.tasks.email_tasks.*": {"queue": "emails"},
        "api.tasks.notification_tasks.*": {"queue": "notifications"},
        "api.tasks.ai_tasks.*": {"queue": "ai_processing"},
        "api.tasks.maintenance_tasks.*": {"queue": "maintenance"},
    },
    # Task time limits
    task_soft_time_limit=300,  # 5 minutes
    task_time_limit=600,  # 10 minutes
    # Task result settings
    result_expires=3600,  # 1 hour
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    # Beat settings
    beat_scheduler="django_celery_beat.schedulers:DatabaseScheduler",
)


@app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f"Request: {self.request!r}")
