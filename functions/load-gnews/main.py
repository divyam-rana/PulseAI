import functions_framework
from google.cloud import storage
from google.cloud import bigquery
import json
import pandas as pd
from datetime import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'raw_gnews'
table_id = 'articles'

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
    articles_data = json.loads(data_str)
    
    print(f"Loaded {len(articles_data)} articles from GCS")
    
    if len(articles_data) == 0:
        return {"message": "No articles to load"}, 200
    
    # Add load_timestamp and restructure source field
    load_timestamp = datetime.utcnow().isoformat()
    processed_articles = []
    
    for article in articles_data:
        # Restructure to match BigQuery schema with nested source
        processed_article = {
            'title': article.get('title'),
            'description': article.get('description'),
            'content': article.get('content'),
            'url': article.get('url'),
            'image': article.get('image'),
            'published_at': article.get('publishedAt'),
            'source': {
                'name': article.get('source', {}).get('name'),
                'url': article.get('source', {}).get('url')
            },
            'ingest_timestamp': article.get('ingest_timestamp'),
            'load_timestamp': load_timestamp,
            'source_path': article.get('source_path'),
            'run_id': run_id
        }
        processed_articles.append(processed_article)
    
    # Convert to DataFrame
    df = pd.json_normalize(processed_articles)
    
    # Ensure timestamp fields are properly formatted
    df['published_at'] = pd.to_datetime(df['published_at'], errors='coerce')
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
    
    # Convert DataFrame to records for BigQuery
    records = df.to_dict('records')
    
    # Load data
    job = client.load_table_from_json(
        records,
        table_ref,
        job_config=job_config
    )
    
    # Wait for job to complete
    job.result()
    
    print(f"Loaded {len(df)} articles into {table_ref}")
    
    # Deduplicate based on url (keep latest load_timestamp)
    dedup_query = f"""
    CREATE OR REPLACE TABLE `{project_id}.{dataset_id}.{table_id}` AS
    SELECT * EXCEPT(row_num)
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY url 
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
        "status": "success"
    }, 200