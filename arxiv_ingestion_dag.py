from __future__ import annotations

import pendulum

from airflow.decorators import dag, task
from include.arxiv import fetch_ai_papers_to_dataframe # Import your function from the 'include' folder
import pandas as pd # Needed for type hinting and usage

# --- Configuration Constants ---
# NOTE: Replace these with your actual GCP details
GCS_BUCKET = "pulse-ai-data-bucket"
GCS_FOLDER = "raw/arxiv/"

# --- Define the core data saving logic as an Airflow Task ---

@task(task_id="save_data_to_gcs")
def save_data_task(df: pd.DataFrame, execution_date: str):
    """
    Saves the fetched Pandas DataFrame to Google Cloud Storage (GCS).
    This function assumes your 'arxiv.py' script was updated to contain
    the GCS upload logic (requiring gcsfs and fsspec).
    """
    if df is None or df.empty:
        print("No data fetched, skipping GCS upload.")
        return

    # Define the target path based on the bucket, folder, and execution date
    filename = f"arxiv_papers_{execution_date}.parquet"
    gcs_path = f"gs://{GCS_BUCKET}/{GCS_FOLDER}{filename}"

    print(f"📦 Attempting to save {len(df)} records to {gcs_path}")

    # The Pandas to_parquet method handles the GCS upload thanks to 'gcsfs'
    # NOTE: Your 'arxiv.py' should contain logic similar to this, or you can 
    # integrate the entire saving function here and just return the DF from arxiv.py.
    try:
        df.to_parquet(gcs_path, index=False)
        print(f"✅ Data successfully uploaded to GCS at {gcs_path}")
    except Exception as e:
        # Raise an exception to fail the Airflow task on upload failure
        raise ConnectionError(f"Failed to upload data to GCS: {e}")

# --- Define the DAG Workflow ---

@dag(
    dag_id="arxiv_weekly_ingestion_dag",
    start_date=pendulum.datetime(2025, 1, 1, tz="UTC"),
    # Schedule for midnight (00:00) every Monday for weekly ingestion
    schedule="0 0 * * 1", 
    catchup=False,
    tags=["pulse_ai", "data_ingestion", "arxiv"],
    default_args={
        "retries": 3,
        "retry_delay": pendulum.duration(minutes=5), # Resilience setting
    },
    doc_md=__doc__,
)
def arxiv_ingestion_pipeline():
    # 1. Fetch data task (using the function imported from include/arxiv.py)
    # The output (DataFrame) is automatically passed to the next task
    arxiv_df = fetch_ai_papers_to_dataframe()

    # 2. Save data task
    # The 'ds' macro is Airflow's execution date (e.g., '2025-10-14')
    save_data_task(
        df=arxiv_df,
        execution_date="{{ ds }}" 
    )

# Instantiate the DAG
arxiv_ingestion_pipeline()
