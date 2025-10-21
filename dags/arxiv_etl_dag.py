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
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/setup-arxiv-schema"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Setup BigQuery response: {response.status_code}")
    return response.json()

def call_extract_arxiv():
    url = "https://extract-arxiv-final-335360564911.us-central1.run.app"
    params = {
        "days_ago": 7,
        "max_results": 100,
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    print(f"Extract arXiv response: {response.status_code}")
    return response.json()

def call_load_papers(ti):
    # Get extracted data from upstream task
    extracted_data = ti.xcom_pull(task_ids="extract_arxiv_papers")
    blob_name = extracted_data.get("blob_name")
    
    url = "https://load-arxiv-final-335360564911.us-central1.run.app"
    params = {
        "blob_path": blob_name
    }
    
    # Send request to load endpoint
    response = requests.get(url, params=params)
    response.raise_for_status()
    print(f"Load papers response: {response.status_code}")
    return response.json()

with DAG(
    dag_id="arxiv_etl_pipeline",
    default_args=default_args,
    description="ETL pipeline for arXiv: setup schema → extract → load",
    schedule="@daily",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["arxiv", "etl", "pulseai"],
) as dag:

    start = EmptyOperator(task_id="start")

    setup_bigquery = PythonOperator(
        task_id="setup_bigquery_schema",
        python_callable=call_setup_bigquery,
    )

    extract_arxiv = PythonOperator(
        task_id="extract_arxiv_papers",
        python_callable=call_extract_arxiv,
    )

    load_papers = PythonOperator(
        task_id="load_arxiv_papers",
        python_callable=call_load_papers,
    )

    end = EmptyOperator(task_id="end")

    start >> setup_bigquery >> extract_arxiv >> load_papers >> end