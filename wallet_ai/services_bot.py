import re
import json
import requests
import os
import tempfile
import logging
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache
from google.cloud import speech
from pydub import AudioSegment
from .models import TransferIntent, TransferData, VoiceMessage

logger = logging.getLogger(__name__)

class SpeechToTextService:
    """Google Speech-to-Text service for processing voice messages"""
    
    def __init__(self):
        # Initialize the Speech-to-Text client
        self.client = speech.SpeechClient()
        self.config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            sample_rate_hertz=16000,
            language_code="en-US",
            # Enhanced models for better accuracy
            model="latest_long",
            use_enhanced=True,
            # Enable automatic punctuation
            enable_automatic_punctuation=True,
            # Enable word confidence for better accuracy filtering
            enable_word_confidence=True,
        )
    
    def download_voice_file(self, bot_token, file_id):
        """Download voice file from Telegram servers"""
        try:
            # Get file path from Telegram
            file_info_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"
            response = requests.get(file_info_url)
            file_info = response.json()
            
            if not file_info.get('ok'):
                logger.error(f"Failed to get file info: {file_info}")
                return None
            
            file_path = file_info['result']['file_path']
            
            # Download the actual file
            file_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
            file_response = requests.get(file_url)
            
            if file_response.status_code == 200:
                return file_response.content
            else:
                logger.error(f"Failed to download file: {file_response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading voice file: {e}")
            return None
    
    def convert_audio_format(self, audio_data):
        """Convert audio to format suitable for Google Speech-to-Text"""
        try:
            # Create temporary file for input
            with tempfile.NamedTemporaryFile(suffix='.ogg') as temp_input:
                temp_input.write(audio_data)
                temp_input.flush()
                
                # Load audio using pydub
                audio = AudioSegment.from_file(temp_input.name, format="ogg")
                
                # Convert to mono and set sample rate to 16kHz
                audio = audio.set_channels(1).set_frame_rate(16000)
                
                # Export as WAV for better compatibility
                with tempfile.NamedTemporaryFile(suffix='.wav') as temp_output:
                    audio.export(temp_output.name, format="wav")
                    temp_output.seek(0)
                    return temp_output.read()
                    
        except Exception as e:
            logger.error(f"Error converting audio format: {e}")
            return None
    
    def transcribe_audio(self, audio_data):
        """Transcribe audio data to text using Google Speech-to-Text"""
        try:
            # Convert audio format
            converted_audio = self.convert_audio_format(audio_data)
            if not converted_audio:
                return None, "Failed to convert audio format"
            
            # Update config for WAV format
            wav_config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="en-US",
                model="latest_long",
                use_enhanced=True,
                enable_automatic_punctuation=True,
                enable_word_confidence=True,
                # Add profanity filter
                profanity_filter=True,
                # Alternative language codes for better recognition
                alternative_language_codes=["en-GB", "en-AU"],
            )
            
            # Create the audio object
            audio = speech.RecognitionAudio(content=converted_audio)
            
            # Perform the transcription
            response = self.client.recognize(config=wav_config, audio=audio)
            
            # Process results
            if response.results:
                # Get the transcript with highest confidence
                transcript = response.results[0].alternatives[0].transcript
                confidence = response.results[0].alternatives[0].confidence
                
                logger.info(f"Transcription successful: {transcript} (confidence: {confidence})")
                return transcript.strip(), None
            else:
                return None, "No speech detected in audio"
                
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return None, f"Transcription failed: {str(e)}"
    
    def process_voice_message(self, chat_id, user_id, voice_data):
        """Process voice message from Telegram"""
        try:
            file_id = voice_data.get('file_id')
            duration = voice_data.get('duration', 0)
            
            # Store voice message record
            voice_message = VoiceMessage.objects.create(
                chat_id=chat_id,
                user_id=user_id,
                file_id=file_id,
                duration=duration
            )
            
            # Download and transcribe
            audio_data = self.download_voice_file(settings.TELEGRAM_BOT_TOKEN, file_id)
            if not audio_data:
                return None, "Failed to download voice message"
            
            transcript, error = self.transcribe_audio(audio_data)
            
            # Update voice message record
            voice_message.transcribed_text = transcript or ""
            voice_message.processed = True
            voice_message.save()
            
            if transcript:
                return transcript, None
            else:
                return None, error or "Failed to transcribe audio"
                
        except Exception as e:
            logger.error(f"Error processing voice message: {e}")
            return None, f"Voice processing failed: {str(e)}"

