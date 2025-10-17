#!/bin/bash

# Deploy all Cloud Functions for PulseAI
# Run from repo root: bash deploy-functions.sh

PROJECT_ID="pulseai-team3-ba882-fall25"
REGION="us-central1"

echo "======================================"
echo "Deploying Extract Functions..."
echo "======================================"

# Deploy extract-arxiv
cd functions/extract-arxiv
gcloud functions deploy extract-arxiv \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
cd ../..

# Deploy extract-gnews
cd functions/extract-gnews
gcloud functions deploy extract-gnews \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
cd ../..

# Deploy extract-reddit
cd functions/extract-reddit
gcloud functions deploy extract-reddit \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
cd ../..

echo "======================================"
echo "Deploying Schema Setup Functions..."
echo "======================================"

# Deploy arxiv schema
cd functions/setup-arxiv-schema
gcloud functions deploy setup-arxiv-schema \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated
cd ../..

# Deploy gnews schema
cd functions/setup-gnews-schema
gcloud functions deploy setup-gnews-schema \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated
cd ../..

# Deploy reddit schema
cd functions/setup-reddit-schema
gcloud functions deploy setup-reddit-schema \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated
cd ../..

echo "======================================"
echo "Deploying Load Functions..."
echo "======================================"

# Deploy load-arxiv
cd functions/load-arxiv
gcloud functions deploy load-arxiv \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
cd ../..

# Deploy load-gnews
cd functions/load-gnews
gcloud functions deploy load-gnews \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
cd ../..

# Deploy load-reddit
cd functions/load-reddit
gcloud functions deploy load-reddit \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
cd ../..

echo "======================================"
echo "All functions deployed successfully!"
echo "======================================"