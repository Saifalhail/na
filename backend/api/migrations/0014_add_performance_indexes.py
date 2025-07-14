# Generated migration for performance optimization indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "api",
            "0013_rename_idx_malware_scan_hash_malware_sca_file_ha_3d2038_idx_and_more",
        ),
    ]

    operations = [
        # Add indexes for Meal model
        migrations.AddIndex(
            model_name='meal',
            index=models.Index(fields=['user', 'consumed_at'], name='idx_meals_user_consumed_at'),
        ),
        migrations.AddIndex(
            model_name='meal',
            index=models.Index(fields=['user', 'meal_type'], name='idx_meals_user_meal_type'),
        ),
        migrations.AddIndex(
            model_name='meal',
            index=models.Index(fields=['-consumed_at'], name='idx_meals_consumed_at_desc'),
        ),
        
        # Add indexes for MealItem model
        migrations.AddIndex(
            model_name='mealitem',
            index=models.Index(fields=['meal'], name='idx_meal_items_meal_id'),
        ),
        migrations.AddIndex(
            model_name='mealitem',
            index=models.Index(fields=['food_item'], name='idx_meal_items_food_item'),
        ),
        
        # Add indexes for FavoriteMeal model
        migrations.AddIndex(
            model_name='favoritemeal',
            index=models.Index(fields=['user', 'created_at'], name='idx_favoritemeal_user_crtd'),
        ),
        migrations.AddIndex(
            model_name='favoritemeal',
            index=models.Index(fields=['quick_add_order'], name='idx_favoritemeal_quick_add'),
        ),
        
        # Add indexes for FoodItem model
        migrations.AddIndex(
            model_name='fooditem',
            index=models.Index(fields=['name'], name='idx_food_items_name_search'),
        ),
        migrations.AddIndex(
            model_name='fooditem',
            index=models.Index(fields=['barcode'], name='idx_food_items_barcode'),
        ),
        
        # Add indexes for User model (custom user)
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email', 'is_active'], name='idx_user_email_active'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['is_verified'], name='idx_user_is_verified'),
        ),
        
        # Add indexes for APIUsageLog model
        migrations.AddIndex(
            model_name='apiusagelog',
            index=models.Index(fields=['user', 'created_at'], name='idx_apiusagelog_user_crtd'),
        ),
        migrations.AddIndex(
            model_name='apiusagelog',
            index=models.Index(fields=['endpoint', 'created_at'], name='idx_apiusagelog_endpt_crtd'),
        ),
        
        # Add indexes for Notification model
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'created_at'], name='idx_notification_user_crtd'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read'], name='idx_notification_user_read'),
        ),
        
        # Add indexes for BlacklistedToken model
        migrations.AddIndex(
            model_name='blacklistedtoken',
            index=models.Index(fields=['token_hash'], name='idx_blacklistedtoken_hash'),
        ),
        migrations.AddIndex(
            model_name='blacklistedtoken',
            index=models.Index(fields=['expires_at'], name='idx_blacklistedtoken_exp'),
        ),
        
        # Add indexes for SMSOTPCode model
        migrations.AddIndex(
            model_name='smsotpcode',
            index=models.Index(fields=['phone_number', 'created_at'], name='idx_smsotpcode_phone_crtd'),
        ),
        migrations.AddIndex(
            model_name='smsotpcode',
            index=models.Index(fields=['expires_at'], name='idx_smsotpcode_expires'),
        ),
    ]
