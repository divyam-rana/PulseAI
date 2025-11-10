import functions_framework
from google.cloud import bigquery
from datetime import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
source_dataset = 'raw_gnews'
target_dataset = 'pulseai_main_db'

@functions_framework.http
def task(request):
    
    # instantiate BigQuery client
    client = bigquery.Client(project=project_id)
    
    print("Starting GNews transformation to fact and dimension tables...")
    
    try:
        ##################################################### Transform NEWS_SOURCES dimension
        
        # Get distinct sources from raw_gnews.articles with proper surrogate keys
        news_sources_query = f"""
        MERGE `{project_id}.{target_dataset}.news_sources` AS target
        USING (
            SELECT 
                source_bk,
                (SELECT COALESCE(MAX(source_sk), 0) FROM `{project_id}.{target_dataset}.news_sources`) + 
                ROW_NUMBER() OVER (ORDER BY source_bk) AS source_sk
            FROM (
                SELECT DISTINCT source.name AS source_bk
                FROM `{project_id}.{source_dataset}.articles`
                WHERE source.name IS NOT NULL
            )
        ) AS source
        ON target.source_bk = source.source_bk
        WHEN NOT MATCHED THEN
            INSERT (source_sk, source_bk, _loaded_at)
            VALUES (
                source.source_sk,
                source.source_bk,
                CURRENT_TIMESTAMP()
            )
        """
        
        print("Executing NEWS_SOURCES dimension merge...")
        query_job = client.query(news_sources_query)
        query_job.result()
        print(f"NEWS_SOURCES dimension updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        ##################################################### Transform NEWS_ARTICLES fact
        
        news_articles_query = f"""
        MERGE `{project_id}.{target_dataset}.news_articles` AS target
        USING (
            SELECT
                a.title,
                a.description,
                a.content,
                a.url,
                a.image,
                ns.source_sk,
                a.published_at
            FROM `{project_id}.{source_dataset}.articles` a
            LEFT JOIN `{project_id}.{target_dataset}.news_sources` ns
                ON a.source.name = ns.source_bk
            WHERE a.url IS NOT NULL
        ) AS source
        ON target.url = source.url
        WHEN NOT MATCHED THEN
            INSERT (title, description, content, url, image, source_sk, published_at, _loaded_at)
            VALUES (
                source.title,
                source.description,
                source.content,
                source.url,
                source.image,
                source.source_sk,
                source.published_at,
                CURRENT_TIMESTAMP()
            )
        WHEN MATCHED THEN
            UPDATE SET
                target.title = source.title,
                target.description = source.description,
                target.content = source.content,
                target.image = source.image,
                target.source_sk = source.source_sk,
                target.published_at = source.published_at,
                target._loaded_at = CURRENT_TIMESTAMP()
        """
        
        print("Executing NEWS_ARTICLES fact merge...")
        query_job = client.query(news_articles_query)
        query_job.result()
        print(f"NEWS_ARTICLES fact updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        return {
            "source": f"{source_dataset}.articles",
            "target_dimension": "news_sources",
            "target_fact": "news_articles",
            "status": "success"
        }, 200
        
    except Exception as e:
        print(f"Error during GNews transformation: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "status": "failed"
        }, 500