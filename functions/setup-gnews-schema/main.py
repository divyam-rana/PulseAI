import functions_framework
from google.cloud import bigquery

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'raw_gnews'

@functions_framework.http
def task(request):
    
    # instantiate BigQuery client
    client = bigquery.Client(project=project_id)
    
    ##################################################### create the dataset
    
    # create dataset if it doesn't exist
    dataset_ref = f"{project_id}.{dataset_id}"
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "US"
    
    try:
        dataset = client.create_dataset(dataset, exists_ok=True)
        print(f"Dataset {dataset_id} created or already exists")
    except Exception as e:
        print(f"Error creating dataset: {e}")
        return {"error": str(e)}, 500
    
    ##################################################### create the articles table
    
    table_id = f"{project_id}.{dataset_id}.articles"
    
    schema = [
        bigquery.SchemaField("title", "STRING", mode="REQUIRED",
                           description="Article headline"),
        bigquery.SchemaField("description", "STRING", mode="NULLABLE",
                           description="Article description/excerpt"),
        bigquery.SchemaField("content", "STRING", mode="NULLABLE",
                           description="Full article content"),
        bigquery.SchemaField("url", "STRING", mode="NULLABLE",
                           description="Article URL"),
        bigquery.SchemaField("image", "STRING", mode="NULLABLE",
                           description="Article image URL"),
        bigquery.SchemaField("published_at", "TIMESTAMP", mode="NULLABLE",
                           description="Article publication timestamp"),
        bigquery.SchemaField("source", "RECORD", mode="NULLABLE",
                           description="News source information",
                           fields=[
                               bigquery.SchemaField("name", "STRING", mode="NULLABLE",
                                                  description="Source name"),
                               bigquery.SchemaField("url", "STRING", mode="NULLABLE",
                                                  description="Source homepage URL"),
                           ]),
        bigquery.SchemaField("ingest_timestamp", "TIMESTAMP", mode="REQUIRED",
                           description="When data was extracted from GNews API"),
        bigquery.SchemaField("load_timestamp", "TIMESTAMP", mode="REQUIRED",
                           description="When data was loaded into BigQuery"),
        bigquery.SchemaField("source_path", "STRING", mode="NULLABLE",
                           description="GCS path to raw JSON file"),
        bigquery.SchemaField("run_id", "STRING", mode="NULLABLE",
                           description="Unique identifier for extraction run"),
    ]
    
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="published_at"
    )
    # Note: Cannot cluster on nested fields like source.name
    # table.clustering_fields = ["source.name"]
    
    try:
        table = client.create_table(table, exists_ok=True)
        print(f"Table {table_id} created or already exists")
    except Exception as e:
        print(f"Error creating table: {e}")
        return {"error": str(e)}, 500
    
    return {
        "dataset": dataset_id,
        "tables": ["articles"],
        "status": "success"
    }, 200