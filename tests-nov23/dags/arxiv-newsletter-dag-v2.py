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

def call_setup_newsletter_schema():
    """Setup the weekly_newsletters table"""
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/summarize-arxiv-weekly-v2-schema"
    response = requests.get(url)
    response.raise_for_status()
    print(f"Setup newsletter schema response: {response.status_code}")
    return response.json()

def call_generate_newsletter(**context):
    """Generate the weekly newsletter (v2 - no categories)"""
    url = "https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/summarize-arxiv-weekly-v2"
    
    # Calculate date range: previous Saturday to current Friday
    execution_date = context['execution_date']
    
    # Find the most recent Friday (execution date)
    end_date = execution_date.strftime('%Y-%m-%d')
    
    # Go back to previous Saturday (6 days before Friday)
    start_date = (execution_date - timedelta(days=6)).strftime('%Y-%m-%d')
    
    params = {
        "start_date": start_date,
        "end_date": end_date
    }
    
    print(f"Generating newsletter (v2 - no categories) for {start_date} to {end_date}")
    
    response = requests.get(url, params=params, timeout=600)  # 10 min timeout (may process many papers)
    response.raise_for_status()
    
    result = response.json()
    print(f"Generate newsletter response: {response.status_code}")
    print(f"Processed {result.get('paper_count', 0)} papers in {result.get('chunk_count', 0)} chunks")
    
    return result

with DAG(
    dag_id="arxiv_weekly_newsletter_v2_pipeline",
    default_args=default_args,
    description="Generate weekly AI research newsletter from arXiv papers (v2 - no category grouping)",
    schedule="0 7 * * 6",  # Run at 7 AM UTC every Saturday (2 AM EST)
    start_date=datetime(2025, 1, 4),  # First Saturday of 2025
    catchup=False,
    tags=["arxiv", "newsletter", "pulseai", "genai", "v2"],
) as dag:

    start = EmptyOperator(task_id="start")

    setup_schema = PythonOperator(
        task_id="setup_newsletter_schema",
        python_callable=call_setup_newsletter_schema,
    )

    generate_newsletter = PythonOperator(
        task_id="generate_weekly_newsletter_v2",
        python_callable=call_generate_newsletter,
        execution_timeout=timedelta(minutes=15),  # Longer timeout for processing many papers
    )

    end = EmptyOperator(task_id="end")

    start >> setup_schema >> generate_newsletter >> end
