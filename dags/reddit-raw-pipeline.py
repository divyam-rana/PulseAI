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
    schedule="0 */2 * * *",            # Every 2 hours
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["raw", "ingest", "reddit", "social"]
)
def reddit_pipeline():

    @task
    def setup_schema():
        """Setup BigQuery schema for Reddit posts"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/setup-reddit-schema"
        resp = invoke_function(url)
        print(f"Reddit schema setup: {resp}")
        return resp

    @task
    def extract_posts() -> dict:
        """Extract AI posts from Reddit"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-reddit"
        ctx = get_current_context()
        params = {
            'run_id': ctx["dag_run"].run_id,
            'date': ctx["ds_nodash"],
            'subreddit': 'MachineLearning',
            'limit': 100
        }
        resp = invoke_function(url, params=params)
        print("Reddit extraction response=============================")
        print(resp)
        return resp

    @task
    def load_posts(extract_payload: dict) -> dict:
        """Load Reddit posts into BigQuery"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/load-reddit"
        ctx = get_current_context()
        print("Reddit load incoming payload =======================")
        print(extract_payload)
        
        # Use the metadata from extract function
        params = {
            'num_entries': extract_payload.get('num_entries', 0),
            'bucket_name': extract_payload.get('bucket_name'),
            'blob_name': extract_payload.get('blob_name'),
            'run_id': extract_payload.get('run_id'),
            'subreddit': extract_payload.get('subreddit')
        }
        
        print("Reddit load final payload =======================")
        print(params)
        resp = invoke_function(url, params=params)
        return resp

    @task
    def reddit_summary(load_result: dict) -> dict:
        """Summarize Reddit pipeline execution"""
        summary = {
            'source': 'Reddit',
            'execution_date': get_current_context()["ds_nodash"],
            'posts_loaded': load_result.get('rows_loaded', 0),
            'table': load_result.get('table'),
            'subreddit': load_result.get('subreddit'),
            'status': 'success' if load_result.get('rows_loaded', 0) > 0 else 'no_data'
        }
        
        print("Reddit Pipeline Summary =======================")
        print(f"Posts loaded: {summary['posts_loaded']}")
        print(f"Subreddit: {summary['subreddit']}")
        print(f"Table: {summary['table']}")
        
        return summary

    # DAG execution flow
    schema_result = setup_schema()
    extract_result = extract_posts()
    load_result = load_posts(extract_result)
    summary = reddit_summary(load_result)


reddit_pipeline()