curl -X POST https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/create_reddit_tag_summaries_table

curl -X POST https://us-central1-pulseai-team3-ba882-fall25.cloudfunctions.net/summarize_reddit_by_tag \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'