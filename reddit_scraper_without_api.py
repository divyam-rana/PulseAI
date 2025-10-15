import requests
from bs4 import BeautifulSoup
import time
import pandas as pd

def scrape_reddit(subreddit, limit=10):
    """
    Scrapes Reddit posts from a given subreddit.
    Note: Reddit's structure changes frequently, so this may need updates.
    """
    url = f"https://www.reddit.com/r/{subreddit}/new/.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to fetch: {response.status_code}")
            return []
        
        data = response.json()
        posts = []
        
        for post_data in data['data']['children'][:limit]:
            post = post_data['data']
            posts.append({
                "title": post.get('title', 'No title'),
                "score": post.get('score', 0),
                "url": f"https://www.reddit.com{post.get('permalink', '')}",
                "author": post.get('author', 'Unknown'),
                "created_utc": post.get('created_utc', 0),
                "num_comments": post.get('num_comments', 0),
                "subreddit": post.get('subreddit', subreddit)
            })
        
        df = pd.DataFrame(posts)
        
        return posts, df
        
    except Exception as e:
        print(f"Error scraping Reddit: {e}")
        return []

posts, df = scrape_reddit("MachineLearning")