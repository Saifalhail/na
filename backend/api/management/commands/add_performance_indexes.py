"""
Django management command to add performance indexes to the database.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Add performance indexes to optimize common queries"

    def handle(self, *args, **options):
        """Add database indexes for common query patterns."""
        
        with connection.cursor() as cursor:
            # Indexes for meal queries
            indexes_to_add = [
                # Meal filtering indexes
                {
                    "table": "meals",
                    "name": "idx_meals_user_consumed_at",
                    "columns": ["user_id", "consumed_at"],
                    "description": "Optimize meal history queries by user and date"
                },
                {
                    "table": "meals", 
                    "name": "idx_meals_user_meal_type",
                    "columns": ["user_id", "meal_type"],
                    "description": "Optimize meal filtering by user and meal type"
                },
                {
                    "table": "meals",
                    "name": "idx_meals_consumed_at_desc",
                    "columns": ["consumed_at DESC"],
                    "description": "Optimize meal ordering by consumed date"
                },
                
                # Meal items indexes
                {
                    "table": "meal_items",
                    "name": "idx_meal_items_meal_id",
                    "columns": ["meal_id"],
                    "description": "Optimize meal item lookups by meal"
                },
                {
                    "table": "meal_items",
                    "name": "idx_meal_items_food_item_id",
                    "columns": ["food_item_id"],
                    "description": "Optimize meal item lookups by food item"
                },
                
                # Favorite meals indexes
                {
                    "table": "api_favoritemeal",
                    "name": "idx_favoritemeal_user_created",
                    "columns": ["user_id", "created_at"],
                    "description": "Optimize favorite meal queries by user"
                },
                {
                    "table": "api_favoritemeal",
                    "name": "idx_favoritemeal_quick_add_order",
                    "columns": ["quick_add_order"],
                    "description": "Optimize favorite meal ordering"
                },
                
                # Food items indexes
                {
                    "table": "food_items",
                    "name": "idx_food_items_name_search",
                    "columns": ["name"],
                    "description": "Optimize food item search by name"
                },
                {
                    "table": "food_items",
                    "name": "idx_food_items_barcode",
                    "columns": ["barcode"],
                    "description": "Optimize food item lookup by barcode"
                },
                
                # User authentication indexes
                {
                    "table": "auth_user",
                    "name": "idx_user_email_active",
                    "columns": ["email", "is_active"],
                    "description": "Optimize user authentication queries"
                },
                {
                    "table": "auth_user",
                    "name": "idx_user_is_verified",
                    "columns": ["is_verified"],
                    "description": "Optimize verified user queries"
                },
                
                # API usage logs indexes
                {
                    "table": "api_apiusagelog",
                    "name": "idx_apiusagelog_user_created",
                    "columns": ["user_id", "created_at"],
                    "description": "Optimize API usage queries by user"
                },
                {
                    "table": "api_apiusagelog",
                    "name": "idx_apiusagelog_endpoint_created",
                    "columns": ["endpoint", "created_at"],
                    "description": "Optimize API usage queries by endpoint"
                },
                
                # Notification indexes
                {
                    "table": "api_notification",
                    "name": "idx_notification_user_created",
                    "columns": ["user_id", "created_at"],
                    "description": "Optimize notification queries by user"
                },
                {
                    "table": "api_notification",
                    "name": "idx_notification_user_read",
                    "columns": ["user_id", "is_read"],
                    "description": "Optimize unread notification queries"
                },
                
                # Token blacklist indexes
                {
                    "table": "api_blacklistedtoken",
                    "name": "idx_blacklistedtoken_hash",
                    "columns": ["token_hash"],
                    "description": "Optimize token blacklist lookups"
                },
                {
                    "table": "api_blacklistedtoken",
                    "name": "idx_blacklistedtoken_expires",
                    "columns": ["expires_at"],
                    "description": "Optimize token cleanup queries"
                },
                
                # SMS OTP indexes
                {
                    "table": "api_smsotpcode",
                    "name": "idx_smsotpcode_phone_created",
                    "columns": ["phone_number", "created_at"],
                    "description": "Optimize SMS OTP queries by phone"
                },
                {
                    "table": "api_smsotpcode",
                    "name": "idx_smsotpcode_expires",
                    "columns": ["expires_at"],
                    "description": "Optimize SMS OTP cleanup queries"
                },
            ]
            
            created_count = 0
            skipped_count = 0
            
            for index in indexes_to_add:
                try:
                    # Check if index already exists
                    cursor.execute(f"""
                        SELECT COUNT(*) 
                        FROM pg_indexes 
                        WHERE tablename = '{index['table']}' 
                        AND indexname = '{index['name']}'
                    """)
                    
                    if cursor.fetchone()[0] > 0:
                        self.stdout.write(
                            self.style.WARNING(f"Index {index['name']} already exists, skipping")
                        )
                        skipped_count += 1
                        continue
                    
                    # Create the index
                    columns_str = ", ".join(index['columns'])
                    sql = f"""
                        CREATE INDEX CONCURRENTLY {index['name']} 
                        ON {index['table']} ({columns_str})
                    """
                    
                    cursor.execute(sql)
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Created index {index['name']} on {index['table']} - {index['description']}"
                        )
                    )
                    created_count += 1
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to create index {index['name']}: {str(e)}"
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSummary: {created_count} indexes created, {skipped_count} skipped"
                )
            )