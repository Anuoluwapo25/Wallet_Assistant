import React, { useState } from 'react';
import { Wallet, MessageSquare, Settings } from 'lucide-react';
import VoiceCommand from './components/VoiceCommand';
import TransactionConfirm from './components/TransactionConfirm';
import Dashboard from './components/dashboard';

function App() {
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Welcome to ZapBase! Your AI-powered crypto wallet. Try speaking a command like 'Send 0.005 ETH to annie.base.eth'",
      type: 'system',
      timestamp: new Date()
    }
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); 

  const handleVoiceCommand = (response, originalCommand) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: originalCommand,
      type: 'user',
      timestamp: new Date(),
      isVoice: true
    }]);

    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      text: response,
      type: 'assistant',
      timestamp: new Date()
    }]);
  };

  const handleTransactionDetected = (transactionData, voiceCommand) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: voiceCommand,
      type: 'user',
      timestamp: new Date(),
      isVoice: true
    }]);

    setPendingTransaction({
      ...transactionData,
      voiceCommand: voiceCommand
    });
  };

  const handleTransactionConfirm = async (transaction) => {
    try {
      const response = await fetch('/api/send-crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: transaction.amount,
          token: transaction.token,
          recipient: transaction.recipient
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: result.message,
          type: 'assistant',
          timestamp: new Date(),
          isSuccess: true
        }]);

        return { success: true, txHash: result.txHash };
      } else {
        throw new Error(result.message || 'Transaction failed');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Transaction failed: ${error.message}`,
        type: 'assistant',
        timestamp: new Date(),
        isError: true
      }]);

      throw error;
    }
  };

  const handleTransactionCancel = () => {
    setPendingTransaction(null);
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: "Transaction cancelled.",
      type: 'assistant',
      timestamp: new Date()
    }]);
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsConnected(true);
        setWalletAddress(accounts[0]);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: " Wallet connected! You can now send crypto using voice commands.",
          type: 'system',
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet');
    }
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  // Render based on current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            onNavigate={handleNavigate}
            walletAddress={walletAddress}
            isConnected={isConnected}
          />
        );
      case 'voice_chat':
        return (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <VoiceCommand 
                  onCommand={handleVoiceCommand}
                  onTransactionDetected={handleTransactionDetected}
                />

                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings size={20} />
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 text-sm">
                      Check my balance
                    </button>
                    <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 text-sm">
                      View recent transactions
                    </button>
                    <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 text-sm">
                      Help & Support
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Chat History
                </h3>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary-50 border border-primary-200'
                          : message.type === 'system'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {message.isVoice && (
                            <span className="text-xs text-primary-600 font-medium">🎤 Voice: </span>
                          )}
                          <p className="text-sm text-gray-800">{message.text}</p>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'send':
      case 'receive':
      case 'convert':
        return (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <div className="card text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)} Page
              </h2>
              <p className="text-gray-600">This feature is coming soon!</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Only show on non-dashboard views */}
      {currentView !== 'dashboard' && (
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Wallet size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Siso</h1>
                  <p className="text-sm text-gray-600">AI-Powered Crypto Wallet</p>
                </div>
              </div>
              
              <button
                onClick={connectWallet}
                className={`btn-primary ${isConnected ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {isConnected ? ' Connected' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        </header>
      )}
      
      <main>
        {renderView()}
      </main>

      {/* Transaction Confirmation Modal */}
      {pendingTransaction && (
        <TransactionConfirm
          transaction={pendingTransaction}
          onConfirm={handleTransactionConfirm}
          onCancel={handleTransactionCancel}
          onClose={() => setPendingTransaction(null)}
        />
      )}
    </div>
  );
}

export default App;