from django.core.management.base import BaseCommand
from django.conf import settings
from crypto_bot.services import TelegramBotService

class Command(BaseCommand):
    help = 'Setup Telegram webhook'
    
    def handle(self, *args, **options):
        if not settings.PUBLIC_URL:
            self.stdout.write(
                self.style.ERROR('PUBLIC_URL environment variable not set')
            )
            return
        
        bot_service = TelegramBotService()
        webhook_url = f"{settings.PUBLIC_URL}/"
        
        if bot_service.set_webhook(webhook_url):
            self.stdout.write(
                self.style.SUCCESS(f'Webhook set successfully to {webhook_url}')
            )
        else:
            self.stdout.write(
                self.style.ERROR('Failed to set webhook')
            )