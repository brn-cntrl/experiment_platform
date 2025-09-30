import time
import os
import re
import json
import requests
import threading
from pathlib import Path
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk

env_path = Path(__file__).parent / ".env"
print(f"Looking for .env at: {env_path}")
print("File exists:", env_path.exists())  

load_dotenv(dotenv_path=env_path)

speech_key = os.getenv("AZURE_SPEECH_KEY")
region = os.getenv("AZURE_SPEECH_REGION")

class TranscriptionManager:
    def __init__(self):
        """
        Fast Transcription Manager using Azure's Fast Transcription API.
        This is MUCH faster than the regular SDK - can transcribe 30 minutes in <1 minute.
        """
        self.azure_key = os.getenv('AZURE_SPEECH_KEY')
        self.azure_region = os.getenv('AZURE_SPEECH_REGION')
        self.result = None
        self.lock = threading.Lock()
        
        if not self.azure_key or not self.azure_region:
            raise ValueError(
                "Azure credentials not found. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in your .env file"
            )
        
        # Fast Transcription API endpoint
        self.endpoint = f"https://{self.azure_region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe"
        
        print("Transcription Manager initialized.")
        print(f"   Region: {self.azure_region}")
        print(f"   Endpoint: {self.endpoint}")

    def transcribe(self, audio_file):
        """
        Fast transcription using Azure's Fast Transcription API.
        This should give you sub-2-second response times.
        
        Args:
            audio_file (str): Path to audio file
        Returns:
            dict: Transcription result with metadata
        """
        try:
            start_time = time.time()
            
            # Prepare the files and data for multipart/form-data request
            with open(audio_file, 'rb') as f:
                files = {
                    'audio': (os.path.basename(audio_file), f, 'audio/wav')
                }
                
                data = {
                    'definition': json.dumps({
                        "locales": ["en-US"]
                    })
                }
                
                headers = {
                    'Ocp-Apim-Subscription-Key': self.azure_key,
                    'Accept': 'application/json'
                }
                
                params = {
                    'api-version': '2024-05-15-preview'
                }
                
                print(f"Sending audio file: {audio_file}")
                response = requests.post(
                    self.endpoint,
                    files=files,
                    data=data,
                    headers=headers,
                    params=params,
                    timeout=30  # 30 second timeout should be plenty
                )
            
            processing_time = time.time() - start_time
            print(f"Fast transcription API completed in {processing_time:.3f} seconds")
            
            if response.status_code == 200:
                result = response.json()
                
                text = ""
                if 'combinedPhrases' in result and len(result['combinedPhrases']) > 0:
                    text = result['combinedPhrases'][0].get('text', '')
                elif 'phrases' in result and len(result['phrases']) > 0:
                    # Fallback: combine all phrases
                    text = ' '.join([phrase.get('text', '') for phrase in result['phrases']])
                
                text = text.strip()
                parsed_answer = self._parse_math_answer(text)
                
                return {
                    "success": True,
                    "text": text,
                    "answer": parsed_answer,
                    "confidence": 1.0,
                    "processing_time": processing_time,
                    "source": "azure_fast_transcription"
                }
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                print(f"Fast transcription failed: {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "text": "",
                    "processing_time": processing_time,
                    "source": "azure_fast_transcription"
                }
                
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Request timeout (>30 seconds)",
                "text": "",
                "processing_time": time.time() - start_time,
                "source": "azure_fast_transcription"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "processing_time": time.time() - start_time,
                "source": "azure_fast_transcription"
            }

    def _get_confidence_score(self, result):
        """Extract confidence score from Azure result."""
        try:
            if hasattr(result, 'properties'):
                detailed_result = result.properties.get(
                    speechsdk.PropertyId.SpeechServiceResponse_JsonResult
                )
                if detailed_result:
                    data = json.loads(detailed_result)
                    if 'NBest' in data and len(data['NBest']) > 0:
                        return data['NBest'][0].get('Confidence', 1.0)
            return 1.0
        except:
            return 1.0

    def _parse_math_answer(self, text):
        """
        Parse mathematical answer from speech text.
        Handles numbers, words, and common math expressions.
        """
        text = text.lower().strip()
        
        # Remove punctuation that might interfere
        text = re.sub(r'[.!?]$', '', text)
        
        # Extract direct numbers including decimals and negatives
        numbers = re.findall(r'-?\d+(?:\.\d+)?', text)
        if numbers:
            try:
                return float(numbers[0]) if '.' in numbers[0] else int(numbers[0])
            except ValueError:
                pass
        
        # Word-to-number conversion for common math terms
        number_words = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
            'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
            'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
            'twenty-nine': 29, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
            'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100
        }
        
        # Handle negative numbers
        is_negative = any(word in text for word in ['negative', 'minus'])
        
        # Try exact match first
        if text in number_words:
            result = number_words[text]
            return -result if is_negative else result
        
        # Try compound numbers (e.g., "twenty one", "forty-two")
        words = text.replace('-', ' ').split()
        total = 0
        current = 0
        
        for word in words:
            if word in number_words:
                value = number_words[word]
                if value == 100:
                    current = current * 100 if current > 0 else 100
                elif value >= 20:
                    current += value
                else:
                    current += value
        
        total += current
        
        if total > 0:
            return -total if is_negative else total
        
        # If no conversion possible, return original text
        return text

    def test_connection(self):
        """Test the Fast Transcription API with a sample file."""
        try:
            print("🧪 Testing Fast Transcription API...")
            
            # You'll need to provide a test audio file path
            test_file = "tmp/recording.wav"  # Use your existing recording file
            
            if not os.path.exists(test_file):
                print(f"❌ Test file not found: {test_file}")
                return False
            
            result = self.transcribe(test_file)
            
            if result["success"]:
                print(f"✅ Fast Transcription test successful!")
                print(f"   Text: '{result['text']}'")
                print(f"   Processing time: {result['processing_time']:.3f}s")
                print(f"   Source: {result['source']}")
                return True
            else:
                print(f"❌ Fast Transcription test failed: {result['error']}")
                return False
                
        except Exception as e:
            print(f"❌ Fast Transcription test error: {e}")
            return False

    def get_service_info(self):
        """Get Fast Transcription API configuration info."""
        return {
            "service": "Azure Fast Transcription API",
            "region": self.azure_region,
            "endpoint": self.endpoint,
            "language": "en-US",
            "api_version": "2024-05-15-preview",
            "expected_performance": "Sub-2-second for typical audio files",
            "max_file_size": "300 MB",
            "max_duration": "2 hours",
            "has_credentials": bool(self.azure_key)
        }