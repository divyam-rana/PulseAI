#!/bin/bash

# Quick deployment script for Google Cloud Run
# Usage: ./deploy-gcp.sh [PROJECT_ID] [REGION]

set -e

PROJECT_ID=${1:-pulseai-team3-ba882-fall25}
REGION=${2:-us-central1}
SERVICE_NAME="pulseai-insights"

echo "🚀 Deploying PulseAI Insights to Google Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Verify service account key exists
if [ ! -f "backend/service-account-key.json" ]; then
    echo "❌ ERROR: backend/service-account-key.json not found!"
    echo "   Please place your service account key file at: backend/service-account-key.json"
    exit 1
fi

# Build and submit to Cloud Build
echo "🏗️  Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run with service account key file
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,BIGQUERY_DATASET=pulseai_main_db,NODE_ENV=production,GOOGLE_APPLICATION_CREDENTIALS=/app/backend/service-account-key.json

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application is available at:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
echo ""
