import zipfile
import os
from datetime import datetime
import shutil

from rest_framework import generics, permissions
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from django.conf import settings

from .models import Project
from .serializers import ProjectSerializer

from .forms import ProjectForm 
from .forms import ZipFileUploadForm    # 다중 파일 업로드 폼 추가
from .forms import MultipleFileUploadForm    # 다중 파일 업로드 폼 추가
from django.http import JsonResponse

@login_required
def project_list(request):
    projects = Project.objects.filter(owner=request.user)  # 현재 로그인한 사용자의 프로젝트만 가져오기
    return render(request, "projects/project_list.html", {"projects": projects})

@login_required
def project_create(request):
    if request.method == "POST":
        form = ProjectForm(request.POST, request.FILES)
        if form.is_valid():
            project = form.save(commit=False)
            project.owner = request.user  # 현재 로그인한 사용자 할당
            project.save()
            return redirect("project-list")  # 프로젝트 목록으로 이동
    else:
        form = ProjectForm()
    return render(request, "projects/project_form.html", {"form": form})

@login_required
def project_update(request, project_id):
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    if request.method == "POST":
        form = ProjectForm(request.POST, request.FILES, instance=project)
        if form.is_valid():
            form.save()
            return redirect("project-list")  # 수정 후 프로젝트 목록으로 이동
    else:
        form = ProjectForm(instance=project)
    
    return render(request, "projects/project_form.html", {"form": form, "project": project})

@login_required
def project_delete(request, project_id):
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    
    if request.method == "POST":
        project.delete()
        return redirect("project-list")  # 삭제 후 프로젝트 목록으로 이동
    
    return render(request, "projects/project_confirm_delete.html", {"project": project})

@login_required
def project_detail(request, project_id):
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    return render(request, "projects/project_detail.html", {"project": project})

@login_required
def zip_file_upload(request, project_id):
    
    # 정렬 함수
    def floor_key(floor):
        if floor.startswith("B"):  # 지하층인 경우
            return -int(floor[1:-1])  # B2F → -2, B1F → -1
        else:  # 지상층인 경우
            return int(floor[:-1])  # 3F → 3, 1F → 1
        
    """ZIP 파일을 업로드하고 압축을 해제하여 저장"""
    project = get_object_or_404(Project, id=project_id, owner=request.user)

    if request.method == "POST":
        form = ZipFileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            zip_file = request.FILES["zip_file"]  # ✅ ZIP 파일 가져오기

            # ✅ 프로젝트 ID 폴더 내에 압축 파일명과 동일한 폴더 생성
            zip_name = os.path.splitext(zip_file.name)[0]  # ZIP 파일명 (확장자 제거)
            upload_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id))
            os.makedirs(upload_root, exist_ok=True)  # 폴더 생성

            # ✅ ZIP 파일을 저장 후 압축 해제
            zip_path = os.path.join(upload_root, zip_file.name)
            with open(zip_path, "wb") as f:
                for chunk in zip_file.chunks():
                    f.write(chunk)

            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(upload_root)  # 압축 해제

            os.remove(zip_path)  # ✅ 원본 ZIP 파일 삭제

            return redirect("project-file-upload", project_id=project.id)

    else:
        form = ZipFileUploadForm()

    project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id))
    
    # ✅ 업로드된 폴더 목록 가져오기
    date_folders  = []
    folder_structure = {}

    if os.path.exists(project_root):
        date_folders  = sorted(os.listdir(project_root))  # 최상위 폴더 목록 가져오기

        for date in date_folders :
            folder_path = os.path.join(project_root, date)
            if os.path.isdir(folder_path):  # 폴더인 경우만 처리
                folder_structure[date] = sorted(os.listdir(folder_path))  # 내부 폴더 가져오기
        all_floors = [item for sublist in folder_structure.values() for item in sublist]
        floor_folders = list(set(all_floors))
    
    # 정렬
    floor_folders = sorted(floor_folders, key=floor_key)
    
    return render(request, "projects/project_file_upload.html", {
        "project": project,
        "form": form,
        "date_folders": date_folders,  # ✅ 최상위 폴더 이름
        "floor_folders": floor_folders,  # ✅ 최상위 폴더 이름
        "folder_structure": folder_structure,  # ✅ 내부 폴더 포함
    })
        
@login_required
def project_file_upload(request, project_id):
    """프로젝트 고유 ID 폴더 내에 날짜별 폴더로 파일 업로드"""
    project = get_object_or_404(Project, id=project_id, owner=request.user)

    if request.method == "POST":
        form = MultipleFileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            files = request.FILES.getlist("files")  # ✅ 여러 파일 가져오기
            today_str = datetime.today().strftime("%Y-%m-%d")  # 현재 날짜 (YYYY-MM-DD)

            # ✅ 프로젝트 ID 폴더 내에 YYYY-MM-DD 폴더 생성
            upload_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id), today_str)
            os.makedirs(upload_root, exist_ok=True)

            for file in files:
                folder_names = {os.path.dirname(file.name).split("/")[0] for file in files if "/" in file.name}
                print(folder_names)
                save_path = os.path.join(upload_root, file.name)
                default_storage.save(save_path, ContentFile(file.read()))


            return redirect("project-file-upload", project_id=project.id)

    else:
        form = MultipleFileUploadForm()

    # ✅ 기존 업로드된 폴더 조회
    project_folder_path = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id))
    existing_folders = sorted([
        f for f in os.listdir(project_folder_path)
        if os.path.isdir(os.path.join(project_folder_path, f))
    ]) if os.path.exists(project_folder_path) else []

    return render(request, "projects/project_file_upload.html", {
        "project": project,
        "existing_folders": existing_folders,
        "form": form
    })

@login_required
def delete_selected_folders(request, project_id):
    """선택한 폴더(컬럼 단위) 삭제"""
    project = get_object_or_404(Project, id=project_id, owner=request.user)

    if request.method == "POST":
        folder_names = request.POST.getlist("folders[]")  # ✅ 삭제할 폴더 리스트 받기
        project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id))

        deleted_folders = []
        for folder_name in folder_names:
            folder_path = os.path.join(project_root, folder_name)
            if os.path.exists(folder_path):
                shutil.rmtree(folder_path)  # ✅ 폴더 삭제
                deleted_folders.append(folder_name)

        return JsonResponse({"deleted": deleted_folders}, status=200)

    return JsonResponse({"error": "Invalid request"}, status=400)


# # 🔹 프로젝트 목록 조회 & 생성 (GET, POST)
# class ProjectListCreateView(generics.ListCreateAPIView):
#     serializer_class = ProjectSerializer
#     permission_classes = [permissions.IsAuthenticated]  # 로그인한 사용자만 접근 가능

#     def get_queryset(self):
#         return Project.objects.filter(owner=self.request.user)  # 현재 사용자 프로젝트만 조회

#     def perform_create(self, serializer):
#         serializer.save(owner=self.request.user)  # 현재 로그인한 사용자를 owner로 설정


# # 🔹 특정 프로젝트 조회, 수정, 삭제 (GET, PUT, DELETE)
# class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
#     serializer_class = ProjectSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         return Project.objects.filter(owner=self.request.user)  # 현재 사용자 프로젝트만 접근 가능
