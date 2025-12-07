# PulseAI Insights - Deployment Guide

## Table of Contents
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Google Cloud Platform (GCP) Deployment](#google-cloud-platform-gcp-deployment)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher
- Google Cloud service account with BigQuery access
- Docker (optional, for containerized deployment)

### Using the Start Script

```bash
# Make the script executable
chmod +x start.sh

# Run the application
./start.sh
```

This will:
1. Install all dependencies
2. Start the backend server on port 3001
3. Start the frontend server on port 8080

Access the application at:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001

## Local Development

### Manual Setup

1. **Install Frontend Dependencies**
```bash
npm install
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
cd ..
```

3. **Configure Environment Variables**
```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit backend/.env with your credentials
# Required variables:
# - GOOGLE_CLOUD_PROJECT
# - BIGQUERY_DATASET
# - GOOGLE_APPLICATION_CREDENTIALS
# - PORT
```

4. **Add Service Account Key**
Place your Google Cloud service account JSON file in `backend/service-account-key.json`

5. **Start Backend Server**
```bash
cd backend
npm run dev
```

6. **Start Frontend Server** (in a new terminal)
```bash
npm run dev
```

## Docker Deployment

### Build and Run with Docker

```bash
# Build the Docker image
docker build -t pulseai-insights .

# Run the container
docker run -p 8080:8080 -p 3001:3001 \
  -e GOOGLE_CLOUD_PROJECT=your-project-id \
  -e BIGQUERY_DATASET=your-dataset \
  -v $(pwd)/backend/service-account-key.json:/app/backend/service-account-key.json:ro \
  pulseai-insights
```

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

## Google Cloud Platform (GCP) Deployment

### Option 1: Cloud Run (Recommended)

1. **Build and Push to Container Registry**
```bash
# Set your GCP project
export PROJECT_ID=your-gcp-project-id

# Configure Docker to use gcloud
gcloud auth configure-docker

# Build and tag the image
docker build -t gcr.io/$PROJECT_ID/pulseai-insights .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/pulseai-insights
```

2. **Deploy to Cloud Run**
```bash
gcloud run deploy pulseai-insights \
  --image gcr.io/$PROJECT_ID/pulseai-insights \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID,BIGQUERY_DATASET=pulseai_main_db \
  --service-account your-service-account@$PROJECT_ID.iam.gserviceaccount.com
```

### Option 2: Google Kubernetes Engine (GKE)

1. **Create a GKE Cluster**
```bash
gcloud container clusters create pulseai-cluster \
  --num-nodes=2 \
  --machine-type=n1-standard-2 \
  --region us-central1
```

2. **Create Kubernetes Secret for Service Account**
```bash
kubectl create secret generic gcp-credentials \
  --from-file=service-account-key.json=backend/service-account-key.json
```

3. **Create Deployment YAML** (see kubernetes/ directory)

4. **Deploy to GKE**
```bash
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
```

### Option 3: App Engine

1. **Create app.yaml**
```yaml
runtime: nodejs20
instance_class: F2

env_variables:
  GOOGLE_CLOUD_PROJECT: "your-project-id"
  BIGQUERY_DATASET: "pulseai_main_db"
  PORT: "8080"

handlers:
- url: /api/.*
  script: auto
  secure: always

- url: /.*
  static_files: frontend/dist/index.html
  upload: frontend/dist/index.html
  secure: always
```

2. **Deploy**
```bash
gcloud app deploy
```

## Environment Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
BIGQUERY_DATASET=pulseai_main_db
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Server Configuration
PORT=3001
NODE_ENV=production
```

### Frontend Environment Variables

Create `.env` (if needed):

```env
VITE_API_URL=http://localhost:3001
```

For production, update the API URL in your build process or use environment-specific configurations.

## Production Build

### Build Frontend for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Health Checks

The application provides health check endpoints:

- **Backend Health**: `http://localhost:3001/api/health`
- **Frontend**: `http://localhost:8080`

## Monitoring and Logs

### Docker Logs
```bash
docker logs -f <container-id>
```

### Cloud Run Logs
```bash
gcloud run logs read pulseai-insights --region us-central1
```

## Troubleshooting

### Common Issues

1. **Backend won't start - "Dataset ID required"**
   - Ensure `backend/.env` is properly configured
   - Verify service account key is in place

2. **Port already in use**
   ```bash
   # Find and kill process on port 8080
   lsof -ti:8080 | xargs kill -9
   
   # Find and kill process on port 3001
   lsof -ti:3001 | xargs kill -9
   ```

3. **BigQuery authentication errors**
   - Verify service account has BigQuery permissions
   - Check `GOOGLE_APPLICATION_CREDENTIALS` path
   - Ensure service account key JSON is valid

4. **Frontend can't connect to backend**
   - Check CORS settings in backend
   - Verify API URL in frontend configuration
   - Ensure both servers are running

## Performance Optimization

### Frontend
- Enable gzip compression
- Use CDN for static assets
- Implement code splitting
- Optimize images

### Backend
- Enable query caching
- Use connection pooling
- Implement rate limiting
- Add Redis for session management

## Security Best Practices

1. **Never commit sensitive files**
   - `backend/.env`
   - `backend/service-account-key.json`

2. **Use secrets management**
   - GCP Secret Manager
   - Kubernetes Secrets
   - Environment variables

3. **Enable HTTPS**
   - Use Cloud Run automatic HTTPS
   - Configure SSL certificates

4. **Implement authentication**
   - Add JWT tokens
   - Use OAuth 2.0
   - Implement role-based access control

## Scaling

### Horizontal Scaling
```bash
# Cloud Run auto-scaling
gcloud run services update pulseai-insights \
  --min-instances=1 \
  --max-instances=10
```

### Vertical Scaling
```bash
# Increase resources
gcloud run services update pulseai-insights \
  --memory=2Gi \
  --cpu=2
```

## Cost Optimization

- Use Cloud Run with min instances = 0 for low traffic
- Implement BigQuery query caching
- Use appropriate machine types
- Monitor and optimize query costs

## Support

For issues and questions:
- Check logs for error messages
- Review GCP console for service status
- Verify environment configurations
- Test endpoints individually

## License

See LICENSE file for details.
