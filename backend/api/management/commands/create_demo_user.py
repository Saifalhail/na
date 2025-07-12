from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a demo user for testing purposes'

    def handle(self, *args, **options):
        demo_email = 'demo@nutritionai.com'
        demo_password = 'demo123456'
        
        # Check if demo user already exists
        if User.objects.filter(email=demo_email).exists():
            self.stdout.write(self.style.WARNING(f'Demo user {demo_email} already exists'))
            return
        
        # Create demo user
        demo_user = User.objects.create_user(
            email=demo_email,
            username='DemoUser',
            password=demo_password,
            first_name='Demo',
            last_name='User',
            is_verified=True,  # Pre-verify the demo account
        )
        
        # Create user profile with some sample data
        UserProfile.objects.create(
            user=demo_user,
            bio='Demo account for testing Nutrition AI features',
            phone_number='+1234567890',
            date_of_birth='1990-01-01',
            gender='other',
            height=170,  # cm
            weight=70,   # kg
            activity_level='moderately_active',
            dietary_preferences=['vegetarian'],
            allergies=['peanuts'],
            health_conditions=['none'],
            daily_calorie_goal=2000,
            daily_protein_goal=50,
            daily_carbs_goal=250,
            daily_fat_goal=70,
            measurement_system='metric',
            notifications_enabled=True,
            newsletter_subscribed=False,
            is_premium=True,  # Give demo user premium features
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created demo user:\n'
                f'Email: {demo_email}\n'
                f'Password: {demo_password}\n'
                f'Username: DemoUser'
            )
        )