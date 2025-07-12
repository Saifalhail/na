"""
Serializers for payment and subscription models.
"""
from rest_framework import serializers
from decimal import Decimal
from api.models import (
    SubscriptionPlan, Subscription, PaymentMethod, Payment, Invoice
)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans."""
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'plan_type', 'price', 'billing_period',
            'ai_analysis_limit', 'meal_storage_limit', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Customize serialization output."""
        data = super().to_representation(instance)
        
        # Add user-friendly features list
        features = []
        if instance.ai_analysis_limit == -1:
            features.append("Unlimited AI analyses")
        else:
            features.append(f"{instance.ai_analysis_limit} AI analyses per month")
        
        if instance.meal_storage_limit == -1:
            features.append("Unlimited meal storage")
        else:
            features.append(f"Store up to {instance.meal_storage_limit} meals")
        
        if instance.plan_type == 'premium':
            features.extend([
                "Priority support",
                "Advanced analytics",
                "Export data"
            ])
        elif instance.plan_type == 'professional':
            features.extend([
                "Priority support",
                "Advanced analytics",
                "Export data",
                "API access",
                "White-label options"
            ])
        
        data['features'] = features
        data['is_free'] = instance.plan_type == 'free'
        data['price_display'] = f"${instance.price}/{instance.billing_period}"
        
        return data


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions."""
    
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_id', 'status', 'trial_start', 'trial_end',
            'current_period_start', 'current_period_end', 'canceled_at',
            'cancel_at_period_end', 'ai_analyses_used', 'ai_analyses_reset_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'trial_start', 'trial_end', 'current_period_start',
            'current_period_end', 'canceled_at', 'ai_analyses_used',
            'ai_analyses_reset_date', 'created_at', 'updated_at'
        ]
    
    def to_representation(self, instance):
        """Customize serialization output."""
        data = super().to_representation(instance)
        
        # Add computed fields
        data['is_active'] = instance.is_active()
        data['can_use_ai'] = instance.can_use_ai_analysis()
        data['days_until_renewal'] = None
        
        if instance.current_period_end:
            from django.utils import timezone
            days_left = (instance.current_period_end - timezone.now()).days
            data['days_until_renewal'] = max(0, days_left)
        
        # Add usage percentage
        if instance.plan.ai_analysis_limit > 0:
            usage_percentage = (instance.ai_analyses_used / instance.plan.ai_analysis_limit) * 100
            data['usage_percentage'] = min(100, round(usage_percentage, 1))
        else:
            data['usage_percentage'] = 0  # Unlimited plan
        
        return data


class CreateSubscriptionSerializer(serializers.Serializer):
    """Serializer for creating subscriptions."""
    
    plan_id = serializers.UUIDField()
    payment_method_id = serializers.CharField(max_length=255, required=False)
    trial_days = serializers.IntegerField(min_value=0, max_value=30, required=False)
    
    def validate_plan_id(self, value):
        """Validate plan exists and is active."""
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive subscription plan.")
    
    def validate(self, attrs):
        """Validate subscription creation request."""
        plan = SubscriptionPlan.objects.get(id=attrs['plan_id'])
        
        # Free plans don't need payment methods
        if plan.plan_type == 'free':
            if 'payment_method_id' in attrs:
                raise serializers.ValidationError(
                    "Free plans do not require a payment method."
                )
        else:
            # Paid plans need payment method unless trial is specified
            if not attrs.get('payment_method_id') and not attrs.get('trial_days'):
                raise serializers.ValidationError(
                    "Paid plans require a payment method or trial period."
                )
        
        return attrs


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment methods."""
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'payment_type', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'is_default', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'payment_type', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year', 'created_at', 'updated_at'
        ]
    
    def to_representation(self, instance):
        """Customize serialization output."""
        data = super().to_representation(instance)
        
        # Add display information
        if instance.payment_type == 'card':
            data['display_name'] = f"{instance.card_brand.title()} ending in {instance.card_last4}"
            data['is_expired'] = False
            
            # Check if card is expired
            if instance.card_exp_month and instance.card_exp_year:
                from datetime import date
                today = date.today()
                if (instance.card_exp_year < today.year or 
                    (instance.card_exp_year == today.year and instance.card_exp_month < today.month)):
                    data['is_expired'] = True
        else:
            data['display_name'] = instance.get_payment_type_display()
            data['is_expired'] = False
        
        return data


