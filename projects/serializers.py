from rest_framework import serializers
from .models import Project, PanoramaImage, PanoramaLink

class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.uuid')  # owner를 이메일로 표시

    class Meta:
        model = Project
        fields = ['id', 'title', 'client', 'contractor', 'designer', 'description', 'owner', 'created_at', 'image', 'uuid', 'start_date', 'end_date', 'floors_min', 'floors_max']

class PanoramaImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanoramaImage
        fields = ["id", "project", "image", "position_x", "position_y", "rotation"]
        
class PanoramaLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanoramaLink
        fields = ["id", "from_panorama", "to_panorama"]