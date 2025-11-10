import functions_framework
from google.cloud import bigquery
from datetime import datetime

# settings
project_id = 'pulseai-team3-ba882-fall25'
source_dataset = 'raw_arxiv'
target_dataset = 'pulseai_main_db'

@functions_framework.http
def task(request):
    
    # instantiate BigQuery client
    client = bigquery.Client(project=project_id)
    
    print("Starting arXiv transformation to fact and dimension tables...")
    
    try:
        ##################################################### Transform AUTHORS dimension
        
        # Get distinct authors from raw_arxiv.papers (UNNEST the repeated authors field)
        authors_query = f"""
        MERGE `{project_id}.{target_dataset}.authors` AS target
        USING (
            SELECT 
                author_bk,
                (SELECT COALESCE(MAX(author_sk), 0) FROM `{project_id}.{target_dataset}.authors`) + 
                ROW_NUMBER() OVER (ORDER BY author_bk) AS author_sk
            FROM (
                SELECT DISTINCT author AS author_bk
                FROM `{project_id}.{source_dataset}.papers`,
                UNNEST(authors) AS author
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
        
        print("Executing AUTHORS dimension merge (from arXiv)...")
        query_job = client.query(authors_query)
        query_job.result()
        print(f"AUTHORS dimension updated with arXiv authors. Rows modified: {query_job.num_dml_affected_rows}")
        
        ##################################################### Transform ARXIV_CATEGORIES dimension
        
        # Get distinct categories from raw_arxiv.papers
        arxiv_categories_query = f"""
        MERGE `{project_id}.{target_dataset}.arxiv_categories` AS target
        USING (
            SELECT 
                category_bk,
                (SELECT COALESCE(MAX(category_sk), 0) FROM `{project_id}.{target_dataset}.arxiv_categories`) + 
                ROW_NUMBER() OVER (ORDER BY category_bk) AS category_sk
            FROM (
                SELECT DISTINCT primary_category AS category_bk
                FROM `{project_id}.{source_dataset}.papers`
                WHERE primary_category IS NOT NULL
                
                UNION DISTINCT
                
                SELECT DISTINCT category AS category_bk
                FROM `{project_id}.{source_dataset}.papers`,
                UNNEST(all_categories) AS category
                WHERE category IS NOT NULL
            )
        ) AS source
        ON target.category_bk = source.category_bk
        WHEN NOT MATCHED THEN
            INSERT (category_sk, category_bk, _loaded_at)
            VALUES (
                source.category_sk,
                source.category_bk,
                CURRENT_TIMESTAMP()
            )
        """
        
        print("Executing ARXIV_CATEGORIES dimension merge...")
        query_job = client.query(arxiv_categories_query)
        query_job.result()
        print(f"ARXIV_CATEGORIES dimension updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        ##################################################### Transform ARXIV_PAPERS fact
        
        arxiv_papers_query = f"""
        MERGE `{project_id}.{target_dataset}.arxiv_papers` AS target
        USING (
            SELECT
                p.arxiv_id AS paper_id,
                p.title,
                p.summary AS abstract,
                ac.category_sk,
                p.published_date AS published_at,
                p.updated_date AS updated_at
            FROM `{project_id}.{source_dataset}.papers` p
            LEFT JOIN `{project_id}.{target_dataset}.arxiv_categories` ac
                ON p.primary_category = ac.category_bk
            WHERE p.arxiv_id IS NOT NULL
        ) AS source
        ON target.paper_id = source.paper_id
        WHEN NOT MATCHED THEN
            INSERT (paper_id, title, abstract, category_sk, published_at, updated_at, _loaded_at)
            VALUES (
                source.paper_id,
                source.title,
                source.abstract,
                source.category_sk,
                source.published_at,
                source.updated_at,
                CURRENT_TIMESTAMP()
            )
        WHEN MATCHED THEN
            UPDATE SET
                target.title = source.title,
                target.abstract = source.abstract,
                target.category_sk = source.category_sk,
                target.published_at = source.published_at,
                target.updated_at = source.updated_at,
                target._loaded_at = CURRENT_TIMESTAMP()
        """
        
        print("Executing ARXIV_PAPERS fact merge...")
        query_job = client.query(arxiv_papers_query)
        query_job.result()
        print(f"ARXIV_PAPERS fact updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        ##################################################### Transform PAPER_AUTHORS bridge table
        
        # Create many-to-many relationship between papers and authors
        # FIXED: Handle duplicate authors in the same paper
        paper_authors_query = f"""
        MERGE `{project_id}.{target_dataset}.paper_authors` AS target
        USING (
            SELECT
                paper_id,
                author_sk,
                MIN(author_position) AS author_position
            FROM (
                SELECT
                    p.arxiv_id AS paper_id,
                    a.author_sk,
                    author_position + 1 AS author_position
                FROM `{project_id}.{source_dataset}.papers` p,
                UNNEST(p.authors) AS author_name WITH OFFSET AS author_position
                LEFT JOIN `{project_id}.{target_dataset}.authors` a
                    ON author_name = a.author_bk
                WHERE p.arxiv_id IS NOT NULL AND a.author_sk IS NOT NULL
            )
            GROUP BY paper_id, author_sk
        ) AS source
        ON target.paper_id = source.paper_id 
           AND target.author_sk = source.author_sk
        WHEN NOT MATCHED THEN
            INSERT (paper_id, author_sk, author_position, _loaded_at)
            VALUES (
                source.paper_id,
                source.author_sk,
                source.author_position,
                CURRENT_TIMESTAMP()
            )
        WHEN MATCHED THEN
            UPDATE SET
                target.author_position = source.author_position,
                target._loaded_at = CURRENT_TIMESTAMP()
        """
        
        print("Executing PAPER_AUTHORS bridge table merge...")
        query_job = client.query(paper_authors_query)
        query_job.result()
        print(f"PAPER_AUTHORS bridge table updated. Rows modified: {query_job.num_dml_affected_rows}")
        
        return {
            "source": f"{source_dataset}.papers",
            "target_dimensions": ["authors", "arxiv_categories"],
            "target_fact": "arxiv_papers",
            "target_bridge": "paper_authors",
            "status": "success"
        }, 200
        
    except Exception as e:
        print(f"Error during arXiv transformation: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "status": "failed"
        }, 500