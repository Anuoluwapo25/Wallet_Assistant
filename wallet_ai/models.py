from django.db import models
from django.contrib.auth.models import User

class TransferIntent(models.Model):
    chat_id = models.BigIntegerField()
    user_id = models.BigIntegerField()
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    token = models.CharField(max_length=10, default='ETH')
    recipient = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'transfer_intents'

class TransferData(models.Model):
    chat_id = models.BigIntegerField()
    amount = models.CharField(max_length=50)
    token = models.CharField(max_length=10)
    recipient = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transfer_data'

class VoiceMessage(models.Model):
    chat_id = models.BigIntegerField()
    user_id = models.BigIntegerField()
    file_id = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, blank=True)
    transcribed_text = models.TextField(blank=True)
    duration = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'voice_messages'