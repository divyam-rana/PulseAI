git init
git remote add origin https://github.com/divyam-rana/PulseAI.git
git fetch origin
git checkout -b Brendan---DAG-Setup origin/Brendan---DAG-Setup
git add -A
git commit -m "refactor: Update cloud functions with Secret Manager"
git push origin Brendan---DAG-Setup