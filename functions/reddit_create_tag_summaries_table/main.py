# reddit_create_tag_summaries_table/main.py

import functions_framework
from google.cloud import bigquery

PROJECT_ID = "pulseai-team3-ba882-fall25"
DATASET = "pulseai_main_db"
TABLE = "reddit_tag_summaries"

table_id = f"{PROJECT_ID}.{DATASET}.{TABLE}"

schema = [
    bigquery.SchemaField("tag", "STRING", mode="REQUIRED"),
    bigquery.SchemaField("window_start", "TIMESTAMP", mode="REQUIRED"),
    bigquery.SchemaField("window_end", "TIMESTAMP", mode="REQUIRED"),
    bigquery.SchemaField("high_level_summary", "STRING", mode="NULLABLE"),
    bigquery.SchemaField("detailed_summary", "STRING", mode="NULLABLE"),
    bigquery.SchemaField(
        "sources",
        "RECORD",
        mode="REPEATED",
        fields=[
            bigquery.SchemaField("post_id", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("title", "STRING", mode="NULLABLE"),
        ],
    ),
    bigquery.SchemaField(
        "created_at",
        "TIMESTAMP",
        mode="REQUIRED",
        default_value_expression="CURRENT_TIMESTAMP()",
    ),
]


@functions_framework.http
def create_reddit_tag_summaries_table(request):
    try:
        client = bigquery.Client()

        dataset = client.dataset(DATASET)
        if not dataset:
            client.create_dataset(bigquery.Dataset(dataset))

        tables = list(client.list_tables(dataset))
        existing = {t.table_id for t in tables}

        if TABLE in existing:
            return {"status": "exists", "message": "Table already exists"}, 200

        table_obj = bigquery.Table(table_id, schema=schema)
        client.create_table(table_obj)

        return {"status": "created", "table": table_id}, 200

    except Exception as e:
        return {"error": str(e)}, 500