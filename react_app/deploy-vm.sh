#!/bin/bash

# VM Deployment Script for PulseAI Insights on Google Cloud Platform
# This script creates a VM instance and deploys the application

set -e

# Configuration
PROJECT_ID=${1:-pulseai-team3-ba882-fall25}
ZONE=${2:-us-central1-a}
INSTANCE_NAME="pulseai-insights-vm"
MACHINE_TYPE="e2-medium"  # 2 vCPUs, 4GB RAM - adjust as needed
DISK_SIZE="20GB"

echo "🚀 Deploying PulseAI Insights on GCP VM"
echo "   Project: $PROJECT_ID"
echo "   Zone: $ZONE"
echo "   Instance: $INSTANCE_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Create startup script
echo "📝 Creating startup script..."
cat > /tmp/startup-script.sh << 'STARTUP_SCRIPT'
#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install git
apt-get install -y git

# Install nginx (optional - for reverse proxy)
apt-get install -y nginx

# Create app directory
mkdir -p /opt/pulseai-insights
cd /opt/pulseai-insights

# Clone repository (or you can upload files)
# git clone https://github.com/divyam-rana/pulseai-insights.git .

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Configure nginx as reverse proxy (optional)
cat > /etc/nginx/sites-available/pulseai << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONFIG

ln -sf /etc/nginx/sites-available/pulseai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "✅ VM setup complete!"
STARTUP_SCRIPT

# Create the VM instance
echo "🖥️  Creating VM instance..."
gcloud compute instances create $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --network-interface=network-tier=PREMIUM,subnet=default \
  --maintenance-policy=MIGRATE \
  --provisioning-model=STANDARD \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server,https-server \
  --create-disk=auto-delete=yes,boot=yes,device-name=$INSTANCE_NAME,image=projects/debian-cloud/global/images/family/debian-12,mode=rw,size=$DISK_SIZE,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-balanced \
  --metadata-from-file startup-script=/tmp/startup-script.sh \
  --no-shielded-secure-boot \
  --shielded-vtpm \
  --shielded-integrity-monitoring \
  --labels=app=pulseai-insights \
  --reservation-affinity=any

# Create firewall rules if they don't exist
echo "🔥 Configuring firewall rules..."
gcloud compute firewall-rules create allow-pulseai-frontend --allow=tcp:8080 --source-ranges=0.0.0.0/0 --target-tags=http-server 2>/dev/null || echo "Firewall rule already exists"
gcloud compute firewall-rules create allow-pulseai-backend --allow=tcp:3001 --source-ranges=0.0.0.0/0 --target-tags=http-server 2>/dev/null || echo "Firewall rule already exists"

# Wait for instance to be ready
echo "⏳ Waiting for instance to be ready..."
sleep 30

# Get instance IP
EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "✅ VM Instance Created Successfully!"
echo ""
echo "📊 Instance Details:"
echo "   Name: $INSTANCE_NAME"
echo "   Zone: $ZONE"
echo "   External IP: $EXTERNAL_IP"
echo "   Machine Type: $MACHINE_TYPE"
echo ""
echo "🔑 To access the VM:"
echo "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo ""
echo "📋 Next Steps:"
echo "   1. SSH into the VM"
echo "   2. Upload your application files or clone from git"
echo "   3. Upload service account key to /opt/pulseai-insights/backend/"
echo "   4. Configure backend/.env file"
echo "   5. Run the application with ./start.sh"
echo ""
echo "🌐 Once running, access your app at:"
echo "   Frontend: http://$EXTERNAL_IP:8080"
echo "   Backend:  http://$EXTERNAL_IP:3001"
echo "   (via nginx): http://$EXTERNAL_IP"
echo ""
echo "🛠️  To deploy the application, see VM_SETUP.md"
echo ""
