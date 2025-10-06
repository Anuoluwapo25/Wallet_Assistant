# ZapBase - AI-Powered Voice Crypto Wallet 🎤💰

ZapBase is an innovative crypto wallet that allows you to send cryptocurrency using voice commands powered by AI. Simply speak your transaction request, and the AI processes it to execute secure crypto transfers.

## ✨ Features

- 🎤 **Voice Commands**: Speak naturally to send crypto
- 🤖 **AI Processing**: Gemini AI understands your voice commands
- ⚡ **Fast Transactions**: Support for ETH and ERC-20 tokens
- 🔐 **Secure**: Web3 wallet integration with MetaMask
- 🌐 **ENS Support**: Send to .eth, .base.eth addresses
- 📱 **Modern UI**: Clean, responsive interface

## 🎯 How It Works

1. **🎤 Voice Input**: Click the microphone and say your command
2. **🧠 AI Processing**: Gemini AI processes your voice and extracts transaction details
3. **✅ Confirmation**: Review transaction details before confirming
4. **🚀 Execution**: Transaction is sent to the blockchain
5. **📋 Receipt**: View transaction hash and confirmation

### Example Voice Commands

- *"Send 0.005 ETH to annie.base.eth"*
- *"Transfer 0.1 ETH Sepolia to john.eth"*
- *"Pay 0.05 ETH to wallet.base.eth"*

## 🛠️ Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (3.8 or higher)
- **Gemini API Key** from [Google AI Studio](https://makersuite.google.com/)
- **MetaMask** or other Web3 wallet

### Quick Setup

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd Wallet_Assistant
   ./setup.sh
   ```

2. **Configure environment:**
   ```bash
   # Edit .env file with your API keys
   nano .env
   ```
   
   Required keys:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

3. **Start the application:**
   
   **Backend (Terminal 1):**
   ```bash
   python manage.py runserver
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 🎯 Usage

### Voice Commands

1. **Connect Wallet**: Click "Connect Wallet" to link your MetaMask
2. **Start Voice**: Click the microphone button
3. **Speak Command**: Say something like "Send 0.005 ETH to annie.base.eth"
4. **Confirm Transaction**: Review details and confirm
5. **View Results**: See transaction hash and confirmation

### Supported Networks

- **Base Sepolia** (Testnet)
- **Ethereum Mainnet** (Coming soon)
- **Base Mainnet** (Coming soon)

### Supported Tokens

- **ETH** (Ethereum)
- **ERC-20 Tokens** (USDC, USDT, etc.)

## 🏗️ Architecture

### Frontend (`/frontend`)
- **React 18** with modern hooks
- **Web Speech API** for voice recognition
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Web3** integration for wallet connectivity

### Backend (`/wallet_ai`)
- **Django** REST API
- **Gemini AI** for natural language processing
- **Voice processing** with fallback to Google Speech-to-Text
- **Transaction execution** via ENS asset sender API

### Key Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Voice Input   │───▶│   AI Processing  │───▶│  Crypto Transfer │
│                 │    │                 │    │                 │
│ Web Speech API  │    │   Gemini AI     │    │  Web3 / ENS     │
│ + Microphone    │    │ + Pattern Match │    │ + Blockchain    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key-here

# Optional (for Telegram bot)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Optional (for Google Speech-to-Text fallback)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

### Voice Recognition Settings

The app uses two speech recognition methods:

1. **Web Speech API** (Primary)
   - Browser-based, works offline
   - Supported in Chrome, Edge, Safari
   - Real-time transcription

2. **Google Speech-to-Text** (Fallback)
   - Server-side processing
   - Higher accuracy
   - Requires API credentials

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist folder
```

### Backend (Railway/Heroku)

```bash
# Add environment variables to your platform
# Deploy with your preferred service
```

## 🔐 Security

- **No Private Keys**: App doesn't store private keys
- **MetaMask Integration**: Secure transaction signing
- **Input Validation**: All voice commands are validated
- **Rate Limiting**: Protection against spam
- **HTTPS Required**: Secure communication

## 🧪 Testing

### Voice Commands to Test

1. **Valid Commands:**
   - "Send 0.001 ETH to test.base.eth"
   - "Transfer 0.5 ETH to demo.eth"
   - "Pay 0.1 ETH to wallet.base.eth"

2. **Invalid Commands:**
   - "Send ETH" (missing amount/recipient)
   - "Hello world" (not a transaction)
   - "Send -1 ETH to test.eth" (negative amount)

### Browser Compatibility

- ✅ **Chrome 25+** (Full support)
- ✅ **Edge 79+** (Full support)  
- ✅ **Safari 14.1+** (Full support)
- ❌ **Firefox** (Limited - no Web Speech API)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

### Common Issues

1. **Voice not working**: Enable microphone permissions
2. **API errors**: Check your Gemini API key
3. **Transaction failing**: Ensure sufficient balance
4. **Wallet not connecting**: Try refreshing or reconnecting MetaMask

### Getting Help

- 📧 Email: support@zapbase.io
- 💬 Discord: [Join our community]
- 📚 Docs: [Documentation]

---

**Made with ❤️ for the future of crypto UX**

*Try it now: "Send 0.005 ETH to annie.base.eth"* 🎤