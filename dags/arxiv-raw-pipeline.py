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
    schedule="0 2 * * *",              # Daily at 2 AM UTC
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["raw", "ingest", "arxiv", "papers"]
)
def arxiv_pipeline():

    @task
    def setup_schema():
        """Setup BigQuery schema for arXiv papers"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/setup-arxiv-schema"
        resp = invoke_function(url)
        print(f"arXiv schema setup: {resp}")
        return resp

    @task
    def extract_papers() -> dict:
        """Extract AI papers from arXiv"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/extract-arxiv"
        ctx = get_current_context()
        params = {
            'run_id': ctx["dag_run"].run_id,
            'date': ctx["ds_nodash"],
            'days_ago': 7,
            'max_results': 100
        }
        resp = invoke_function(url, params=params)
        print("arXiv extraction response=============================")
        print(resp)
        return resp

    @task
    def load_papers(extract_payload: dict) -> dict:
        """Load arXiv papers into BigQuery"""
        url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/load-arxiv"
        ctx = get_current_context()
        print("arXiv load incoming payload =======================")
        print(extract_payload)
        
        # Use the metadata from extract function
        params = {
            'num_entries': extract_payload.get('num_entries', 0),
            'bucket_name': extract_payload.get('bucket_name'),
            'blob_name': extract_payload.get('blob_name'),
            'run_id': extract_payload.get('run_id')
        }
        
        print("arXiv load final payload =======================")
        print(params)
        resp = invoke_function(url, params=params)
        return resp

    @task
    def arxiv_summary(load_result: dict) -> dict:
        """Summarize arXiv pipeline execution"""
        summary = {
            'source': 'arXiv',
            'execution_date': get_current_context()["ds_nodash"],
            'papers_loaded': load_result.get('rows_loaded', 0),
            'table': load_result.get('table'),
            'status': 'success' if load_result.get('rows_loaded', 0) > 0 else 'no_data'
        }
        
        print("arXiv Pipeline Summary =======================")
        print(f"Papers loaded: {summary['papers_loaded']}")
        print(f"Table: {summary['table']}")
        
        return summary

    # DAG execution flow
    schema_result = setup_schema()
    extract_result = extract_papers()
    load_result = load_papers(extract_result)
    summary = arxiv_summary(load_result)


arxiv_pipeline()