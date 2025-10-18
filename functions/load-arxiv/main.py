import functions_framework
from google.cloud import storage
from google.cloud import bigquery
import json
import pandas as pd
from datetime import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'raw_arxiv'
table_id = 'papers'

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
    papers_data = json.loads(data_str)
    
    print(f"Loaded {len(papers_data)} papers from GCS")
    
    if len(papers_data) == 0:
        return {"message": "No papers to load"}, 200
    
    # Add load_timestamp to each record
    load_timestamp = datetime.utcnow().isoformat()
    for paper in papers_data:
        paper['load_timestamp'] = load_timestamp
    
    # Convert to DataFrame for easier manipulation
    df = pd.DataFrame(papers_data)
    
    # Ensure timestamp fields are properly formatted
    df['published_date'] = pd.to_datetime(df['published_date'], errors='coerce')
    df['updated_date'] = pd.to_datetime(df['updated_date'], errors='coerce')
    df['ingest_timestamp'] = pd.to_datetime(df['ingest_timestamp'], errors='coerce')
    df['load_timestamp'] = pd.to_datetime(df['load_timestamp'], errors='coerce')
    
    # Load into BigQuery
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset_id}.{table_id}"
    
    # Configure load job for DataFrame
    job_config = bigquery.LoadJobConfig(
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        schema_update_options=[
            bigquery.SchemaUpdateOption.ALLOW_FIELD_RELAXATION
        ]
    )
    
    # Load data using the DataFrame directly
    job = client.load_table_from_dataframe(
        df,
        table_ref,
        job_config=job_config
    )
    
    # Wait for job to complete
    job.result()
    
    print(f"Loaded {len(df)} papers into {table_ref}")
    
    # Deduplicate based on arxiv_id (keep latest load_timestamp)
    dedup_query = f"""
    CREATE OR REPLACE TABLE `{project_id}.{dataset_id}.{table_id}` AS
    SELECT * EXCEPT(row_num)
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY arxiv_id 
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