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
from .models import PanoramaImage
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
            upload_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id), "origin")
            os.makedirs(upload_root, exist_ok=True)  # 폴더 생성

            # ✅ ZIP 파일을 저장 후 압축 해제
            zip_path = os.path.join(upload_root, zip_file.name)
            with open(zip_path, "wb") as f:
                for chunk in zip_file.chunks():
                    f.write(chunk)
            
            extracted_images = []  # ✅ DB에 저장할 이미지 목록
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(upload_root)  # 압축 해제

                for file_name in zip_ref.namelist():
                    file_path = os.path.join(upload_root, file_name)

                    # ✅ 파일이 {date}/{floor}/*.jpg 구조인지 확인
                    path_parts = file_name.split("/")
                    # print(path_parts, upload_root,zip_ref.namelist())
                    if len(path_parts) == 3:
                        date_folder = path_parts[0]  # ✅ 날짜 폴더 (YYYY-MM-DD)
                        floor_folder = path_parts[1]  # ✅ 층 폴더 (1F, B1F 등)
                        image_name = path_parts[2]  # ✅ 이미지 파일명

                        if image_name.lower().endswith((".jpg", ".jpeg", ".png")):
                            relative_path = os.path.join("projects", str(project.id), "origin", file_name)

                            # ✅ PanoramaImage 모델에 저장
                            PanoramaImage.objects.create(
                                project=project,
                                image=relative_path,  # Django ImageField 경로 저장
                                date=date_folder,
                                floor=floor_folder,
                                sfm='none',
                                vt='none',
                            )
            
            
            os.remove(zip_path)  # ✅ 원본 ZIP 파일 삭제

            return redirect("project-file-upload", project_id=project.id)

    else:
        form = ZipFileUploadForm()
        
    # ✅ 업로드된 폴더 목록 가져오기
    project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id), "origin")

    date_folders  = []
    floor_folders = []
    folder_structure = {}
    if os.path.exists(project_root):
        all_folders_files  = sorted(os.listdir(project_root))  # 최상위 폴더 목록 가져오기
        date_folders = [x for x in all_folders_files if os.path.isdir(os.path.join(project_root,x))]
        for date in date_folders :
            folder_path = os.path.join(project_root, date)
            if os.path.isdir(folder_path):  # 폴더인 경우만 처리
                folder_structure[date] = sorted(os.listdir(folder_path))  # 내부 폴더 가져오기
        all_floors = [item for sublist in folder_structure.values() for item in sublist]
        floor_folders = list(set(all_floors))

    # 정렬
    floor_folders = sorted(floor_folders, key=floor_key)
    
    
    # ✅ sfm 완료된 폴더 목록 가져오기
    project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id), "sfm")

    date_folders_sfm  = []
    floor_folders_sfm = []
    folder_structure_sfm = {}
    if os.path.exists(project_root):
        all_folders_files  = sorted(os.listdir(project_root))  # 최상위 폴더 목록 가져오기
        date_folders_sfm = [x for x in all_folders_files if os.path.isdir(os.path.join(project_root,x))]
        for date in date_folders_sfm :
            folder_path = os.path.join(project_root, date)
            if os.path.isdir(folder_path):  # 폴더인 경우만 처리
                folder_structure_sfm[date] = sorted(os.listdir(folder_path))  # 내부 폴더 가져오기
        all_floors = [item for sublist in folder_structure_sfm.values() for item in sublist]
        floor_folders_sfm = list(set(all_floors))

    # 정렬
    floor_folders_sfm = sorted(floor_folders_sfm, key=floor_key)
    
    return render(request, "projects/project_file_upload.html", {
        "project": project,
        "form": form,
        
        "date_folders": date_folders,  # ✅ 최상위 폴더 이름
        "floor_folders": floor_folders,  # ✅ 최상위 폴더 이름
        "folder_structure": folder_structure,  # ✅ 내부 폴더 포함
        
        "date_folders_sfm": date_folders_sfm,  # ✅ sfm 최상위 폴더 이름
        "floor_folders_sfm": floor_folders_sfm,  # ✅ sfm 최상위 폴더 이름
        "folder_structure_sfm": folder_structure_sfm,  # ✅ sfm 내부 폴더 포함
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
        project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id), "origin")

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


