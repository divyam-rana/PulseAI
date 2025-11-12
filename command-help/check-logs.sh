# View recent logs for load-gnews function
gcloud functions logs read <FUNCTION NAME> \
  --region us-central1 \
  --limit 100