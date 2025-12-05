import json
from datetime import datetime, timedelta, timezone

import functions_framework
from google.cloud import bigquery

PROJECT_ID = "pulseai-team3-ba882-fall25"
LOCATION = "us-central1"

DATASET = "pulseai_main_db"
SOURCE_TABLE = f"{PROJECT_ID}.{DATASET}.reddit_posts_tagged"
SUMMARY_TABLE = f"{PROJECT_ID}.{DATASET}.reddit_tag_summaries"

bq = bigquery.Client()


@functions_framework.http
def summarize_reddit_by_tag(request):
    import vertexai
    from vertexai.generative_models import GenerativeModel
    
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel("gemini-2.5-flash")
    
    try:
        body = request.get_json(silent=True) or {}
        days = int(body.get("days", 7))

        end_ts = datetime.now(timezone.utc)
        start_ts = end_ts - timedelta(days=days)

        query = f"""
        WITH recent AS (
          SELECT post_id, title, tags, created_utc
          FROM `{SOURCE_TABLE}`
          WHERE created_utc BETWEEN @start_ts AND @end_ts
        )
        SELECT
          tag,
          ARRAY_AGG(
            STRUCT(
              post_id,
              title,
              created_utc
            )
            ORDER BY created_utc DESC
            LIMIT 50
          ) AS posts
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

        for row in rows:
            tag = row["tag"]
            posts = row["posts"]

            if not posts:
                continue

            text_blocks = []
            fallback_sources = []

            for p in posts:
                post_id = p["post_id"]
                title = p["title"] or ""

                text_blocks.append(
                    f"post_id: {post_id}\n"
                    f"title: {title}\n"
                )

                fallback_sources.append({
                    "post_id": post_id,
                    "title": title
                })

            posts_block = "\n\n".join(text_blocks)

            prompt = f"""
You summarize Reddit posts from Machine Learning and Artificial Intelligence communities.

Tag: {tag}
Window: {start_ts.isoformat()} - {end_ts.isoformat()}

Given these posts, produce:

1. high_level_summary: A concise 2-3 sentence overview as a single string.
2. detailed_summary: A detailed summary as a single string with bullet points referencing post_id where relevant.
3. sources: list of objects with (post_id, title)

Return ONLY valid JSON with keys: high_level_summary, detailed_summary, sources.
Both high_level_summary and detailed_summary must be strings, not arrays.

Posts:
{posts_block}
""".strip()

            response = model.generate_content(prompt)
            raw = response.text

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
                parsed = {
                    "high_level_summary": "",
                    "detailed_summary": raw,
                    "sources": fallback_sources,
                }

            # Ensure summaries are strings, not arrays
            high_level = parsed.get("high_level_summary", "")
            if isinstance(high_level, list):
                high_level = "\n".join(str(item) for item in high_level)
            
            detailed = parsed.get("detailed_summary", "")
            if isinstance(detailed, list):
                detailed = "\n".join(str(item) for item in detailed)

            out_rows.append({
                "tag": tag,
                "window_start": start_ts.isoformat(),
                "window_end": end_ts.isoformat(),
                "high_level_summary": high_level,
                "detailed_summary": detailed,
                "sources": parsed.get("sources", fallback_sources),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        errors = bq.insert_rows_json(SUMMARY_TABLE, out_rows)
        if errors:
            return {"status": "bq_error", "errors": errors}, 500

        return {"status": "ok", "count": len(out_rows)}, 200

    except Exception as e:
        return {"error": str(e)}, 500