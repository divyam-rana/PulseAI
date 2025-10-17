# dags/smoke_gcs.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.gcs import GCSListObjectsOperator

with DAG(
    dag_id="smoke_gcs",
    start_date=datetime.now() - timedelta(days=1),
    schedule=None,
    catchup=False,
) as dag:
    GCSListObjectsOperator(
        task_id="list",
        bucket="pulse-ai-data-bucket",
        gcp_conn_id="gcs_default",
    )
