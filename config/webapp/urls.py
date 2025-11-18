from django.urls import path, include
from .views import VIEW_main

urlpatterns = [
    path('', VIEW_main, name='main'),
]
