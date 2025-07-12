"""
Management command to create default subscription plans.
"""
from django.core.management.base import BaseCommand
from api.models import SubscriptionPlan


class Command(BaseCommand):
    help = 'Create default subscription plans'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing plans instead of creating new ones',
        )
    
    def handle(self, *args, **options):
        plans_data = [
            {
                'name': 'Free Plan',
                'plan_type': 'free',
                'price': 0.00,
                'billing_period': 'monthly',
                'ai_analysis_limit': 10,
                'meal_storage_limit': 50,
                'stripe_price_id': '',  # No Stripe price for free plan
            },
            {
                'name': 'Premium Monthly',
                'plan_type': 'premium',
                'price': 9.99,
                'billing_period': 'monthly',
                'ai_analysis_limit': 100,
                'meal_storage_limit': 500,
                'stripe_price_id': 'price_premium_monthly',  # Replace with actual Stripe price ID
            },
            {
                'name': 'Premium Yearly',
                'plan_type': 'premium',
                'price': 99.99,
                'billing_period': 'yearly',
                'ai_analysis_limit': 100,
                'meal_storage_limit': 500,
                'stripe_price_id': 'price_premium_yearly',  # Replace with actual Stripe price ID
            },
            {
                'name': 'Professional Monthly',
                'plan_type': 'professional',
                'price': 29.99,
                'billing_period': 'monthly',
                'ai_analysis_limit': -1,  # Unlimited
                'meal_storage_limit': -1,  # Unlimited
                'stripe_price_id': 'price_professional_monthly',  # Replace with actual Stripe price ID
            },
            {
                'name': 'Professional Yearly',
                'plan_type': 'professional',
                'price': 299.99,
                'billing_period': 'yearly',
                'ai_analysis_limit': -1,  # Unlimited
                'meal_storage_limit': -1,  # Unlimited
                'stripe_price_id': 'price_professional_yearly',  # Replace with actual Stripe price ID
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for plan_data in plans_data:
            # Create unique identifier for plan
            plan_key = f"{plan_data['plan_type']}_{plan_data['billing_period']}"
            
            if options['update']:
                # Update existing plan
                try:
                    plan = SubscriptionPlan.objects.get(
                        plan_type=plan_data['plan_type'],
                        billing_period=plan_data['billing_period']
                    )
                    for key, value in plan_data.items():
                        setattr(plan, key, value)
                    plan.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Updated plan: {plan.name}')
                    )
                except SubscriptionPlan.DoesNotExist:
                    # Create if doesn't exist
                    plan = SubscriptionPlan.objects.create(**plan_data)
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Created plan: {plan.name}')
                    )
            else:
                # Create new plan (skip if exists)
                plan, created = SubscriptionPlan.objects.get_or_create(
                    plan_type=plan_data['plan_type'],
                    billing_period=plan_data['billing_period'],
                    defaults=plan_data
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Created plan: {plan.name}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Plan already exists: {plan.name}')
                    )
        
        # Summary
        if options['update']:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCompleted: {updated_count} plans updated, {created_count} plans created'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCompleted: {created_count} plans created'
                )
            )
        
        # Display all plans
        self.stdout.write('\nCurrent subscription plans:')
        self.stdout.write('-' * 80)
        
        for plan in SubscriptionPlan.objects.all().order_by('plan_type', 'price'):
            ai_limit = 'Unlimited' if plan.ai_analysis_limit == -1 else plan.ai_analysis_limit
            meal_limit = 'Unlimited' if plan.meal_storage_limit == -1 else plan.meal_storage_limit
            
            self.stdout.write(
                f'{plan.name:<25} | ${plan.price:<8} | AI: {ai_limit:<10} | Meals: {meal_limit:<10} | Active: {plan.is_active}'
            )