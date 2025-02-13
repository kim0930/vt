import os
from django.shortcuts import render, get_object_or_404
from .models import VirtualTour, VirtualTourLog, Memo
from projects.models import Project
from django.http import JsonResponse
from django.conf import settings

def virtual_tour(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    return render(request, "virtual_tour/index.html", {
        "project": project,
    })

def get_first_folder_images(request, project_id):
    """프로젝트의 첫 번째 폴더 내 이미지 리스트 반환"""
    project = get_object_or_404(Project, id=project_id)

    # ✅ 프로젝트 업로드 폴더 경로
    project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id))

    try:
        # ✅ 프로젝트 내 폴더 목록 가져오기 (정렬 후 첫 번째 선택)
        folders = sorted([f for f in os.listdir(project_root) if os.path.isdir(os.path.join(project_root, f))])
        if not folders:
            return JsonResponse({"error": "No folders found"}, status=404)

        first_folder = folders[0]
        folder_path = os.path.join(project_root, first_folder)

        # ✅ 첫 번째 폴더 내 이미지 파일 가져오기
        images = sorted([f for f in os.listdir(folder_path) if f.lower().endswith(('png', 'jpg', 'jpeg'))])

        return JsonResponse({"folders": folders, "images": images})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)