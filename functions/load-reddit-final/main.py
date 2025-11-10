import functions_framework
from google.cloud import storage
from google.cloud import bigquery
import json
import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
bucket_name = 'pulse-ai-data-bucket'
dataset_id = 'raw_reddit'
table_id = f"{project_id}.{dataset_id}.posts"
aggregated_file_path = "raw/reddit/aggregated_posts.json"

####################################################### helpers

def read_from_gcs(bucket_name, blob_path):
    """Reads JSON data from GCS bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    
    try:
        data = blob.download_as_string()
        posts_data = json.loads(data)
        print(f"Successfully read {len(posts_data)} records from {blob_path}")
        return posts_data
    except Exception as e:
        print(f"Error reading from GCS: {e}")
        raise


def get_existing_post_ids(client):
    """Fetches all existing post ids from BigQuery to avoid duplicates."""
    query = f"SELECT DISTINCT id FROM `{table_id}`"
    try:
        result = client.query(query).result()
        existing_ids = {row.id for row in result}
        print(f"Found {len(existing_ids)} existing posts in BigQuery")
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


def load_to_bigquery(posts_data, source_path, run_id):
    """Loads posts data into BigQuery table, skipping duplicates."""
    client = bigquery.Client(project=project_id)
    
    # Get existing post ids to avoid duplicates
    existing_ids = get_existing_post_ids(client)
    
    # Filter out duplicates
    new_posts = [p for p in posts_data if p.get('id') not in existing_ids]
    
    if len(new_posts) == 0:
        print("No new posts to load - all are duplicates")
        return {
            "rows_loaded": 0,
            "job_id": None,
            "duplicates_skipped": len(posts_data),
            "message": "All posts already exist in BigQuery"
        }
    
    print(f"Loading {len(new_posts)} new posts ({len(posts_data) - len(new_posts)} duplicates skipped)")
    
    # Add metadata fields
    load_timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    processed_data = []
    
    for post in new_posts:
        # Create a copy to avoid modifying original
        post_copy = post.copy()
        
        # Ensure timestamps are in BigQuery format
        # NULLABLE fields can be null
        if post_copy.get('created_utc'):
            post_copy['created_utc'] = convert_timestamp_to_bigquery_format(
                post_copy['created_utc'],
                allow_null=True
            )
        
        if post_copy.get('ingest_timestamp'):
            post_copy['ingest_timestamp'] = convert_timestamp_to_bigquery_format(
                post_copy['ingest_timestamp'],
                allow_null=True
            )
        else:
            # Fallback for missing ingest_timestamp
            post_copy['ingest_timestamp'] = load_timestamp
            print(f"WARNING: Missing ingest_timestamp for post {post_copy.get('id')}, using load timestamp")
        
        # Add load metadata
        post_copy['load_timestamp'] = load_timestamp
        post_copy['source_path'] = source_path
        post_copy['run_id'] = run_id
        
        processed_data.append(post_copy)
    
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
            "duplicates_skipped": len(posts_data) - len(new_posts),
            "new_entries": len(new_posts)
        }
    except Exception as e:
        print(f"CRITICAL ERROR during BigQuery load: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise

####################################################### core task

@functions_framework.http
def task(request):
    
    # get blob path from request or use default
    blob_path = request.args.get("blob_path", aggregated_file_path)
    run_id = request.args.get("run_id")
    
    print(f"Reading from GCS path: {blob_path}")
    print(f"Run ID: {run_id}")
    
    try:
        # read data from GCS
        posts_data = read_from_gcs(bucket_name, blob_path)
        
        # handle cases where there are no posts found
        if len(posts_data) == 0:
            print("no posts to load ============================")
            return {
                "num_records": 0,
                "message": "No posts found in GCS file",
                "status": "success"
            }, 200
        
        # load data to BigQuery
        bq_result = load_to_bigquery(posts_data, blob_path, run_id)
        
        # return the metadata
        return {
            "num_records_read": len(posts_data),
            "rows_loaded_bq": bq_result.get('rows_loaded'),
            "duplicates_skipped": bq_result.get('duplicates_skipped'),
            "new_entries": bq_result.get('new_entries'),
            "job_id": bq_result.get('job_id'),
            "bucket_name": bucket_name,
            "gcs_path": blob_path,
            "table_id": table_id,
            "status": "success"
        }, 200
        
    except Exception as e:
        print(f"Error in load task: {e}")
        return {
            "error": str(e),
            "blob_path": blob_path,
            "status": "failed"
        }, 500