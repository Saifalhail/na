"""
Management command to warm user cache.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from api.services.user_cache_service import user_cache_service

User = get_user_model()


class Command(BaseCommand):
    """
    Warm user cache for active users.

    Usage:
        python manage.py warm_user_cache
        python manage.py warm_user_cache --active-only
        python manage.py warm_user_cache --user-id 123
    """

    help = "Warm user cache for improved performance"

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-id",
            type=int,
            help="Warm cache for specific user ID",
        )

        parser.add_argument(
            "--active-only",
            action="store_true",
            help="Only warm cache for active users (logged in within last 30 days)",
        )

        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of users to process in each batch (default: 100)",
        )

        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed output",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        user_id = options.get("user_id")
        active_only = options["active_only"]
        batch_size = options["batch_size"]
        verbose = options["verbose"]

        self.stdout.write("Starting user cache warming...")

        if user_id:
            # Warm cache for specific user
            self._warm_single_user(user_id, verbose)
        else:
            # Warm cache for multiple users
            self._warm_multiple_users(active_only, batch_size, verbose)

        self.stdout.write(self.style.SUCCESS("User cache warming completed!"))

    def _warm_single_user(self, user_id: int, verbose: bool):
        """Warm cache for a single user."""
        try:
            cached_data = user_cache_service.warm_user_cache(user_id)

            if cached_data:
                self.stdout.write(
                    self.style.SUCCESS(f"Warmed cache for user {user_id}")
                )

                if verbose:
                    self.stdout.write(f"  Tier: {cached_data.get('tier')}")
                    self.stdout.write(
                        f"  Permissions: {cached_data.get('permissions')}"
                    )
                    self.stdout.write(
                        f"  Profile: {'Yes' if cached_data.get('profile') else 'No'}"
                    )
            else:
                self.stdout.write(
                    self.style.ERROR(f"Failed to warm cache for user {user_id}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error warming cache for user {user_id}: {e}")
            )

    def _warm_multiple_users(self, active_only: bool, batch_size: int, verbose: bool):
        """Warm cache for multiple users."""
        # Build queryset
        queryset = User.objects.filter(is_active=True)

        if active_only:
            # Only users who logged in within last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)
            queryset = queryset.filter(
                Q(last_login__gte=thirty_days_ago) | Q(date_joined__gte=thirty_days_ago)
            )

        total_users = queryset.count()
        self.stdout.write(f"Found {total_users} users to process")

        if total_users == 0:
            self.stdout.write("No users to process")
            return

        # Process in batches
        processed = 0
        successful = 0
        failed = 0

        for batch_start in range(0, total_users, batch_size):
            batch_end = min(batch_start + batch_size, total_users)
            batch_users = queryset[batch_start:batch_end]

            self.stdout.write(
                f"Processing batch {batch_start + 1}-{batch_end} of {total_users}"
            )

            for user in batch_users:
                try:
                    cached_data = user_cache_service.warm_user_cache(user.id)

                    if cached_data:
                        successful += 1
                        if verbose:
                            self.stdout.write(f"  ✓ User {user.id} ({user.email})")
                    else:
                        failed += 1
                        if verbose:
                            self.stdout.write(f"  ✗ User {user.id} ({user.email})")

                except Exception as e:
                    failed += 1
                    if verbose:
                        self.stdout.write(f"  ✗ User {user.id}: {e}")

                processed += 1

            # Show progress
            progress = (processed / total_users) * 100
            self.stdout.write(f"Progress: {processed}/{total_users} ({progress:.1f}%)")

        # Final summary
        self.stdout.write(f"\nCache warming summary:")
        self.stdout.write(f"  Total processed: {processed}")
        self.stdout.write(f"  Successful: {successful}")
        self.stdout.write(f"  Failed: {failed}")

        if successful > 0:
            success_rate = (successful / processed) * 100
            self.stdout.write(f"  Success rate: {success_rate:.1f}%")
