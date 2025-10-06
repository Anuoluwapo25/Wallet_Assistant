#!/bin/bash

echo "🚀 Setting up ZapBase AI Wallet..."

# Backend setup
echo "📦 Installing backend dependencies..."
pip install -r requirements.txt

# Frontend setup
echo "⚛️ Installing frontend dependencies..."
cd frontend
npm install

# Create environment file if it doesn't exist
if [ ! -f "../.env" ]; then
    echo "📝 Creating environment file..."
    cat > ../.env << EOL
# Django settings
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True

# API Keys
GEMINI_API_KEY=your-gemini-api-key-here
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here

# Google Cloud (optional for voice processing)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Public URL for webhooks (when deployed)
PUBLIC_URL=https://your-domain.com
EOL
    echo "✅ Environment file created at .env"
    echo "⚠️  Please update the API keys in the .env file"
fi

cd ..

# Run migrations
echo "🗄️ Running database migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✅ Setup complete!"
echo ""
echo "📚 Next Steps:"
echo "1. Update your .env file with your Gemini API key"
echo "2. Start the backend: python manage.py runserver"
echo "3. In another terminal, start the frontend: cd frontend && npm run dev"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "🎤 Try saying: 'Send 0.005 ETH to annie.base.eth'"