# PulseAI Backend - BigQuery API

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set up Google Cloud Credentials

#### Option A: Service Account Key (Development)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Create a new service account or select existing one
4. Grant it the "BigQuery Data Viewer" and "BigQuery Job User" roles
5. Create a JSON key and download it
6. Place the key file in the `backend` folder (e.g., `service-account-key.json`)

#### Option B: Application Default Credentials (If you have gcloud CLI)
```bash
gcloud auth application-default login
```
Then you don't need to set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and update:
```
GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25
BIGQUERY_DATASET=pulseai_main_db
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3001
```

### 4. Run the Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /api/health
```

### Get Newsletters
```
GET /api/newsletters
```

### Custom Query
```
POST /api/query
Content-Type: application/json

{
  "tableName": "your_table_name",
  "filters": {
    "column_name": "value"
  },
  "limit": 100
}
```

### List Tables
```
GET /api/tables
```

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit your service account key file to Git
- The `.gitignore` is configured to exclude JSON files (except package.json)
- Keep your `.env` file secret
- Use environment variables for production deployments
