import functions_framework
from google.cloud import bigquery

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'raw_arxiv'

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
    
    ##################################################### create the papers table
    
    table_id = f"{project_id}.{dataset_id}.papers"
    
    schema = [
        bigquery.SchemaField("arxiv_id", "STRING", mode="REQUIRED", 
                           description="Unique arXiv paper identifier"),
        bigquery.SchemaField("title", "STRING", mode="REQUIRED",
                           description="Paper title"),
        bigquery.SchemaField("authors", "STRING", mode="REPEATED",
                           description="List of paper authors"),
        bigquery.SchemaField("summary", "STRING", mode="NULLABLE",
                           description="Paper abstract/summary"),
        bigquery.SchemaField("published_date", "TIMESTAMP", mode="NULLABLE",
                           description="Original publication date on arXiv"),
        bigquery.SchemaField("updated_date", "TIMESTAMP", mode="NULLABLE",
                           description="Last update date on arXiv"),
        bigquery.SchemaField("pdf_url", "STRING", mode="NULLABLE",
                           description="URL to PDF version"),
        bigquery.SchemaField("primary_category", "STRING", mode="NULLABLE",
                           description="Primary arXiv category (e.g., cs.AI)"),
        bigquery.SchemaField("all_categories", "STRING", mode="REPEATED",
                           description="All associated arXiv categories"),
        bigquery.SchemaField("doi", "STRING", mode="NULLABLE",
                           description="Digital Object Identifier"),
        bigquery.SchemaField("journal_ref", "STRING", mode="NULLABLE",
                           description="Journal reference if published"),
        bigquery.SchemaField("comments", "STRING", mode="NULLABLE",
                           description="Author comments"),
        bigquery.SchemaField("ingest_timestamp", "TIMESTAMP", mode="REQUIRED",
                           description="When data was extracted from arXiv API"),
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
        field="published_date"
    )
    table.clustering_fields = ["primary_category"]
    
    try:
        table = client.create_table(table, exists_ok=True)
        print(f"Table {table_id} created or already exists")
    except Exception as e:
        print(f"Error creating table: {e}")
        return {"error": str(e)}, 500
    
    return {
        "dataset": dataset_id,
        "tables": ["papers"],
        "status": "success"
    }, 200