import uuid

from django.db import models
from projects.models import Project
from django.contrib.auth import get_user_model

User = get_user_model()

class VirtualTour(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)  # 프로젝트 소유자 (사용자)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="panoramas")
    settings = models.JSONField(default=dict)  # 가상투어 설정 값 (뷰어 속성 등)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.project.title} - {self.date}"
    
class VirtualTourLog(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)  # 프로젝트 소유자 (사용자)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=255)  # 예: "POI 클릭", "카메라 이동

class Memo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='memos')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)