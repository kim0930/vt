from django.urls import path
# from .views import UserCreateView, UserLoginView
from .views import user_login, user_logout, user_register, activate_user  # 👈 올바르게 임포트해야 함
from django.contrib.auth.views import LogoutView

urlpatterns = [
    # path('register/', UserCreateView.as_view(), name='user-register'),
    # path('login/', UserLoginView.as_view(), name='user-login'),
    path("login/", user_login, name="login"),
    path("logout/", user_logout, name="logout"),
    # path("logout/", LogoutView.as_view(next_page="login"), name="logout"),  # ✅ 로그아웃 추가
    path("register/", user_register, name="user-register"),
    path("activate/<uidb64>/<token>/", activate_user, name="activate-user"),

]
