# Generated manually for notifications

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_add_two_factor_auth'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('meal_reminder', 'Meal Reminder'), ('daily_summary', 'Daily Summary'), ('weekly_report', 'Weekly Report'), ('goal_achieved', 'Goal Achieved'), ('streak_milestone', 'Streak Milestone'), ('system', 'System Notification'), ('tips', 'Nutrition Tips')], max_length=50, verbose_name='notification type')),
                ('title', models.CharField(max_length=200, verbose_name='title')),
                ('message', models.TextField(verbose_name='message')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed'), ('read', 'Read'), ('archived', 'Archived')], default='pending', max_length=20, verbose_name='status')),
                ('channel', models.CharField(choices=[('in_app', 'In-App'), ('email', 'Email'), ('push', 'Push Notification'), ('sms', 'SMS')], default='in_app', max_length=20, verbose_name='delivery channel')),
                ('priority', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')], default='medium', max_length=10, verbose_name='priority')),
                ('data', models.JSONField(blank=True, default=dict, help_text='Additional data for the notification', verbose_name='additional data')),
                ('scheduled_for', models.DateTimeField(blank=True, help_text='When this notification should be sent', null=True, verbose_name='scheduled for')),
                ('sent_at', models.DateTimeField(blank=True, null=True, verbose_name='sent at')),
                ('read_at', models.DateTimeField(blank=True, null=True, verbose_name='read at')),
                ('failed_at', models.DateTimeField(blank=True, null=True, verbose_name='failed at')),
                ('error_message', models.TextField(blank=True, verbose_name='error message')),
                ('retry_count', models.PositiveSmallIntegerField(default=0, verbose_name='retry count')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'notification',
                'verbose_name_plural': 'notifications',
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notification_preferences',
            field=models.JSONField(blank=True, default=dict, help_text='Detailed preferences for different notification types', verbose_name='notification preferences'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='meal_reminder_times',
            field=models.JSONField(blank=True, default=list, help_text='Times for meal reminders (e.g., ["08:00", "12:00", "18:00"])', verbose_name='meal reminder times'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='email_daily_summary',
            field=models.BooleanField(default=True, help_text='Receive daily nutrition summary via email', verbose_name='email daily summary'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='email_weekly_report',
            field=models.BooleanField(default=True, help_text='Receive weekly progress report via email', verbose_name='email weekly report'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='email_tips',
            field=models.BooleanField(default=True, help_text='Receive nutrition tips and recommendations via email', verbose_name='email nutrition tips'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'status'], name='notifications_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'type'], name='notifications_user_type_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['scheduled_for', 'status'], name='notifications_scheduled_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['created_at'], name='notifications_created_idx'),
        ),
    ]