# GCP Deployment Troubleshooting Guide

## Common Issue: Data Not Loading

If your application is deployed but data is not loading, follow these steps:

## Step 1: Verify Service Account Configuration

### Check if Service Account is Attached

```bash
# Get your service name and region
SERVICE_NAME="pulseai-insights"
REGION="us-central1"
PROJECT_ID="pulseai-team3-ba882-fall25"

# Check current service account
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(spec.template.spec.serviceAccountName)'
```

### Attach Service Account to Cloud Run

If no service account is attached, you need to:

1. **Create or identify a service account with BigQuery permissions:**

```bash
# List existing service accounts
gcloud iam service-accounts list

# Or create a new one (if needed)
gcloud iam service-accounts create pulseai-run-sa \
  --display-name="PulseAI Cloud Run Service Account" \
  --project=$PROJECT_ID
```

2. **Grant BigQuery permissions:**

```bash
# Grant BigQuery Data Viewer and Job User roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:pulseai-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:pulseai-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

3. **Attach service account to Cloud Run service:**

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --service-account=pulseai-run-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 2: Verify Environment Variables

```bash
# Check current environment variables
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format='value(spec.template.spec.containers[0].env)'
```

### Update Environment Variables

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,BIGQUERY_DATASET=pulseai_main_db,NODE_ENV=production
```

## Step 3: Check Application Logs

```bash
# View recent logs
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --limit 50

# Follow logs in real-time
gcloud run services logs tail $SERVICE_NAME \
  --region $REGION
```

### Common Log Errors:

1. **"Dataset ID required"**
   - Fix: Set `BIGQUERY_DATASET` environment variable

2. **"Permission denied" or "Access Denied"**
   - Fix: Attach service account with BigQuery permissions (Step 1)

3. **"Cannot find module" or "File not found"**
   - Fix: Rebuild and redeploy the Docker image

## Step 4: Test API Endpoints

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)')

# Test health endpoint
curl $SERVICE_URL/api/health

# Test newsletters endpoint
curl "$SERVICE_URL/api/newsletters?limit=5"

# Test with verbose output to see errors
curl -v "$SERVICE_URL/api/newsletters?limit=5"
```

## Step 5: Verify BigQuery Access

### Test BigQuery Access from Cloud Run

1. **SSH into a Cloud Run instance (if possible) or use Cloud Shell:**

```bash
# In Cloud Shell, test BigQuery access
gcloud auth application-default login

# Test query
bq query --use_legacy_sql=false \
  "SELECT COUNT(*) as count FROM \`$PROJECT_ID.pulseai_main_db.combined_newsletter\`"
```

2. **Check BigQuery dataset exists:**

```bash
bq ls $PROJECT_ID:pulseai_main_db
```

## Step 6: Complete Deployment Checklist

Run this complete deployment script:

```bash
#!/bin/bash

PROJECT_ID="pulseai-team3-ba882-fall25"
REGION="us-central1"
SERVICE_NAME="pulseai-insights"
SERVICE_ACCOUNT="pulseai-run-sa@$PROJECT_ID.iam.gserviceaccount.com"

echo "🔍 Checking deployment configuration..."

# 1. Verify project
echo "1. Setting project..."
gcloud config set project $PROJECT_ID

# 2. Check service account exists
echo "2. Checking service account..."
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT &>/dev/null; then
  echo "   Creating service account..."
  gcloud iam service-accounts create pulseai-run-sa \
    --display-name="PulseAI Cloud Run Service Account"
fi

# 3. Grant permissions
echo "3. Granting BigQuery permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataViewer" \
  --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.jobUser" \
  --quiet

# 4. Rebuild and deploy
echo "4. Rebuilding and deploying..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# 5. Deploy with correct configuration
echo "5. Deploying to Cloud Run..."
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
  --service-account=$SERVICE_ACCOUNT \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,BIGQUERY_DATASET=pulseai_main_db,NODE_ENV=production

# 6. Get URL and test
echo "6. Testing deployment..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "🧪 Testing endpoints..."
curl -s "$SERVICE_URL/api/health" | jq .
echo ""
curl -s "$SERVICE_URL/api/newsletters?limit=1" | jq '.count'
```

## Step 7: Frontend API URL Configuration

### Verify Frontend is Using Correct API URL

The frontend should automatically use the same origin in production. Check:

1. **Open browser console** on your deployed site
2. **Check Network tab** - API calls should go to same domain (no CORS errors)
3. **Verify `apiUrl.ts`** - Should return empty string in production

If you see CORS errors or wrong API URLs:
- Check that `NODE_ENV=production` is set
- Verify frontend build includes production config
- Check browser console for errors

## Step 8: Debugging Tips

### Enable Verbose Logging

Add to your backend `server.js`:

```javascript
// Add at the top
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  BIGQUERY_DATASET: process.env.BIGQUERY_DATASET,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  PORT: process.env.PORT
});
```

### Test BigQuery Connection

Add a test endpoint:

```javascript
app.get('/api/test-bigquery', async (req, res) => {
  try {
    const [datasets] = await bigquery.getDatasets();
    res.json({ 
      success: true, 
      datasets: datasets.map(d => d.id),
      project: process.env.GOOGLE_CLOUD_PROJECT 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});
```

## Quick Fix Commands

```bash
# 1. Update service account
gcloud run services update pulseai-insights \
  --region us-central1 \
  --service-account=pulseai-run-sa@pulseai-team3-ba882-fall25.iam.gserviceaccount.com

# 2. Update environment variables
gcloud run services update pulseai-insights \
  --region us-central1 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25,BIGQUERY_DATASET=pulseai_main_db,NODE_ENV=production

# 3. Redeploy (rebuilds image)
./deploy-gcp.sh

# 4. Check logs
gcloud run services logs read pulseai-insights --region us-central1 --limit 100
```

## Still Not Working?

1. **Check Cloud Run service status:**
   ```bash
   gcloud run services describe pulseai-insights --region us-central1
   ```

2. **Verify BigQuery dataset name:**
   ```bash
   bq ls pulseai-team3-ba882-fall25:pulseai_main_db
   ```

3. **Test with a simple query:**
   ```bash
   bq query --use_legacy_sql=false \
     "SELECT COUNT(*) FROM \`pulseai-team3-ba882-fall25.pulseai_main_db.combined_newsletter\`"
   ```

4. **Check IAM permissions:**
   ```bash
   gcloud projects get-iam-policy pulseai-team3-ba882-fall25 \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:pulseai-run-sa*"
   ```

## Contact & Support

If issues persist:
1. Check all logs: `gcloud run services logs read pulseai-insights --region us-central1`
2. Verify all environment variables are set correctly
3. Ensure service account has proper BigQuery permissions
4. Test API endpoints directly with curl

