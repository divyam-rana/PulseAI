from datetime import datetime, timedelta
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

default_args = {
    "owner": "pulseai",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

def call_setup_bigquery():
    url = "https://setup-reddit-final-335360564911.us-central1.run.app"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Setup BigQuery response: {response.status_code}")
    return response.json()

def call_extract_reddit():
    url = "https://extract-reddit-final-335360564911.us-central1.run.app"
    params = {
        "subreddit": "MachineLearning",
        "limit": 100,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    print(f"Extract Reddit response: {response.status_code}")
    return response.json()

def call_load_posts(ti):
    # Get extracted data from upstream task
    extracted_data = ti.xcom_pull(task_ids="extract_reddit_posts")
    blob_name = extracted_data.get("blob_name")
    run_id = extracted_data.get("run_id")
    
    url = "https://load-reddit-final-335360564911.us-central1.run.app"
    params = {
        "blob_path": blob_name,
        "run_id": run_id
    }
    
    # Send request to load endpoint
    response = requests.get(url, params=params)
    response.raise_for_status()
    print(f"Load posts response: {response.status_code}")
    return response.json()

with DAG(
    dag_id="reddit_etl_pipeline",
    default_args=default_args,
    description="ETL pipeline for Reddit: setup schema → extract → load",
    schedule="@daily",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["reddit", "etl", "pulseai"],
) as dag:

    start = EmptyOperator(task_id="start")

    setup_bigquery = PythonOperator(
        task_id="setup_reddit_schema",
        python_callable=call_setup_bigquery,
    )

    extract_reddit = PythonOperator(
        task_id="extract_reddit_posts",
        python_callable=call_extract_reddit,
    )

    load_posts = PythonOperator(
        task_id="load_reddit_posts",
        python_callable=call_load_posts,
    )

    end = EmptyOperator(task_id="end")

    start >> setup_bigquery >> extract_reddit >> load_posts >> end