# generate-combined-newsletter/main.py

import json
from datetime import datetime, timedelta, timezone

import functions_framework
import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import bigquery

PROJECT_ID = "pulseai-team3-ba882-fall25"
LOCATION = "us-central1"

DATASET = "pulseai_main_db"

# Source tables
ARXIV_SUMMARY_TABLE = f"{PROJECT_ID}.{DATASET}.arxiv_tag_summaries"
GNEWS_SUMMARY_TABLE = f"{PROJECT_ID}.{DATASET}.news_tagged_summaries"
REDDIT_SUMMARY_TABLE = f"{PROJECT_ID}.{DATASET}.reddit_tag_summaries"

# Target table
COMBINED_TABLE = f"{PROJECT_ID}.{DATASET}.combined_newsletter"

vertexai.init(project=PROJECT_ID, location=LOCATION)
model = GenerativeModel("gemini-2.5-flash")
bq = bigquery.Client()


@functions_framework.http
def generate_combined_newsletter(request):
    """
    HTTP-triggered Cloud Function:

    By default:
        Merges summaries from arxiv_tag_summaries, news_tagged_summaries, and reddit_tag_summaries
        for the last 7 days, generates a combined summary using Gemini, and writes results
        to combined_newsletter table.

    Optional:
        You can pass {"days": 7} in the request body to change the window size.
    """
    try:
        body = request.get_json(silent=True) or {}
        days = int(body.get("days", 7))

        end_ts = datetime.now(timezone.utc)
        start_ts = end_ts - timedelta(days=days)

        print(f"Processing combined newsletter for window: {start_ts.isoformat()} to {end_ts.isoformat()}")

        # -------- 1. Query and merge summaries from all three sources --------
        # Full outer join on tag, window_start, window_end
        query = f"""
        WITH arxiv AS (
            SELECT
                tag,
                window_start,
                window_end,
                detailed_summary AS detailed_summary_arxiv
            FROM `{ARXIV_SUMMARY_TABLE}`
            WHERE window_start >= @start_ts AND window_end <= @end_ts
        ),
        gnews AS (
            SELECT
                tag,
                window_start,
                window_end,
                detailed_summary AS detailed_summary_gnews
            FROM `{GNEWS_SUMMARY_TABLE}`
            WHERE window_start >= @start_ts AND window_end <= @end_ts
        ),
        reddit AS (
            SELECT
                tag,
                window_start,
                window_end,
                detailed_summary AS detailed_summary_reddit
            FROM `{REDDIT_SUMMARY_TABLE}`
            WHERE window_start >= @start_ts AND window_end <= @end_ts
        )
        SELECT
            COALESCE(a.tag, g.tag, r.tag) AS tag,
            COALESCE(a.window_start, g.window_start, r.window_start) AS window_start,
            COALESCE(a.window_end, g.window_end, r.window_end) AS window_end,
            a.detailed_summary_arxiv,
            g.detailed_summary_gnews,
            r.detailed_summary_reddit
        FROM arxiv a
        FULL OUTER JOIN gnews g
            ON a.tag = g.tag
            AND a.window_start = g.window_start
            AND a.window_end = g.window_end
        FULL OUTER JOIN reddit r
            ON COALESCE(a.tag, g.tag) = r.tag
            AND COALESCE(a.window_start, g.window_start) = r.window_start
            AND COALESCE(a.window_end, g.window_end) = r.window_end
        ORDER BY tag, window_start
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("start_ts", "TIMESTAMP", start_ts),
                bigquery.ScalarQueryParameter("end_ts", "TIMESTAMP", end_ts),
            ]
        )

        print("Executing merge query across all three source tables...")
        rows = list(bq.query(query, job_config=job_config).result())
        
        if not rows:
            print("No data found in any source tables for the specified time window")
            return {"status": "no_data", "message": "No summaries found in source tables"}, 200

        print(f"Found {len(rows)} unique tag/window combinations to process")

        out_rows = []

        # -------- 2. Generate combined summaries with Gemini for each row --------
        for row in rows:
            tag = row["tag"]
            window_start = row["window_start"]
            window_end = row["window_end"]
            detailed_summary_arxiv = row["detailed_summary_arxiv"]
            detailed_summary_gnews = row["detailed_summary_gnews"]
            detailed_summary_reddit = row["detailed_summary_reddit"]

            print(f"Processing tag: {tag}, window: {window_start} to {window_end}")

            # Build source blocks for the prompt
            source_blocks = []
            sources_available = []

            if detailed_summary_arxiv:
                source_blocks.append(f"=== arXiv Research Papers ===\n{detailed_summary_arxiv}")
                sources_available.append("arXiv")
            else:
                source_blocks.append("=== arXiv Research Papers ===\nNo arXiv papers were available for this tag during this period.")

            if detailed_summary_gnews:
                source_blocks.append(f"=== News Articles ===\n{detailed_summary_gnews}")
                sources_available.append("News")
            else:
                source_blocks.append("=== News Articles ===\nNo news articles were available for this tag during this period.")

            if detailed_summary_reddit:
                source_blocks.append(f"=== Reddit Community Discussions ===\n{detailed_summary_reddit}")
                sources_available.append("Reddit")
            else:
                source_blocks.append("=== Reddit Community Discussions ===\nNo Reddit discussions were available for this tag during this period.")

            # Skip if no sources have data
            if not sources_available:
                print(f"Skipping tag {tag} - no source data available")
                continue

            sources_block = "\n\n".join(source_blocks)

            prompt = f"""
