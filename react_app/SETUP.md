# PulseAI Insights - Setup Guide

## 🎯 Overview

PulseAI Insights is a full-stack web application that displays AI-powered newsletters from BigQuery with a modern, beautiful UI. This app connects to your Google Cloud BigQuery database and provides an intuitive interface for browsing, searching, and filtering newsletter content.

## 📋 Prerequisites

- Node.js (v18 or higher)
- Google Cloud Project with BigQuery
- Service account credentials JSON file

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `backend/.env`:
```env
GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25
BIGQUERY_DATASET=pulseai_main_db
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3001
```

Place your service account JSON file in the `backend/` directory as `service-account-key.json`.

### 2. Frontend Setup

```bash
# Navigate to root folder
cd ..

# Install dependencies  
npm install

# Configure environment
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📊 Database Schema

The app connects to the `combined_newsletter` table with this schema:

| Field              | Type      | Mode     | Description                        |
|--------------------|-----------|----------|------------------------------------|
| tag                | STRING    | REQUIRED | Category/classification tag        |
| window_start       | TIMESTAMP | REQUIRED | Start of time window               |
| window_end         | TIMESTAMP | REQUIRED | End of time window                 |
| Newsletter Content | STRING    | NULLABLE | Generated newsletter content       |
| created_at         | TIMESTAMP | REQUIRED | When record was created            |

## 🎨 Features

### Frontend Features
- ✨ Modern glassmorphism UI with smooth animations
- 🔍 Real-time search across newsletter content
- 🏷️ Tag-based filtering with 9 categories
- 📅 Date range filtering
- 📊 Statistics dashboard with tag distribution
- 📱 Fully responsive mobile design
- 🌓 Dark mode optimized
- ⚡ Fast loading with React Query caching

### Backend Features
- 🔌 RESTful API with Express.js
- 📊 Direct BigQuery integration
- 🔍 Advanced filtering (tags, dates, search)
- 📈 Analytics endpoints for stats and trends
- 🚀 Efficient query optimization
- ⚡ CORS enabled for cross-origin requests

## 🛠️ API Endpoints

### GET /api/health
Health check endpoint
```json
{"status": "ok", "message": "Backend is running"}
```

### GET /api/newsletters
Get newsletters with optional filters
```bash
# Query parameters:
?limit=100          # Max results (default: 100)
&tag=Finance        # Filter by tag
&startDate=2025-01-01  # Filter by start date
&endDate=2025-12-31    # Filter by end date
&search=AI          # Search in content
```

### GET /api/tags
Get all unique tags
```json
{"tags": ["Finance", "Sales", "Marketing", ...]}
```

### GET /api/stats
Get analytics and statistics
```json
{
  "total_newsletters": 18,
  "total_tags": 9,
  "earliest_date": "2025-12-06T00:00:00.000Z",
  "latest_date": "2025-12-06T00:00:00.000Z",
  "tag_distribution": [
    {"tag": "Finance", "count": 2},
    ...
  ]
}
```

### GET /api/tables
List all BigQuery tables
```json
{"tables": ["combined_newsletter", "arxiv_papers", ...]}
```

## 🎯 Available Tags

The app supports 9 newsletter categories:
- 💰 Finance
- 📊 Sales  
- 📱 Marketing
- 🎯 Strategy
- 🏭 Supply Chain
- 💻 Tech
- 🤝 Customer Experience
- 👥 HR
- 📋 Other

## 🔧 Development

### Project Structure
```
pulseai-insights/
├── backend/              # Express.js API server
│   ├── server.js        # Main server file
│   ├── package.json
│   └── .env             # Backend config
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API client
│   ├── pages/           # Page components
│   └── types/           # TypeScript types
└── package.json         # Frontend dependencies
```

### Key Technologies
- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, @google-cloud/bigquery
- **State Management**: TanStack React Query
- **Styling**: TailwindCSS with custom glassmorphism effects

## 🐛 Troubleshooting

### Backend won't start - Port already in use
```bash
# Kill any process on port 3001
lsof -ti:3001 | xargs kill -9
```

### BigQuery authentication errors
1. Ensure service account JSON file is in `backend/` directory
2. Check that `GOOGLE_APPLICATION_CREDENTIALS` path is correct in `.env`
3. Verify service account has BigQuery Data Viewer and Job User roles

### Frontend can't connect to backend
1. Ensure backend is running on port 3001
2. Check CORS is enabled in `server.js`
3. Verify `VITE_API_URL` in frontend `.env` is correct

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.
