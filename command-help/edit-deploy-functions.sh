#!/bin/bash

# PulseAI Transformation Pipeline Deployment Script
# Deploys only the 4 new transformation functions

set -e  # Exit on error

# Configuration
PROJECT_ID="pulseai-team3-ba882-fall25"
REGION="us-central1"
RUNTIME="python311"

echo "======================================"
echo "PulseAI Transformation Pipeline"
echo "======================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Runtime: $RUNTIME"
echo ""
echo "Deploying 4 new transformation functions..."
echo ""

# Navigate to functions directory
cd functions

# Function 1: Setup Main DB Schema
echo "======================================"
echo "1/4: Deploying setup-main-db-schema"
echo "======================================"
cd setup-main-db-schema

gcloud functions deploy setup-main-db-schema \
    --gen2 \
    --runtime "$RUNTIME" \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point task \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --memory 512MB \
    --timeout 540s \
    --quiet

echo "✓ setup-main-db-schema deployed successfully"
echo ""

cd ..

# Function 2: Transform GNews
echo "======================================"
echo "2/4: Deploying transform-gnews"
echo "======================================"
cd transform-gnews

gcloud functions deploy transform-gnews \
    --gen2 \
    --runtime "$RUNTIME" \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point task \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --memory 512MB \
    --timeout 540s \
    --quiet

echo "✓ transform-gnews deployed successfully"
echo ""

cd ..

# Function 3: Transform Reddit
echo "======================================"
echo "3/4: Deploying transform-reddit"
echo "======================================"
cd transform-reddit

gcloud functions deploy transform-reddit \
    --gen2 \
    --runtime "$RUNTIME" \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point task \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --memory 512MB \
    --timeout 540s \
    --quiet

echo "✓ transform-reddit deployed successfully"
echo ""

cd ..

# Function 4: Transform arXiv
echo "======================================"
echo "4/4: Deploying transform-arxiv"
echo "======================================"
cd transform-arxiv

gcloud functions deploy transform-arxiv \
    --gen2 \
    --runtime "$RUNTIME" \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point task \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --memory 512MB \
    --timeout 540s \
    --quiet

echo "✓ transform-arxiv deployed successfully"
echo ""

cd ../..

# Get and display function URLs
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Function URLs:"
echo "=============="
echo ""

echo "1. Setup Schema:"
gcloud functions describe setup-main-db-schema --gen2 --region "$REGION" --format="value(serviceConfig.uri)" 2>/dev/null || \
gcloud functions describe setup-main-db-schema --region "$REGION" --format="value(httpsTrigger.url)" 2>/dev/null
echo ""

echo "2. Transform GNews:"
gcloud functions describe transform-gnews --gen2 --region "$REGION" --format="value(serviceConfig.uri)" 2>/dev/null || \
gcloud functions describe transform-gnews --region "$REGION" --format="value(httpsTrigger.url)" 2>/dev/null
echo ""

echo "3. Transform Reddit:"
gcloud functions describe transform-reddit --gen2 --region "$REGION" --format="value(serviceConfig.uri)" 2>/dev/null || \
gcloud functions describe transform-reddit --region "$REGION" --format="value(httpsTrigger.url)" 2>/dev/null
echo ""

echo "4. Transform arXiv:"
gcloud functions describe transform-arxiv --gen2 --region "$REGION" --format="value(serviceConfig.uri)" 2>/dev/null || \
gcloud functions describe transform-arxiv --region "$REGION" --format="value(httpsTrigger.url)" 2>/dev/null
echo ""

echo "======================================"
echo "Next Steps:"
echo "======================================"
echo "1. Copy the URLs above"
echo "2. Update dags/pulseai_main_transformation_dag.py with these URLs"
echo "3. Deploy the DAG to Airflow"
echo "4. Test the pipeline"
echo ""