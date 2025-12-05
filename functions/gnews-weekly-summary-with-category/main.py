import json
from datetime import datetime, timedelta, timezone

import functions_framework
import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import bigquery

# ----------------- Basic Configuration -----------------
PROJECT_ID = "pulseai-team3-ba882-fall25"
LOCATION = "us-central1"
DATASET = "pulseai_main_db"

# Input: the tagged news table
SOURCE_TABLE = f"{PROJECT_ID}.{DATASET}.news_articles_tagged"

# Output: summary table (schema similar to arxiv_tag_summaries)
# Recommended fields:
#   tag STRING
#   window_start TIMESTAMP
#   window_end TIMESTAMP
#   high_level_summary STRING
#   detailed_summary STRING
#   sources ARRAY<STRUCT<article_id STRING, title STRING>>
#   created_at TIMESTAMP
SUMMARY_TABLE = f"{PROJECT_ID}.{DATASET}.news_tagged_summaries"

vertexai.init(project=PROJECT_ID, location=LOCATION)
model = GenerativeModel("gemini-2.5-flash")
bq = bigquery.Client()


@functions_framework.http
def summarize_news_by_tag(request):
    """
    HTTP-triggered Cloud Function:

    By default:
        Summarizes the last 7 days of data in `news_articles_tagged`,
        grouped by tag, and writes results into `news_tagged_summaries`.

    Optional:
        You can pass {"days": 3} in the request body to change the window size.
    """
    try:
        body = request.get_json(silent=True) or {}
        days = int(body.get("days", 7))

        end_ts = datetime.now(timezone.utc)
        start_ts = end_ts - timedelta(days=days)

        # -------- 1. Query recent news from BigQuery, grouped by tag --------
        query = f"""
        WITH recent AS (
          SELECT
            id,
            title,
            description,
            content,
            tags,
            published_at
          FROM `{SOURCE_TABLE}`
          WHERE published_at BETWEEN @start_ts AND @end_ts
        )
        SELECT
          tag,
          ARRAY_AGG(
            STRUCT(
              id AS article_id,
              title,
              published_at
            )
            ORDER BY published_at DESC
            LIMIT 50
          ) AS articles
        FROM recent, UNNEST(tags) AS tag
        GROUP BY tag
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("start_ts", "TIMESTAMP", start_ts),
                bigquery.ScalarQueryParameter("end_ts", "TIMESTAMP", end_ts),
            ]
        )

        rows = list(bq.query(query, job_config=job_config).result())
        if not rows:
            return {"status": "no_data"}, 200

        out_rows = []

        # -------- 2. Generate summaries with Gemini for each tag --------
        for row in rows:
            tag = row["tag"]
            articles = row["articles"]

            if not articles:
                continue

            text_blocks = []
            fallback_sources = []

            for art in articles:
                article_id = art["article_id"]
                title = art["title"] or ""
                published_at = art["published_at"]

                text_blocks.append(
                    f"article_id: {article_id}\n"
                    f"title: {title}\n"
                    f"published_at: {published_at.isoformat()}\n"
                )

                # This structure must match the `sources` schema in BigQuery
                fallback_sources.append(
                    {
                        "article_id": article_id,
                        "title": title,
                    }
                )

            articles_block = "\n\n".join(text_blocks)

            prompt = f"""
You are summarizing AI and technology news articles.

Tag: {tag}
Window: {start_ts.isoformat()} – {end_ts.isoformat()}

Given these articles, produce:
1. high_level_summary: A concise 2–3 sentence overview of the main themes and trends for this tag.
2. detailed_summary: A more detailed summary that may reference article_id where relevant.
3. sources: list of objects with (article_id, title).

Return ONLY valid JSON with keys: high_level_summary, detailed_summary, sources.

Articles:
{articles_block}
""".strip()

            response = model.generate_content(prompt)
            raw = response.text

            # -------- 3. Parse Gemini JSON output; fall back if invalid --------
            try:
                cleaned = raw.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]

                parsed = json.loads(cleaned.strip())
            except Exception:
                # If Gemini returns malformed JSON, store raw text as detailed summary
                parsed = {
                    "high_level_summary": "",
                    "detailed_summary": raw,
                    "sources": fallback_sources,
                }

            out_rows.append(
                {
                    "tag": tag,
                    "window_start": start_ts.isoformat(),
                    "window_end": end_ts.isoformat(),
                    "high_level_summary": parsed.get("high_level_summary", ""),
                    "detailed_summary": parsed.get("detailed_summary", ""),
                    "sources": parsed.get("sources", fallback_sources),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )

        # -------- 4. Insert results into BigQuery: news_tagged_summaries --------
        errors = bq.insert_rows_json(SUMMARY_TABLE, out_rows)
        if errors:
            return {"status": "bq_error", "errors": errors}, 500

        return {"status": "ok", "count": len(out_rows)}, 200

    except Exception as e:
        return {"error": str(e)}, 500