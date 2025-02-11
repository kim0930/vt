from rest_framework import generics, permissions
from .serializers import ProjectSerializer
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from .models import Project
from .forms import ProjectForm 


@login_required
def project_list(request):
    projects = Project.objects.filter(owner=request.user)  # 현재 로그인한 사용자의 프로젝트만 가져오기
    return render(request, "projects/project_list.html", {"projects": projects})

@login_required
def project_create(request):
    if request.method == "POST":
        form = ProjectForm(request.POST)
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
        form = ProjectForm(request.POST, instance=project)
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