class VoiceCommandProcessor:
    """Process voice commands for crypto operations"""
    
    @staticmethod
    def normalize_voice_text(text):
        """Normalize transcribed text for better command recognition"""
        if not text:
            return ""
        
        # Common speech-to-text corrections for crypto terms
        replacements = {
            # Currency corrections
            'etherium': 'ethereum',
            'ether': 'eth',
            'bitcoins': 'bitcoin',
            'bit coin': 'bitcoin',
            
            # Action corrections
            'sent': 'send',
            'transfer': 'send',
            'give': 'send',
            'pay': 'send',
            
            # Address corrections
            'dot base dot eth': '.base.eth',
            'dot eth': '.eth',
            'point base point eth': '.base.eth',
            'point eth': '.eth',
            
            # Number corrections
            'zero point': '0.',
            'one': '1',
            'two': '2',
            'three': '3',
            'four': '4',
            'five': '5',
            'six': '6',
            'seven': '7',
            'eight': '8',
            'nine': '9',
            'ten': '10',
        }
        
        normalized = text.lower()
        for old, new in replacements.items():
            normalized = normalized.replace(old, new)
        
        return normalized
    
    @staticmethod
    def extract_voice_command(text):
        """Extract commands from voice text with enhanced patterns"""
        normalized_text = VoiceCommandProcessor.normalize_voice_text(text)
        
        # Enhanced patterns for voice commands
        patterns = [
            # Standard transfer pattern
            r'(?i)send\s+([\d.]+|zero point \d+)\s*(eth|ethereum|btc|bitcoin|usdc|usdt)?\s+to\s+([a-zA-Z0-9.-]+\.(?:base\.eth|eth|bnb|polygon|arb|op))',
            
            # Alternative phrasings
            r'(?i)transfer\s+([\d.]+|zero point \d+)\s*(eth|ethereum|btc|bitcoin|usdc|usdt)?\s+to\s+([a-zA-Z0-9.-]+\.(?:base\.eth|eth|bnb|polygon|arb|op))',
            
            # More natural phrasing
            r'(?i)pay\s+([a-zA-Z0-9.-]+\.(?:base\.eth|eth|bnb|polygon|arb|op))\s+([\d.]+|zero point \d+)\s*(eth|ethereum|btc|bitcoin|usdc|usdt)?',
            
            # Give pattern
            r'(?i)give\s+([\d.]+|zero point \d+)\s*(eth|ethereum|btc|bitcoin|usdc|usdt)?\s+to\s+([a-zA-Z0-9.-]+\.(?:base\.eth|eth|bnb|polygon|arb|op))',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, normalized_text)
            if match:
                groups = match.groups()
                
                # Handle different pattern structures
                if len(groups) >= 3:
                    if pattern.startswith(r'(?i)pay'):  # pay pattern has different order
                        recipient = groups[0]
                        amount = groups[1]
                        token = groups[2] if len(groups) > 2 and groups[2] else 'ETH'
                    else:
                        amount = groups[0]
                        token = groups[1] if groups[1] else 'ETH'
                        recipient = groups[2]
                    
                    # Clean up the amount (handle "zero point" etc)
                    amount = amount.replace('zero point', '0.')
                    
                    return True, {
                        'amount': amount,
                        'token': token.upper() if token else 'ETH',
                        'recipient': recipient
                    }
        
        return False, None

class CryptoTransferService:
    
    @staticmethod
    def extract_transfer_info(text):
        """Extract transfer information from text using regex"""
        # First try voice command extraction
        is_voice_command, voice_data = VoiceCommandProcessor.extract_voice_command(text)
        if is_voice_command:
            return True, voice_data
        
        # Fallback to original text pattern matching
        pattern = r'(?i)send\s+([\d.]+)\s*(eth|token|btc|usdc|usdt)?\s+to\s+([a-zA-Z0-9.-]+\.(?:base\.eth|eth|bnb|polygon|arb|op))'
        
        matches = re.search(pattern, text)
        
        if matches:
            amount = matches.group(1)
            token = matches.group(2) or 'ETH'
            recipient = matches.group(3)
            
            return True, {
                'amount': amount,
                'token': token.upper(),
                'recipient': recipient
            }
        
        return False, None
    
    @staticmethod
    def send_crypto(amount, token, recipient):
        """Send cryptocurrency to recipient"""
        api_url = "https://ens-asset-sender.onrender.com/send-asset"
        
        is_eth = token.lower() == 'eth'
        
        payload = {
            'recipient': recipient,
            'amount': float(amount),
            'isEth': is_eth
        }
        
        try:
            response = requests.post(
                api_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                tx_hash = result.get('txHash')
                
                if tx_hash:
                    return f"✅ Transfer succeeded!\n\n🔗 Transaction: https://sepolia.basescan.org/tx/{tx_hash}\n\n💰 Sent: {amount} {token}\n📧 To: {recipient}"
                else:
                    return "❌ Transfer failed due to insufficient funds.\n\n💳 Top up your wallet here: https://zapbase-imara1.vercel.app/"
            else:
                return f"❌ Transaction failed: {response.text}"
                
        except requests.RequestException as e:
            return f"❌ Failed to reach transaction server: {str(e)}"

class GeminiAIService:
    
    @staticmethod
    def get_ai_response(user_input, is_voice_input=False):
        """Get AI response from Gemini API"""
        voice_context = " (This message was sent via voice)" if is_voice_input else ""
        
        context = ("You are a helpful assistant called Frechi for a crypto application called ZapBase. "
                  "The user can ask for their balance, transfer ETH using a wallet address or basename "
                  "i.e username.base.eth, check token prices, or tip the app Zapbase'. "
                  "Be empathetic and please respond to the following message" + voice_context + ":")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"{context} {user_input}"
                }]
            }]
        }
        
        try:
            response = requests.post(
                url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('candidates') and 
                    len(data['candidates']) > 0 and
                    data['candidates'][0].get('content', {}).get('parts') and
                    len(data['candidates'][0]['content']['parts']) > 0):
                    
                    return data['candidates'][0]['content']['parts'][0]['text']
            
            return "Sorry, I couldn't process that request right now."
            
        except requests.RequestException:
            return "Oops! Something went wrong with the AI service."

class TelegramBotService:
    
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
    
    def send_message(self, chat_id, text, parse_mode='HTML'):
        """Send message via Telegram Bot API"""
        url = f"{self.base_url}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode
        }
        
        try:
            response = requests.post(url, json=payload)
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def set_webhook(self, webhook_url):
        """Set webhook for Telegram bot"""
        url = f"{self.base_url}/setWebhook"
        payload = {'url': webhook_url}
        
        try:
            response = requests.post(url, json=payload)
            return response.status_code == 200
        except requests.RequestException:
            return False
        payload = {'url': webhook_url}
        
        try:
            response = requests.post(url, json=payload)
            return response.status_code == 200
        except requests.RequestException:
            return False