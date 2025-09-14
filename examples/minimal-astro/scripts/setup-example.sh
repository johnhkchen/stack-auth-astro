#!/bin/bash

# Stack Auth Minimal Example Setup Script
# Automates the setup process for new users

set -e

echo "🚀 Setting up Stack Auth Minimal Example..."
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: This script must be run from the minimal-astro example directory"
    echo "   Please run: cd examples/minimal-astro && ./scripts/setup-example.sh"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Check if .env already exists
if [[ -f ".env" ]]; then
    echo "⚠️  .env file already exists"
    echo "   Current configuration:"
    echo "   - $(grep -c "STACK_" .env 2>/dev/null || echo "0") Stack Auth variables configured"
    echo ""
    read -p "   Do you want to overwrite the existing .env file? (y/N): " confirm
    
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "   Backing up existing .env to .env.backup..."
        cp .env .env.backup
        echo "   ✅ Backup created"
    else
        echo "   Keeping existing .env file"
        echo ""
        echo "🎯 Quick test:"
        echo "   npm run build:test    # Test with mock credentials"
        echo "   npm run dev          # Start development server"
        echo ""
        exit 0
    fi
fi

# Check if .env.example exists
if [[ ! -f ".env.example" ]]; then
    echo "❌ Error: .env.example file not found"
    echo "   This file should contain the template for environment variables"
    exit 1
fi

# Copy .env.example to .env
echo "📝 Creating .env file from template..."
cp .env.example .env
echo "✅ Created .env file"
echo ""

# Display setup instructions
echo "🔧 Next Steps:"
echo ""
echo "1. Edit your .env file with your Stack Auth credentials:"
echo "   - Get these from your Stack Auth dashboard"
echo "   - Visit: https://app.stack-auth.com"
echo ""
echo "2. Required environment variables:"
echo "   - STACK_PROJECT_ID=your-project-id-here"
echo "   - STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-key-here" 
echo "   - STACK_SECRET_SERVER_KEY=your-secret-key-here"
echo ""
echo "3. Optional configuration:"
echo "   - STACK_AUTH_PREFIX=/auth (default: /handler)"
echo ""

# Ask if user wants to open .env file
if command -v code &> /dev/null; then
    read -p "   Open .env in VS Code now? (y/N): " open_vscode
    if [[ $open_vscode == [yY] || $open_vscode == [yY][eE][sS] ]]; then
        code .env
    fi
elif command -v nano &> /dev/null; then
    read -p "   Open .env in nano now? (y/N): " open_nano
    if [[ $open_nano == [yY] || $open_nano == [yY][eE][sS] ]]; then
        nano .env
    fi
fi

echo ""
echo "🎯 Quick Commands:"
echo "   npm run dev          # Start development server (requires real credentials)"
echo "   npm run build:test   # Test build with mock credentials"
echo "   npm run build        # Production build (requires real credentials)"
echo ""
echo "✨ Setup complete! The example is now ready to use."
echo "   Note: The build will work without real credentials thanks to automatic test mode fallback."