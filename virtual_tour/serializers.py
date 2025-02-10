from rest_framework import serializers
from .models import Panorama

class PanoramaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Panorama
        fields = ["id", "project", "name", "image", "created_at"]
