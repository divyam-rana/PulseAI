import functions_framework
from google.cloud import bigquery

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'pulseai_main_db'

@functions_framework.http
def task(request):
    client = bigquery.Client(project=project_id)
    
    table_id = f"{project_id}.{dataset_id}.weekly_newsletters"
    
    schema = [
        bigquery.SchemaField("newsletter_id", "STRING", mode="REQUIRED",
                           description="Unique identifier for newsletter"),
        bigquery.SchemaField("start_date", "DATE", mode="REQUIRED",
                           description="Start date of coverage period"),
        bigquery.SchemaField("end_date", "DATE", mode="REQUIRED",
                           description="End date of coverage period"),
        bigquery.SchemaField("content", "STRING", mode="REQUIRED",
                           description="Newsletter markdown content"),
        bigquery.SchemaField("paper_count", "INTEGER", mode="NULLABLE",
                           description="Number of papers summarized"),
        bigquery.SchemaField("category_count", "INTEGER", mode="NULLABLE",
                           description="Number of categories"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED",
                           description="When newsletter was generated"),
        bigquery.SchemaField("version", "STRING", mode="NULLABLE",
                           description="Newsletter generation version"),
    ]
    
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="generated_at"
    )
    
    try:
        table = client.create_table(table, exists_ok=True)
        print(f"Table {table_id} created or already exists")
        return {"status": "success", "table_id": table_id}, 200
    except Exception as e:
        return {"error": str(e)}, 500
