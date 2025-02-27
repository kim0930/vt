from django import forms
from .models import Project
from django.core.exceptions import ValidationError
import os

def validate_image_extension(value):
    ext = os.path.splitext(value.name)[1].lower()  # 파일 확장자 추출
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise ValidationError("JPG 또는 PNG 형식의 이미지만 업로드할 수 있습니다.")

class ProjectForm(forms.ModelForm):
    image = forms.ImageField(
        required=False,
        validators=[validate_image_extension],  # 이미지 확장자 검증 추가
    )

    class Meta:
        model = Project
        fields = ["title", "client", "cm", "contractor", "designer", "description", "image", 'start_date', 'end_date', 'floors_min', 'floors_max']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
        }
        
class MultipleFileUploadForm(forms.Form):
    files = forms.FileField(
        widget=forms.ClearableFileInput(attrs={"allow_multiple_selected": True}),  # ✅ 다중 파일 업로드 지원
        required=True
    )

class ZipFileUploadForm(forms.Form):
    zip_file = forms.FileField(label="ZIP 파일 업로드")
    
class ZipFileUploadForm_map(forms.Form):
    zip_file = forms.FileField(label="ZIP 파일 업로드")