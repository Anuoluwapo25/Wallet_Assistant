import json
import logging
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.core.cache import cache
from decimal import Decimal
from .services import (
    CryptoTransferService, 
    GeminiAIService, 
    TelegramBotService, 
    SpeechToTextService,
    VoiceCommandProcessor
)
from .models import TransferIntent, TransferData, VoiceMessage

logger = logging.getLogger(__name__)

@csrf_exempt
def health_check(request):
    """Health check endpoint"""
    return HttpResponse("Bot is running.")

@csrf_exempt
def home(request):
    """Home endpoint"""
    return HttpResponse("Server is running.")

@method_decorator(csrf_exempt, name='dispatch')
class SendResponseView(View):
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            chat_id = data.get('chatID')
            text = data.get('text')
            
            if not chat_id or not text:
                return JsonResponse({
                    'success': False,
                    'message': 'Missing chatID or text'
                }, status=400)
            
            # Check for transfer command
            is_transfer, transfer_data = CryptoTransferService.extract_transfer_info(text)
            
            if is_transfer:
                response = {
                    'success': True,
                    'message': f"Transfer of {transfer_data['amount']} {transfer_data['token']} to {transfer_data['recipient']} detected",
                    'transfer': transfer_data
                }
            else:
                # Get AI response
                ai_response = GeminiAIService.get_ai_response(text)
                response = {
                    'success': True,
                    'message': ai_response
                }
            
            return JsonResponse(response)
            
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'message': 'Invalid JSON'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Server error: {str(e)}'
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class TelegramWebhookView(View):
    
    def post(self, request):
        try:
            update = json.loads(request.body)
            
            if not update.get('message'):
                return HttpResponse("OK")
            
            message = update['message']
            if message.get('from', {}).get('is_bot'):
                return HttpResponse("OK")
            
            chat_id = message['chat']['id']
            user_id = message['from']['id']
            
            # Handle voice messages
            if message.get('voice'):
                self._handle_voice_message(chat_id, user_id, message['voice'])
                return HttpResponse("OK")
            
            # Handle text messages
            text = message.get('text', '')
            if text:
                self._handle_text_message(chat_id, user_id, text)
            
            return HttpResponse("OK")
            
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return HttpResponse("OK")
    
    def _handle_voice_message(self, chat_id, user_id, voice_data):
        """Handle incoming voice message"""
        bot_service = TelegramBotService()
        
        try:
            # Send processing message
            bot_service.send_message(chat_id, "🎤 Processing your voice message...")
            
            # Try Google Speech-to-Text first (if configured)
            speech_service = SpeechToTextService()
            transcript, error = speech_service.process_voice_message(chat_id, user_id, voice_data)
            
            if transcript:
                logger.info(f"Voice transcribed: {transcript}")
                # Process the transcribed text as a regular message
                self._handle_text_message(chat_id, user_id, transcript, is_voice_input=True)
            else:
                # Fallback: Let user know we couldn't process the voice
                bot_service.send_message(
                    chat_id, 
                    f"🎤 I couldn't process your voice message: {error}\n\n"
                    "💡 Please try:\n"
                    "• Speaking clearly\n"
                    "• Using text instead\n"
                    "• Example: 'send 0.5 ETH to john.base.eth'"
                )
                
        except Exception as e:
            logger.error(f"Voice processing error: {e}")
            bot_service.send_message(
                chat_id, 
                "❌ Sorry, I couldn't process your voice message. Please try typing your message instead."
            )
    
    def _handle_text_message(self, chat_id, user_id, text, is_voice_input=False):
        """Handle incoming text message (including transcribed voice)"""
        bot_service = TelegramBotService()
        
        # Check for confirmation
        if text.lower() == 'yes':
            cache_key = f"pending_transfer_{chat_id}"
            intent_data = cache.get(cache_key)
            
            if intent_data:
                # Send processing message
                bot_service.send_message(chat_id, "💫 Processing your transaction...")
                
                result = CryptoTransferService.send_crypto(
                    intent_data['amount'],
                    intent_data['token'],
                    intent_data['recipient']
                )
                cache.delete(cache_key)
                bot_service.send_message(chat_id, result)
                return
        
        # Check for transfer command
        if self._is_transfer_command(text):
            is_transfer, transfer_data = CryptoTransferService.extract_transfer_info(text)
            
            if is_transfer:
                try:
                    amount = Decimal(transfer_data['amount'])
                    if amount > 0:
                        # Store pending transfer in cache
                        cache_key = f"pending_transfer_{chat_id}"
                        cache.set(cache_key, transfer_data, timeout=300)  # 5 minutes
                        
                        # Store in database for persistence
                        TransferData.objects.create(
                            chat_id=chat_id,
                            amount=transfer_data['amount'],
                            token=transfer_data['token'],
                            recipient=transfer_data['recipient']
                        )
                        
                        voice_indicator = "🎤 " if is_voice_input else ""
                        confirmation_msg = (
                            f"{voice_indicator}💰 <b>Transfer Confirmation</b>\n\n"
                            f"💵 Amount: <b>{transfer_data['amount']} {transfer_data['token']}</b>\n"
                            f"📧 To: <b>{transfer_data['recipient']}</b>\n\n"
                            f"❓ Confirm this transfer?\n"
                            f"Reply with <b>'yes'</b> to proceed"
                        )
                        
                        bot_service.send_message(chat_id, confirmation_msg, parse_mode='HTML')
                        return
                        
                except (ValueError, TypeError):
                    bot_service.send_message(chat_id, "❌ Invalid amount specified.")
                    return
        
        # Get AI response for other messages
        context = self._get_context(text, chat_id, user_id)
        ai_response = GeminiAIService.get_ai_response(context, is_voice_input)
        
        # Simple safeguard for repeated phrases
        if ai_response.count("I'm sorry") > 3:
            ai_response = "🤔 Hmm... I didn't quite get that. Could you rephrase?"
        
        # Add voice indicator if this was from voice input
        if is_voice_input:
            ai_response = f"🎤 {ai_response}"
        
        bot_service.send_message(chat_id, ai_response)
    
    def _is_transfer_command(self, text):
        """Check if text contains a transfer command"""
        text_lower = text.lower()
        transfer_keywords = ['send', 'transfer', 'pay', 'give']
        domain_keywords = ['.eth', '.base.eth', '.bnb', '.polygon', '.arb', '.op']
        
        has_transfer_keyword = any(keyword in text_lower for keyword in transfer_keywords)
        has_domain = any(domain in text_lower for domain in domain_keywords)
        
        return has_transfer_keyword and has_domain
    
    def _get_context(self, input_text, chat_id, user_id):
        """Get context for AI based on user input"""
        input_lower = input_text.lower()
        
        if self._is_transfer_command(input_text):
            return self._handle_sending_context(input_text, chat_id, user_id)
        elif 'balance' in input_lower:
            return "Check my balance."
        elif 'help' in input_lower:
            return "I want to know about Zapbase."
        
        return input_text
    
    def _handle_sending_context(self, user_message, chat_id, user_id):
        """Handle sending context for transfers"""
        is_transfer, transfer_data = CryptoTransferService.extract_transfer_info(user_message)
        
        if is_transfer:
            return (f"I want to send {transfer_data['amount']} "
                   f"{transfer_data['token']} to {transfer_data['recipient']}.")
        
        return "What details do you need for the transfer?"