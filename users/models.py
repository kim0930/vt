import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

# 사용자 관리 매니저
class UserManager(BaseUserManager):
    def create_user(self, email, phone_number, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, phone_number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, phone_number, password, **extra_fields)

# 사용자 모델
class User(AbstractUser):
    username = None  # username 필드 제거
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone_number']

    objects = UserManager()  # UserManager 추가

    def __str__(self):
        return self.email
