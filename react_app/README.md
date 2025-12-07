# PulseAI Insights

A full-stack web application for analyzing and visualizing newsletter data using Google BigQuery, built with React, Vite, and Express.js.

## 🚀 Quick Start

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher
- Google Cloud service account with BigQuery access
- Docker (optional, for containerized deployment)

### One-Command Start

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Start both frontend and backend servers
./start.sh
```

This will start:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001

### Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

## 📋 Features

### Frontend
- 🎨 Modern UI with React 18 and TailwindCSS
- 📊 Interactive data visualizations (Recharts, @visx)
- 🔍 Advanced search and filtering
- 📱 Responsive design
- 🎯 Newsletter analytics dashboard
- ☁️ Word cloud visualizations
- 📈 Trending topics and metrics

### Backend
- 🔌 RESTful API with Express.js
- 📊 Google BigQuery integration
- 🔒 CORS-enabled
- ⚡ Real-time data queries
- 🏥 Health check endpoints

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, React Router
- **Backend**: Node.js, Express.js, Google Cloud BigQuery
- **Deployment**: Docker, Google Cloud Platform (Cloud Run, GKE, App Engine)

## 📦 Installation

### Clone the Repository
```bash
git clone https://github.com/divyam-rana/pulseai-insights.git
cd pulseai-insights
```

### Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### Configure Environment

1. **Backend Configuration**
```bash
cp backend/.env.example backend/.env
```

2. **Edit `backend/.env`**:
```env
GOOGLE_CLOUD_PROJECT=your-project-id
BIGQUERY_DATASET=your-dataset
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3001
```

3. **Add Service Account Key**
   - Place your Google Cloud service account JSON file as `backend/service-account-key.json`

## 🐳 Docker Deployment

### Using Docker
```bash
# Build the image
docker build -t pulseai-insights .

# Run the container
docker run -p 8080:8080 -p 3001:3001 \
  -v $(pwd)/backend/service-account-key.json:/app/backend/service-account-key.json:ro \
  pulseai-insights
```

### Using Docker Compose
```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down
```

## ☁️ GCP Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- **Google Cloud VM** (Simplest - see [VM_SETUP.md](./VM_SETUP.md))
- **Google Cloud Run** (Recommended for serverless)
- **Google Kubernetes Engine (GKE)** (For complex deployments)
- **Google App Engine** (Managed platform)
- **Cloud Build CI/CD**

### Quick VM Deployment (Easiest)
```bash
# Create and configure a VM with one command
./deploy-vm.sh your-project-id us-central1-a

# Then SSH into the VM and upload your app
# See VM_SETUP.md for detailed instructions
```

### Quick Cloud Run Deployment
```bash
# Build and push to GCR
export PROJECT_ID=your-gcp-project-id
docker build -t gcr.io/$PROJECT_ID/pulseai-insights .
docker push gcr.io/$PROJECT_ID/pulseai-insights

# Deploy to Cloud Run
gcloud run deploy pulseai-insights \
  --image gcr.io/$PROJECT_ID/pulseai-insights \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 📁 Project Structure

```
pulseai-insights/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities and helpers
│   └── types/             # TypeScript type definitions
├── backend/               # Backend server
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables (create from .env.example)
├── public/                # Static assets
├── kubernetes/            # Kubernetes deployment files
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
├── start.sh              # Script to start both servers
├── DEPLOYMENT.md         # Detailed deployment guide
└── README.md             # This file
```

## 🔧 Development

### Frontend Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend Development
```bash
cd backend
npm run dev          # Start backend server
npm start            # Production mode
```

## 🧪 API Endpoints

- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/newsletters` - Get all newsletters
- `GET /api/newsletters/:id` - Get newsletter by ID
- `GET /api/stats` - Get statistics
- `GET /api/tags` - Get all tags
- `GET /api/search` - Search newsletters
- `GET /api/trending` - Get trending topics
- `GET /api/wordcloud` - Get word cloud data

## 🔒 Security

- Service account keys are gitignored
- Environment variables for sensitive data
- CORS configuration for API access
- HTTPS enforced in production

## 📊 Environment Variables

### Backend (.env)
```env
GOOGLE_CLOUD_PROJECT=your-project-id
BIGQUERY_DATASET=your-dataset-name
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3001
NODE_ENV=development
```

### Frontend (optional)
```env
VITE_API_URL=http://localhost:3001
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### BigQuery Authentication Issues
- Verify service account has BigQuery Data Viewer role
- Check service account key path in `.env`
- Ensure `GOOGLE_CLOUD_PROJECT` matches your GCP project

### Module Not Found Errors
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install

cd backend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🛠️ What technologies are used for this project?

This project is built with:

- **Frontend**: Vite, TypeScript, React 18, shadcn-ui, TailwindCSS
- **Backend**: Node.js, Express.js, Google Cloud BigQuery
- **Deployment**: Docker, Google Cloud Platform

## 📄 License

This project is licensed under the MIT License.

## 📧 Support

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For issues and questions, please open an issue on GitHub.

---

**Note**: Remember to configure your Google Cloud credentials and environment variables before running the application.

