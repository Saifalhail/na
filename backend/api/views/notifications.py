"""
Views for notification management.
"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from api.models import Notification
from api.serializers.notification_serializers import (
    NotificationSerializer,
    NotificationListSerializer,
    NotificationPreferencesSerializer,
    MarkAsReadSerializer,
    NotificationStatsSerializer,
    CreateNotificationSerializer
)

User = get_user_model()


class NotificationPagination(PageNumberPagination):
    """
    Custom pagination for notifications.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationViewSet(ModelViewSet):
    """
    ViewSet for managing user notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        """
        Return notifications for the authenticated user with optimized queries.
        """
        queryset = Notification.objects.filter(user=self.request.user)
        
        # Optimize queries based on action
        if self.action == 'list':
            # For list view, we only need basic notification info
            queryset = queryset.select_related('user').only(
                'id', 'type', 'title', 'message', 'status', 'priority', 
                'created_at', 'read_at', 'user__id'
            )
        elif self.action in ['retrieve', 'update', 'partial_update']:
            # For detail views, we need all fields including data
            queryset = queryset.select_related('user')
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'list':
            return NotificationListSerializer
        elif self.action == 'create':
            return CreateNotificationSerializer
        return NotificationSerializer
    
    def perform_create(self, serializer):
        """
        Create notification for the authenticated user.
        """
        serializer.save(user=self.request.user)
    
    @extend_schema(
        summary="Mark notifications as read",
        request=MarkAsReadSerializer,
        responses={200: {'description': 'Notifications marked as read successfully'}}
    )
    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """
        Mark multiple notifications as read.
        """
        serializer = MarkAsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        
        # Update notifications
        updated_count = Notification.objects.filter(
            user=request.user,
            id__in=notification_ids,
            status__in=['pending', 'sent']
        ).update(
            status='read',
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} notifications marked as read',
            'updated_count': updated_count
        })
    
    @extend_schema(
        summary="Mark all notifications as read",
        responses={200: {'description': 'All notifications marked as read successfully'}}
    )
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        Mark all user's notifications as read.
        """
        updated_count = Notification.objects.filter(
            user=request.user,
            status__in=['pending', 'sent']
        ).update(
            status='read',
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'All {updated_count} notifications marked as read',
            'updated_count': updated_count
        })
    
    @extend_schema(
        summary="Get notification statistics",
        responses={200: NotificationStatsSerializer}
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get notification statistics for the user.
        """
        queryset = self.get_queryset()
        
        # Basic counts
        total_count = queryset.count()
        unread_count = queryset.filter(status__in=['pending', 'sent']).count()
        read_count = queryset.filter(status='read').count()
        
        # Count by type
        by_type = dict(
            queryset.values('type').annotate(count=Count('id')).values_list('type', 'count')
        )
        
        # Count by priority
        by_priority = dict(
            queryset.values('priority').annotate(count=Count('id')).values_list('priority', 'count')
        )
        
        # Recent notifications (last 10)
        recent_notifications = queryset.order_by('-created_at')[:10]
        
        data = {
            'total_notifications': total_count,
            'unread_count': unread_count,
            'read_count': read_count,
            'by_type': by_type,
            'by_priority': by_priority,
            'recent_notifications': recent_notifications
        }
        
        serializer = NotificationStatsSerializer(data)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get unread notifications",
        responses={200: NotificationListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """
        Get all unread notifications for the user.
        """
        queryset = self.get_queryset().filter(
            status__in=['pending', 'sent']
        ).order_by('-created_at')
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Delete old notifications",
        responses={200: {'description': 'Old notifications deleted successfully'}}
    )
    @action(detail=False, methods=['delete'])
    def clear_old(self, request):
        """
        Delete old read notifications (older than 30 days).
        """
        from datetime import timedelta
        
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_count = self.get_queryset().filter(
            status='read',
            created_at__lt=cutoff_date
        ).delete()[0]
        
        return Response({
            'message': f'{deleted_count} old notifications deleted',
            'deleted_count': deleted_count
        })


class NotificationPreferencesView(generics.RetrieveUpdateAPIView):
    """
    View for managing notification preferences.
    """
    serializer_class = NotificationPreferencesSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Return the authenticated user's profile.
        """
        return self.request.user.profile
    
    def get(self, request, *args, **kwargs):
        """
        Get current notification preferences.
        """
        profile = self.get_object()
        
        data = {
            'receive_email_notifications': profile.receive_email_notifications,
            'receive_push_notifications': profile.receive_push_notifications,
            'receive_sms_notifications': profile.receive_sms_notifications,
            'email_daily_summary': profile.email_daily_summary,
            'email_weekly_report': profile.email_weekly_report,
            'email_tips': profile.email_tips,
            'meal_reminder_times': profile.meal_reminder_times,
            'notification_preferences': profile.notification_preferences,
        }
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)
    
    def put(self, request, *args, **kwargs):
        """
        Update notification preferences.
        """
        return self.update(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        """
        Partially update notification preferences.
        """
        return self.partial_update(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Update notification preferences.
        """
        partial = kwargs.pop('partial', False)
        profile = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Update profile with validated data
        for attr, value in serializer.validated_data.items():
            if hasattr(profile, attr):
                setattr(profile, attr, value)
        profile.save()
        
        return Response({
            'message': 'Notification preferences updated successfully',
            'preferences': serializer.data
        })


class AdminNotificationView(generics.CreateAPIView):
    """
    Admin view for creating system notifications.
    """
    serializer_class = CreateNotificationSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def create(self, request, *args, **kwargs):
        """
        Create a system notification for specific users or all users.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get target users
        target_users = request.data.get('target_users', [])
        send_to_all = request.data.get('send_to_all', False)
        
        if send_to_all:
            users = User.objects.filter(is_active=True)
        elif target_users:
            users = User.objects.filter(id__in=target_users, is_active=True)
        else:
            return Response(
                {'error': 'Must specify either target_users or send_to_all'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create notifications
        notifications = []
        for user in users:
            notification = Notification(
                user=user,
                **serializer.validated_data
            )
            notifications.append(notification)
        
        # Bulk create notifications
        created_notifications = Notification.objects.bulk_create(notifications)
        
        return Response({
            'message': f'{len(created_notifications)} notifications created',
            'created_count': len(created_notifications)
        }, status=status.HTTP_201_CREATED)