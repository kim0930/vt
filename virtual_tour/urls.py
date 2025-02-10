from django.urls import path
from .views import virtual_tour, get_panoramas_by_date

app_name = "virtual_tour"

urlpatterns = [
    path("<int:project_id>/", virtual_tour, name="virtual_tour"),
    path("panoramas/<int:project_id>/", get_panoramas_by_date, name="get_panoramas_by_date"),
]