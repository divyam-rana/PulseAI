# Cloud Functions Deployment Guide

## Overview
Three Google Cloud Functions for data extraction:
1. **extract-arxiv** - Fetches AI research papers from arXiv
2. **extract-gnews** - Fetches AI news articles from GNews
3. **extract-reddit** - Fetches posts from Reddit using official API

## Project Configuration
- **Project ID**: `pulseai-team3-ba882-fall25`
- **Bucket Name**: `pulse-ai-data-bucket`
- **Region**: `us-central1` (recommended)

## Secrets in Secret Manager
Make sure you have created these secrets:

### 1. GNEWS_API_KEY
- **Type**: String
- **Value**: Your GNews API key

### 2. REDDIT_API_KEY
- **Type**: JSON
- **Value**:
```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "user_agent": "python:pulseai-extractor:v1.0 (by /u/YourUsername)"
}
```

## Grant Permissions to Cloud Functions

For each secret, grant access to the Cloud Function service account:

1. Go to **Secret Manager** in GCP Console
2. Click on the secret
3. Go to **PERMISSIONS** tab
4. Click **GRANT ACCESS**
5. Add principal: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
   - To find your project number: Go to **IAM & Admin > Settings**
6. Select role: **Secret Manager Secret Accessor**
7. Click **SAVE**

## Deployment Commands

### Deploy extract-arxiv
```bash
cd /Users/Owner/Downloads/PulseAI-Brendan-DAG-Setup/functions/extract-arxiv

gcloud functions deploy extract-arxiv \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region us-central1 \
  --project pulseai-team3-ba882-fall25 \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
```

### Deploy extract-gnews
```bash
cd /Users/Owner/Downloads/PulseAI-Brendan-DAG-Setup/functions/extract-gnews

gcloud functions deploy extract-gnews \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region us-central1 \
  --project pulseai-team3-ba882-fall25 \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
```

### Deploy extract-reddit
```bash
cd /Users/Owner/Downloads/PulseAI-Brendan-DAG-Setup/functions/extract-reddit

gcloud functions deploy extract-reddit \
  --gen2 \
  --runtime python311 \
  --trigger-http \
  --entry-point task \
  --region us-central1 \
  --project pulseai-team3-ba882-fall25 \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s
```

## API Endpoints

After deployment, your functions will be available at:
- `https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-arxiv`
- `https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-gnews`
- `https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-reddit`

## Query Parameters

### extract-arxiv
- `date` (optional): YYYYMMDD format (defaults to yesterday)
- `run_id` (optional): Unique identifier for the run
- `days_ago` (optional): Number of days to look back (default: 7)
- `max_results` (optional): Maximum papers to fetch (default: 100)

**Example**:
```
https://REGION-PROJECT.cloudfunctions.net/extract-arxiv?date=20241016&days_ago=7&max_results=50
```

### extract-gnews
- `date` (optional): YYYYMMDD format (defaults to yesterday)
- `run_id` (optional): Unique identifier for the run
- `days_back` (optional): Number of days to look back (default: 7)
- `max_results` (optional): Maximum articles to fetch (default: 100)

**Example**:
```
https://REGION-PROJECT.cloudfunctions.net/extract-gnews?date=20241016&days_back=7
```

### extract-reddit
- `date` (optional): YYYYMMDD format (defaults to yesterday)
- `run_id` (optional): Unique identifier for the run
- `subreddit` (optional): Subreddit name (default: MachineLearning)
- `limit` (optional): Number of posts to fetch (default: 100)
- `time_filter` (optional): Time filter for posts (default: week)

**Example**:
```
https://REGION-PROJECT.cloudfunctions.net/extract-reddit?subreddit=artificial&limit=50
```

## Testing the Functions

### Test with curl:
```bash
# Test arXiv
curl "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-arxiv?date=20241016"

# Test GNews
curl "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-gnews?date=20241016"

# Test Reddit
curl "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-reddit?date=20241016&subreddit=MachineLearning"
```

## Response Format

All functions return JSON with this structure:
```json
{
  "num_entries": 45,
  "run_id": "abc123def456",
  "bucket_name": "pulse-ai-data-bucket",
  "blob_name": "raw/SOURCE/date=YYYYMMDD/RUN_ID/data.json"
}
```

## GCS Data Structure

Data is saved in the following structure:
```
pulse-ai-data-bucket/
├── raw/
│   ├── arxiv/
│   │   └── date=20241016/
│   │       └── abc123def456/
│   │           └── data.json
│   ├── gnews/
│   │   └── date=20241016/
│   │       └── def456ghi789/
│   │           └── data.json
│   └── reddit/
│       └── subreddit=MachineLearning/
│           └── date=20241016/
│               └── ghi789jkl012/
│                   └── data.json
```

## Using in Airflow DAGs

### Example DAG Task:
```python
from airflow.providers.google.cloud.operators.functions import CloudFunctionInvokeFunctionOperator

extract_arxiv_task = CloudFunctionInvokeFunctionOperator(
    task_id='extract_arxiv',
    function_id='extract-arxiv',
    location='us-central1',
    input_data={"date": "{{ ds_nodash }}", "days_ago": 7},
    project_id='pulseai-team3-ba882-fall25'
)
```

## Troubleshooting

### Permission Denied Errors
- Ensure the Cloud Function service account has access to Secret Manager
- Check that the service account has write permissions to GCS bucket

### Secret Not Found
- Verify secret names match exactly: `GNEWS_API_KEY` and `REDDIT_API_KEY`
- Check that secrets are in the same project

### API Rate Limits
- Reddit: 60 requests per minute
- GNews: Check your plan limits
- arXiv: 1 request per 3 seconds (handled by the arxiv library)

## Monitoring

View logs in Cloud Console:
1. Go to **Cloud Functions**
2. Click on the function name
3. Go to **LOGS** tab

Or use gcloud:
```bash
gcloud functions logs read extract-arxiv --region us-central1 --limit 50
```

