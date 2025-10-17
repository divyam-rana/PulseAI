import functions_framework
from google.cloud import storage
from google.cloud import bigquery
import json
import pandas as pd
from datetime import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'raw_reddit'
table_id = 'posts'

@functions_framework.http
def task(request):
    
    # Parse request parameters
    num_entries = int(request.args.get("num_entries", 0))
    if num_entries == 0:
        print("no entries found - EXITING")
        return {"message": "No entries to process"}, 200
    
    bucket_name = request.args.get("bucket_name")
    blob_name = request.args.get("blob_name")
    run_id = request.args.get("run_id")
    
    if not bucket_name or not blob_name:
        return {"error": "Missing bucket_name or blob_name"}, 400
    
    print(f"Loading data from gs://{bucket_name}/{blob_name}")
    
    # Read JSON from GCS
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    data_str = blob.download_as_text()
    posts_data = json.loads(data_str)
    
    print(f"Loaded {len(posts_data)} posts from GCS")
    
    if len(posts_data) == 0:
        return {"message": "No posts to load"}, 200
    
    # Add load_timestamp to each record
    load_timestamp = datetime.utcnow().isoformat()
    for post in posts_data:
        post['load_timestamp'] = load_timestamp
    
    # Convert to DataFrame
    df = pd.DataFrame(posts_data)
    
    # Ensure timestamp fields are properly formatted
    # created_utc comes as unix timestamp, convert to datetime
    if 'created_utc' in df.columns:
        df['created_utc'] = pd.to_datetime(df['created_utc'], unit='s', errors='coerce')
    
    df['ingest_timestamp'] = pd.to_datetime(df['ingest_timestamp'], errors='coerce')
    df['load_timestamp'] = pd.to_datetime(df['load_timestamp'], errors='coerce')
    
    # Load into BigQuery
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset_id}.{table_id}"
    
    # Configure load job
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        schema_update_options=[
            bigquery.SchemaUpdateOption.ALLOW_FIELD_RELAXATION
        ]
    )
    
    # Convert DataFrame to newline-delimited JSON
    json_data = df.to_json(orient='records', lines=True, date_format='iso')
    
    # Load data
    job = client.load_table_from_json(
        json.loads(f'[{json_data.replace(chr(10), ",")}]'),
        table_ref,
        job_config=job_config
    )
    
    # Wait for job to complete
    job.result()
    
    print(f"Loaded {len(df)} posts into {table_ref}")
    
    # Deduplicate based on id (keep latest load_timestamp)
    dedup_query = f"""
    CREATE OR REPLACE TABLE `{project_id}.{dataset_id}.{table_id}` AS
    SELECT * EXCEPT(row_num)
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY id 
                ORDER BY load_timestamp DESC, ingest_timestamp DESC
            ) as row_num
        FROM `{project_id}.{dataset_id}.{table_id}`
    )
    WHERE row_num = 1
    """
    
    dedup_job = client.query(dedup_query)
    dedup_job.result()
    
    print(f"Deduplication complete")
    
    return {
        "rows_loaded": len(df),
        "table": table_ref,
        "run_id": run_id,
        "subreddit": request.args.get("subreddit"),
        "status": "success"
    }, 200