from django.contrib import admin
from .models import TransferIntent, TransferData

@admin.register(TransferIntent)
class TransferIntentAdmin(admin.ModelAdmin):
    list_display = ['chat_id', 'amount', 'token', 'recipient', 'confirmed', 'created_at']
    list_filter = ['token', 'confirmed', 'created_at']
    search_fields = ['chat_id', 'recipient']

@admin.register(TransferData)
class TransferDataAdmin(admin.ModelAdmin):
    list_display = ['chat_id', 'amount', 'token', 'recipient', 'created_at']
    list_filter = ['token', 'created_at']
    search_fields = ['chat_id', 'recipient']