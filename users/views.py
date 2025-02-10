from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt
import json
from django.conf import settings

User = get_user_model()

def user_login(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")
        user = authenticate(request, email=email, password=password)

        if user is not None:
            login(request, user)
            return redirect("project-list")  # 로그인 후 이동할 페이지
        else:
            messages.error(request, "Invalid email or password.")

    return render(request, "users/login.html")

def user_logout(request):
    logout(request)
    return redirect("login")  # 로그아웃 후 로그인 페이지로 이동

@csrf_exempt
def user_register(request):
    if request.method == "POST":  # ✅ POST 요청만 처리
        email = request.POST.get("email")
        phone_number = request.POST.get("phone_number")
        password1 = request.POST.get("password1")
        password2 = request.POST.get("password2")

        if password1 != password2:
            messages.error(request, "비밀번호가 일치하지 않습니다.")
            return render(request, "users/register.html")

        if User.objects.filter(email=email).exists():
            messages.error(request, "이미 가입된 이메일입니다.")
            return render(request, "users/register.html")

        user = User.objects.create_user(email=email, phone_number=phone_number, password=password1)
        user.is_active = False  # 이메일 인증 전까지 비활성화
        user.save()

        messages.success(request, "회원가입이 완료되었습니다. 이메일 인증을 확인하세요.")
        return redirect("login")  # 로그인 페이지로 이동

    return render(request, "users/register.html")  # ✅ GET 요청이면 회원가입 폼을 렌더링

def activate_user(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = get_object_or_404(User, pk=uid)

        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return JsonResponse({"message": "이메일 인증 완료. 로그인하세요."}, status=200)
        else:
            return JsonResponse({"error": "유효하지 않은 인증 링크입니다."}, status=400)
    
    except Exception:
        return JsonResponse({"error": "잘못된 요청입니다."}, status=400)


# class UserRegisterView(generics.CreateAPIView):
#     queryset = User.objects.all()
#     serializer_class = UserRegisterSerializer
#     permission_classes = [AllowAny]

# class ActivateUserView(generics.GenericAPIView):
#     permission_classes = [AllowAny]

#     def get(self, request, uidb64, token):
#         try:
#             uid = urlsafe_base64_decode(uidb64).decode()
#             user = User.objects.get(pk=uid)

#             if user is not None and default_token_generator.check_token(user, token):
#                 user.is_active = True
#                 user.save()
#                 return Response({"message": "이메일 인증이 완료되었습니다. 로그인하세요."}, status=status.HTTP_200_OK)
#             else:
#                 return Response({"error": "유효하지 않은 링크입니다."}, status=status.HTTP_400_BAD_REQUEST)
#         except Exception:
#             return Response({"error": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

# class UserCreateView(generics.CreateAPIView):
#     queryset = User.objects.all()
#     serializer_class = UserSerializer
#     permission_classes = [AllowAny]

# class UserLoginView(APIView):
#     permission_classes = [AllowAny]

#     def post(self, request):
#         email = request.data.get('email')
#         password = request.data.get('password')
#         user = authenticate(request, email=email, password=password)
        
#         if user is not None:
#             return Response({"message": "Login successful"}, status=status.HTTP_200_OK)
#         return Response({"error": "Invalid Credentials"}, status=status.HTTP_400_BAD_REQUEST)