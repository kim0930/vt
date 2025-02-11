from django.urls import path
from .views import virtual_tour, get_first_folder_images

app_name = "virtual_tour"

urlpatterns = [
    path("<uuid:project_id>/", virtual_tour, name="virtual_tour"),
    path("<uuid:project_id>/first-folder-images/", get_first_folder_images, name="first-folder-images"),

]