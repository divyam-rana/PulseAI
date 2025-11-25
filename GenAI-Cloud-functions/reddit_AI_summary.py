import os
import datetime
from google.cloud import bigquery
from google.cloud import aiplatform

# --- Configuration (Set as Environment Variables) ---
# It's best practice to pass these configurations via environment variables.
PROJECT_ID = 'pulseai-team3-ba882-fall25'
INPUT_TABLE = os.environ.get("INPUT_TABLE", "`pulseai-team3-ba882-fall25.raw_reddit.posts`")
OUTPUT_TABLE = os.environ.get("OUTPUT_TABLE", "`pulseai-team3-ba882-fall25.raw_reddit.daily_post_summaries`")
REGION = os.environ.get("GCP_REGION", "us-central1") # Use the region where your Vertex AI is located

# Initialize BigQuery client globally for reuse
BQ_CLIENT = bigquery.Client()

def get_aggregated_daily_text(input_table: str, target_date: datetime.date) -> tuple[datetime.date, str | None]:
    """Executes the BigQuery query to aggregate and concatenate post content for a given day."""

    # The date string is used for partition filtering
    target_date_str = target_date.strftime("%Y-%m-%d")

    # SQL query to get distinct posts and aggregate their content
    query = f"""
    SELECT
      TIMESTAMP('{target_date_str}') AS summary_date,
      STRING_AGG(
        CONCAT(t.title, '\n\n', t.selftext), '\n\n---\n\n'
      ) AS daily_text_for_summary
    FROM (
      -- Select distinct posts by ID and ensure the selftext isn't empty (noise reduction)
      SELECT DISTINCT
        id, title, selftext
      FROM
        {input_table}
      WHERE
        -- Efficiently filter using the partitioned column
        _PARTITIONTIME = TIMESTAMP('{target_date_str}')
        AND selftext IS NOT NULL
        AND selftext != ''
    ) AS t
    GROUP BY
      1
    """

    print(f"Executing BQ Query for date: {target_date_str}")
    try:
        query_job = BQ_CLIENT.query(query)
        result = query_job.result()

        # Should only return one row (or zero if no data for the day)
        for row in result:
            return row['summary_date'].date(), row['daily_text_for_summary']

    except Exception as e:
        print(f"Error executing BigQuery aggregation: {e}")
        return target_date, None
    
    # Return None if no rows were found
    return target_date, None


def generate_gemini_summary(daily_text: str, project_id: str, region: str) -> str:
    """Calls the Gemini model to create the summary with specific constraints."""
    
    # Initialize the Vertex AI client
    aiplatform.init(project=project_id, location=region)
    
    # Define the constrained prompt for a 2-3 line summary
    prompt = f"""
    Analyze the following collection of social media posts from a single day.
    Your task is to generate a concise summary, **exactly 2 to 3 lines long**, 
    highlighting the overall key themes and most important topics discussed.
    The response must contain only the summary text.

    Posts to summarize:
    ---
    {daily_text}
    ---
    """
    
    # Use the cost-effective Gemini-2.5-flash model
    model = aiplatform.models.TextGenerationModel.from_pretrained("gemini-2.5-flash")
    
    print("Calling Gemini-2.5-flash for summarization...")
    response = model.predict(
        prompt,
        max_output_tokens=150, # Sufficient for 2-3 lines
        temperature=0.1        # Lower temperature for less creative, more factual summary
    )

    return response.text


def insert_summary_into_bq(summary_date: datetime.date, summary_text: str, output_table: str):
    """Inserts the generated summary into the target BigQuery table."""
    
    # Ensure the table name is correctly formatted for insertion
    full_table_id = f"{PROJECT_ID}.{output_table}"
    
    # The INSERT query
    query = f"""
    INSERT INTO `{full_table_id}` (summary_date, daily_summary_text)
    VALUES (DATE('{summary_date.strftime("%Y-%m-%d")}'), @summary_text)
    """

    # Use query parameters to safely pass the summary text (prevents SQL injection)
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("summary_text", "STRING", summary_text),
        ]
    )
    
    print(f"Inserting summary for {summary_date} into {full_table_id}")
    try:
        query_job = BQ_CLIENT.query(query, job_config=job_config)
        query_job.result() # Wait for the job to complete
        print("Summary successfully inserted into BigQuery.")
    except Exception as e:
        print(f"Error inserting into BigQuery: {e}")
        raise e


def summarize_daily_posts(event, context):
    """
    The entrypoint for the Cloud Function, triggered by Cloud Scheduler.
    It orchestrates the entire daily summary generation process.
    """
    # Determine the date to process: typically the day before the function runs.
    target_date = (datetime.datetime.now() - datetime.timedelta(days=1)).date()
    
    print(f"Starting summary process for data on: {target_date}")

    # 1. Aggregate data from the raw table
    summary_date, daily_text = get_aggregated_daily_text(INPUT_TABLE, target_date)

    if not daily_text:
        print(f"No aggregated text found for {target_date}. Exiting.")
        return

    # 2. Generate the summary using Gemini-2.5-flash
    try:
        summary_text = generate_gemini_summary(daily_text, PROJECT_ID, REGION)
    except Exception as e:
        print(f"Gemini summarization failed. Skipping insertion. Error: {e}")
        return

    # 3. Insert the final summary into the new table
    insert_summary_into_bq(summary_date, summary_text, OUTPUT_TABLE)
    
    print(f"Daily summary process complete for {summary_date}.")
