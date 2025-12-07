# create-combined-newsletter-table/main.py

import functions_framework
from google.cloud import bigquery

PROJECT_ID = "pulseai-team3-ba882-fall25"
DATASET = "pulseai_main_db"
TABLE = "combined_newsletter"

table_id = f"{PROJECT_ID}.{DATASET}.{TABLE}"

schema = [
    bigquery.SchemaField("tag", "STRING", mode="REQUIRED",
                        description="The category/classification tag"),
    bigquery.SchemaField("window_start", "TIMESTAMP", mode="REQUIRED",
                        description="Start of the time window being summarized"),
    bigquery.SchemaField("window_end", "TIMESTAMP", mode="REQUIRED",
                        description="End of the time window being summarized"),
    bigquery.SchemaField("detailed_summary_arxiv", "STRING", mode="NULLABLE",
                        description="Detailed summary from arXiv papers"),
    bigquery.SchemaField("detailed_summary_gnews", "STRING", mode="NULLABLE",
                        description="Detailed summary from news articles"),
    bigquery.SchemaField("detailed_summary_reddit", "STRING", mode="NULLABLE",
                        description="Detailed summary from Reddit posts"),
    bigquery.SchemaField("combined_summary", "STRING", mode="NULLABLE",
                        description="AI-generated synthesis of all three summaries"),
    bigquery.SchemaField(
        "created_at",
        "TIMESTAMP",
        mode="REQUIRED",
        default_value_expression="CURRENT_TIMESTAMP()",
        description="When this combined record was created",
    ),
]


@functions_framework.http
def create_combined_newsletter_table(request):
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