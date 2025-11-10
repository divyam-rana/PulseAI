import functions_framework
from google.cloud import bigquery
from datetime import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
source_dataset = 'raw_reddit'
target_dataset = 'pulseai_main_db'

@functions_framework.http
def task(request):
    
    # instantiate BigQuery client
    client = bigquery.Client(project=project_id)
    
    print("Starting Reddit transformation to fact and dimension tables...")
    
    try:
        ##################################################### Transform AUTHORS dimension
        
        # Get distinct authors from raw_reddit.posts with proper surrogate keys
        authors_query = f"""
        MERGE `{project_id}.{target_dataset}.authors` AS target
        USING (
            SELECT 
                author_bk,
                (SELECT COALESCE(MAX(author_sk), 0) FROM `{project_id}.{target_dataset}.authors`) + 
                ROW_NUMBER() OVER (ORDER BY author_bk) AS author_sk
            FROM (
                SELECT DISTINCT author AS author_bk
                FROM `{project_id}.{source_dataset}.posts`
                WHERE author IS NOT NULL
            )
        ) AS source
        ON target.author_bk = source.author_bk
        WHEN NOT MATCHED THEN
            INSERT (author_sk, author_bk, _loaded_at)
            VALUES (
                source.author_sk,
                source.author_bk,
                CURRENT_TIMESTAMP()
            )
        """
        
        print("Executing AUTHORS dimension merge...")
        query_job = client.query(authors_query)
        query_job.result()
        print(f"AUTHORS dimension updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        ##################################################### Transform CALENDAR_DATE dimension
        
        # Get distinct dates from raw_reddit.posts
        calendar_date_query = f"""
        MERGE `{project_id}.{target_dataset}.calendar_date` AS target
        USING (
            SELECT DISTINCT
                CAST(FORMAT_TIMESTAMP('%Y%m%d', created_utc) AS INT64) AS date_sk,
                EXTRACT(YEAR FROM created_utc) AS year,
                EXTRACT(QUARTER FROM created_utc) AS quarter,
                EXTRACT(MONTH FROM created_utc) AS month,
                EXTRACT(DAY FROM created_utc) AS day,
                FORMAT_TIMESTAMP('%A', created_utc) AS weekday_name,
                EXTRACT(ISOWEEK FROM created_utc) AS iso_week
            FROM `{project_id}.{source_dataset}.posts`
            WHERE created_utc IS NOT NULL
        ) AS source
        ON target.date_sk = source.date_sk
        WHEN NOT MATCHED THEN
            INSERT (date_sk, year, quarter, month, day, weekday_name, iso_week, _loaded_at)
            VALUES (
                source.date_sk,
                source.year,
                source.quarter,
                source.month,
                source.day,
                source.weekday_name,
                source.iso_week,
                CURRENT_TIMESTAMP()
            )
        """
        
        print("Executing CALENDAR_DATE dimension merge...")
        query_job = client.query(calendar_date_query)
        query_job.result()
        print(f"CALENDAR_DATE dimension updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        ##################################################### Transform REDDIT_POSTS fact
        
        # FIXED: Handle duplicate post_ids in raw data by keeping the most recent version
        reddit_posts_query = f"""
        MERGE `{project_id}.{target_dataset}.reddit_posts` AS target
        USING (
            SELECT
                post_id,
                title,
                author_sk,
                date_sk,
                created_utc
            FROM (
                SELECT
                    p.id AS post_id,
                    p.title,
                    a.author_sk,
                    CAST(FORMAT_TIMESTAMP('%Y%m%d', p.created_utc) AS INT64) AS date_sk,
                    p.created_utc,
                    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY p.ingest_timestamp DESC) AS rn
                FROM `{project_id}.{source_dataset}.posts` p
                LEFT JOIN `{project_id}.{target_dataset}.authors` a
                    ON p.author = a.author_bk
                WHERE p.id IS NOT NULL
            )
            WHERE rn = 1
        ) AS source
        ON target.post_id = source.post_id
        WHEN NOT MATCHED THEN
            INSERT (post_id, title, author_sk, date_sk, created_utc, _loaded_at)
            VALUES (
                source.post_id,
                source.title,
                source.author_sk,
                source.date_sk,
                source.created_utc,
                CURRENT_TIMESTAMP()
            )
        WHEN MATCHED THEN
            UPDATE SET
                target.title = source.title,
                target.author_sk = source.author_sk,
                target.date_sk = source.date_sk,
                target.created_utc = source.created_utc,
                target._loaded_at = CURRENT_TIMESTAMP()
        """
        
        print("Executing REDDIT_POSTS fact merge...")
        query_job = client.query(reddit_posts_query)
        query_job.result()
        print(f"REDDIT_POSTS fact updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        return {
            "source": f"{source_dataset}.posts",
            "target_dimensions": ["authors", "calendar_date"],
            "target_fact": "reddit_posts",
            "status": "success"
        }, 200
        
    except Exception as e:
        print(f"Error during Reddit transformation: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "status": "failed"
        }, 500