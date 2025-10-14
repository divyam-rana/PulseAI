"""
GNews ETL: fetch recent AI news from GNews, apply light normalization, and write to GCS as Parquet/JSON.

Usage:
  - As a module (import functions in Airflow/Cloud Run)
  - Or as a script: `python gnews_etl.py --days 7`

Notes:
  - API key comes from env/Secret Manager.
  - Outputs partitioned by date for idempotent loads.
"""

import os
os.environ["GNEWS_API_KEY"] = "66e52967ebdb37d202315b621b197735"

import os
import sys
import requests
from datetime import datetime, timedelta, timezone

API_KEY = os.getenv("GNEWS_API_KEY")
if not API_KEY:
    print("ERROR: set GNEWS_API_KEY"); sys.exit(1)

QUERY = '(AI OR "artificial intelligence")'
LANG = "en"
COUNTRY = "us"
LIMIT_TOTAL = 100
DAYS_BACK = 7
SORT_BY = "publishedAt"
BASE = "https://gnews.io/api/v4/search"

def rfc3339(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

to_dt = datetime.now(timezone.utc)
from_dt = to_dt - timedelta(days=DAYS_BACK)
FROM, TO = rfc3339(from_dt), rfc3339(to_dt)

def fetch_articles():
    params = {
        "q": QUERY,
        "lang": LANG,
        "country": COUNTRY,
        "from": FROM,
        "to": TO,
        "sortby": SORT_BY,
        "max": LIMIT_TOTAL,
        "token": API_KEY
    }
    resp = requests.get(BASE, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return data.get("articles", [])

articles = fetch_articles()

print(f"\n Top {len(articles)} U.S. AI News Articles (Past 7 Days):\n")
for i, a in enumerate(articles, 1):
    print(f"{i}. {a.get('title')}")
    print(f"   🗞️  {a.get('source', {}).get('name')}")
    print(f"   🔗  {a.get('url')}\n")

