from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.shortcuts import redirect

# 기본 루트 페이지 뷰
def redirect_to_login(request):
    return redirect('login')

urlpatterns = [
    path("", redirect_to_login, name="home"),  # 기본 URL 접속 시 로그인 페이지로 이동
    path('admin/', admin.site.urls),
    path("users/", include("users.urls")),  # 로그인/로그아웃 URL 포함
    path("projects/", include("projects.urls")),  # 👈 프로젝트 API 추가

]
