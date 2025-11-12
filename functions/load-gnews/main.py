import functions_framework
from google.cloud import storage
from google.cloud import bigquery
import json
import datetime
import hashlib  # ← **CHANGE 1: NEW IMPORT**

# settings
project_id = 'pulseai-team3-ba882-fall25'
bucket_name = 'pulse-ai-data-bucket'
dataset_id = 'raw_gnews'
table_id = f"{project_id}.{dataset_id}.articles"
master_file_path = "raw/gnews/master/articles.ndjson"

####################################################### helpers

# ← **CHANGE 2: NEW FUNCTION**
def generate_article_id(url):
    """Generate a unique ID for an article based on its URL."""
    if not url:
        # Fallback to timestamp-based ID if URL is missing
        return hashlib.sha256(str(datetime.datetime.utcnow()).encode()).hexdigest()[:16]
    
    # Create a hash of the URL for a consistent, unique ID
    return hashlib.sha256(url.encode('utf-8')).hexdigest()[:16]


def read_from_gcs(bucket_name, blob_path):
    """Reads NDJSON data from GCS bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    try:
        data = blob.download_as_string().decode('utf-8')
        # Parse NDJSON (newline-delimited JSON)
        articles_data = [json.loads(line) for line in data.strip().split('\n') if line.strip()]
        print(f"Successfully read {len(articles_data)} records from {blob_path}")
        return articles_data
    except Exception as e:
        print(f"Error reading from GCS: {e}")
        raise


def get_existing_article_urls(client):
    """Fetches all existing article URLs from BigQuery to avoid duplicates."""
    query = f"SELECT DISTINCT url FROM `{table_id}` WHERE url IS NOT NULL"
    try:
        result = client.query(query).result()
        existing_urls = {row.url for row in result}
        print(f"Found {len(existing_urls)} existing articles in BigQuery")
        return existing_urls
    except Exception as e:
        print(f"Error fetching existing URLs: {e}")
        return set()


# ← **CHANGE 3: NEW FUNCTION**
def get_existing_article_ids(client):
    """Fetches all existing article IDs from BigQuery to avoid ID collisions."""
    query = f"SELECT DISTINCT id FROM `{table_id}` WHERE id IS NOT NULL"
    try:
        result = client.query(query).result()
        existing_ids = {row.id for row in result}
        print(f"Found {len(existing_ids)} existing article IDs in BigQuery")
        return existing_ids
    except Exception as e:
        print(f"Error fetching existing IDs: {e}")
        return set()


def convert_timestamp_to_bigquery_format(timestamp_str, allow_null=False):
    """Convert timestamp string to BigQuery TIMESTAMP format."""
    if not timestamp_str:
        if allow_null:
            return None
        else:
            # For fields that need timestamps, use current time
            return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

    try:
        # If already a string in BigQuery format, return as-is
        if isinstance(timestamp_str, str) and ' ' in timestamp_str and ':' in timestamp_str:
            return timestamp_str

        # Parse ISO format (with T separator)
        if isinstance(timestamp_str, str) and 'T' in timestamp_str:
            dt = datetime.datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
            dt = timestamp_str if isinstance(timestamp_str, datetime.datetime) else None

        if dt:
            return dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        else:
            if allow_null:
                return None
            else:
                return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    except Exception as e:
        print(f"Error converting timestamp {timestamp_str}: {e}")
        if allow_null:
            return None
        else:
            return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]


def load_to_bigquery(articles_data, source_path, run_id):
    """Loads articles data into BigQuery table, skipping duplicates."""
    client = bigquery.Client(project=project_id)

    # Get existing article URLs and IDs to avoid duplicates
    existing_urls = get_existing_article_urls(client)
    existing_ids = get_existing_article_ids(client)  # ← **CHANGE 4: CALL NEW FUNCTION**

    # Filter out duplicates based on URL
    new_articles = [a for a in articles_data if a.get('url') not in existing_urls]

    if len(new_articles) == 0:
        print("No new articles to load - all are duplicates")
        return {
            "rows_loaded": 0,
            "job_id": None,
            "duplicates_skipped": len(articles_data),
            "message": "All articles already exist in BigQuery"
        }

    print(f"Loading {len(new_articles)} new articles ({len(articles_data) - len(new_articles)} duplicates skipped)")

    # Add metadata fields
    load_timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    processed_data = []

    for article in new_articles:
        # Create a copy to avoid modifying original
        article_copy = article.copy()
        
        # ============================================
        # **CHANGE 5: ID GENERATION LOGIC (NEW BLOCK)**
        # ============================================
        # Generate unique ID for the article
        article_id = generate_article_id(article_copy.get('url'))
        
        # Handle ID collision (very rare with SHA256, but check anyway)
        counter = 1
        original_id = article_id
        while article_id in existing_ids:
            article_id = f"{original_id}_{counter}"
            counter += 1
            print(f"ID collision detected, using {article_id}")
        
        article_copy['id'] = article_id
        existing_ids.add(article_id)  # Add to set to prevent duplicates in this batch
        # ============================================

        # Ensure timestamps are in BigQuery format
        if article_copy.get('published_at'):
            article_copy['published_at'] = convert_timestamp_to_bigquery_format(
                article_copy['published_at'],
                allow_null=True
            )

        if article_copy.get('ingest_timestamp'):
            article_copy['ingest_timestamp'] = convert_timestamp_to_bigquery_format(
                article_copy['ingest_timestamp'],
                allow_null=False  # REQUIRED field
            )
        else:
            # Fallback for missing ingest_timestamp
            article_copy['ingest_timestamp'] = load_timestamp
            print(f"WARNING: Missing ingest_timestamp for article {article_copy.get('url')}, using load timestamp")

        # Add load metadata
        article_copy['load_timestamp'] = load_timestamp
        article_copy['source_path'] = source_path
        article_copy['run_id'] = run_id

        processed_data.append(article_copy)

    try:
        # Configure load job
        job_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            autodetect=False
        )

        print(f"Attempting to load {len(processed_data)} records to {table_id}")

        # Load data into BigQuery
        load_job = client.load_table_from_json(
            processed_data,
            table_id,
            job_config=job_config
        )
        load_result = load_job.result()

        print(f"Load job completed. Job ID: {load_job.job_id}")
        print(f"Successfully loaded {load_job.output_rows} records into {table_id}")

        # Check for errors in the load job
        if load_job.errors:
            print(f"Load job errors: {load_job.errors}")
            raise Exception(f"BigQuery load errors: {load_job.errors}")

        return {
            "rows_loaded": load_job.output_rows,
            "job_id": load_job.job_id,
            "duplicates_skipped": len(articles_data) - len(new_articles),
            "new_entries": len(new_articles)
        }
    except Exception as e:
        print(f"CRITICAL ERROR during BigQuery load: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise


def write_to_gcs(bucket_name, blob_path, articles_data):
    """Writes articles data to GCS in NDJSON format, appending to existing file."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    try:
        # Convert articles to NDJSON format (data is already cleaned in task())
        new_ndjson = "\n".join([json.dumps(article) for article in articles_data])

        # Read existing data if file exists
        existing_ndjson = ""
        if blob.exists():
            print(f"Reading existing data from {blob_path}")
            existing_ndjson = blob.download_as_text()

        # Merge (append new data)
        full_ndjson = existing_ndjson + "\n" + new_ndjson if existing_ndjson else new_ndjson

        # Upload merged content
        print(f"Writing merged content to {blob_path}. Appended rows: {len(articles_data)}")
        blob.upload_from_string(full_ndjson, content_type="application/x-ndjson")

        print(f"Successfully wrote {len(articles_data)} records to {blob_path}")
    except Exception as e:
        print(f"Error writing to GCS: {e}")
        raise

