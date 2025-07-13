"""
Management command to clean up expired blacklisted tokens.
"""

from django.core.management.base import BaseCommand

from api.models import BlacklistedToken
from api.security.token_blacklist import token_blacklist_service


class Command(BaseCommand):
    """
    Clean up expired blacklisted tokens.

    Usage:
        python manage.py cleanup_tokens
    """

    help = "Clean up expired blacklisted tokens from the database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed output",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        dry_run = options["dry_run"]
        verbose = options["verbose"]

        self.stdout.write("Starting token cleanup...")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN MODE - No tokens will be deleted")
            )

            # Count expired tokens
            from django.utils import timezone

            expired_count = BlacklistedToken.objects.filter(
                expires_at__lt=timezone.now()
            ).count()

            self.stdout.write(f"Would delete {expired_count} expired tokens")
        else:
            # Actually clean up tokens
            cleaned_count = token_blacklist_service.cleanup_expired_tokens()

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully cleaned up {cleaned_count} expired tokens"
                )
            )

        if verbose:
            # Show remaining token statistics
            total_tokens = BlacklistedToken.objects.count()
            access_tokens = BlacklistedToken.objects.filter(token_type="access").count()
            refresh_tokens = BlacklistedToken.objects.filter(
                token_type="refresh"
            ).count()

            self.stdout.write(f"\nToken statistics:")
            self.stdout.write(f"  Total blacklisted tokens: {total_tokens}")
            self.stdout.write(f"  Access tokens: {access_tokens}")
            self.stdout.write(f"  Refresh tokens: {refresh_tokens}")

        self.stdout.write("Token cleanup completed.")
