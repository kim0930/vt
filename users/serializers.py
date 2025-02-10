from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "phone_number"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data, is_active=False)  # 비활성화 상태로 생성
        self.send_verification_email(user)
        return user

    def send_verification_email(self, user):
        current_site = "127.0.0.1:8080"  # 로컬 테스트용 도메인
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verification_link = f"http://{current_site}/users/activate/{uid}/{token}/"

        send_mail(
            subject="이메일 인증을 완료하세요",
            message=f"아래 링크를 클릭하여 계정을 활성화하세요: {verification_link}",
            from_email="noreply@example.com",
            recipient_list=[user.email],
        )

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ['email', 'phone_number', 'password']
    
    def create(self, validated_data):
        user = User.objects.create(
            email=validated_data['email'],
            phone_number=validated_data['phone_number']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
