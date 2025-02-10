from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.email')  # owner를 이메일로 표시

    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'owner', 'created_at']
