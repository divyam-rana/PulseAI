# PulseAI Insights - Quick Reference

## 🚀 Quick Commands

### Start Application (Development)
```bash
./start.sh
# OR
npm run start:all
```

### Build for Production
```bash
./build.sh
# OR
npm run build:prod
```

### Deploy to Google Cloud VM
```bash
./deploy-vm.sh
# OR
npm run deploy:vm
```

### Deploy to Google Cloud Run
```bash
./deploy-gcp.sh
# OR
npm run deploy:gcp
```

### Docker Commands
```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:run

# Stop Docker containers
npm run docker:stop
```

### PM2 Commands (For VM)
```bash
# Start with PM2
npm run pm2:start

# Stop PM2
npm run pm2:stop

# Restart PM2
npm run pm2:restart

# View logs
npm run pm2:logs
```

## 📦 What Was Created

### Scripts
- ✅ `start.sh` - Start both frontend and backend servers
- ✅ `build.sh` - Build production bundle
- ✅ `deploy-vm.sh` - Create and configure GCP VM
- ✅ `deploy-gcp.sh` - Deploy to Google Cloud Run
- ✅ `docker-entrypoint.sh` - Docker container startup script

### Process Management
- ✅ `ecosystem.config.js` - PM2 configuration for production

### Docker Files
- ✅ `Dockerfile` - Multi-stage Docker build configuration
- ✅ `docker-compose.yml` - Docker Compose orchestration
- ✅ `.dockerignore` - Docker build exclusions

### Kubernetes Files
- ✅ `kubernetes/deployment.yaml` - K8s deployment configuration
- ✅ `kubernetes/service.yaml` - K8s service and ingress

### GCP Deployment Files
- ✅ `app.yaml` - App Engine configuration
- ✅ `cloudbuild.yaml` - Cloud Build CI/CD pipeline
- ✅ `.gcloudignore` - GCP deployment exclusions

### Documentation
- ✅ `README.md` - Updated main documentation
- ✅ `DEPLOYMENT.md` - Comprehensive deployment guide
- ✅ `VM_SETUP.md` - Complete VM deployment guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - Deployment verification checklist
- ✅ `requirements.txt` - System requirements
- ✅ `QUICK_START.md` - This file

### Configuration
- ✅ `backend/.env` - Backend environment variables (created)
- ✅ Updated `package.json` with deployment scripts

## 🎯 Usage Examples

### Local Development
```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Configure environment
# Edit backend/.env with your GCP credentials

# 3. Start the app
./start.sh
```

### Docker Deployment
```bash
# Build and run
docker build -t pulseai-insights .
docker run -p 8080:8080 -p 3001:3001 pulseai-insights

# OR use Docker Compose
docker-compose up -d
```

### Google Cloud VM (Simplest)
```bash
# 1. Create and configure VM
./deploy-vm.sh your-project-id us-central1-a

# 2. SSH into VM
gcloud compute ssh pulseai-insights-vm --zone=us-central1-a

# 3. Upload your application files
# From local machine:
gcloud compute scp --recurse . pulseai-insights-vm:~/pulseai-insights --zone=us-central1-a

# 4. Upload service account key
gcloud compute scp backend/service-account-key.json \
  pulseai-insights-vm:~/pulseai-insights/backend/ --zone=us-central1-a

# 5. On the VM, install and run
cd ~/pulseai-insights
npm install
cd backend && npm install && cd ..
./build.sh
pm2 start ecosystem.config.js

# See VM_SETUP.md for complete instructions
```

### Google Cloud Run
```bash
# One-command deployment
./deploy-gcp.sh your-project-id us-central1

# Manual deployment
gcloud builds submit --tag gcr.io/PROJECT_ID/pulseai-insights
gcloud run deploy pulseai-insights \
  --image gcr.io/PROJECT_ID/pulseai-insights \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Google Kubernetes Engine
```bash
# 1. Create cluster
gcloud container clusters create pulseai-cluster \
  --num-nodes=2 \
  --region us-central1

# 2. Create secret for service account
kubectl create secret generic gcp-credentials \
  --from-file=service-account-key.json=backend/service-account-key.json

# 3. Deploy
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
```

### Google App Engine
```bash
# Deploy
gcloud app deploy app.yaml
```

## 🔑 Required Environment Variables

### Backend (.env)
```env
GOOGLE_CLOUD_PROJECT=your-project-id
BIGQUERY_DATASET=pulseai_main_db
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3001
```

### For Docker
Set in docker-compose.yml or pass as -e flags

### For Cloud Run
Set via `--set-env-vars` flag or Cloud Run console

## 📊 Application URLs

### Local Development
- Frontend: http://localhost:8080
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/

### Production (Cloud Run)
- Will be provided after deployment
- Format: https://pulseai-insights-xxxxx-xx.a.run.app

## 🔍 Health Checks

```bash
# Check backend
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:8080
```

## 🐛 Common Issues

### Port in use
```bash
lsof -ti:8080 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Missing dependencies
```bash
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install
```

### BigQuery errors
- Verify service account key exists at `backend/service-account-key.json`
- Check permissions on service account
- Verify environment variables are set correctly

## 📝 NPM Scripts Reference

```bash
npm run dev              # Start frontend dev server
npm run build            # Build frontend for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run start:all        # Start both servers (./start.sh)
npm run build:prod       # Production build (./build.sh)
npm run deploy:gcp       # Deploy to GCP (./deploy-gcp.sh)
npm run docker:build     # Build Docker image
npm run docker:run       # Run with Docker Compose
npm run docker:stop      # Stop Docker containers
```

## 📚 More Information

- Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Project overview: [README.md](./README.md)
- Setup instructions: [SETUP.md](./SETUP.md)

## ✅ Pre-Deployment Checklist

- [ ] Environment variables configured in `backend/.env`
- [ ] Service account key file placed in `backend/service-account-key.json`
- [ ] Dependencies installed (`npm install` in root and backend)
- [ ] Application tested locally (`./start.sh`)
- [ ] Production build successful (`./build.sh`)
- [ ] Docker build successful (optional: `docker build -t pulseai-insights .`)
- [ ] GCP project and permissions configured
- [ ] Service account has BigQuery Data Viewer role

## 🎉 You're Ready to Deploy!

Choose your deployment method:
1. **Cloud Run** (Recommended) - Serverless, auto-scaling
2. **GKE** - Full Kubernetes control
3. **App Engine** - Simple, managed platform
4. **Docker** - Run anywhere

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
