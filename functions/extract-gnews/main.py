import functions_framework
from google.cloud import storage
from google.cloud import secretmanager
import requests
import json
import datetime
import uuid

# settings
project_id = 'pulseai-team3-ba882-fall25'
secret_id = 'GNEWS_API_KEY'
version_id = 'latest'
bucket_name = 'pulse-ai-data-bucket'

# GNews settings
QUERY = '(AI OR "artificial intelligence")'
LANG = "en"
COUNTRY = "us"
SORT_BY = "publishedAt"
BASE_URL = "https://gnews.io/api/v4/search"

####################################################### helpers

def access_secret_version(project_id, secret_id, version_id):
    """Access a secret version from Google Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")


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


def rfc3339(dt):
    """Convert datetime to RFC3339 format for GNews API."""
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_articles(api_key, days_back=7, max_results=100):
    """Fetch articles from GNews API."""
    to_dt = datetime.datetime.now(datetime.timezone.utc)
    from_dt = to_dt - datetime.timedelta(days=days_back)
    
    params = {
        "q": QUERY,
        "lang": LANG,
        "country": COUNTRY,
        "from": rfc3339(from_dt),
        "to": rfc3339(to_dt),
        "sortby": SORT_BY,
        "max": max_results,
        "token": api_key
    }
    
    print(f"Fetching articles from GNews API...")
    resp = requests.get(BASE_URL, params=params, timeout=20)
    resp.raise_for_status()
    print(f"requested url - status {resp.status_code}")
    data = resp.json()
    return data.get("articles", [])

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
    days_back = int(request.args.get("days_back", 7))
    max_results = int(request.args.get("max_results", 100))

    # get API key from Secret Manager
    try:
        api_key = access_secret_version(project_id, secret_id, version_id)
    except Exception as e:
        return {
            "error": f"Failed to access secret: {str(e)}",
            "run_id": run_id,
        }, 500

    # get the data
    articles = fetch_articles(api_key, days_back=days_back, max_results=max_results)

    # handle cases where there are no articles found
    if len(articles) == 0:
        print("no articles to process ============================")
        return {
            "num_entries": 0,
            "run_id": run_id,
        }, 200

    # add ingest timestamp to each article
    ingest_timestamp = datetime.datetime.utcnow().isoformat()
    for article in articles:
        article['ingest_timestamp'] = ingest_timestamp

    # otherwise, process the data and save the artifact to GCS
    j_string = json.dumps(articles)
    _path = f"raw/gnews"
    gcs_path = upload_to_gcs(bucket_name, path=_path, run_id=run_id, data=j_string)

    # return the metadata
    return {
        "num_entries": len(articles),
        "run_id": run_id,
        "bucket_name": gcs_path.get('bucket_name'),
        "blob_name": gcs_path.get('blob_name')
    }, 200