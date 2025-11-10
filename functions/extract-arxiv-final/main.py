import functions_framework
from google.cloud import storage
import arxiv
import datetime
import json
import uuid

# settings
project_id = 'pulseai-team3-ba882-fall25'
bucket_name = 'pulse-ai-data-bucket'
version_id = 'latest'
aggregated_file_path = "raw/arxiv/aggregated_papers.json"

####################################################### helpers

def read_existing_data(bucket_name, blob_path):
    """Reads existing JSON data from GCS, returns empty list if file doesn't exist."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    
    try:
        data = blob.download_as_string()
        return json.loads(data)
    except Exception as e:
        print(f"No existing file found or error reading: {e}. Starting with empty list.")
        return []


def append_to_gcs(bucket_name, blob_path, new_data):
    """Appends new data to an existing JSON file in GCS."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    
    # Read existing data
    existing_data = read_existing_data(bucket_name, blob_path)
    
    # Append new data
    existing_data.extend(new_data)
    
    # Write back to GCS
    json_string = json.dumps(existing_data)
    blob.upload_from_string(json_string)
    print(f"Successfully appended {len(new_data)} entries to {blob_path}. Total entries: {len(existing_data)}")
    
    return {
        'bucket_name': bucket_name,
        'blob_name': blob_path,
        'total_entries': len(existing_data),
        'new_entries': len(new_data)
    }


def convert_timestamp_to_bigquery_format(iso_timestamp):
    """Convert ISO format timestamp to BigQuery TIMESTAMP format."""
    if not iso_timestamp:
        return None
    
    try:
        # Parse ISO format timestamp (handle both with and without timezone)
        iso_timestamp_clean = iso_timestamp.replace('Z', '+00:00')
        dt = datetime.datetime.fromisoformat(iso_timestamp_clean)
        
        # Convert to BigQuery format (YYYY-MM-DD HH:MM:SS.ffffff)
        return dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    except Exception as e:
        print(f"Error converting timestamp {iso_timestamp}: {e}")
        return None


def fetch_ai_papers(days_ago=7, max_results=100):
    """
    Fetches extensive metadata for the latest AI-related papers from arXiv
    and returns it as a list of dictionaries.
    """
    print(f"Fetching metadata for the latest {max_results} AI papers from the last {days_ago} days...")

    # Calculate the date for filtering papers
    cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago)

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
        # Check if the paper was published within the specified timeframe
        if result.published >= cutoff_date:

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
                'published_date': convert_timestamp_to_bigquery_format(result.published.isoformat()),
                'updated_date': convert_timestamp_to_bigquery_format(result.updated.isoformat()),
                'pdf_url': result.pdf_url,
                'primary_category': result.primary_category,
                'all_categories': result.categories,
                'doi': result.doi,
                'journal_ref': result.journal_ref,
                'comments': result.comment,
                'ingest_timestamp': convert_timestamp_to_bigquery_format(datetime.datetime.utcnow().isoformat())
            }
            papers_data.append(paper_info)

    print(f"Successfully collected metadata for {len(papers_data)} papers.")
    return papers_data

####################################################### core task

@functions_framework.http
def task(request):
    # grab the date from query string (?date=YYYYMMDD)
    yyyymmdd = request.args.get("date")
    if not yyyymmdd:
        yyyymmdd = (datetime.datetime.utcnow() - datetime.timedelta(days=1)).strftime("%Y%m%d")
    print(f"date for the job: {yyyymmdd}")

    # grab the run id
    run_id = request.args.get("run_id")
    if not run_id:
        run_id = uuid.uuid4().hex[:12]
    print(f"run_id: {run_id}")

    # grab optional parameters
    days_ago = int(request.args.get("days_ago", 7))
    max_results = int(request.args.get("max_results", 100))

    # get the data
    papers_data = fetch_ai_papers(days_ago=days_ago, max_results=max_results)

    # handle cases where there are no papers found
    if len(papers_data) == 0:
        print("no papers to process ============================")
        return {
            "num_entries": 0,
            "run_id": run_id,
            "message": "No papers found"
        }, 200

    # append data to aggregated file in GCS
    gcs_path = append_to_gcs(bucket_name, aggregated_file_path, papers_data)

    # return the metadata
    return {
        "num_new_entries": gcs_path.get('new_entries'),
        "total_entries": gcs_path.get('total_entries'),
        "run_id": run_id,
        "bucket_name": gcs_path.get('bucket_name'),
        "blob_name": gcs_path.get('blob_name')
    }, 200