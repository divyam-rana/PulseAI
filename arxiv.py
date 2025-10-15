import arxiv
import datetime
import pandas as pd
import requests

def fetch_ai_papers_to_dataframe(days_ago=7, max_results=100):
    """
    Fetches extensive metadata for the latest AI-related papers from arXiv
    and returns it as a Pandas DataFrame.
    """
    print(f"🚀 Fetching metadata for the latest {max_results} AI papers from the last {days_ago} days...")

    # Calculate the date for one week ago from today
    one_week_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago)

    # Construct the search query for major AI categories
    query = "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV"

    # Create the search object
    search = arxiv.Search(
      query=query,
      max_results=max_results,
      sort_by=arxiv.SortCriterion.SubmittedDate,
      sort_order=arxiv.SortOrder.Descending
    )

    # List to hold the metadata for each paper
    papers_data = []

    # Iterate over the search results
    for result in search.results():
        # Check if the paper was published within the last week
        if result.published >= one_week_ago:

            # Extract core arXiv ID from the entry_id URL
            arxiv_id = result.entry_id.split('/')[-1]

            # Extract author names into a simple list
            author_names = [author.name for author in result.authors]

            # Create a dictionary with all the desired metadata
            paper_info = {
                'arxiv_id': arxiv_id,
                'title': result.title,
                'authors': author_names,
                'summary': result.summary,
                'published_date': result.published,
                'updated_date': result.updated,
                'pdf_url': result.pdf_url,
                'primary_category': result.primary_category,
                'all_categories': result.categories,
                'doi': result.doi,
                'journal_ref': result.journal_ref,
                'comments': result.comment
            }
            papers_data.append(paper_info)

    if not papers_data:
        print("No new papers found in the specified categories for the last week.")
        return None

    # Create a DataFrame from the list of dictionaries
    df = pd.DataFrame(papers_data)

    print(f"\n✅ Successfully collected metadata for {len(df)} papers.")
    return df

# df = fetch_ai_papers_to_dataframe(days_ago=7, max_results=100)



# import arxiv
# import datetime
# import pandas as pd
# import requests
# ... (rest of your imports)
from google.cloud import storage # Import the GCS client

# Define your target bucket and folder
GCS_BUCKET = "pulse-ai-data-bucket"
GCS_FOLDER = "raw/arxiv/"

def upload_dataframe_to_gcs(df: pd.DataFrame, execution_date: str):
    """Saves the DataFrame to a GCS bucket as a Parquet file."""

    # 1. Define the target filename using the execution date for organization
    filename = f"arxiv_papers_{execution_date}.parquet"
    gcs_path = f"gs://{GCS_BUCKET}/{GCS_FOLDER}{filename}"

    print(f"📦 Attempting to save data to {gcs_path}")

    # 2. Use Pandas to directly write to GCS (requires gcsfs dependency)
    try:
        df.to_parquet(gcs_path, index=False)
        print("✅ Data successfully uploaded to GCS.")
    except Exception as e:
        print(f"❌ Failed to upload data to GCS: {e}")
        raise # Re-raise the exception to fail the Airflow task

# Example of how the execution would work in your DAG-triggered Cloud Function:
# (assuming the Cloud Function is triggered with a payload including 'execution_date')

df = fetch_ai_papers_to_dataframe(days_ago=7, max_results=100)

# if df is not None:
    # Use Airflow's execution date macro (e.g., ds) here
#    upload_dataframe_to_gcs(df, ds) # Replace with the actual execution date variable
