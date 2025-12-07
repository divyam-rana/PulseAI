# Or to see the full detailed logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=summarize-arxiv-weekly-v2" \
  --limit=50 \
  --project=pulseai-team3-ba882-fall25 \
  --freshness=5m