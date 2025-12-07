"""
Airflow DAG for orchestrating Combined Newsletter Cloud Functions (Gen 2).

This DAG triggers the following workflow:
- Schema setup for combined_newsletter table
- Newsletter generation from arxiv, gnews, and reddit summaries

Schedule: Every Saturday at 3:00 AM US Eastern Time (America/New_York)
         This runs after the individual source newsletter DAGs complete.
"""

from datetime import datetime, timedelta
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

# ==============================================================================
# Configuration
# ==============================================================================

GCP_PROJECT_ID = "pulseai-team3-ba882-fall25"
GCP_REGION = "us-central1"
PROJECT_NUMBER = "335360564911"

SCHEMA_SETUP_URL = f"https://create-combined-newsletter-table-{PROJECT_NUMBER}.{GCP_REGION}.run.app"
NEWSLETTER_GEN_URL = f"https://generate-combined-newsletter-{PROJECT_NUMBER}.{GCP_REGION}.run.app"

# ==============================================================================
# Default Arguments
# ==============================================================================

default_args = {
    "owner": "pulseai",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

# ==============================================================================
# Task Functions
# ==============================================================================

def call_setup_schema():
    """Setup the combined_newsletter BigQuery table"""
    response = requests.get(SCHEMA_SETUP_URL)
    response.raise_for_status()
    print(f"Setup schema response: {response.status_code}")
    return response.json()


def call_generate_newsletter():
    """Generate combined newsletter from all sources"""
    response = requests.post(
        NEWSLETTER_GEN_URL,
        json={"days": 7},
        timeout=600  # 10 minute timeout for LLM processing
    )
    response.raise_for_status()
    print(f"Generate newsletter response: {response.status_code}")
    
    # Handle text response instead of JSON
    try:
        return response.json()
    except Exception as e:
        print(f"Response is not JSON, returning text: {response.text}")
        return {"message": response.text, "status": "success"}


# ==============================================================================
# DAG Definition
# ==============================================================================

with DAG(
    dag_id="combined_newsletter_pipeline",
    default_args=default_args,
    description="Combined newsletter generation from arxiv, gnews, and reddit summaries",
    schedule="0 8 * * 6",  # Every Saturday at 8:00 AM UTC (3:00 AM EST)
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["newsletters", "combined", "summarization", "weekly"],
) as dag:

    start = EmptyOperator(task_id="start")

    setup_schema = PythonOperator(
        task_id="setup_combined_newsletter_schema",
        python_callable=call_setup_schema,
    )

    generate_newsletter = PythonOperator(
        task_id="generate_combined_newsletter",
        python_callable=call_generate_newsletter,
    )

    end = EmptyOperator(task_id="end")

    # Task dependencies
    start >> setup_schema >> generate_newsletter >> end