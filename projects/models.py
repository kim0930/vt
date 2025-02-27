from django.db import models
from django.contrib.auth import get_user_model
from PIL import Image
import os
from django.core.files.base import ContentFile
from io import BytesIO
import uuid

User = get_user_model()

def project_image_upload_path(instance, filename):
    """이미지가 projects/{id}/ 경로에 저장되도록 설정"""
    return os.path.join("projects", str(instance.id), filename)

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
    image = models.ImageField(upload_to=project_image_upload_path, blank=True, null=True)  # ✅ 대표 이미지 필드 추가
    start_date = models.DateField("공사 시작일")
    end_date = models.DateField("공사 종료일")
    floors_min = models.SmallIntegerField()
    floors_max = models.SmallIntegerField()

    def __str__(self):
        return f"{self.title} ({self.id})"  # 프로젝트명과 고유 ID 함께 표시
    
    def clean(self):
    # floors_min이 floors_max보다 클 경우 ValidationError 발생
        if self.floors_min > self.floors_max:
            raise ValidationError({
                '최저층': 'The minimum floor must be less than or equal to the maximum floor.',
                '최고층': 'The maximum floor must be greater than or equal to the minimum floor.'
            })
    def save(self, *args, **kwargs):
            """이미지 업로드 시 해상도를 낮춰서 저장"""
            super().save(*args, **kwargs)  # 먼저 기본 저장 수행

            if self.image:  
                image_path = self.image.path  # 저장된 이미지 경로
                img = Image.open(image_path)

                # ✅ 이미지 리사이징 (최대 너비/높이 지정)
                max_size = (300, 200)  # 해상도 조정 (예: 800x800)
                if img.width > max_size[0] or img.height > max_size[1]:  
                    img.thumbnail(max_size, Image.LANCZOS)

                    # ✅ 원본 파일을 리사이징된 이미지로 덮어쓰기
                    img.save(image_path, format=img.format if img.format else "JPEG", quality=70)
    
    def image_folder_path(self):  # 파노라마 데이터셋 폴더 업로드
        """프로젝트별 이미지 폴더 경로 (media/projects/YYYY-MM-DD/)"""
        return os.path.join("projects", self.created_at.strftime("%Y-%m-%d"))


class PanoramaImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # 고유 ID
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    image = models.ImageField(upload_to="projects/%Y/%m/%d/")
    date = models.CharField(max_length=20)  # 업로드된 날짜 폴더
    floor = models.CharField(max_length=10)  # 층 정보
    uploaded_at = models.DateTimeField(auto_now_add=True)
    position_x = models.FloatField(default=0.0)  # 3D 평면 상 X 좌표
    position_y = models.FloatField(default=0.0)  # 3D 평면 상 Y 좌표
    position_z = models.FloatField(default=0.0)  # 3D 평면 상 Y 좌표
    front_x = models.FloatField(default=0.0)  # 3d 평면 상 앞방향 X
    front_y = models.FloatField(default=0.0)  # 3d 평면 상 앞방향 Y
    front_z = models.FloatField(default=0.0)  # 3d 평면 상 앞방향 Z

    sfm =  models.CharField(max_length=10)
    vt =  models.CharField(max_length=10)
    
    def __str__(self):
        return f"{self.project} - {self.date} - {self.floor} - {self.image.name}"
    
class PanoramaLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_panorama = models.ForeignKey(PanoramaImage, on_delete=models.CASCADE, related_name="outgoing_links")
    to_panorama = models.ForeignKey(PanoramaImage, on_delete=models.CASCADE, related_name="incoming_links")
    description = models.CharField(max_length=255, blank=True, null=True)  # 연결 설명 (옵션)

    def __str__(self):
        return f"{self.from_panorama.name} → {self.to_panorama.name}"
    
# 파노라마 생성
# p1 = Panorama.objects.create(name="파노라마 1", project=project)
# p2 = Panorama.objects.create(name="파노라마 2", project=project)
# p3 = Panorama.objects.create(name="파노라마 3", project=project) 

# 파노라마 간 연결
# PanoramaLink.objects.create(from_panorama=p1, to_panorama=p2)
# PanoramaLink.objects.create(from_panorama=p1, to_panorama=p3)
# PanoramaLink.objects.create(from_panorama=p2, to_panorama=p3)

# # 특정 파노라마에서 연결된 파노라마 조회
# p1_links = p1.outgoing_links.all()
# for link in p1_links:
#     print(f"{p1.name} → {link.to_panorama.name}")
    
# # 특정 파노라마로 연결된 다른 파노라마 조회
# p3_links = p3.incoming_links.all()
# for link in p3_links:
#     print(f"{link.from_panorama.name} → {p3.name}")