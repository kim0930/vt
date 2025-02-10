from django.urls import path
# from .views import ProjectListCreateView, ProjectDetailView
from .views import project_list, project_create, project_update, project_delete, project_detail 

urlpatterns = [
    # path("", ProjectListCreateView.as_view(), name="project-list-create"),
    # path("<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path("", project_list, name="project-list"),  # ✅ 프로젝트 리스트 페이지 URL
    path("create/", project_create, name="project-create"),  # ✅ 프로젝트 생성 URL 추가
    path("<int:project_id>/edit/", project_update, name="project-update"),  # ✅ 수정 기능 추가
    path("<int:project_id>/delete/", project_delete, name="project-delete"),  # ✅ 삭제 기능 추가
    path("<int:project_id>/", project_detail, name="project-detail"),  # ✅ 상세보기 기능 추가

]
