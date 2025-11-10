import functions_framework
from google.cloud import storage
import praw
import json
import datetime
import uuid
import os

# settings
bucket_name = 'pulse-ai-data-bucket'
aggregated_file_path = "raw/reddit/aggregated_posts.json"

# Reddit settings
DEFAULT_SUBREDDIT = 'MachineLearning'

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


def convert_timestamp_to_bigquery_format(timestamp_value):
    """Convert Unix timestamp to BigQuery TIMESTAMP format."""
    if not timestamp_value:
        return None
    
    try:
        # Convert Unix timestamp to datetime
        dt = datetime.datetime.utcfromtimestamp(float(timestamp_value))
        
        # Convert to BigQuery format (YYYY-MM-DD HH:MM:SS.ffffff)
        return dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    except Exception as e:
        print(f"Error converting timestamp {timestamp_value}: {e}")
        return None


def fetch_reddit_posts(client_id, client_secret, user_agent, subreddit, limit=100):
    """
    Fetches Reddit posts from a given subreddit using the official Reddit API.
    
    Args:
        client_id: Reddit API client ID
        client_secret: Reddit API client secret
        user_agent: User agent string for Reddit API
        subreddit: Name of the subreddit (without 'r/')
        limit: Number of posts to fetch
    """
    print(f"Fetching posts from r/{subreddit} using Reddit API...")
    
    try:
        # Initialize Reddit API client
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent="linux:pulse-ai-reddit-extractor:1.0 (by /u/Total_Commission_930)"
        )
        
        # Get the subreddit
        subreddit_obj = reddit.subreddit(subreddit)
        
        # Fetch posts
        posts = []
        for submission in subreddit_obj.new(limit=limit):
            # Convert created_utc timestamp to BigQuery format
            created_utc_bq = convert_timestamp_to_bigquery_format(submission.created_utc)
            
            posts.append({
                "id": submission.id,
                "title": submission.title,
                "author": str(submission.author) if submission.author else "Unknown",
                "score": submission.score,
                "upvote_ratio": submission.upvote_ratio,
                "num_comments": submission.num_comments,
                "created_utc": created_utc_bq,
                "url": submission.url,
                "permalink": f"https://www.reddit.com{submission.permalink}",
                "selftext": submission.selftext,
                "subreddit": submission.subreddit.display_name,
                "is_self": submission.is_self,
                "link_flair_text": submission.link_flair_text,
                "over_18": submission.over_18,
                "spoiler": submission.spoiler,
                "stickied": submission.stickied,
                "ingest_timestamp": convert_timestamp_to_bigquery_format(datetime.datetime.utcnow().timestamp())
            })
        
        print(f"Successfully fetched {len(posts)} posts from r/{subreddit}.")
        return posts
        
    except Exception as e:
        print(f"Error fetching Reddit posts: {e}")
        raise

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
    subreddit = request.args.get("subreddit", DEFAULT_SUBREDDIT)
    limit = int(request.args.get("limit", 100))

    # get Reddit credentials from environment variables
    try:
        client_id = os.getenv('client_id')
        client_secret = os.getenv('client_secret')
        user_agent = "linux:pulse-ai-reddit-extractor:1.0 (by /u/Total_Commission_930)"
        
        if not client_id or not client_secret or not user_agent:
            return {
                "error": "Missing Reddit credentials in environment variables (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT)",
                "run_id": run_id,
            }, 500
    except Exception as e:
        return {
            "error": f"Failed to read Reddit credentials from environment: {str(e)}",
            "run_id": run_id,
        }, 500

    # get the data
    try:
        posts = fetch_reddit_posts(client_id, client_secret, user_agent, subreddit, limit=limit)
    except Exception as e:
        return {
            "error": f"Failed to fetch Reddit posts: {str(e)}",
            "run_id": run_id,
        }, 500

    # handle cases where there are no posts found
    if len(posts) == 0:
        print("no posts to process ============================")
        return {
            "num_entries": 0,
            "run_id": run_id,
            "message": "No posts found"
        }, 200

    # append data to aggregated file in GCS
    gcs_path = append_to_gcs(bucket_name, aggregated_file_path, posts)

    # return the metadata
    return {
        "num_new_entries": gcs_path.get('new_entries'),
        "total_entries": gcs_path.get('total_entries'),
        "run_id": run_id,
        "subreddit": subreddit,
        "bucket_name": gcs_path.get('bucket_name'),
        "blob_name": gcs_path.get('blob_name')
    }, 200