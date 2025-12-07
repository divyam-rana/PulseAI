#!/bin/bash

# Test script to verify deployment readiness

set -e

echo "🧪 PulseAI Deployment Pre-flight Checks"
echo "========================================"
echo ""

# Check 1: Node.js version
echo "✓ Checking Node.js version..."
node --version

# Check 2: npm dependencies
echo "✓ Checking frontend dependencies..."
if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install
fi

echo "✓ Checking backend dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo "  Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check 3: Service account key
echo "✓ Checking service account key..."
if [ ! -f "backend/service-account-key.json" ]; then
    echo "  ❌ ERROR: backend/service-account-key.json not found!"
    echo "     Download from GCP Console → IAM & Admin → Service Accounts"
    exit 1
else
    echo "  ✅ Service account key found"
fi

# Check 4: Build frontend
echo "✓ Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "  ❌ ERROR: Frontend build failed!"
    exit 1
else
    echo "  ✅ Frontend built successfully ($(du -sh dist | cut -f1))"
fi

# Check 5: Docker (optional)
echo "✓ Checking Docker..."
if command -v docker &> /dev/null; then
    echo "  ✅ Docker installed: $(docker --version)"
    
    read -p "  Test Docker build? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  Building Docker image..."
        docker build -t pulseai-insights:test .
        echo "  ✅ Docker build successful"
    fi
else
    echo "  ⚠️  Docker not installed (optional for local testing)"
fi

# Check 6: gcloud CLI
echo "✓ Checking gcloud CLI..."
if command -v gcloud &> /dev/null; then
    echo "  ✅ gcloud installed: $(gcloud --version | head -n1)"
    echo "  📋 Current project: $(gcloud config get-value project 2>/dev/null || echo 'not set')"
else
    echo "  ❌ ERROR: gcloud CLI not installed!"
    echo "     Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo ""
echo "✅ All checks passed! Ready to deploy."
echo ""
echo "To deploy to Cloud Run, run:"
echo "  ./deploy-gcp.sh"
echo ""
