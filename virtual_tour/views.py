from django.shortcuts import render, get_object_or_404
from .models import Panorama
from projects.models import Project
from django.http import JsonResponse

def virtual_tour(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    panoramas = Panorama.objects.filter(project=project).order_by("date")

    return render(request, "virtual_tour/virtual_tour.html", {
        "project": project,
        "panoramas": panoramas
    })

def get_panoramas_by_date(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    panoramas = Panorama.objects.filter(project=project).order_by("date")

    grouped_panoramas = {}
    for panorama in panoramas:
        date_str = panorama.date.strftime("%Y-%m-%d")
        if date_str not in grouped_panoramas:
            grouped_panoramas[date_str] = []
        grouped_panoramas[date_str].append({
            "id": panorama.id,
            "image_url": panorama.image.url
        })

    return JsonResponse({"panoramas_by_date": grouped_panoramas})
