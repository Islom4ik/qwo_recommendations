from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # path('admin/', admin.site.urls),
    path('', include('webapp.urls')),
    # path('api/create/zakup', API_CreateZakup.as_view()),
]