####################################################### core task

@functions_framework.http
def task(request):

    # get parameters from request
    request_json = request.get_json(silent=True)

    if not request_json:
        return {"error": "No JSON payload"}, 400

    articles = request_json.get("articles", [])
    run_id = request_json.get("run_id", "manual")

    print(f"Processing {len(articles)} articles")
    print(f"Run ID: {run_id}")

    try:
        # handle cases where there are no articles
        if len(articles) == 0:
            print("no articles to load ============================")
            return {
                "num_records": 0,
                "message": "No articles found in request",
                "status": "success"
            }, 200

        # Add ingest timestamp if not present
        load_ts = datetime.datetime.utcnow().isoformat() + 'Z'
        for article in articles:
            if not article.get('ingest_timestamp'):
                article['ingest_timestamp'] = load_ts

        # Clean the data BEFORE writing to GCS and loading to BigQuery
        cleaned_articles = []
        for article in articles:
            cleaned = {
                'title': article.get('title'),
                'description': article.get('description'),
                'content': article.get('content'),
                'url': article.get('url'),
                'image': article.get('image'),
                'published_at': article.get('publishedAt'),
                'ingest_timestamp': article.get('ingest_timestamp'),
                'load_timestamp': article.get('load_timestamp'),
                'source_path': article.get('source_path'),
                'run_id': article.get('run_id')
            }

            # Clean source object - only keep name and url
            if article.get('source'):
                cleaned['source'] = {
                    'name': article['source'].get('name'),
                    'url': article['source'].get('url')
                }
            else:
                cleaned['source'] = None

            cleaned_articles.append(cleaned)

        # write data to GCS (append to master file)
        write_to_gcs(bucket_name, master_file_path, cleaned_articles)

        # load data to BigQuery (IDs will be generated here)
        bq_result = load_to_bigquery(cleaned_articles, f"gs://{bucket_name}/{master_file_path}", run_id)

        # return the metadata
        return {
            "num_records_received": len(articles),
            "rows_loaded_bq": bq_result.get('rows_loaded'),
            "duplicates_skipped": bq_result.get('duplicates_skipped'),
            "new_entries": bq_result.get('new_entries'),
            "job_id": bq_result.get('job_id'),
            "bucket_name": bucket_name,
            "gcs_path": master_file_path,
            "table_id": table_id,
            "status": "success"
        }, 200

    except Exception as e:
        print(f"Error in load task: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "run_id": run_id,
            "status": "failed"
        }, 500