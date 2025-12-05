import json
from datetime import datetime, timedelta, timezone

import functions_framework
import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import bigquery

PROJECT_ID = "pulseai-team3-ba882-fall25"
LOCATION = "us-central1"

DATASET = "pulseai_main_db"
SOURCE_TABLE = f"{PROJECT_ID}.{DATASET}.arxiv_papers_tagged"
SUMMARY_TABLE = f"{PROJECT_ID}.{DATASET}.arxiv_tag_summaries"

vertexai.init(project=PROJECT_ID, location=LOCATION)
model = GenerativeModel("gemini-2.5-flash")
bq = bigquery.Client()


@functions_framework.http
def summarize_arxiv_by_tag(request):
    try:
        body = request.get_json(silent=True) or {}
        days = int(body.get("days", 7))

        end_ts = datetime.now(timezone.utc)
        start_ts = end_ts - timedelta(days=days)

        query = f"""
        WITH recent AS (
          SELECT paper_id, title, abstract, tags, published_at
          FROM `{SOURCE_TABLE}`
          WHERE published_at BETWEEN @start_ts AND @end_ts
        )
        SELECT
          tag,
          ARRAY_AGG(
            STRUCT(
              paper_id,
              title,
              abstract,
              published_at
            )
            ORDER BY published_at DESC
            LIMIT 50
          ) AS papers
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
            papers = row["papers"]

            if not papers:
                continue

            text_blocks = []
            fallback_sources = []

            for p in papers:  # p is dict
                paper_id = p["paper_id"]
                title = p["title"] or ""
                abstract = p["abstract"] or ""

                text_blocks.append(
                    f"paper_id: {paper_id}\n"
                    f"title: {title}\n"
                    f"abstract: {abstract}\n"
                )

                fallback_sources.append({
                    "paper_id": paper_id,
                    "title": title
                })

            papers_block = "\n\n".join(text_blocks)

            prompt = f"""
You summarize arXiv research.

Tag: {tag}
Window: {start_ts.isoformat()} – {end_ts.isoformat()}

Given these papers, produce:

1. high_level_summary
2. detailed_summary with bullet points referencing paper_id
3. sources: list of (paper_id, title)

Return ONLY JSON.

Papers:
{papers_block}
""".strip()

            response = model.generate_content(prompt)
            raw = response.text

            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {
                    "high_level_summary": "",
                    "detailed_summary": raw,
                    "sources": fallback_sources,
                }

            # Convert timestamps → ISO8601 strings
            out_rows.append({
                "tag": tag,
                "window_start": start_ts.isoformat(),
                "window_end": end_ts.isoformat(),
                "high_level_summary": parsed.get("high_level_summary", ""),
                "detailed_summary": parsed.get("detailed_summary", ""),
                "sources": parsed.get("sources", fallback_sources),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        # Insert summaries into BigQuery
        errors = bq.insert_rows_json(SUMMARY_TABLE, out_rows)
        if errors:
            return {"status": "bq_error", "errors": errors}, 500

        return {"status": "ok", "count": len(out_rows)}, 200

    except Exception as e:
        return {"error": str(e)}, 500