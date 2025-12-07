#!/bin/bash

# Build script for PulseAI Insights
# This script prepares the application for production deployment

set -e

echo "🏗️  Building PulseAI Insights for Production"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm ci

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci
cd ..

echo ""
echo "🔨 Building frontend..."
npm run build

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 Production files are ready in ./dist"
echo ""
echo "Next steps:"
echo "  - For Docker: docker build -t pulseai-insights ."
echo "  - For GCP Cloud Run: See DEPLOYMENT.md"
echo "  - For testing: npm run preview"
echo ""
