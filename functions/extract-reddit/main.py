import functions_framework
from google.cloud import storage
from google.cloud import secretmanager
import praw
import json
import datetime
import uuid

# settings
project_id = 'pulseai-team3-ba882-fall25'
secret_id = 'REDDIT_API_KEY'
version_id = 'latest'
bucket_name = 'pulse-ai-data-bucket'

# Reddit settings
DEFAULT_SUBREDDIT = 'MachineLearning'

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


def fetch_reddit_posts(reddit_creds, subreddit, limit=100, time_filter='week'):
    """
    Fetches Reddit posts from a given subreddit using the official Reddit API.
    
    Args:
        reddit_creds: Dictionary with client_id, client_secret, user_agent
        subreddit: Name of the subreddit (without 'r/')
        limit: Number of posts to fetch
        time_filter: Time filter for 'top' posts (hour, day, week, month, year, all)
    """
    print(f"Fetching posts from r/{subreddit} using Reddit API...")
    
    try:
        # Initialize Reddit API client
        reddit = praw.Reddit(
            client_id=reddit_creds['client_id'],
            client_secret=reddit_creds['client_secret'],
            user_agent=reddit_creds['user_agent']
        )
        
        # Get the subreddit
        subreddit_obj = reddit.subreddit(subreddit)
        
        # Fetch posts (using 'new' by default, can be changed to 'hot', 'top', etc.)
        posts = []
        for submission in subreddit_obj.new(limit=limit):
            posts.append({
                "id": submission.id,
                "title": submission.title,
                "author": str(submission.author) if submission.author else "Unknown",
                "score": submission.score,
                "upvote_ratio": submission.upvote_ratio,
                "num_comments": submission.num_comments,
                "created_utc": submission.created_utc,
                "url": submission.url,
                "permalink": f"https://www.reddit.com{submission.permalink}",
                "selftext": submission.selftext,
                "subreddit": submission.subreddit.display_name,
                "is_self": submission.is_self,
                "link_flair_text": submission.link_flair_text,
                "over_18": submission.over_18,
                "spoiler": submission.spoiler,
                "stickied": submission.stickied
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
    time_filter = request.args.get("time_filter", "week")

    # get Reddit credentials from Secret Manager
    try:
        reddit_creds_json = access_secret_version(project_id, secret_id, version_id)
        reddit_creds = json.loads(reddit_creds_json)
    except Exception as e:
        return {
            "error": f"Failed to access Reddit credentials: {str(e)}",
            "run_id": run_id,
        }, 500

    # get the data
    posts = fetch_reddit_posts(reddit_creds, subreddit, limit=limit, time_filter=time_filter)

    # handle cases where there are no posts found
    if len(posts) == 0:
        print("no posts to process ============================")
        return {
            "num_entries": 0,
            "run_id": run_id,
        }, 200

    # add ingest timestamp to each post
    ingest_timestamp = datetime.datetime.utcnow().isoformat()
    for post in posts:
        post['ingest_timestamp'] = ingest_timestamp

    # otherwise, process the data and save the artifact to GCS
    j_string = json.dumps(posts)
    _path = f"raw/reddit"
    gcs_path = upload_to_gcs(bucket_name, path=_path, run_id=run_id, data=j_string)

    # return the metadata
    return {
        "num_entries": len(posts),
        "run_id": run_id,
        "subreddit": subreddit,
        "bucket_name": gcs_path.get('bucket_name'),
        "blob_name": gcs_path.get('blob_name')
    }, 200
