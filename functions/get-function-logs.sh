# Get logs for all functions with more detail
gcloud functions logs read extract-reddit --limit=20
gcloud functions logs read extract-gnews --limit=20
gcloud functions logs read extract-arxiv --limit=20
gcloud functions logs read setup-reddit-schema --limit=20
gcloud functions logs read setup-gnews-schema --limit=20
gcloud functions logs read setup-arxiv-schema --limit=20
gcloud functions logs read load-reddit --limit=20
gcloud functions logs read load-gnews --limit=20
gcloud functions logs read load-arxiv --limit=20