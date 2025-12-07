# ✅ PulseAI Insights - Deployment Checklist

## 📋 Pre-Deployment Setup

### Local Environment
- [ ] Node.js v20+ installed (`node -v`)
- [ ] npm v10+ installed (`npm -v`)
- [ ] Docker installed (optional) (`docker --version`)
- [ ] gcloud CLI installed (for GCP) (`gcloud --version`)

### Project Setup
- [ ] Repository cloned
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] All scripts are executable (`chmod +x *.sh`)

### Google Cloud Configuration
- [ ] GCP project created
- [ ] Service account created with BigQuery permissions
- [ ] Service account key downloaded as JSON
- [ ] Service account key placed in `backend/service-account-key.json`
- [ ] BigQuery dataset exists (`pulseai_main_db`)
- [ ] Project ID noted: `pulseai-team3-ba882-fall25`

### Environment Configuration
- [ ] `backend/.env` file created (from `.env.example`)
- [ ] `GOOGLE_CLOUD_PROJECT` set correctly
- [ ] `BIGQUERY_DATASET` set correctly
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` path verified
- [ ] `PORT` configured (default: 3001)

## 🧪 Testing

### Local Testing
- [ ] Start script works (`./start.sh`)
- [ ] Frontend accessible at http://localhost:8080
- [ ] Backend accessible at http://localhost:3001
- [ ] API health check passes: `curl http://localhost:3001/api/health`
- [ ] Frontend loads without errors
- [ ] Data fetches from BigQuery successfully
- [ ] All features working (search, filter, analytics)

### Build Testing
- [ ] Production build succeeds (`./build.sh`)
- [ ] Build output in `dist/` directory
- [ ] No build errors or warnings
- [ ] Preview works (`npm run preview`)

## 🐳 Docker Deployment (Optional)

### Docker Build
- [ ] Dockerfile exists
- [ ] `.dockerignore` configured
- [ ] Build succeeds (`docker build -t pulseai-insights .`)
- [ ] No build errors
- [ ] Image size reasonable (<500MB recommended)

### Docker Run
- [ ] Container starts (`docker run -p 8080:8080 -p 3001:3001 pulseai-insights`)
- [ ] Service account mounted correctly
- [ ] Environment variables passed
- [ ] Application accessible
- [ ] Logs show no errors

### Docker Compose
- [ ] `docker-compose.yml` configured
- [ ] Environment variables in `.env` files
- [ ] Starts successfully (`docker-compose up`)
- [ ] Health checks passing
- [ ] Can stop cleanly (`docker-compose down`)

## ☁️ Google Cloud Run Deployment

### Prerequisites
- [ ] gcloud CLI authenticated (`gcloud auth login`)
- [ ] Project set (`gcloud config set project PROJECT_ID`)
- [ ] Required APIs enabled:
  - [ ] Cloud Build API
  - [ ] Cloud Run API
  - [ ] Container Registry API

### Build & Push
- [ ] Image builds (`gcloud builds submit --tag gcr.io/PROJECT_ID/pulseai-insights`)
- [ ] Image pushed to GCR
- [ ] No build errors
- [ ] Image in Container Registry

### Deployment
- [ ] Deploy command succeeds (via `./deploy-gcp.sh`)
- [ ] Environment variables configured
- [ ] Service account permissions set
- [ ] Port mapping correct (8080)
- [ ] Memory allocation sufficient (1Gi+)
- [ ] Auto-scaling configured

### Post-Deployment
- [ ] Service URL received
- [ ] Application accessible via URL
- [ ] HTTPS working
- [ ] API endpoints responding
- [ ] Data loading from BigQuery
- [ ] No errors in logs (`gcloud run logs read`)

## 🎯 Google Kubernetes Engine (Advanced)

### Cluster Setup
- [ ] GKE cluster created
- [ ] kubectl configured
- [ ] Cluster accessible

### Secrets
- [ ] Service account secret created (`kubectl create secret`)
- [ ] Secret verified (`kubectl get secrets`)