from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import PanoramaImage, PanoramaLink
from .serializers import PanoramaImageSerializer, PanoramaLinkSerializer

@login_required
def sfm_execute(request, project_id):
    """SFM 실행 후 panorama_editor.html 페이지로 이동"""
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    if request.method == "POST":
        date = request.POST.get("date")
        floor = request.POST.get("floor")
    else:
        date = None
        floor = None

    # ✅ 여기에 SFM 실행 로직 추가
    print(f"SFM 실행 for project {project_id}-{date}-{floor}")
    project_root = os.path.join(settings.MEDIA_ROOT, "projects", str(project.id), "sfm")
    os.makedirs(os.path.join(project_root, date, floor),  exist_ok=True)
    
    # # 결과물(예상)
    sfm_imgs = ['projects/2f6a7291-ac01-4268-a1e2-6786a2e42164/origin/2025-01-20/1F/201_6_B.jpg', 'projects/2f6a7291-ac01-4268-a1e2-6786a2e42164/origin/2025-01-20/1F/201_6_F.jpg']
    
    # ✅  SFM 결과를 PanoramaImage DB에 업데이트
    for sfm_img in sfm_imgs:  
        panoramas = PanoramaImage.objects.filter(project__id=project_id, date=date, floor=floor, image=sfm_img)
        # print(PanoramaImage.objects.all())
        for panorama in panoramas:
            panorama.position_x = 100
            panorama.position_y = 100
            panorama.position_z = 0
            panorama.front_x = 120
            panorama.front_y = 120
            panorama.front_z = 0
            panorama.sfm = "true"
            panorama.save()
    
    # return render(request, "projects/panorama_editor.html", {
    #     "project": project,       
    #     "date": date,
    #     "floor": floor,
    #     })
    return redirect("panorama-editor", project_id=project_id)


@login_required
def panorama_editor(request, project_id):
    """SFM 실행 후 Panorama Editor 페이지 렌더링"""
    if request.method == "POST":
        date = request.POST.get("date")
        floor = request.POST.get("floor")
    else:
        date = None
        floor = None
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    # panoramas = PanoramaImage.objects.filter(project=project, date=date, floor=floor)
    panoramas = PanoramaImage.objects.filter(project__id=project_id, date=date, floor=floor)

    return render(request, "projects/panorama_editor.html", {
        "project": project,  
        "panoramas": panoramas,        
        "date": date,
        "floor": floor,
        })

@login_required
def panorama_list(request, project_id):
    """✅ 1. 프로젝트별 파노라마 목록 조회"""
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    panoramas = PanoramaImage.objects.filter(project=project)
    serializer = PanoramaImageSerializer(panoramas, many=True)
    return JsonResponse(serializer.data, safe=False)

