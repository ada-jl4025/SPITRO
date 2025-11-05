#!/bin/bash

echo "Setting up the Spitro Journey Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

echo "Installing dependencies..."
npm install

echo "Creating .env.local file from example..."
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "Created .env.local file. Please update it with your actual API keys."
    else
        echo "Creating basic .env.local file..."
        cat > .env.local << 'EOL'
# Database
POSTGRES_URL=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Azure OpenAI
AZURE_API_TARGET_URL=
AZURE_API_KEY=

# TFL API (optional)
NEXT_PUBLIC_TFL_API_KEY=

# Geocoding
GEOCODING_API_KEY=
GEOCODING_PROVIDER=mapbox
EOL
        echo "Created .env.local file. Please update it with your actual API keys."
    fi
else
    echo ".env.local file already exists."
fi

echo ""
echo "Setup complete! Next steps:"
echo "1. Update the .env.local file with your API keys"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For deployment to Vercel:"
echo "1. Push your code to GitHub"
echo "2. Import the project in Vercel"
echo "3. Add environment variables in Vercel dashboard"
echo "4. Deploy!"