### Deployment
- [ ] Updated `kubernetes/deployment.yaml` with project ID
- [ ] Applied deployment (`kubectl apply -f kubernetes/deployment.yaml`)
- [ ] Applied service (`kubectl apply -f kubernetes/service.yaml`)
- [ ] Pods running (`kubectl get pods`)
- [ ] Service created (`kubectl get services`)

### Verification
- [ ] Load balancer IP assigned
- [ ] Application accessible via IP
- [ ] Health checks passing
- [ ] Logs clean (`kubectl logs`)

## 📱 Google App Engine

### Configuration
- [ ] `app.yaml` configured with project details
- [ ] Runtime set to `nodejs20`
- [ ] Environment variables configured
- [ ] Handlers configured correctly

### Deployment
- [ ] Deploy succeeds (`gcloud app deploy`)
- [ ] Application accessible via App Engine URL
- [ ] Static files serving correctly
- [ ] API endpoints working

## 🔍 Post-Deployment Verification

### Functionality Tests
- [ ] Homepage loads
- [ ] Newsletter grid displays
- [ ] Search functionality works
- [ ] Filters working
- [ ] Analytics page loads
- [ ] Word cloud displays
- [ ] Trending topics show
- [ ] Individual newsletter details work

### Performance Tests
- [ ] Initial load time acceptable (<3s)
- [ ] API response times fast (<500ms)
- [ ] Images loading properly
- [ ] No console errors
- [ ] Mobile responsive

### API Endpoints Test
```bash
# Replace URL with your deployment URL
BASE_URL="https://your-app-url"

curl $BASE_URL/api/health
curl $BASE_URL/api/newsletters
curl $BASE_URL/api/stats
curl $BASE_URL/api/tags
curl $BASE_URL/api/trending
curl $BASE_URL/api/wordcloud
```

- [ ] All endpoints return 200 OK
- [ ] Data is correct and complete
- [ ] No error responses

## 🔒 Security Checklist

### Sensitive Data
- [ ] `.env` files not committed to git
- [ ] `service-account-key.json` not committed
- [ ] `.gitignore` properly configured
- [ ] Secrets managed securely

### Access Control
- [ ] Service account has minimum required permissions
- [ ] API endpoints secured if needed
- [ ] CORS configured properly
- [ ] HTTPS enabled in production

### Best Practices
- [ ] Environment-specific configurations
- [ ] Secrets in environment variables
- [ ] No hardcoded credentials
- [ ] Regular security updates

## 📊 Monitoring & Logging

### Cloud Run/GKE
- [ ] Cloud Logging enabled
- [ ] Metrics dashboard configured
- [ ] Alerts set up (optional)
- [ ] Error tracking configured

### Application Logs
- [ ] Backend logs accessible
- [ ] No unexpected errors
- [ ] Query performance logged
- [ ] API usage tracked

## 🎉 Final Checks

### Documentation
- [ ] README.md updated
- [ ] DEPLOYMENT.md reviewed
- [ ] Team has access to docs
- [ ] Deployment URL documented

### Handoff
- [ ] Access credentials shared securely
- [ ] GCP project access granted
- [ ] Repository access provided
- [ ] Support contacts documented

### Backup & Recovery
- [ ] Deployment process documented
- [ ] Rollback procedure known
- [ ] Configuration backed up
- [ ] Service account keys secured

## 🚀 You're Live!

Congratulations! Your PulseAI Insights application is now deployed and running in production.

### Quick Links
- Application: [Your Cloud Run URL]
- GCP Console: https://console.cloud.google.com
- Container Registry: https://console.cloud.google.com/gcr
- Cloud Run Services: https://console.cloud.google.com/run

### Next Steps
1. Monitor application performance
2. Set up automated backups
3. Configure custom domain (optional)
4. Set up CI/CD pipeline (optional)
5. Implement monitoring and alerting

### Support
- Documentation: See DEPLOYMENT.md
- Issues: Open GitHub issue
- GCP Support: https://cloud.google.com/support

---

**Last Updated**: December 6, 2025
**Version**: 1.0.0
