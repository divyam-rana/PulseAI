import functions_framework
from google.cloud import bigquery

# settings
project_id = 'pulseai-team3-ba882-fall25'
dataset_id = 'pulseai_main_db'

@functions_framework.http
def task(request):
    
    # instantiate BigQuery client
    client = bigquery.Client(project=project_id)
    
    ##################################################### create the dataset
    
    # create dataset if it doesn't exist
    dataset_ref = f"{project_id}.{dataset_id}"
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "US"
    
    try:
        dataset = client.create_dataset(dataset, exists_ok=True)
        print(f"Dataset {dataset_id} created or already exists")
    except Exception as e:
        print(f"Error creating dataset: {e}")
        return {"error": str(e)}, 500
    
    ##################################################### create dimension tables
    
    # NEWS_SOURCES dimension table
    news_sources_table_id = f"{project_id}.{dataset_id}.news_sources"
    news_sources_schema = [
        bigquery.SchemaField("source_sk", "INTEGER", mode="REQUIRED",
                           description="Surrogate key for news source"),
        bigquery.SchemaField("source_bk", "STRING", mode="NULLABLE",
                           description="Business key - source name/identifier"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When dimension record was loaded"),
    ]
    
    news_sources_table = bigquery.Table(news_sources_table_id, schema=news_sources_schema)
    
    try:
        news_sources_table = client.create_table(news_sources_table, exists_ok=True)
        print(f"Table {news_sources_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating news_sources table: {e}")
        return {"error": str(e)}, 500
    
    # AUTHORS dimension table
    authors_table_id = f"{project_id}.{dataset_id}.authors"
    authors_schema = [
        bigquery.SchemaField("author_sk", "INTEGER", mode="REQUIRED",
                           description="Surrogate key for author"),
        bigquery.SchemaField("author_bk", "STRING", mode="NULLABLE",
                           description="Business key - author name/identifier"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When dimension record was loaded"),
    ]
    
    authors_table = bigquery.Table(authors_table_id, schema=authors_schema)
    
    try:
        authors_table = client.create_table(authors_table, exists_ok=True)
        print(f"Table {authors_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating authors table: {e}")
        return {"error": str(e)}, 500
    
    # CALENDAR_DATE dimension table
    calendar_date_table_id = f"{project_id}.{dataset_id}.calendar_date"
    calendar_date_schema = [
        bigquery.SchemaField("date_sk", "INTEGER", mode="REQUIRED",
                           description="Surrogate key for date (YYYYMMDD format)"),
        bigquery.SchemaField("year", "INTEGER", mode="NULLABLE",
                           description="Year"),
        bigquery.SchemaField("quarter", "INTEGER", mode="NULLABLE",
                           description="Quarter (1-4)"),
        bigquery.SchemaField("month", "INTEGER", mode="NULLABLE",
                           description="Month (1-12)"),
        bigquery.SchemaField("day", "INTEGER", mode="NULLABLE",
                           description="Day of month"),
        bigquery.SchemaField("weekday_name", "STRING", mode="NULLABLE",
                           description="Name of weekday"),
        bigquery.SchemaField("iso_week", "INTEGER", mode="NULLABLE",
                           description="ISO week number"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When dimension record was loaded"),
    ]
    
    calendar_date_table = bigquery.Table(calendar_date_table_id, schema=calendar_date_schema)
    
    try:
        calendar_date_table = client.create_table(calendar_date_table, exists_ok=True)
        print(f"Table {calendar_date_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating calendar_date table: {e}")
        return {"error": str(e)}, 500
    
    # ARXIV_CATEGORIES dimension table
    arxiv_categories_table_id = f"{project_id}.{dataset_id}.arxiv_categories"
    arxiv_categories_schema = [
        bigquery.SchemaField("category_sk", "INTEGER", mode="REQUIRED",
                           description="Surrogate key for arXiv category"),
        bigquery.SchemaField("category_bk", "STRING", mode="NULLABLE",
                           description="Business key - category code (e.g., cs.AI)"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When dimension record was loaded"),
    ]
    
    arxiv_categories_table = bigquery.Table(arxiv_categories_table_id, schema=arxiv_categories_schema)
    
    try:
        arxiv_categories_table = client.create_table(arxiv_categories_table, exists_ok=True)
        print(f"Table {arxiv_categories_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating arxiv_categories table: {e}")
        return {"error": str(e)}, 500
    
    ##################################################### create fact tables
    
    # NEWS_ARTICLES fact table
    news_articles_table_id = f"{project_id}.{dataset_id}.news_articles"
    news_articles_schema = [
        bigquery.SchemaField("title", "STRING", mode="NULLABLE",
                           description="Article title"),
        bigquery.SchemaField("description", "STRING", mode="NULLABLE",
                           description="Article description"),
        bigquery.SchemaField("content", "STRING", mode="NULLABLE",
                           description="Article content"),
        bigquery.SchemaField("url", "STRING", mode="NULLABLE",
                           description="Article URL"),
        bigquery.SchemaField("image", "STRING", mode="NULLABLE",
                           description="Article image URL"),
        bigquery.SchemaField("source_sk", "INTEGER", mode="NULLABLE",
                           description="Foreign key to news_sources dimension"),
        bigquery.SchemaField("published_at", "TIMESTAMP", mode="NULLABLE",
                           description="Article publication timestamp"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When fact record was loaded"),
    ]
    
    news_articles_table = bigquery.Table(news_articles_table_id, schema=news_articles_schema)
    news_articles_table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="published_at"
    )
    
    try:
        news_articles_table = client.create_table(news_articles_table, exists_ok=True)
        print(f"Table {news_articles_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating news_articles table: {e}")
        return {"error": str(e)}, 500
    
    # REDDIT_POSTS fact table
    reddit_posts_table_id = f"{project_id}.{dataset_id}.reddit_posts"
    reddit_posts_schema = [
        bigquery.SchemaField("post_id", "STRING", mode="NULLABLE",
                           description="Reddit post ID"),
        bigquery.SchemaField("title", "STRING", mode="NULLABLE",
                           description="Post title"),
        bigquery.SchemaField("author_sk", "INTEGER", mode="NULLABLE",
                           description="Foreign key to authors dimension"),
        bigquery.SchemaField("date_sk", "INTEGER", mode="NULLABLE",
                           description="Foreign key to calendar_date dimension"),
        bigquery.SchemaField("created_utc", "TIMESTAMP", mode="NULLABLE",
                           description="Post creation timestamp"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When fact record was loaded"),
    ]
    
    reddit_posts_table = bigquery.Table(reddit_posts_table_id, schema=reddit_posts_schema)
    reddit_posts_table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="created_utc"
    )
    
    try:
        reddit_posts_table = client.create_table(reddit_posts_table, exists_ok=True)
        print(f"Table {reddit_posts_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating reddit_posts table: {e}")
        return {"error": str(e)}, 500
    
    # ARXIV_PAPERS fact table
    arxiv_papers_table_id = f"{project_id}.{dataset_id}.arxiv_papers"
    arxiv_papers_schema = [
        bigquery.SchemaField("paper_id", "STRING", mode="NULLABLE",
                           description="arXiv paper ID"),
        bigquery.SchemaField("title", "STRING", mode="NULLABLE",
                           description="Paper title"),
        bigquery.SchemaField("abstract", "STRING", mode="NULLABLE",
                           description="Paper abstract"),
        bigquery.SchemaField("category_sk", "INTEGER", mode="NULLABLE",
                           description="Foreign key to arxiv_categories dimension"),
        bigquery.SchemaField("published_at", "TIMESTAMP", mode="NULLABLE",
                           description="Paper publication timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE",
                           description="Paper update timestamp"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When fact record was loaded"),
    ]
    
    arxiv_papers_table = bigquery.Table(arxiv_papers_table_id, schema=arxiv_papers_schema)
    arxiv_papers_table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="published_at"
    )
    
    try:
        arxiv_papers_table = client.create_table(arxiv_papers_table, exists_ok=True)
        print(f"Table {arxiv_papers_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating arxiv_papers table: {e}")
        return {"error": str(e)}, 500
    
    ##################################################### create bridge tables
    
    # PAPER_AUTHORS bridge table (many-to-many between papers and authors)
    paper_authors_table_id = f"{project_id}.{dataset_id}.paper_authors"
    paper_authors_schema = [
        bigquery.SchemaField("paper_id", "STRING", mode="NULLABLE",
                           description="Foreign key to arxiv_papers fact"),
        bigquery.SchemaField("author_sk", "INTEGER", mode="NULLABLE",
                           description="Foreign key to authors dimension"),
        bigquery.SchemaField("author_position", "INTEGER", mode="NULLABLE",
                           description="Order of author in the paper's author list"),
        bigquery.SchemaField("_loaded_at", "TIMESTAMP", mode="NULLABLE",
                           description="When bridge record was loaded"),
    ]
    
    paper_authors_table = bigquery.Table(paper_authors_table_id, schema=paper_authors_schema)
    
    try:
        paper_authors_table = client.create_table(paper_authors_table, exists_ok=True)
        print(f"Table {paper_authors_table_id} created or already exists")
    except Exception as e:
        print(f"Error creating paper_authors table: {e}")
        return {"error": str(e)}, 500
    
    return {
        "dataset": dataset_id,
        "dimension_tables": ["news_sources", "authors", "calendar_date", "arxiv_categories"],
        "fact_tables": ["news_articles", "reddit_posts", "arxiv_papers"],
        "bridge_tables": ["paper_authors"],
        "status": "success"
    }, 200