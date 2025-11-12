from datetime import datetime, timedelta
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.google.cloud.hooks.bigquery import BigQueryHook
import json

# Configuration
project_id = 'pulseai-team3-ba882-fall25'
source_dataset_id = 'pulseai_main_db'
source_table_id = 'arxiv_papers'
target_dataset_id = 'pulseai_main_db'
target_table_id = 'arxiv_papers_tagged'
classification_function_url = 'https://huggingface-fb-mnli-335360564911.us-central1.run.app'

default_args = {
    "owner": "pulseai",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


def create_tagged_schema():
    """Create the BigQuery table with tags column using Airflow's BigQueryHook."""
    from google.cloud import bigquery
    
    # Use BigQueryHook which automatically uses the google_cloud_default connection
    hook = BigQueryHook(gcp_conn_id='google_cloud_default', use_legacy_sql=False)
    client = hook.get_client()
    
    # Define schema for tagged papers table
    table_id = f"{project_id}.{target_dataset_id}.{target_table_id}"
    
    schema = [
        bigquery.SchemaField("paper_id", "STRING", mode="NULLABLE",
                           description="arXiv paper ID"),
        bigquery.SchemaField("title", "STRING", mode="NULLABLE",
                           description="Paper title"),
        bigquery.SchemaField("abstract", "STRING", mode="NULLABLE",
                           description="Paper abstract"),
        bigquery.SchemaField("category_sk", "INTEGER", mode="NULLABLE",
                           description="Foreign key to arxiv_categories dimension"),
        bigquery.SchemaField("published_at", "TIMESTAMP", mode="NULLABLE",
                           description="Paper publication timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE",
                           description="Paper update timestamp"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When fact record was loaded"),
        bigquery.SchemaField("tags", "STRING", mode="REPEATED",
                           description="Classification tags for the paper"),
    ]
    
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="published_at"
    )
    
    try:
        table = client.create_table(table, exists_ok=True)
        print(f"Table {table_id} created or already exists")
    except Exception as e:
        print(f"Error creating table: {e}")
        raise
    
    return {
        "dataset": target_dataset_id,
        "table": target_table_id,
        "table_id": table_id,
        "status": "success"
    }


def classify_text(text):
    """Call the classification Cloud Function to get tags."""
    try:
        response = requests.post(
            classification_function_url,
            headers={"Content-Type": "application/json"},
            json={"text": text},
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        return result.get("labels", [])
    except Exception as e:
        print(f"Error classifying text: {e}")
        return []


def process_and_tag_papers(ds=None, **context):
    """
    Read papers from source table, classify them, and write to target table.
    Uses Airflow's BigQueryHook for authentication.
    """
    from google.cloud import bigquery
    
    # Use BigQueryHook for authentication
    hook = BigQueryHook(gcp_conn_id='google_cloud_default', use_legacy_sql=False)
    client = hook.get_client(project_id=project_id)
    
    # Use ds (date string) which is always provided by Airflow
    execution_date_str = ds or datetime.utcnow().strftime('%Y-%m-%d')
    
    # Query to get papers that are NOT already in the target table
    query = f"""
    SELECT 
        source.paper_id,
        source.title,
        source.abstract,
        source.category_sk,
        source.published_at,
        source.updated_at,
        source._loaded_at
    FROM `{project_id}.{source_dataset_id}.{source_table_id}` as source
    LEFT JOIN `{project_id}.{target_dataset_id}.{target_table_id}` as target
        ON source.paper_id = target.paper_id
    WHERE target.paper_id IS NULL
    AND source.title IS NOT NULL
    AND source.title != ''
    ORDER BY source.published_at DESC
    LIMIT 100
    """
    
    print(f"Executing query to find untagged papers...")
    print(f"Query: {query}")
    
    try:
        query_job = client.query(query)
        results = query_job.result()
    except Exception as e:
        # If target table doesn't exist yet, get all papers from source
        print(f"Target table might not exist yet, processing all papers: {e}")
        query = f"""
        SELECT 
            paper_id,
            title,
            abstract,
            category_sk,
            published_at,
            updated_at,
            _loaded_at
        FROM `{project_id}.{source_dataset_id}.{source_table_id}`
        WHERE title IS NOT NULL
        AND title != ''
        ORDER BY published_at DESC
        LIMIT 100
        """
        query_job = client.query(query)
        results = query_job.result()
    
    # Process papers in batches
    batch_size = 50
    rows_to_insert = []
    processed_count = 0
    skipped_count = 0
    
    for row in results:
        # Combine title for classification
        text_to_classify = f"{row.title or ''}"
        
        # Get tags from classification function
        print(f"Classifying paper: {row.paper_id[:20] if row.paper_id else 'no-id'}...")
        tags = classify_text(text_to_classify)
        
        if not tags:
            print(f"Warning: No tags returned for paper {row.paper_id}")
            skipped_count += 1
            continue
        
        # Prepare row for insertion
        row_to_insert = {
            "paper_id": row.paper_id,
            "title": row.title,
            "abstract": row.abstract,
            "category_sk": row.category_sk,
            "published_at": row.published_at.isoformat() if row.published_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            "_loaded_at": datetime.utcnow().isoformat(),
            "tags": tags,
        }
        
        rows_to_insert.append(row_to_insert)
        processed_count += 1
        
        # Insert in batches
        if len(rows_to_insert) >= batch_size:
            table_ref = f"{project_id}.{target_dataset_id}.{target_table_id}"
            errors = client.insert_rows_json(table_ref, rows_to_insert)
            
            if errors:
                print(f"Errors inserting batch: {errors}")
            else:
                print(f"Successfully inserted batch of {len(rows_to_insert)} rows")
            
            rows_to_insert = []
    
    # Insert remaining rows
    if rows_to_insert:
        table_ref = f"{project_id}.{target_dataset_id}.{target_table_id}"
        errors = client.insert_rows_json(table_ref, rows_to_insert)
        
        if errors:
            print(f"Errors inserting final batch: {errors}")
        else:
            print(f"Successfully inserted final batch of {len(rows_to_insert)} rows")
    
    print(f"Total papers processed and tagged: {processed_count}")
    print(f"Papers skipped (no tags): {skipped_count}")
    
    return {
        "processed_count": processed_count,
        "skipped_count": skipped_count,
        "status": "success"
    }


# Define the DAG
with DAG(
    dag_id="arxiv_paper_tagging_pipeline",
    default_args=default_args,
    description="Tag arXiv papers with ML classification and load to BigQuery",
    schedule="0 2 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["arxiv", "classification", "pulseai", "ml"],
) as dag:
    
    start_task = EmptyOperator(task_id="start")
    
    setup_schema_task = PythonOperator(
        task_id="setup_tagged_schema",
        python_callable=create_tagged_schema,
    )
    
    tag_and_load_task = PythonOperator(
        task_id="classify_and_tag_papers",
        python_callable=process_and_tag_papers,
    )
    
    end_task = EmptyOperator(task_id="end")
    
    # Define task dependencies
    start_task >> setup_schema_task >> tag_and_load_task >> end_task