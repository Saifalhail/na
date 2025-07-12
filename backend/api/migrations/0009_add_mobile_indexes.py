# Generated manually for mobile optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_add_device_push_models'),
    ]

    operations = [
        # Add indexes for meals
        migrations.AddIndex(
            model_name='meal',
            index=models.Index(fields=['user', '-consumed_at'], name='idx_meals_user_consumed'),
        ),
        migrations.AddIndex(
            model_name='meal',
            index=models.Index(fields=['user', '-updated_at'], name='idx_meals_user_updated'),
        ),
        
        # Add indexes for notifications
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', '-updated_at'], name='idx_notifications_user_upd'),
        ),
        
        # Add indexes for subscriptions
        migrations.AddIndex(
            model_name='subscription',
            index=models.Index(fields=['user', 'status'], name='idx_subscriptions_user_stat'),
        ),
        
        # Add indexes for meal items
        migrations.AddIndex(
            model_name='mealitem',
            index=models.Index(fields=['meal', 'food_item'], name='idx_meal_items_meal_food'),
        ),
        
        # The device token and push notification indexes are already added in the model definition
        
        # Add indexes for API usage logs
        migrations.AddIndex(
            model_name='apiusagelog',
            index=models.Index(fields=['user', 'endpoint', '-created_at'], name='idx_api_usage_user_endpoint'),
        ),
        migrations.AddIndex(
            model_name='apiusagelog',
            index=models.Index(fields=['ip_address', 'endpoint', '-created_at'], name='idx_api_usage_ip_endpoint'),
        ),
        
        # Add indexes for payments
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['user', 'status', '-created_at'], name='idx_payments_user_status'),
        ),
        
        # Add indexes for invoices
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['user', 'status'], name='idx_invoices_user_status'),
        ),
    ]