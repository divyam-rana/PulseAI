from airflow.decorators import dag, task
from datetime import datetime, timedelta
from airflow.operators.python import get_current_context
import requests

# helper
def invoke_function(url, params={}) -> dict:
    """
    Invoke our cloud function url and optionally pass data for the function to use
    """
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    return resp.json()


@dag(
    schedule="0 */6 * * *",            # Every 6 hours
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["raw", "ingest", "gnews", "news"]
)
def gnews_pipeline():

    @task
    def setup_schema():
        """Setup BigQuery schema for GNews articles"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/setup-gnews-schema"
        resp = invoke_function(url)
        print(f"GNews schema setup: {resp}")
        return resp

    @task
    def extract_articles() -> dict:
        """Extract AI news from GNews"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-gnews"
        ctx = get_current_context()
        params = {
            'run_id': ctx["dag_run"].run_id,
            'date': ctx["ds_nodash"],
            'days_back': 1,  # Only last 24 hours for frequent runs
            'max_results': 50
        }
        resp = invoke_function(url, params=params)
        print("GNews extraction response=============================")
        print(resp)
        return resp

    @task
    def load_articles(extract_payload: dict) -> dict:
        """Load GNews articles into BigQuery"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/load-gnews"
        ctx = get_current_context()
        print("GNews load incoming payload =======================")
        print(extract_payload)
        
        # Use the metadata from extract function
        params = {
            'num_entries': extract_payload.get('num_entries', 0),
            'bucket_name': extract_payload.get('bucket_name'),
            'blob_name': extract_payload.get('blob_name'),
            'run_id': extract_payload.get('run_id')
        }
        
        print("GNews load final payload =======================")
        print(params)
        resp = invoke_function(url, params=params)
        return resp

    @task
    def gnews_summary(load_result: dict) -> dict:
        """Summarize GNews pipeline execution"""
        summary = {
            'source': 'GNews',
            'execution_date': get_current_context()["ds_nodash"],
            'articles_loaded': load_result.get('rows_loaded', 0),
            'table': load_result.get('table'),
            'status': 'success' if load_result.get('rows_loaded', 0) > 0 else 'no_data'
        }
        
        print("GNews Pipeline Summary =======================")
        print(f"Articles loaded: {summary['articles_loaded']}")
        print(f"Table: {summary['table']}")
        
        return summary

    # DAG execution flow
    schema_result = setup_schema()
    extract_result = extract_articles()
    load_result = load_articles(extract_result)
    summary = gnews_summary(load_result)


gnews_pipeline()