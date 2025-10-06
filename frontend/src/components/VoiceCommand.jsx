import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

const VoiceCommand = ({ onCommand, onTransactionDetected }) => {
  const {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  useEffect(() => {
    if (transcript && !isListening && confidence > 0.6 && transcript !== lastCommand) {
      handleProcessCommand(transcript);
    }
  }, [transcript, isListening, confidence, lastCommand]);

  const handleProcessCommand = async (command) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    setLastCommand(command);

    try {
      // Send to backend for processing
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: command,
          confidence: confidence,
          isVoiceInput: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Check if it's a transfer command
        if (result.transfer) {
          onTransactionDetected(result.transfer, command);
        } else {
          onCommand(result.message, command);
        }
      } else {
        onCommand(result.message || 'Sorry, I couldn\'t process that command.', command);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      onCommand('Sorry, there was an error processing your voice command.', command);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle size={20} />
          <span>Voice recognition not supported. Please use Chrome or Edge.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 size={20} className="text-primary-600" />
          <h3 className="font-semibold text-gray-900">Voice Command</h3>
          {confidence > 0 && (
            <span className="text-sm text-gray-500">
              ({Math.round(confidence * 100)}% confidence)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={`p-4 rounded-full transition-all duration-200 ${
              isListening
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } disabled:opacity-50`}
            whileTap={{ scale: 0.95 }}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </motion.button>

          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">
              {isListening 
                ? 'Listening... (tap mic to stop)' 
                : isProcessing 
                ? 'Processing...' 
                : 'Tap microphone to start voice command'
              }
            </div>
            
            {transcript && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-gray-800">{transcript}</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>
                {error === 'no-speech' && 'No speech detected. Please try again.'}
                {error === 'audio-capture' && 'Microphone access denied or unavailable.'}
                {error === 'not-allowed' && 'Please allow microphone access.'}
                {error === 'network' && 'Network error. Please check your connection.'}
                {!['no-speech', 'audio-capture', 'not-allowed', 'network'].includes(error) && 
                  `Voice recognition error: ${error}`}
              </span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Try saying:</div>
            <div className="text-blue-700 space-y-1">
              <div>"Send 0.005 ETH to annie.base.eth"</div>
              <div>"Transfer 0.1 ETH Sepolia to john.eth"</div>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 text-primary-600">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full"
              />
              <span className="text-sm">Processing your command...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCommand;