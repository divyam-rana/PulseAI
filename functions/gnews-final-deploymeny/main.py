import functions_framework
import os
import requests
from datetime import datetime, timedelta, timezone
from flask import jsonify

QUERY = '(AI OR "artificial intelligence")'
LANG = "en"
COUNTRY = "us"
LIMIT_TOTAL = 100
DAYS_BACK = 7
SORT_BY = "publishedAt"
BASE = "https://gnews.io/api/v4/search"


def rfc3339(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@functions_framework.http
def fetch_articles(request):
    """HTTP Cloud Function to fetch recent AI-related articles."""
    GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")
    if not GNEWS_API_KEY:
        return jsonify({"error": "Missing GNEWS_API_KEY environment variable"}), 500

    to_dt = datetime.now(timezone.utc)
    from_dt = to_dt - timedelta(days=DAYS_BACK)
    FROM, TO = rfc3339(from_dt), rfc3339(to_dt)

    params = {
        "q": QUERY,
        "lang": LANG,
        "country": COUNTRY,
        "from": FROM,
        "to": TO,
        "sortby": SORT_BY,
        "max": LIMIT_TOTAL,
        "token": GNEWS_API_KEY,
    }

    try:
        resp = requests.get(BASE, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return jsonify({"articles": data.get("articles", [])}), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500