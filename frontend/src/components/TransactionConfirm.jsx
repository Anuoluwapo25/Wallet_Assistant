import React, { useState } from 'react';
import { CheckCircle, XCircle, ExternalLink, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

const TransactionConfirm = ({ transaction, onConfirm, onCancel, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState(null);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const result = await onConfirm(transaction);
      setTxResult(result);
    } catch (error) {
      setTxResult({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (txResult) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-xl p-6 max-w-md w-full"
        >
          <div className="text-center">
            {txResult.success ? (
              <div className="space-y-4">
                <CheckCircle size={48} className="text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900">Transaction Successful!</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Sent: <strong>{transaction.amount} {transaction.token}</strong></p>
                  <p>To: <strong>{transaction.recipient}</strong></p>
                  {txResult.txHash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${txResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                    >
                      View on Explorer <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="btn-primary w-full"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <XCircle size={48} className="text-red-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900">Transaction Failed</h3>
                <p className="text-sm text-gray-600">{txResult.error}</p>
                <button
                  onClick={onClose}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl p-6 max-w-md w-full"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Transaction</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{transaction.amount} {transaction.token}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">To:</span>
              <span className="font-medium text-sm">{transaction.recipient}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              <span className="font-medium">Base Sepolia</span>
            </div>
          </div>

          {/* Voice Command Display */}
          {transaction.voiceCommand && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Voice Command:</strong> "{transaction.voiceCommand}"
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isProcessing && <Loader size={16} className="animate-spin" />}
              {isProcessing ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TransactionConfirm;