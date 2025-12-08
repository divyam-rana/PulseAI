# GCP Deployment with Service Account Key File

## Overview

This deployment uses a service account key file (`backend/service-account-key.json`) for BigQuery authentication instead of relying on Cloud Run's service account.

## Prerequisites

1. **Service Account Key File**: 
   - Must exist at `backend/service-account-key.json`
   - Should have BigQuery Data Viewer and Job User permissions
   - **Never commit this file to git** (it's in `.gitignore`)

2. **GCP Project Setup**:
   ```bash
   gcloud config set project pulseai-team3-ba882-fall25
   ```

## Deployment Steps

### 1. Verify Service Account Key Exists

```bash
# Check if the key file exists
ls -la backend/service-account-key.json

# If it doesn't exist, you need to:
# 1. Download it from GCP Console
# 2. Or create a new service account and download the key
```

### 2. Deploy to Cloud Run

```bash
# Make script executable (if not already)
chmod +x deploy-gcp.sh

# Deploy
./deploy-gcp.sh
```

The deployment script will:
- ✅ Verify the service account key file exists
- ✅ Build the Docker image (includes the key file)
- ✅ Deploy to Cloud Run with correct environment variables
- ✅ Set `GOOGLE_APPLICATION_CREDENTIALS=/app/backend/service-account-key.json`

### 3. Verify Deployment

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe pulseai-insights \
  --region us-central1 \
  --format 'value(status.url)')

# Test health endpoint
curl "$SERVICE_URL/api/health"

# Test newsletters endpoint
curl "$SERVICE_URL/api/newsletters?limit=5"
```

## How It Works

### Docker Build Process

1. **Dockerfile copies the key file**:
   ```dockerfile
   COPY backend/service-account-key.json ./
   ```

2. **Backend uses the key file**:
   - Environment variable: `GOOGLE_APPLICATION_CREDENTIALS=/app/backend/service-account-key.json`
   - Backend resolves the path and uses it for BigQuery authentication

### Backend Configuration

The backend (`backend/server.js`) automatically:
- Checks if `GOOGLE_APPLICATION_CREDENTIALS` is set
- Verifies the file exists
- Uses it for BigQuery authentication
- Falls back to default credentials if not found

## Environment Variables

The deployment sets these environment variables:

```bash
GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25
BIGQUERY_DATASET=pulseai_main_db
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/service-account-key.json
```

## Troubleshooting

### Error: "Service account key file not found"

**Problem**: The key file doesn't exist at `backend/service-account-key.json`

**Solution**:
```bash
# Download from GCP Console or create new service account
# Place the JSON file at: backend/service-account-key.json
```

### Error: "Permission denied" or "Access Denied"

**Problem**: Service account doesn't have BigQuery permissions

**Solution**:
```bash
# Get the service account email from the key file
SERVICE_ACCOUNT_EMAIL=$(cat backend/service-account-key.json | jq -r '.client_email')

# Grant BigQuery permissions
gcloud projects add-iam-policy-binding pulseai-team3-ba882-fall25 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding pulseai-team3-ba882-fall25 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/bigquery.jobUser"
```

### Error: "Dataset ID required"

**Problem**: `BIGQUERY_DATASET` environment variable not set

**Solution**: The deployment script sets this automatically. If you see this error:
```bash
# Manually set the environment variable
gcloud run services update pulseai-insights \
  --region us-central1 \
  --set-env-vars BIGQUERY_DATASET=pulseai_main_db
```

### Check Logs

```bash
# View recent logs
gcloud run services logs read pulseai-insights \
  --region us-central1 \
  --limit 50

# Look for:
# - "Using service account key file: /app/backend/service-account-key.json"
# - Any BigQuery errors
```

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit the key file to git** - It's in `.gitignore`
2. **The key file is in the Docker image** - Anyone with access to the image can extract it
3. **Consider using Secret Manager** for production:
   ```bash
   # Store secret in Secret Manager
   gcloud secrets create service-account-key \
     --data-file=backend/service-account-key.json
   
   # Mount as volume in Cloud Run
   gcloud run services update pulseai-insights \
     --update-secrets=GOOGLE_APPLICATION_CREDENTIALS=service-account-key:latest
   ```

## Alternative: Using Cloud Run Service Account

If you prefer not to bundle the key file, you can use Cloud Run's service account instead. See `GCP_DEPLOYMENT_TROUBLESHOOTING.md` for that approach.

## Quick Reference

```bash
# Deploy
./deploy-gcp.sh

# Check logs
gcloud run services logs read pulseai-insights --region us-central1 --limit 50

# Get URL
gcloud run services describe pulseai-insights \
  --region us-central1 \
  --format 'value(status.url)'

# Update environment variables
gcloud run services update pulseai-insights \
  --region us-central1 \
  --set-env-vars KEY=VALUE
```

