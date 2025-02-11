from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Project(models.Model):
    title = models.CharField(max_length=255)  # 프로젝트명
    client = models.CharField(max_length=255, blank=True, null=True)   # 발주처
    cm = models.CharField(max_length=255, blank=True, null=True)   # 감리사
    contractor = models.CharField(max_length=255, blank=True, null=True)   # 시공사
    designer = models.CharField(max_length=255, blank=True, null=True)   # 설계사
    
    description = models.TextField(blank=True, null=True)  # 프로젝트 설명
    owner = models.ForeignKey(User, on_delete=models.CASCADE)  # 프로젝트 소유자 (사용자)
    created_at = models.DateTimeField(auto_now_add=True)  # 생성일
    updated_at = models.DateTimeField(auto_now=True)  # ✅ 수정 시 자동 업데이트

    def __str__(self):
        return self.title