You are creating a unified newsletter summary that synthesizes insights from multiple sources about AI and technology.

Tag: {tag}
Time Window: {window_start.isoformat()} to {window_end.isoformat()}
Available Sources: {', '.join(sources_available) if sources_available else 'None'}

Given the summaries below from different sources, create a cohesive combined summary that:

1. Synthesizes insights across all available sources into a unified narrative
2. Identifies common themes and trends that appear across multiple sources
3. Highlights any divergent perspectives or unique insights from specific sources
4. Notes cross-source correlations (e.g., when news coverage aligns with research findings or community discussions)
5. Maintains clear attribution (indicate which insights come from research papers, news, or community discussions)
6. Acknowledges when sources are missing and focuses on available data
7. Provides actionable insights and key takeaways for readers

Source Summaries:
{sources_block}

Return ONLY valid JSON with a single key: combined_summary
The combined_summary should be a cohesive narrative paragraph or multiple paragraphs (as a single string), not a list or bullet points.
Do not include any markdown formatting or code blocks in your response.
""".strip()

            print(f"Generating combined summary for tag: {tag}")
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
            except Exception as parse_error:
                print(f"JSON parsing failed for tag {tag}: {parse_error}")
                # If Gemini returns malformed JSON, store raw text as combined summary
                parsed = {
                    "combined_summary": raw,
                }

            # Ensure combined_summary is a string
            combined_summary = parsed.get("combined_summary", "")
            if isinstance(combined_summary, list):
                combined_summary = "\n".join(str(item) for item in combined_summary)

            # Convert timestamps to ISO format strings for BigQuery insertion
            out_rows.append({
                "tag": tag,
                "window_start": window_start.isoformat() if hasattr(window_start, 'isoformat') else str(window_start),
                "window_end": window_end.isoformat() if hasattr(window_end, 'isoformat') else str(window_end),
                "detailed_summary_arxiv": detailed_summary_arxiv,
                "detailed_summary_gnews": detailed_summary_gnews,
                "detailed_summary_reddit": detailed_summary_reddit,
                "combined_summary": combined_summary,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            print(f"Successfully processed tag: {tag}")

        if not out_rows:
            print("No rows to insert after processing")
            return {"status": "no_data", "message": "No valid data to insert after processing"}, 200

        # -------- 4. Insert results into BigQuery: combined_newsletter --------
        print(f"Inserting {len(out_rows)} rows into {COMBINED_TABLE}")
        errors = bq.insert_rows_json(COMBINED_TABLE, out_rows)
        
        if errors:
            print(f"BigQuery insertion errors: {errors}")
            return {"status": "bq_error", "errors": errors}, 500

        print(f"Successfully inserted {len(out_rows)} combined newsletter entries")
        return {"status": "ok", "count": len(out_rows)}, 200

    except Exception as e:
        print(f"Error in generate_combined_newsletter: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {"error": str(e)}, 500