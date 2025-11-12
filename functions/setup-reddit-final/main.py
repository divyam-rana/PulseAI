import functions_framework
from google.cloud import bigquery

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'raw_reddit'

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
    
    ##################################################### create the posts table
    
    table_id = f"{project_id}.{dataset_id}.posts"
    
    schema = [
        bigquery.SchemaField("id", "STRING", mode="NULLABLE",
                           description="Reddit post ID"),
        bigquery.SchemaField("title", "STRING", mode="NULLABLE",
                           description="Post title"),
        bigquery.SchemaField("author", "STRING", mode="NULLABLE",
                           description="Reddit username of post author"),
        bigquery.SchemaField("score", "INTEGER", mode="NULLABLE",
                           description="Post score (upvotes - downvotes)"),
        bigquery.SchemaField("upvote_ratio", "FLOAT", mode="NULLABLE",
                           description="Ratio of upvotes to total votes"),
        bigquery.SchemaField("num_comments", "INTEGER", mode="NULLABLE",
                           description="Number of comments on post"),
        bigquery.SchemaField("created_utc", "TIMESTAMP", mode="NULLABLE",
                           description="Post creation timestamp"),
        bigquery.SchemaField("url", "STRING", mode="NULLABLE",
                           description="URL of linked content"),
        bigquery.SchemaField("permalink", "STRING", mode="NULLABLE",
                           description="Reddit permalink to post"),
        bigquery.SchemaField("selftext", "STRING", mode="NULLABLE",
                           description="Post body text (for text posts)"),
        bigquery.SchemaField("subreddit", "STRING", mode="NULLABLE",
                           description="Subreddit name"),
        bigquery.SchemaField("is_self", "BOOLEAN", mode="NULLABLE",
                           description="True if text post, False if link post"),
        bigquery.SchemaField("link_flair_text", "STRING", mode="NULLABLE",
                           description="Post flair text"),
        bigquery.SchemaField("over_18", "BOOLEAN", mode="NULLABLE",
                           description="NSFW flag"),
        bigquery.SchemaField("spoiler", "BOOLEAN", mode="NULLABLE",
                           description="Spoiler flag"),
        bigquery.SchemaField("stickied", "BOOLEAN", mode="NULLABLE",
                           description="Pinned/stickied post flag"),
        bigquery.SchemaField("ingest_timestamp", "TIMESTAMP", mode="NULLABLE",
                           description="When data was extracted from Reddit API"),
        bigquery.SchemaField("load_timestamp", "TIMESTAMP", mode="NULLABLE",
                           description="When data was loaded into BigQuery"),
        bigquery.SchemaField("source_path", "STRING", mode="NULLABLE",
                           description="GCS path to raw JSON file"),
        bigquery.SchemaField("run_id", "STRING", mode="NULLABLE",
                           description="Unique identifier for extraction run"),
    ]
    
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="created_utc"
    )
    table.clustering_fields = ["subreddit", "author"]
    
    try:
        table = client.create_table(table, exists_ok=True)
        print(f"Table {table_id} created or already exists")
    except Exception as e:
        print(f"Error creating table: {e}")
        return {"error": str(e)}, 500
    
    return {
        "dataset": dataset_id,
        "table": "posts",
        "table_id": table_id,
        "status": "success"
    }, 200