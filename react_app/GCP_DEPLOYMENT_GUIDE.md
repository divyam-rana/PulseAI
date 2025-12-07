# GCP Cloud Run Deployment Guide

## Architecture Overview

Your application is deployed as a **unified service** where:
- **Backend (Express)** runs on port 8080
- **Backend serves the frontend** static files (built React app)
- **All traffic** goes through one URL on Cloud Run

```
https://pulseai-insights-xxx.a.run.app
├── /                    → Frontend (React SPA)
├── /api/health          → Backend API
├── /api/newsletters     → Backend API
└── /api/*              → All other API routes
```

## Deployment Steps

### 1. Prerequisites Check

```bash
# Verify gcloud is installed
gcloud --version

# Authenticate
gcloud auth login

# Set project
gcloud config set project pulseai-team3-ba882-fall25

# Verify service account key exists
ls -la backend/service-account-key.json
```

### 2. Deploy to Cloud Run

```bash
# Make script executable (first time only)
chmod +x deploy-gcp.sh

# Deploy
./deploy-gcp.sh
```

The script will:
1. ✅ Enable required GCP APIs
2. ✅ Build Docker image with Cloud Build
3. ✅ Deploy to Cloud Run (us-central1)
4. ✅ Configure auto-scaling (0-10 instances)

### 3. Get Your URL

```bash
gcloud run services describe pulseai-insights \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

### 4. Test Deployment

```bash
# Get your URL from step 3, then test:

# Test API health
curl https://your-app-url.a.run.app/api/health

# Test API endpoint
curl https://your-app-url.a.run.app/api/newsletters?limit=5

# Open frontend in browser
open https://your-app-url.a.run.app
```

## How It Works

### Production Mode (Cloud Run)

1. **Docker Build Process:**
   - Stage 1: Builds React frontend → creates `dist/` folder
   - Stage 2: Sets up Node.js backend + copies frontend build

2. **Runtime:**
   - Backend starts on port 8080
   - Backend serves API routes (`/api/*`)
   - Backend serves frontend static files (all other routes)
   - Frontend makes API calls to same origin (no CORS issues)

3. **Environment Variables:**
   - `NODE_ENV=production` → enables static file serving
   - `GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25`
   - `BIGQUERY_DATASET=pulseai_main_db`
   - `PORT=8080` (set automatically by Cloud Run)

### Local Development Mode

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`
- Frontend configured to call `localhost:3001` in dev mode

## Monitoring & Management

### View Logs
```bash
gcloud run services logs read pulseai-insights \
  --region us-central1 \
  --limit 100
```

### Check Service Status
```bash
gcloud run services describe pulseai-insights \
  --region us-central1
```

### Update Environment Variables
```bash
gcloud run services update pulseai-insights \
  --region us-central1 \
  --set-env-vars KEY=VALUE
```

### Scale Configuration
```bash
gcloud run services update pulseai-insights \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 20
```

## Cost Management

- **Min instances: 0** → Scales to zero when idle (no cost)
- **Max instances: 10** → Prevents runaway costs
- **Memory: 1GB** → Adequate for this app
- **CPU: 1** → Standard allocation

**Estimated cost:** $0-5/month for light usage

## Troubleshooting

### Build Fails
```bash
# Check build logs
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

### API Not Working
```bash
# Check logs for errors
gcloud run services logs read pulseai-insights --limit 50

# Verify environment variables
gcloud run services describe pulseai-insights \
  --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'
```

### Frontend Not Loading
- Check that frontend build succeeded: `ls -la dist/`
- Verify static files are served: Check network tab in browser
- Check backend logs for 404 errors

### BigQuery Connection Issues
- Verify service account key exists in container
- Check IAM permissions for service account
- Review BigQuery dataset name in env vars

## Security Notes

⚠️ **Important:** 
- Service account key is bundled in Docker image
- Never commit `service-account-key.json` to git (use .gitignore)
- Service is publicly accessible (--allow-unauthenticated)
- Consider adding authentication for production use

## Next Steps

1. **Custom Domain:** Add your own domain in Cloud Run console
2. **CI/CD:** Set up GitHub Actions for auto-deploy on push
3. **Monitoring:** Enable Cloud Monitoring for alerts
4. **Authentication:** Add Firebase Auth or similar
5. **Environment Management:** Use Secret Manager for sensitive data

---

**Deployed!** 🚀 Your app is live at: `https://pulseai-insights-xxx.a.run.app`
