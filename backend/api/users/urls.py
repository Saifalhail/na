from django.urls import path
from .views import (
    UserListView,
    UserDetailView,
    UserProfileDetailView,
    UserMealsView,
    UserStatisticsView,
    UserSearchView,
)

app_name = 'users'

urlpatterns = [
    # User management endpoints
    path('', UserListView.as_view(), name='user-list'),
    path('search/', UserSearchView.as_view(), name='user-search'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/profile/', UserProfileDetailView.as_view(), name='user-profile'),
    path('<int:pk>/meals/', UserMealsView.as_view(), name='user-meals'),
    path('<int:pk>/statistics/', UserStatisticsView.as_view(), name='user-statistics'),
]