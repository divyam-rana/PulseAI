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

def call_setup_schema():
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/setup-gnews-schema"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Setup schema response: {response.status_code}")
    return response.json()

def call_extract_articles():
    url = "https://gnews-final-deploymeny-335360564911.us-central1.run.app"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Extract articles response: {response.status_code}")
    return response.json()

def call_load_articles(ti):
    # Get extracted articles from upstream task
    extracted_data = ti.xcom_pull(task_ids="extract_gnews_articles")
    
    url = "https://gnews-loader-final-335360564911.us-central1.run.app"
    
    # Send extracted data to load endpoint
    response = requests.post(url, json=extracted_data)
    response.raise_for_status()
    print(f"Load articles response: {response.status_code}")
    return response.json()

with DAG(
    dag_id="gnews_etl_pipeline",
    default_args=default_args,
    description="ETL pipeline for GNews: setup schema → extract → load",
    schedule="@daily",
    start_date=datetime(2025, 10, 1),
    catchup=False,
    tags=["gnews", "etl", "pulseai"],
) as dag:

    start = EmptyOperator(task_id="start")

    setup_schema = PythonOperator(
        task_id="setup_gnews_schema",
        python_callable=call_setup_schema,
    )

    extract_articles = PythonOperator(
        task_id="extract_gnews_articles",
        python_callable=call_extract_articles,
    )

    load_articles = PythonOperator(
        task_id="load_gnews_articles",
        python_callable=call_load_articles,
    )

    end = EmptyOperator(task_id="end")

    start >> setup_schema >> extract_articles >> load_articles >> end