class AddPaymentMethodSerializer(serializers.Serializer):
    """Serializer for adding payment methods."""
    
    payment_method_id = serializers.CharField(max_length=255)
    set_as_default = serializers.BooleanField(default=False)
    
    def validate_payment_method_id(self, value):
        """Validate payment method ID format."""
        if not value.startswith('pm_'):
            raise serializers.ValidationError("Invalid payment method ID format.")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payments."""
    
    subscription = SubscriptionSerializer(read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'subscription', 'amount', 'currency', 'status',
            'description', 'failure_reason', 'refund_amount',
            'refunded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subscription', 'amount', 'currency', 'status',
            'description', 'failure_reason', 'refund_amount',
            'refunded_at', 'created_at', 'updated_at'
        ]
    
    def to_representation(self, instance):
        """Customize serialization output."""
        data = super().to_representation(instance)
        
        # Add display information
        data['amount_display'] = f"${instance.amount} {instance.currency.upper()}"
        data['is_refunded'] = instance.refund_amount > 0
        
        if instance.status == 'succeeded':
            data['status_display'] = "Successful"
        elif instance.status == 'failed':
            data['status_display'] = "Failed"
        elif instance.status == 'pending':
            data['status_display'] = "Processing"
        else:
            data['status_display'] = instance.get_status_display()
        
        return data


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices."""
    
    subscription = SubscriptionSerializer(read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'subscription', 'invoice_number', 'status',
            'subtotal', 'tax_amount', 'total_amount', 'amount_paid',
            'currency', 'due_date', 'paid_at', 'period_start',
            'period_end', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subscription', 'invoice_number', 'status',
            'subtotal', 'tax_amount', 'total_amount', 'amount_paid',
            'currency', 'due_date', 'paid_at', 'period_start',
            'period_end', 'description', 'created_at', 'updated_at'
        ]
    
    def to_representation(self, instance):
        """Customize serialization output."""
        data = super().to_representation(instance)
        
        # Add display information
        data['total_display'] = f"${instance.total_amount} {instance.currency.upper()}"
        data['is_paid'] = instance.status == 'paid'
        data['is_overdue'] = False
        
        if instance.due_date and instance.status in ['open', 'draft']:
            from django.utils import timezone
            data['is_overdue'] = instance.due_date < timezone.now()
        
        # Calculate amount due
        amount_due = instance.total_amount - instance.amount_paid
        data['amount_due'] = amount_due
        data['amount_due_display'] = f"${amount_due} {instance.currency.upper()}"
        
        return data


class CancelSubscriptionSerializer(serializers.Serializer):
    """Serializer for canceling subscriptions."""
    
    cancel_at_period_end = serializers.BooleanField(default=True)
    cancellation_reason = serializers.CharField(max_length=500, required=False)
    
    def validate(self, attrs):
        """Validate cancellation request."""
        if not attrs.get('cancel_at_period_end', True) and not attrs.get('cancellation_reason'):
            raise serializers.ValidationError(
                "Immediate cancellation requires a reason."
            )
        return attrs


class BillingHistorySerializer(serializers.Serializer):
    """Serializer for billing history summary."""
    
    total_spent = serializers.DecimalField(max_digits=10, decimal_places=2)
    successful_payments = serializers.IntegerField()
    failed_payments = serializers.IntegerField()
    last_payment_date = serializers.DateTimeField(allow_null=True)
    next_payment_date = serializers.DateTimeField(allow_null=True)
    
    def to_representation(self, instance):
        """Customize serialization output."""
        data = super().to_representation(instance)
        data['total_spent_display'] = f"${data['total_spent']}"
        return data