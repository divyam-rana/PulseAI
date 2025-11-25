from __future__ import annotations

import pendulum

from airflow.models.dag import DAG
from airflow.providers.google.cloud.operators.functions import (
    GoogleCloudFunctionInvokeFunctionOperator,
)

# --- Configuration for your Cloud Function ---
# Ensure these match the details of your deployed function
PROJECT_ID = "pulseai-team3-ba882-fall25"
LOCATION = "us-central1"  # Region where your function is deployed
FUNCTION_NAME = "summarize_daily_posts"  # The entrypoint in your Python file

# The Cloud Function is currently set up to process the data from "yesterday".
# Therefore, scheduling it for 6 PM (PST) on the current day makes sense, 
# as it should have all of yesterday's data available for processing.

with DAG(
    dag_id="daily_reddit_ai_summary_pipeline",
    start_date=pendulum.datetime(2023, 1, 1, tz="America/Los_Angeles"),
    schedule="0 18 * * *",  # Cron expression: 6 PM every day
    catchup=False,
    tags=["gcp", "vertex_ai", "bigquery", "reddit"],
    default_args={
        "owner": "airflow",
        "retries": 1,
    },
) as dag:
    # This operator invokes the specified Google Cloud Function.
    # The Cloud Function is an HTTP trigger, and this operator sends a minimal 
    # JSON payload (an empty dictionary `{}`) as the trigger's "event" data, 
    # which is compatible with the function signature `def summarize_daily_posts(event, context):`.
    invoke_reddit_summary_function = GoogleCloudFunctionInvokeFunctionOperator(
        task_id="trigger_reddit_summary_cf",
        project_id=PROJECT_ID,
        location=LOCATION,
        function_id=FUNCTION_NAME,
        # The payload is optional, but included here for completeness as the 
        # function signature expects an 'event' argument.
        input_data={},  
        # IMPORTANT: Ensure the Airflow connection 'google_cloud_default' 
        # has the necessary IAM permissions to invoke the Cloud Function 
        # (roles/cloudfunctions.invoker).
    )
