# Generated manually for payment models

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_add_is_premium_to_userprofile"),
    ]

    operations = [
        migrations.CreateModel(
            name="SubscriptionPlan",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=100, verbose_name="plan name")),
                (
                    "plan_type",
                    models.CharField(
                        choices=[
                            ("free", "Free"),
                            ("premium", "Premium"),
                            ("professional", "Professional"),
                        ],
                        max_length=20,
                        unique=True,
                        verbose_name="plan type",
                    ),
                ),
                (
                    "price",
                    models.DecimalField(
                        decimal_places=2,
                        default=0.0,
                        max_digits=10,
                        verbose_name="price",
                    ),
                ),
                (
                    "billing_period",
                    models.CharField(
                        choices=[("monthly", "Monthly"), ("yearly", "Yearly")],
                        default="monthly",
                        max_length=20,
                        verbose_name="billing period",
                    ),
                ),
                (
                    "ai_analysis_limit",
                    models.IntegerField(
                        default=10,
                        help_text="Number of AI analyses per month (-1 for unlimited)",
                        verbose_name="AI analysis limit",
                    ),
                ),
                (
                    "meal_storage_limit",
                    models.IntegerField(
                        default=100,
                        help_text="Number of meals that can be stored (-1 for unlimited)",
                        verbose_name="meal storage limit",
                    ),
                ),
                (
                    "stripe_price_id",
                    models.CharField(
                        blank=True,
                        help_text="Stripe price ID for this plan",
                        max_length=255,
                        verbose_name="Stripe price ID",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="is active"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
            ],
            options={
                "verbose_name": "subscription plan",
                "verbose_name_plural": "subscription plans",
                "db_table": "subscription_plans",
                "ordering": ["price"],
            },
        ),
        migrations.CreateModel(
            name="Subscription",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "stripe_subscription_id",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        unique=True,
                        verbose_name="Stripe subscription ID",
                    ),
                ),
                (
                    "stripe_customer_id",
                    models.CharField(
                        blank=True, max_length=255, verbose_name="Stripe customer ID"
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("inactive", "Inactive"),
                            ("canceled", "Canceled"),
                            ("past_due", "Past Due"),
                            ("trialing", "Trialing"),
                        ],
                        default="inactive",
                        max_length=20,
                        verbose_name="status",
                    ),
                ),
                (
                    "trial_start",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="trial start"
                    ),
                ),
                (
                    "trial_end",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="trial end"
                    ),
                ),
                (
                    "current_period_start",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="current period start"
                    ),
                ),
                (
                    "current_period_end",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="current period end"
                    ),
                ),
                (
                    "canceled_at",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="canceled at"
                    ),
                ),
                (
                    "cancel_at_period_end",
                    models.BooleanField(
                        default=False, verbose_name="cancel at period end"
                    ),
                ),
                (
                    "ai_analyses_used",
                    models.IntegerField(default=0, verbose_name="AI analyses used"),
                ),
                (
                    "ai_analyses_reset_date",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="AI analyses reset date"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subscriptions",
                        to="api.subscriptionplan",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subscriptions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "subscription",
                "verbose_name_plural": "subscriptions",
                "db_table": "subscriptions",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PaymentMethod",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "stripe_payment_method_id",
                    models.CharField(
                        max_length=255,
                        unique=True,
                        verbose_name="Stripe payment method ID",
                    ),
                ),
                (
                    "payment_type",
                    models.CharField(
                        choices=[
                            ("card", "Credit/Debit Card"),
                            ("paypal", "PayPal"),
                            ("bank_account", "Bank Account"),
                        ],
                        max_length=20,
                        verbose_name="payment type",
                    ),
                ),
                (
                    "card_brand",
                    models.CharField(
                        blank=True, max_length=50, verbose_name="card brand"
                    ),
                ),
                (
                    "card_last4",
                    models.CharField(
                        blank=True, max_length=4, verbose_name="card last 4 digits"
                    ),
                ),
                (
                    "card_exp_month",
                    models.IntegerField(
                        blank=True, null=True, verbose_name="card expiry month"
                    ),
                ),
                (
                    "card_exp_year",
                    models.IntegerField(
                        blank=True, null=True, verbose_name="card expiry year"
                    ),
                ),
                (
                    "is_default",
                    models.BooleanField(default=False, verbose_name="is default"),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="is active"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payment_methods",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "payment method",
                "verbose_name_plural": "payment methods",
                "db_table": "payment_methods",
                "ordering": ["-is_default", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "stripe_payment_intent_id",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        unique=True,
                        verbose_name="Stripe payment intent ID",
                    ),
                ),
                (
                    "stripe_invoice_id",
                    models.CharField(
                        blank=True, max_length=255, verbose_name="Stripe invoice ID"
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2, max_digits=10, verbose_name="amount"
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        default="USD", max_length=3, verbose_name="currency"
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("succeeded", "Succeeded"),
                            ("failed", "Failed"),
                            ("canceled", "Canceled"),
                            ("refunded", "Refunded"),
                        ],
                        default="pending",
                        max_length=20,
                        verbose_name="status",
                    ),
                ),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="description"),
                ),
                (
                    "failure_reason",
                    models.TextField(blank=True, verbose_name="failure reason"),
                ),
                (
                    "refund_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=0.0,
                        max_digits=10,
                        verbose_name="refund amount",
                    ),
                ),
                (
                    "refunded_at",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="refunded at"
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "subscription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="api.subscription",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "payment",
                "verbose_name_plural": "payments",
                "db_table": "payments",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Invoice",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "stripe_invoice_id",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        unique=True,
                        verbose_name="Stripe invoice ID",
                    ),
                ),
                (
                    "invoice_number",
                    models.CharField(
                        max_length=100, unique=True, verbose_name="invoice number"
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("open", "Open"),
                            ("paid", "Paid"),
                            ("void", "Void"),
                            ("uncollectible", "Uncollectible"),
                        ],
                        default="draft",
                        max_length=20,
                        verbose_name="status",
                    ),
                ),
                (
                    "subtotal",
                    models.DecimalField(
                        decimal_places=2, max_digits=10, verbose_name="subtotal"
                    ),
                ),
                (
                    "tax_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=0.0,
                        max_digits=10,
                        verbose_name="tax amount",
                    ),
                ),
                (
                    "total_amount",
                    models.DecimalField(
                        decimal_places=2, max_digits=10, verbose_name="total amount"
                    ),
                ),
                (
                    "amount_paid",
                    models.DecimalField(
                        decimal_places=2,
                        default=0.0,
                        max_digits=10,
                        verbose_name="amount paid",
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        default="USD", max_length=3, verbose_name="currency"
                    ),
                ),
                (
                    "due_date",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="due date"
                    ),
                ),
                (
                    "paid_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="paid at"),
                ),
                (
                    "period_start",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="period start"
                    ),
                ),
                (
                    "period_end",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="period end"
                    ),
                ),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="description"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "subscription",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="invoices",
                        to="api.subscription",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="invoices",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "invoice",
                "verbose_name_plural": "invoices",
                "db_table": "invoices",
                "ordering": ["-created_at"],
            },
        ),
        # Add database indexes
        migrations.RunSQL(
            [
                "CREATE INDEX IF NOT EXISTS subscription_plans_plan_type_idx ON subscription_plans (plan_type);",
                "CREATE INDEX IF NOT EXISTS subscription_plans_is_active_idx ON subscription_plans (is_active);",
                "CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON subscriptions (user_id, status);",
                "CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions (stripe_subscription_id);",
                "CREATE INDEX IF NOT EXISTS subscriptions_current_period_end_idx ON subscriptions (current_period_end);",
                "CREATE INDEX IF NOT EXISTS payment_methods_user_is_default_idx ON payment_methods (user_id, is_default);",
                "CREATE INDEX IF NOT EXISTS payment_methods_stripe_payment_method_id_idx ON payment_methods (stripe_payment_method_id);",
                "CREATE INDEX IF NOT EXISTS payments_user_status_idx ON payments (user_id, status);",
                "CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_idx ON payments (stripe_payment_intent_id);",
                "CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments (created_at);",
                "CREATE INDEX IF NOT EXISTS invoices_user_status_idx ON invoices (user_id, status);",
                "CREATE INDEX IF NOT EXISTS invoices_stripe_invoice_id_idx ON invoices (stripe_invoice_id);",
                "CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices (due_date);",
                "CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices (created_at);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS subscription_plans_plan_type_idx;",
                "DROP INDEX IF EXISTS subscription_plans_is_active_idx;",
                "DROP INDEX IF EXISTS subscriptions_user_status_idx;",
                "DROP INDEX IF EXISTS subscriptions_stripe_subscription_id_idx;",
                "DROP INDEX IF EXISTS subscriptions_current_period_end_idx;",
                "DROP INDEX IF EXISTS payment_methods_user_is_default_idx;",
                "DROP INDEX IF EXISTS payment_methods_stripe_payment_method_id_idx;",
                "DROP INDEX IF EXISTS payments_user_status_idx;",
                "DROP INDEX IF EXISTS payments_stripe_payment_intent_id_idx;",
                "DROP INDEX IF EXISTS payments_created_at_idx;",
                "DROP INDEX IF EXISTS invoices_user_status_idx;",
                "DROP INDEX IF EXISTS invoices_stripe_invoice_id_idx;",
                "DROP INDEX IF EXISTS invoices_due_date_idx;",
                "DROP INDEX IF EXISTS invoices_created_at_idx;",
            ],
        ),
    ]