@login_required
def panorama_update(request):
    """✅ 2. 파노라마 위치 및 회전 정보 업데이트"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            panorama = get_object_or_404(PanoramaImage, id=data["id"])
            
            # 위치 및 회전 정보 업데이트
            panorama.position_x = data.get("position_x", panorama.position_x)
            panorama.position_y = data.get("position_y", panorama.position_y)
            panorama.rotation = data.get("rotation", panorama.rotation)
            panorama.save()

            return JsonResponse({"message": "Panorama updated successfully"})
        except (PanoramaImage.DoesNotExist, KeyError, json.JSONDecodeError):
            return JsonResponse({"error": "Invalid data or panorama not found"}, status=400)
    
    return JsonResponse({"error": "Invalid request method"}, status=405)

@login_required
def panorama_link_list(request, project_id):
    """✅ 3. 파노라마 간 연결 정보 조회"""
    project = get_object_or_404(Project, id=project_id, owner=request.user)
    links = PanoramaLink.objects.filter(from_panorama__project=project)
    serializer = PanoramaLinkSerializer(links, many=True)
    return JsonResponse(serializer.data, safe=False)

@login_required
def panorama_link_update(request):
    """✅ 4. 파노라마 간 연결 정보 업데이트"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            from_panorama = get_object_or_404(PanoramaImage, id=data["from_id"])
            to_panorama = get_object_or_404(PanoramaImage, id=data["to_id"])

            # 중복 링크 방지 후 저장
            if not PanoramaLink.objects.filter(from_panorama=from_panorama, to_panorama=to_panorama).exists():
                PanoramaLink.objects.create(from_panorama=from_panorama, to_panorama=to_panorama)

            return JsonResponse({"message": "Panorama link updated successfully"})
        except (PanoramaImage.DoesNotExist, KeyError, json.JSONDecodeError):
            return JsonResponse({"error": "Invalid data or panoramas not found"}, status=400)
    
    return JsonResponse({"error": "Invalid request method"}, status=405)


# # ✅ 1. 프로젝트별 파노라마 목록 조회 API
# class PanoramaListView(APIView):
#     permission_classes = [IsAuthenticated]
#     # permission_classes = [AllowAny]  # 인증 없이 접근 가능하게 설정

#     lookup_field = "project_id"  # ✅ UUID 필드가 "id"인지 확인
#     def get(self, request, project_id):
#         print("PanoramaListView")
#         panoramas = PanoramaImage.objects.filter(project_id=project_id)
#         serializer = PanoramaImageSerializer(panoramas, many=True)
#         return Response(serializer.data)

# # ✅ 2. 파노라마 위치 및 회전 정보 업데이트 API
# class PanoramaUpdateView(APIView):
#     permission_classes = [IsAuthenticated]
#     lookup_field = "project_id"  # ✅ UUID 필드가 "id"인지 확인

#     def post(self, request):
#         """받은 JSON 데이터로 위치 및 회전 정보 업데이트"""
#         data = request.data  # { "id": "...", "position_x": 100, "position_y": 200, "rotation": 1.57 }
#         try:
#             panorama = PanoramaImage.objects.get(id=data["id"])
#             panorama.position_x = data["position_x"]
#             panorama.position_y = data["position_y"]
#             panorama.rotation = data["rotation"]
#             panorama.save()
#             return Response({"message": "Panorama updated successfully"})
#         except PanoramaImage.DoesNotExist:
#             return Response({"error": "Panorama not found"}, status=404)

# # ✅ 3. 파노라마 간 연결 정보 조회 API
# class PanoramaLinkListView(APIView):
#     permission_classes = [IsAuthenticated]
#     lookup_field = "project_id"  # ✅ UUID 필드가 "id"인지 확인

#     def get(self, request, project_id):
#         links = PanoramaLink.objects.filter(from_panorama__project_id=project_id)
#         serializer = PanoramaLinkSerializer(links, many=True)
#         return Response(serializer.data)

# # ✅ 4. 파노라마 간 연결 정보 업데이트 API
# class PanoramaLinkUpdateView(APIView):
#     permission_classes = [IsAuthenticated]
#     lookup_field = "project_id"  # ✅ UUID 필드가 "id"인지 확인

#     def post(self, request):
#         """받은 JSON 데이터로 연결 정보 업데이트"""
#         data = request.data  # { "from_id": "...", "to_id": "..." }
#         try:
#             from_panorama = PanoramaImage.objects.get(id=data["from_id"])
#             to_panorama = PanoramaImage.objects.get(id=data["to_id"])

#             # 중복 링크 방지
#             if not PanoramaLink.objects.filter(from_panorama=from_panorama, to_panorama=to_panorama).exists():
#                 PanoramaLink.objects.create(from_panorama=from_panorama, to_panorama=to_panorama)

#             return Response({"message": "Panorama link updated successfully"})
#         except PanoramaImage.DoesNotExist:
#             return Response({"error": "One or both panoramas not found"}, status=404)