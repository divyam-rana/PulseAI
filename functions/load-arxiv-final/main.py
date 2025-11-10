import functions_framework
from google.cloud import storage
from google.cloud import bigquery
import json
import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
bucket_name = 'pulse-ai-data-bucket'
dataset_id = 'raw_arxiv'
table_id = f"{project_id}.{dataset_id}.papers"
aggregated_file_path = "raw/arxiv/aggregated_papers.json"

####################################################### helpers

def read_from_gcs(bucket_name, blob_path):
    """Reads JSON data from GCS bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    
    try:
        data = blob.download_as_string()
        papers_data = json.loads(data)
        print(f"Successfully read {len(papers_data)} records from {blob_path}")
        return papers_data
    except Exception as e:
        print(f"Error reading from GCS: {e}")
        raise


def get_existing_arxiv_ids(client):
    """Fetches all existing arxiv_ids from BigQuery to avoid duplicates."""
    query = f"SELECT DISTINCT arxiv_id FROM `{table_id}`"
    try:
        result = client.query(query).result()
        existing_ids = {row.arxiv_id for row in result}
        print(f"Found {len(existing_ids)} existing papers in BigQuery")
        return existing_ids
    except Exception as e:
        print(f"Error fetching existing IDs: {e}")
        return set()


def convert_timestamp_to_bigquery_format(iso_timestamp, field_name="timestamp", allow_null=False):
    """Convert ISO format timestamp to BigQuery TIMESTAMP format."""
    if not iso_timestamp:
        if allow_null:
            return None
        else:
            # For REQUIRED fields, return current time as fallback
            return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    
    try:
        # Parse ISO format timestamp (handle both with and without timezone)
        iso_timestamp_clean = iso_timestamp.replace('Z', '+00:00')
        dt = datetime.datetime.fromisoformat(iso_timestamp_clean)
        
        # Convert to BigQuery format (YYYY-MM-DD HH:MM:SS.ffffff)
        return dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    except Exception as e:
        print(f"Error converting {field_name} timestamp {iso_timestamp}: {e}")
        if allow_null:
            return None
        else:
            # For REQUIRED fields, return current time as fallback
            return datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]


def load_to_bigquery(papers_data, source_path, run_id):
    """Loads papers data into BigQuery table, skipping duplicates."""
    client = bigquery.Client(project=project_id)
    
    # Get existing arxiv_ids to avoid duplicates
    existing_ids = get_existing_arxiv_ids(client)
    
    # Filter out duplicates
    new_papers = [p for p in papers_data if p.get('arxiv_id') not in existing_ids]
    
    if len(new_papers) == 0:
        print("No new papers to load - all are duplicates")
        return {
            "rows_loaded": 0,
            "job_id": None,
            "duplicates_skipped": len(papers_data),
            "message": "All papers already exist in BigQuery"
        }
    
    print(f"Loading {len(new_papers)} new papers ({len(papers_data) - len(new_papers)} duplicates skipped)")
    
    # Log sample paper structure
    if new_papers:
        print(f"Sample paper structure: {json.dumps(new_papers[0], indent=2)}")
    
    # Add metadata fields
    load_timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    processed_data = []
    
    for paper in new_papers:
        # Create a copy to avoid modifying original
        paper_copy = paper.copy()
        
        # Ensure timestamps are in BigQuery format
        # REQUIRED fields (ingest_timestamp, load_timestamp) cannot be null
        if paper_copy.get('ingest_timestamp'):
            paper_copy['ingest_timestamp'] = convert_timestamp_to_bigquery_format(
                paper_copy['ingest_timestamp'], 
                field_name='ingest_timestamp',
                allow_null=False
            )
        else:
            # Fallback for missing ingest_timestamp (REQUIRED field)
            paper_copy['ingest_timestamp'] = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            print(f"WARNING: Missing ingest_timestamp for paper {paper_copy.get('arxiv_id')}, using current time")
        
        # NULLABLE fields can be null
        if paper_copy.get('published_date'):
            paper_copy['published_date'] = convert_timestamp_to_bigquery_format(
                paper_copy['published_date'],
                field_name='published_date',
                allow_null=True
            )
        
        if paper_copy.get('updated_date'):
            paper_copy['updated_date'] = convert_timestamp_to_bigquery_format(
                paper_copy['updated_date'],
                field_name='updated_date',
                allow_null=True
            )
        
        # Add load metadata
        paper_copy['load_timestamp'] = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        paper_copy['source_path'] = source_path
        paper_copy['run_id'] = run_id
        
        processed_data.append(paper_copy)
    
    try:
        # Configure load job
        job_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            autodetect=False
        )
        
        print(f"Attempting to load {len(processed_data)} records to {table_id}")
        print(f"Sample record for validation: {json.dumps(processed_data[0] if processed_data else {}, indent=2)}")
        
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
            "duplicates_skipped": len(papers_data) - len(new_papers),
            "new_entries": len(new_papers)
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
        papers_data = read_from_gcs(bucket_name, blob_path)
        
        # handle cases where there are no papers found
        if len(papers_data) == 0:
            print("no papers to load ============================")
            return {
                "num_records": 0,
                "message": "No papers found in GCS file",
                "status": "success"
            }, 200
        
        # load data to BigQuery
        bq_result = load_to_bigquery(papers_data, blob_path, run_id)
        
        # return the metadata
        return {
            "num_records_read": len(papers_data),
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