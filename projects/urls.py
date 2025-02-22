from django.urls import path
from .views import project_list, project_create, project_update, project_delete, project_detail
from .views import project_file_upload, zip_file_upload, delete_selected_folders
from .views import panorama_list, panorama_update, panorama_link_list, panorama_link_update
from .views import sfm_execute, panorama_editor

# from .views import ProjectListCreateView, ProjectDetailView

urlpatterns = [
    # path("", ProjectListCreateView.as_view(), name="project-list-create"),
    # path("<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path("", project_list, name="project-list"),  # ✅ 프로젝트 리스트 페이지 URL
    path("create/", project_create, name="project-create"),  # ✅ 프로젝트 생성 URL 추가
    path("<uuid:project_id>/", project_detail, name="project-detail"),  # ✅ UUID 적용
    path("<uuid:project_id>/edit/", project_update, name="project-update"),  # ✅ 수정 기능 추가
    path("<uuid:project_id>/delete/", project_delete, name="project-delete"),  # ✅ 삭제 기능 추가
    path("<uuid:project_id>/upload", zip_file_upload, name="project-file-upload"),  # ✅ 상세보기 기능 추가
    path('<uuid:project_id>/delete-folders/', delete_selected_folders, name='delete-selected-folders'),
    
    path("<uuid:project_id>/sfm/", sfm_execute, name="sfm-execute"),
    path("<uuid:project_id>/sfm/editor", panorama_editor, name="panorama-editor"),
    path("panoramas/<uuid:project_id>/", panorama_list, name="panorama-list"),
    path("panoramas/update/", panorama_update, name="panorama-update"),
    path("links/<uuid:project_id>/", panorama_link_list, name="panorama-link-list"),
    path("links/update/", panorama_link_update, name="panorama-link-update"),
]