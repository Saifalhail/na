"""
GraphQL-style batch API endpoints for mobile efficiency.
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from api.models import Meal, Notification, User, Subscription
from api.serializers.meal_serializers import MealListSerializer
from api.serializers.notification_serializers import NotificationSerializer
from api.utils.mobile_cache import MobileQueryOptimizer, MobileCacheManager

logger = logging.getLogger(__name__)


class BatchAPIView(APIView):
    """
    GraphQL-style batch API for mobile clients to request multiple resources efficiently.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Batch API request",
        description="Execute multiple API requests in a single call for mobile efficiency.",
        request={
            "type": "object",
            "properties": {
                "requests": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Request identifier"},
                            "resource": {"type": "string", "description": "Resource type"},
                            "action": {"type": "string", "description": "Action to perform"},
                            "params": {"type": "object", "description": "Request parameters"},
                            "fields": {"type": "array", "description": "Fields to include"}
                        },
                        "required": ["id", "resource", "action"]
                    }
                }
            },
            "required": ["requests"]
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "responses": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "success": {"type": "boolean"},
                                "data": {"type": "object"},
                                "error": {"type": "string"}
                            }
                        }
                    },
                    "execution_time_ms": {"type": "integer"}
                }
            }
        }
    )
    def post(self, request):
        start_time = timezone.now()
        
        batch_requests = request.data.get('requests', [])
        if not batch_requests:
            return Response(
                {"error": "No requests provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit batch size for security
        if len(batch_requests) > 20:
            return Response(
                {"error": "Maximum 20 requests per batch"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process requests in parallel for better performance
        responses = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            # Submit all requests
            future_to_request = {
                executor.submit(self._process_single_request, req, request.user): req
                for req in batch_requests
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_request):
                req = future_to_request[future]
                try:
                    result = future.result()
                    responses.append(result)
                except Exception as e:
                    logger.error(f"Batch request failed: {e}")
                    responses.append({
                        'id': req.get('id', 'unknown'),
                        'success': False,
                        'data': None,
                        'error': str(e)
                    })
        
        # Sort responses by original request order
        request_order = {req.get('id'): i for i, req in enumerate(batch_requests)}
        responses.sort(key=lambda r: request_order.get(r['id'], 999))
        
        execution_time = (timezone.now() - start_time).total_seconds() * 1000
        
        return Response({
            'responses': responses,
            'execution_time_ms': int(execution_time)
        })
    
    def _process_single_request(self, req, user):
        """Process a single batch request."""
        request_id = req.get('id', 'unknown')
        resource = req.get('resource')
        action = req.get('action')
        params = req.get('params', {})
        fields = req.get('fields', [])
        
        try:
            # Route to appropriate handler
            if resource == 'meals':
                data = self._handle_meals_request(action, params, fields, user)
            elif resource == 'notifications':
                data = self._handle_notifications_request(action, params, fields, user)
            elif resource == 'profile':
                data = self._handle_profile_request(action, params, fields, user)
            elif resource == 'dashboard':
                data = self._handle_dashboard_request(action, params, fields, user)
            else:
                raise ValueError(f"Unknown resource: {resource}")
            
            return {
                'id': request_id,
                'success': True,
                'data': data,
                'error': None
            }
            
        except Exception as e:
            logger.error(f"Failed to process batch request {request_id}: {e}")
            return {
                'id': request_id,
                'success': False,
                'data': None,
                'error': str(e)
            }
    
    def _handle_meals_request(self, action, params, fields, user):
        """Handle meals resource requests."""
        if action == 'list':
            limit = min(params.get('limit', 20), 50)  # Max 50 meals
            offset = params.get('offset', 0)
            
            # Use optimized queryset
            meals = MobileQueryOptimizer.get_optimized_meals_queryset(
                user, limit=limit + offset, include_items=True
            )[offset:offset + limit]
            
            # Apply field filtering if specified
            if fields:
                return self._filter_fields(
                    MealListSerializer(meals, many=True).data,
                    fields
                )
            else:
                return MealListSerializer(meals, many=True).data
                
        elif action == 'get':
            meal_id = params.get('id')
            if not meal_id:
                raise ValueError("Missing meal ID")
            
            meal = user.meals.prefetch_related('mealitem_set__food_item').get(id=meal_id)
            data = MealListSerializer(meal).data
            
            if fields:
                return self._filter_fields(data, fields)
            return data
            
        elif action == 'stats':
            today = timezone.now().date()
            
            # Optimized aggregation query
            today_stats = user.meals.filter(consumed_at__date=today).aggregate(
                meal_count=models.Count('id'),
                total_calories=models.Sum(
                    models.F('mealitem__quantity') * models.F('mealitem__food_item__calories') / 100
                )
            )
            
            return {
                'today_meals': today_stats['meal_count'] or 0,
                'today_calories': float(today_stats['total_calories'] or 0),
                'week_meals': user.meals.filter(
                    consumed_at__gte=today - timezone.timedelta(days=7)
                ).count()
            }
        
        else:
            raise ValueError(f"Unknown meals action: {action}")
    
    def _handle_notifications_request(self, action, params, fields, user):
        """Handle notifications resource requests."""
        if action == 'list':
            limit = min(params.get('limit', 20), 50)  # Max 50 notifications
            
            notifications = MobileQueryOptimizer.get_optimized_notifications_queryset(
                user, limit=limit
            )
            
            data = NotificationSerializer(notifications, many=True).data
            
            if fields:
                return self._filter_fields(data, fields)
            return data
            
        elif action == 'count':
            return {
                'unread_count': user.notifications.filter(
                    status__in=['pending', 'sent']
                ).count(),
                'total_count': user.notifications.count()
            }
        
        else:
            raise ValueError(f"Unknown notifications action: {action}")
    
    def _handle_profile_request(self, action, params, fields, user):
        """Handle profile resource requests."""
        if action == 'get':
            # Use cached subscription info
            subscription_info = MobileQueryOptimizer.get_user_subscription_info(user)
            
            profile_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'account_type': user.account_type,
                'date_joined': user.date_joined,
                'subscription': subscription_info
            }
            
            if fields:
                return self._filter_fields(profile_data, fields)
            return profile_data
        
        else:
            raise ValueError(f"Unknown profile action: {action}")
    
    def _handle_dashboard_request(self, action, params, fields, user):
        """Handle dashboard resource requests."""
        if action == 'get':
            # Try cache first
            cached_data = MobileCacheManager.get_dashboard_data(user.id)
            if cached_data:
                if fields:
                    return self._filter_fields(cached_data, fields)
                return cached_data
            
            # Fallback to basic dashboard data
            today = timezone.now().date()
            
            today_meals_count = user.meals.filter(consumed_at__date=today).count()
            notifications_count = user.notifications.filter(
                status__in=['pending', 'sent']
            ).count()
            
            dashboard_data = {
                'today_meals': today_meals_count,
                'notifications_count': notifications_count,
                'last_updated': timezone.now().isoformat()
            }
            
            if fields:
                return self._filter_fields(dashboard_data, fields)
            return dashboard_data
        
        else:
            raise ValueError(f"Unknown dashboard action: {action}")
    
    def _filter_fields(self, data, fields):
        """Filter data to include only specified fields."""
        if isinstance(data, list):
            return [self._filter_single_item(item, fields) for item in data]
        else:
            return self._filter_single_item(data, fields)
    
    def _filter_single_item(self, item, fields):
        """Filter a single item to include only specified fields."""
        if not isinstance(item, dict):
            return item
        
        filtered = {}
        for field in fields:
            if '.' in field:
                # Handle nested fields like 'user.name'
                parts = field.split('.', 1)
                parent_field = parts[0]
                nested_field = parts[1]
                
                if parent_field in item and isinstance(item[parent_field], dict):
                    if parent_field not in filtered:
                        filtered[parent_field] = {}
                    filtered[parent_field][nested_field] = item[parent_field].get(nested_field)
            else:
                # Simple field
                if field in item:
                    filtered[field] = item[field]
        
        return filtered


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    summary="GraphQL-style query",
    description="Execute a GraphQL-style query for flexible data fetching.",
    request={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "GraphQL-style query string"},
            "variables": {"type": "object", "description": "Query variables"}
        },
        "required": ["query"]
    },
    responses={
        200: {
            "type": "object",
            "properties": {
                "data": {"type": "object"},
                "errors": {"type": "array"}
            }
        }
    }
)
def graphql_query(request):
    """
    Simple GraphQL-style query endpoint for mobile clients.
    """
    query = request.data.get('query', '')
    variables = request.data.get('variables', {})
    
    if not query:
        return Response(
            {"errors": ["Query is required"]},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Parse the simple query format
        # Example: "{ meals(limit: 5) { id name calories } }"
        result = _execute_simple_query(query, variables, request.user)
        
        return Response({
            'data': result,
            'errors': []
        })
        
    except Exception as e:
        logger.error(f"GraphQL query failed: {e}")
        return Response({
            'data': None,
            'errors': [str(e)]
        })


def _execute_simple_query(query, variables, user):
    """
    Execute a simple GraphQL-style query.
    This is a basic implementation - for production use a proper GraphQL library.
    """
    # Remove whitespace and braces
    query = query.strip().strip('{}').strip()
    
    # Parse basic query structure
    if query.startswith('meals'):
        return _execute_meals_query(query, variables, user)
    elif query.startswith('notifications'):
        return _execute_notifications_query(query, variables, user)
    elif query.startswith('profile'):
        return _execute_profile_query(query, variables, user)
    else:
        raise ValueError(f"Unknown query type: {query}")


def _execute_meals_query(query, variables, user):
    """Execute meals query."""
    # Extract parameters and fields
    # Basic parsing - in production use a proper parser
    limit = 20
    if 'limit:' in query:
        import re
        match = re.search(r'limit:\s*(\d+)', query)
        if match:
            limit = min(int(match.group(1)), 50)
    
    # Get meals
    meals = MobileQueryOptimizer.get_optimized_meals_queryset(
        user, limit=limit, include_items=True
    )
    
    # Serialize to basic format
    return [
        {
            'id': str(meal.id),
            'name': meal.name,
            'meal_type': meal.meal_type,
            'consumed_at': meal.consumed_at.isoformat(),
            'calories': sum(
                float(item.quantity) * float(item.food_item.calories) / 100
                for item in meal.mealitem_set.all()
            )
        }
        for meal in meals
    ]


def _execute_notifications_query(query, variables, user):
    """Execute notifications query."""
    limit = 20
    if 'limit:' in query:
        import re
        match = re.search(r'limit:\s*(\d+)', query)
        if match:
            limit = min(int(match.group(1)), 50)
    
    notifications = MobileQueryOptimizer.get_optimized_notifications_queryset(
        user, limit=limit
    )
    
    return [
        {
            'id': str(notification.id),
            'title': notification.title,
            'message': notification.message,
            'status': notification.status,
            'created_at': notification.created_at.isoformat()
        }
        for notification in notifications
    ]


def _execute_profile_query(query, variables, user):
    """Execute profile query."""
    subscription_info = MobileQueryOptimizer.get_user_subscription_info(user)
    
    return {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'account_type': user.account_type,
        'subscription': subscription_info
    }