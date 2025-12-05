"""
Airflow DAG for orchestrating Newsletter Cloud Functions (Gen 2).

This DAG triggers the following workflows:
- arxiv: schema setup -> summarization
- gnews: summarization only (table already exists)
- reddit: schema setup -> summarization

Schedule: Every Saturday at 12:00 AM (midnight) US Eastern Time (America/New_York)

Note: Uses HTTP requests to invoke Gen 2 Cloud Functions with IAM authentication.
"""

from datetime import datetime, timedelta

import pendulum
from airflow import DAG
from airflow.providers.google.common.hooks.base_google import GoogleBaseHook
from airflow.decorators import task

# ==============================================================================
# Configuration - Update these values for your environment
# ==============================================================================

GCP_PROJECT_ID = "pulseai-team3-ba882-fall25"
GCP_REGION = "us-central1"
GCP_CONN_ID = "google_cloud_default"

# Cloud Run URLs for Gen 2 Cloud Functions
# Format: https://{FUNCTION_NAME}-{PROJECT_NUMBER}.{REGION}.run.app
PROJECT_NUMBER = "335360564911"

ARXIV_SCHEMA_FUNCTION = "arxiv-summary"
ARXIV_SUMMARIZE_FUNCTION = "arxiv-llm"
GNEWS_SUMMARIZE_FUNCTION = "gnews-weekly-summary-with-category"
REDDIT_SCHEMA_FUNCTION = "create-reddit-tag-summaries-table"
REDDIT_SUMMARIZE_FUNCTION = "summarize-reddit-by-tag"

# Build full URLs for each function
FUNCTION_URLS = {
    ARXIV_SCHEMA_FUNCTION: f"https://{ARXIV_SCHEMA_FUNCTION}-{PROJECT_NUMBER}.{GCP_REGION}.run.app",
    ARXIV_SUMMARIZE_FUNCTION: f"https://{ARXIV_SUMMARIZE_FUNCTION}-{PROJECT_NUMBER}.{GCP_REGION}.run.app",
    GNEWS_SUMMARIZE_FUNCTION: f"https://{GNEWS_SUMMARIZE_FUNCTION}-{PROJECT_NUMBER}.{GCP_REGION}.run.app",
    REDDIT_SCHEMA_FUNCTION: f"https://{REDDIT_SCHEMA_FUNCTION}-{PROJECT_NUMBER}.{GCP_REGION}.run.app",
    REDDIT_SUMMARIZE_FUNCTION: f"https://{REDDIT_SUMMARIZE_FUNCTION}-{PROJECT_NUMBER}.{GCP_REGION}.run.app",
}

# Timezone for scheduling
LOCAL_TZ = pendulum.timezone("America/New_York")

# ==============================================================================
# Default Arguments
# ==============================================================================

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


# ==============================================================================
# Helper function to invoke Cloud Functions with authentication
# ==============================================================================

@task
def invoke_cloud_function(function_name: str, payload: dict = None):
    """
    Invoke a Gen 2 Cloud Function (Cloud Run) using authenticated HTTP request.
    """
    import requests
    from google.auth.transport.requests import Request
    from google.oauth2 import id_token

    function_url = FUNCTION_URLS[function_name]
    
    # Get the identity token for authentication
    hook = GoogleBaseHook(gcp_conn_id=GCP_CONN_ID)
    credentials = hook.get_credentials()
    
    # For Gen 2 functions, we need an identity token
    auth_req = Request()
    credentials.refresh(auth_req)
    
    # Get ID token for the target audience (the function URL)
    token = id_token.fetch_id_token(auth_req, function_url)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    response = requests.post(
        function_url,
        json=payload or {},
        headers=headers,
        timeout=540,  # 9 minute timeout
    )
    
    response.raise_for_status()
    return response.json()


# ==============================================================================
# DAG Definition
# ==============================================================================

with DAG(
    dag_id="newsletters_weekly_dag",
    default_args=default_args,
    description="Weekly newsletter summarization pipeline for arxiv, gnews, and reddit",
    schedule="0 0 * * 6",  # Every Saturday at midnight
    start_date=datetime(2025, 12, 1, tzinfo=LOCAL_TZ),
    catchup=False,
    tags=["newsletters", "summarization", "weekly"],
) as dag:

    # ==========================================================================
    # arxiv Workflow Tasks
    # ==========================================================================

    arxiv_setup_schema = invoke_cloud_function.override(task_id="arxiv_setup_schema")(
        function_name=ARXIV_SCHEMA_FUNCTION,
        payload={},
    )

    arxiv_summarize = invoke_cloud_function.override(task_id="arxiv_summarize")(
        function_name=ARXIV_SUMMARIZE_FUNCTION,
        payload={"days": 7},
    )

    # ==========================================================================
    # gnews Workflow Tasks
    # NOTE: No schema setup task - table already exists in BigQuery
    # ==========================================================================

    gnews_summarize = invoke_cloud_function.override(task_id="gnews_summarize")(
        function_name=GNEWS_SUMMARIZE_FUNCTION,
        payload={"days": 7},
    )

    # ==========================================================================
    # reddit Workflow Tasks
    # ==========================================================================

    reddit_setup_schema = invoke_cloud_function.override(task_id="reddit_setup_schema")(
        function_name=REDDIT_SCHEMA_FUNCTION,
        payload={},
    )

    reddit_summarize = invoke_cloud_function.override(task_id="reddit_summarize")(
        function_name=REDDIT_SUMMARIZE_FUNCTION,
        payload={"days": 7},
    )

    # ==========================================================================
    # Task Dependencies
    # ==========================================================================

    # arxiv: schema setup must complete before summarization
    arxiv_setup_schema >> arxiv_summarize

    # gnews: only summarization (no schema setup needed)
    # gnews_summarize runs independently

    # reddit: schema setup must complete before summarization
    reddit_setup_schema >> reddit_summarize