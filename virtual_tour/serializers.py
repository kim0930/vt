from rest_framework import serializers
from .models import VirtualTour

class PanoramaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VirtualTour
        fields = ["owner", "project", "settings", "created_at"]
