from django.urls import path
from . import views

urlpatterns = [
    # Health check endpoints
    path('', views.home, name='home'),
    path('health/', views.health_check, name='health_check'),
    
    # API endpoints for frontend
    path('api/voice-command', views.VoiceCommandView.as_view(), name='voice_command'),
    path('api/send-crypto', views.SendCryptoView.as_view(), name='send_crypto'),
    path('api/send-response', views.SendResponseView.as_view(), name='send_response'),
    
    # Telegram webhook
    path('webhook/telegram', views.TelegramWebhookView.as_view(), name='telegram_webhook'),
]