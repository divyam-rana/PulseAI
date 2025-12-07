# 🚀 Quick Deployment Reference

## Deploy to GCP (Complete Steps)

```bash
# 1. Run pre-flight checks
./test-deployment.sh

# 2. Deploy to Cloud Run
./deploy-gcp.sh

# 3. Get your URL
gcloud run services describe pulseai-insights \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'

# 4. Open in browser
# Use the URL from step 3
```

## What Happens During Deployment

1. **Cloud Build** creates Docker image (~5-10 minutes)
   - Builds React frontend (production optimized)
   - Sets up Node.js backend
   - Combines both into single container

2. **Cloud Run** deploys your service
   - Allocates resources (1GB RAM, 1 CPU)
   - Sets environment variables
   - Exposes public URL

3. **Auto-scaling** is enabled
   - Scales to 0 when idle (no cost!)
   - Auto-scales up to 10 instances based on traffic

## Access Your Deployed App

### Frontend
```
https://pulseai-insights-xxx.a.run.app
```
Opens the React application

### API Endpoints
```
https://pulseai-insights-xxx.a.run.app/api/health
https://pulseai-insights-xxx.a.run.app/api/newsletters
https://pulseai-insights-xxx.a.run.app/api/tags
https://pulseai-insights-xxx.a.run.app/api/stats
```

## Common Commands

### View Logs
```bash
gcloud run services logs read pulseai-insights \
  --region us-central1 \
  --limit 50 \
  --format "table(timestamp,textPayload)"
```

### Tail Logs (Live)
```bash
gcloud run services logs tail pulseai-insights --region us-central1
```

### Check Status
```bash
gcloud run services list --platform managed
```

### Update Service
```bash
# Redeploy with latest changes
./deploy-gcp.sh

# Or update specific settings
gcloud run services update pulseai-insights \
  --region us-central1 \
  --memory 2Gi
```

### Delete Service
```bash
gcloud run services delete pulseai-insights --region us-central1
```

## Troubleshooting Quick Fixes

### "Build Failed"
```bash
# Check build logs
gcloud builds list --limit 5
gcloud builds log $(gcloud builds list --limit 1 --format='value(id)')
```

### "API Returns 500"
```bash
# Check backend logs
gcloud run services logs read pulseai-insights \
  --region us-central1 \
  --limit 20 | grep ERROR
```

### "Frontend Blank Page"
```bash
# Rebuild frontend locally to test
npm run build
ls -la dist/  # Should have index.html and assets/
```

### "Can't Connect to BigQuery"
```bash
# Verify service account key
ls -la backend/service-account-key.json

# Check environment variables
gcloud run services describe pulseai-insights \
  --region us-central1 \
  --format='get(spec.template.spec.containers[0].env)'
```

## Cost Monitoring

```bash
# View current billing
gcloud billing accounts list
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT_ID
```

**Expected costs:**
- Development/Testing: $0-2/month (scales to zero)
- Light Production: $2-10/month
- Medium Production: $10-50/month

## Development Workflow

### Local Development
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
npm run dev
```

### Test Changes → Deploy
```bash
# 1. Test locally
npm run build  # Build frontend
cd backend && npm run dev  # Test backend

# 2. Deploy to GCP
./deploy-gcp.sh

# 3. Verify
curl https://your-url.a.run.app/api/health
```

## Environment Variables

Automatically set during deployment:
- `NODE_ENV=production`
- `GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25`
- `BIGQUERY_DATASET=pulseai_main_db`
- `PORT=8080` (set by Cloud Run)

## Key Files

- `deploy-gcp.sh` - Main deployment script
- `Dockerfile` - Container configuration
- `docker-entrypoint.sh` - Startup script
- `backend/server.js` - Backend server (serves frontend + API)
- `src/lib/api.ts` - Frontend API client

## Support

- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **Pricing:** https://cloud.google.com/run/pricing
- **Status:** https://status.cloud.google.com/

---

**Pro Tip:** Bookmark your Cloud Run URL and set up custom domain in GCP Console!
