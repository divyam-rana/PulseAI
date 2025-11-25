import functions_framework
import os
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from google.cloud import storage
import torch
import tempfile
import shutil

# --- Configuration ---
GCS_BUCKET_NAME = "ml-model-bucket-pulseai"
MODEL_NAME = "valhalla/distilbart-mnli-12-3"
GCS_MODEL_PATH = "models/distilbart-mnli/"  

FIXED_CATEGORIES = [
    "Marketing", "Sales", "Finance", "HR", "Supply Chain", 
    "Customer Experience", "Tech", "Strategy", "Other"
]

# --- Global Variables ---
classifier = None
local_model_dir = None


def download_model_from_gcs(bucket_name, gcs_path, local_dir):
    """Download model files from GCS to local directory."""
    print(f"Downloading model from gs://{bucket_name}/{gcs_path}")
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # List all blobs in the model directory
        blobs = bucket.list_blobs(prefix=gcs_path)
        
        # Download each file
        for blob in blobs:
            if blob.name.endswith('/'):
                continue  # Skip directory markers
            
            # Create local file path
            relative_path = blob.name[len(gcs_path):]
            local_file_path = os.path.join(local_dir, relative_path)
            
            # Create directories if needed
            os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
            
            # Download the file
            blob.download_to_filename(local_file_path)
            print(f"Downloaded: {blob.name}")
        
        print("Model download complete.")
        return True
    except Exception as e:
        print(f"Error downloading model from GCS: {e}")
        import traceback
        traceback.print_exc()
        return False


def upload_model_to_gcs(bucket_name, local_dir, gcs_path):
    """Upload model files from local directory to GCS."""
    print(f"Uploading model to gs://{bucket_name}/{gcs_path}")
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Walk through local directory and upload all files
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file = os.path.join(root, file)
                relative_path = os.path.relpath(local_file, local_dir)
                gcs_file_path = os.path.join(gcs_path, relative_path)
                
                blob = bucket.blob(gcs_file_path)
                blob.upload_from_filename(local_file)
                print(f"Uploaded: {gcs_file_path}")
        
        print("Model upload complete.")
        return True
    except Exception as e:
        print(f"Error uploading model to GCS: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_model_exists_in_gcs(bucket_name, gcs_path):
    """Check if model exists in GCS."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Check for at least one file in the model directory
        blobs = list(bucket.list_blobs(prefix=gcs_path, max_results=1))
        return len(blobs) > 0
    except Exception as e:
        print(f"Error checking GCS: {e}")
        return False


def load_model():
    """Load model from GCS cache or download from HuggingFace."""
    global classifier, local_model_dir
    
    try:
        # Create a temporary directory for the model
        local_model_dir = tempfile.mkdtemp()
        print(f"Using local directory: {local_model_dir}")
        
        # Check if model exists in GCS
        model_in_gcs = check_model_exists_in_gcs(GCS_BUCKET_NAME, GCS_MODEL_PATH)
        
        if model_in_gcs:
            print("Model found in GCS, downloading...")
            success = download_model_from_gcs(GCS_BUCKET_NAME, GCS_MODEL_PATH, local_model_dir)
            
            if success:
                # Load from local directory
                print("Loading model from local cache...")
                classifier = pipeline(
                    "zero-shot-classification",
                    model=local_model_dir,
                    device=-1,
                    max_length=512,
                    truncation=True
                )
            else:
                raise Exception("Failed to download from GCS")
        else:
            print("Model not found in GCS, downloading from HuggingFace...")
            
            # Download from HuggingFace
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
            
            # Save to local directory
            tokenizer.save_pretrained(local_model_dir)
            model.save_pretrained(local_model_dir)
            
            # Upload to GCS for future use
            print("Uploading model to GCS for caching...")
            upload_model_to_gcs(GCS_BUCKET_NAME, local_model_dir, GCS_MODEL_PATH)
            
            # Load the pipeline
            classifier = pipeline(
                "zero-shot-classification",
                model=local_model_dir,
                device=-1,
                max_length=512,
                truncation=True
            )
        
        # Warm up the model
        print("Warming up model...")
        classifier("test", FIXED_CATEGORIES[:2])
        
        print("Model loaded successfully!")
        return True
        
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        
        # Clean up temp directory on failure
        if local_model_dir and os.path.exists(local_model_dir):
            shutil.rmtree(local_model_dir)
        
        return False


# Load model at startup
print("Starting cold start...")
model_loaded = load_model()


@functions_framework.http
def classify_text(request):
    """
    HTTP Cloud Function to classify text.
    Expects JSON: {"text": "Your text here"}
    Returns: {"labels": ["Label1", "Label2", "Label3"]}
    """
    global classifier, model_loaded
    
    # Lazy load if needed
    if not model_loaded or classifier is None:
        print("Model not loaded, attempting to load now...")
        model_loaded = load_model()
        
        if not model_loaded or classifier is None:
            return {"error": "Model failed to load. Check function logs."}, 500
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    # Set CORS headers for main request
    headers = {
        'Access-Control-Allow-Origin': '*'
    }
    
    # Get JSON data
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return ({"error": "Invalid request: No JSON payload found."}, 400, headers)
    
    if 'text' not in request_json:
        return ({"error": "Invalid request: Missing 'text' key in JSON payload."}, 400, headers)
    
    text = request_json['text']
    
    if not text or not text.strip():
        return ({"error": "Invalid request: 'text' cannot be empty."}, 400, headers)
    
    # Run classification
    try:
        result = classifier(text, FIXED_CATEGORIES)
        top_3_labels = result['labels'][:3]
        
        return ({"labels": top_3_labels}, 200, headers)
        
    except Exception as e:
        print(f"Error during classification: {e}")
        import traceback
        traceback.print_exc()
        return ({"error": f"An error occurred: {str(e)}"}, 500, headers)
