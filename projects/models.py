from django.db import models
from django.contrib.auth import get_user_model
from PIL import Image
import os
from django.core.files.base import ContentFile
from io import BytesIO
import uuid

User = get_user_model()

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # 고유 ID (UUID)

    title = models.CharField(max_length=255)  # 프로젝트명
    client = models.CharField(max_length=255, blank=True, null=True)   # 발주처
    cm = models.CharField(max_length=255, blank=True, null=True)   # 감리사
    contractor = models.CharField(max_length=255, blank=True, null=True)   # 시공사
    designer = models.CharField(max_length=255, blank=True, null=True)   # 설계사
    description = models.TextField(blank=True, null=True)  # 프로젝트 설명
    owner = models.ForeignKey(User, on_delete=models.CASCADE)  # 프로젝트 소유자 (사용자)
    created_at = models.DateTimeField(auto_now_add=True)  # 생성일
    updated_at = models.DateTimeField(auto_now=True)  # ✅ 수정 시 자동 업데이트
    image = models.ImageField(upload_to="project_images/", blank=True, null=True)  # ✅ 대표 이미지 필드 추가
    start_date = models.DateField("공사 시작일")
    end_date = models.DateField("공사 종료일")
    def __str__(self):
        return f"{self.title} ({self.id})"  # 프로젝트명과 고유 ID 함께 표시
    
    def save(self, *args, **kwargs):
            """이미지 업로드 시 해상도를 낮춰서 저장"""
            super().save(*args, **kwargs)  # 먼저 기본 저장 수행

            if self.image:  
                image_path = self.image.path  # 저장된 이미지 경로
                img = Image.open(image_path)

                # ✅ 이미지 리사이징 (최대 너비/높이 지정)
                max_size = (300, 200)  # 해상도 조정 (예: 800x800)
                if img.width > max_size[0] or img.height > max_size[1]:  
                    img.thumbnail(max_size, Image.ANTIALIAS)

                    # ✅ 원본 파일을 리사이징된 이미지로 덮어쓰기
                    img.save(image_path, format=img.format if img.format else "JPEG", quality=70)
    
    def image_folder_path(self):  # 파노라마 데이터셋 폴더 업로드
        """프로젝트별 이미지 폴더 경로 (media/projects/YYYY-MM-DD/)"""
        return os.path.join("projects", self.created_at.strftime("%Y-%m-%d"))