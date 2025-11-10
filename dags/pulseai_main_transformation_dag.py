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

def call_setup_main_db_schema():
    """Setup the pulseai_main_db schema with fact and dimension tables"""
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/setup-main-db-schema"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Setup main DB schema response: {response.status_code}")
    return response.json()

def call_transform_gnews():
    """Transform raw_gnews.articles into news_sources and news_articles"""
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/transform-gnews"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Transform GNews response: {response.status_code}")
    return response.json()

def call_transform_reddit():
    """Transform raw_reddit.posts into authors, calendar_date, and reddit_posts"""
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/transform-reddit"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Transform Reddit response: {response.status_code}")
    return response.json()

def call_transform_arxiv():
    """Transform raw_arxiv.papers into authors, arxiv_categories, arxiv_papers, and paper_authors"""
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/transform-arxiv"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Transform arXiv response: {response.status_code}")
    return response.json()

with DAG(
    dag_id="pulseai_main_transformation_pipeline",
    default_args=default_args,
    description="Transform raw data into fact and dimension tables in pulseai_main_db",
    schedule="@daily",  # Run daily after raw data ingestion
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["pulseai", "transformation", "dimensional-model"],
) as dag:
    
    start = EmptyOperator(task_id="start")
    
    # Setup the main database schema (creates all fact and dimension tables)
    setup_schema = PythonOperator(
        task_id="setup_main_db_schema",
        python_callable=call_setup_main_db_schema,
    )
    
    # Transform operations can run in parallel since they work on different source tables
    transform_gnews = PythonOperator(
        task_id="transform_gnews_to_facts_dims",
        python_callable=call_transform_gnews,
    )
    
    transform_reddit = PythonOperator(
        task_id="transform_reddit_to_facts_dims",
        python_callable=call_transform_reddit,
    )
    
    transform_arxiv = PythonOperator(
        task_id="transform_arxiv_to_facts_dims",
        python_callable=call_transform_arxiv,
    )
    
    end = EmptyOperator(task_id="end")
    
    # Define task dependencies
    # Setup schema first, then all transformations in parallel, then end
    start >> setup_schema >> [transform_gnews, transform_reddit, transform_arxiv] >> end