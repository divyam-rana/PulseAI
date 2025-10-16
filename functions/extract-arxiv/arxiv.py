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

####################################################### helpers

def upload_to_gcs(bucket_name, path, run_id, data):
    """Uploads data to a Google Cloud Storage bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob_name = f"{path}/{run_id}/data.json"
    blob = bucket.blob(blob_name)

    # Upload the data (here it's a serialized string)
    blob.upload_from_string(data)
    print(f"File {blob_name} uploaded to {bucket_name}.")

    return {'bucket_name': bucket_name, 'blob_name': blob_name}


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
                'published_date': result.published.isoformat(),
                'updated_date': result.updated.isoformat(),
                'pdf_url': result.pdf_url,
                'primary_category': result.primary_category,
                'all_categories': result.categories,
                'doi': result.doi,
                'journal_ref': result.journal_ref,
                'comments': result.comment
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
        }, 200

    # otherwise, process the data and save the artifact to GCS
    j_string = json.dumps(papers_data)
    _path = f"raw/arxiv/date={yyyymmdd}"
    gcs_path = upload_to_gcs(bucket_name, path=_path, run_id=run_id, data=j_string)

    # return the metadata
    return {
        "num_entries": len(papers_data),
        "run_id": run_id,
        "bucket_name": gcs_path.get('bucket_name'),
        "blob_name": gcs_path.get('blob_name')
    }, 200
