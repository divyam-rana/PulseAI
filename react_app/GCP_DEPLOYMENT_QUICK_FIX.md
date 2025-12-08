# GCP Deployment Quick Fix Guide

## The Problem: Data Not Loading

When deployed to GCP Cloud Run, the app can't access BigQuery data because:
1. ❌ No service account attached to Cloud Run service
2. ❌ Service account doesn't have BigQuery permissions
3. ❌ Backend trying to use key file instead of service account

## The Solution (3 Steps)

### Step 1: Run the Updated Deployment Script

```bash
./deploy-gcp.sh
```

This script now automatically:
- ✅ Creates service account if needed
- ✅ Grants BigQuery permissions
- ✅ Attaches service account to Cloud Run
- ✅ Sets correct environment variables

### Step 2: Verify Deployment

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe pulseai-insights \
  --region us-central1 \
  --format 'value(status.url)')

# Test the API
curl "$SERVICE_URL/api/health"
curl "$SERVICE_URL/api/newsletters?limit=5"
```

### Step 3: Check Logs if Still Not Working

```bash
gcloud run services logs read pulseai-insights \
  --region us-central1 \
  --limit 50
```

## Manual Fix (If Script Doesn't Work)

### 1. Create/Verify Service Account

```bash
PROJECT_ID="pulseai-team3-ba882-fall25"
SERVICE_ACCOUNT="pulseai-run-sa@$PROJECT_ID.iam.gserviceaccount.com"

# Create if doesn't exist
gcloud iam service-accounts create pulseai-run-sa \
  --display-name="PulseAI Cloud Run Service Account" \
  --project=$PROJECT_ID || true
```

### 2. Grant BigQuery Permissions

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.jobUser"
```

### 3. Attach Service Account to Cloud Run

```bash
gcloud run services update pulseai-insights \
  --region us-central1 \
  --service-account=$SERVICE_ACCOUNT
```

### 4. Verify Environment Variables

```bash
gcloud run services update pulseai-insights \
  --region us-central1 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,BIGQUERY_DATASET=pulseai_main_db,NODE_ENV=production
```

### 5. Redeploy

```bash
./deploy-gcp.sh
```

## What Changed in the Code

1. **Backend (`backend/server.js`)**:
   - Now works with or without service account key file
   - Automatically uses Cloud Run service account when available
   - Falls back to key file for local development

2. **Deployment Script (`deploy-gcp.sh`)**:
   - Automatically creates service account
   - Grants BigQuery permissions
   - Attaches service account to Cloud Run service

## Testing Your Deployment

```bash
# 1. Get service URL
SERVICE_URL=$(gcloud run services describe pulseai-insights \
  --region us-central1 \
  --format 'value(status.url)')

# 2. Test health endpoint
echo "Testing health endpoint..."
curl -s "$SERVICE_URL/api/health" | jq .

# 3. Test newsletters endpoint
echo "Testing newsletters endpoint..."
curl -s "$SERVICE_URL/api/newsletters?limit=1" | jq '.count'

# 4. Open in browser
echo "Opening in browser..."
open "$SERVICE_URL"
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Dataset ID required" | Set `BIGQUERY_DATASET` env var |
| "Permission denied" | Attach service account with BigQuery roles |
| "Cannot find module" | Rebuild Docker image |
| CORS errors | Check API URL configuration |

## Need More Help?

See the detailed guide: `GCP_DEPLOYMENT_TROUBLESHOOTING.md`

