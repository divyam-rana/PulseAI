# PulseAI Insights - VM Deployment Guide

## 🖥️ Deploy on Google Cloud VM

This guide shows you how to deploy PulseAI Insights on a Google Cloud Platform Virtual Machine.

## 📋 Prerequisites

- Google Cloud account
- gcloud CLI installed and authenticated
- GCP project with billing enabled
- Service account key with BigQuery access

## 🚀 Quick Deployment

### Option 1: Automated VM Creation

```bash
# Make script executable
chmod +x deploy-vm.sh

# Create and configure VM (uses default project)
./deploy-vm.sh

# Or specify project and zone
./deploy-vm.sh your-project-id us-central1-a
```

This script will:
1. Create a VM instance with Node.js pre-installed
2. Configure firewall rules
3. Set up nginx as reverse proxy
4. Provide you with the IP address

### Option 2: Manual VM Creation

#### Step 1: Create VM Instance

```bash
gcloud compute instances create pulseai-insights-vm \
  --project=your-project-id \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --network-tier=PREMIUM \
  --subnet=default \
  --tags=http-server,https-server \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-balanced
```

#### Step 2: Configure Firewall Rules

```bash
# Allow HTTP traffic on port 8080 (frontend)
gcloud compute firewall-rules create allow-frontend \
  --allow=tcp:8080 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server

# Allow HTTP traffic on port 3001 (backend)
gcloud compute firewall-rules create allow-backend \
  --allow=tcp:3001 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server

# Allow HTTP traffic on port 80 (nginx)
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
```

## 🔧 VM Setup

### Step 1: SSH into VM

```bash
gcloud compute ssh pulseai-insights-vm --zone=us-central1-a
```

### Step 2: Install Node.js

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show v10.x.x
```

### Step 3: Install Additional Tools

```bash
# Install git
sudo apt-get install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx (optional - for reverse proxy)
sudo apt-get install -y nginx
```

### Step 4: Upload Application Files

**Option A: Using Git**
```bash
cd ~
git clone https://github.com/divyam-rana/pulseai-insights.git
cd pulseai-insights
```

**Option B: Using gcloud scp (from your local machine)**
```bash
# Create tarball of your project
cd /Users/divyamrana/Documents/Boston/Fall\ 2025/react_app_deployment/pulseai-insights
tar -czf pulseai-insights.tar.gz \
  --exclude=node_modules \
  --exclude=backend/node_modules \
  --exclude=.git \
  --exclude=dist \
  .

# Upload to VM
gcloud compute scp pulseai-insights.tar.gz pulseai-insights-vm:~ --zone=us-central1-a

# SSH into VM and extract
gcloud compute ssh pulseai-insights-vm --zone=us-central1-a
tar -xzf pulseai-insights.tar.gz
cd pulseai-insights
```

### Step 5: Upload Service Account Key

**From your local machine:**
```bash
gcloud compute scp backend/service-account-key.json \
  pulseai-insights-vm:~/pulseai-insights/backend/ \
  --zone=us-central1-a
```

### Step 6: Configure Environment

**On the VM:**
```bash
cd ~/pulseai-insights

# Create backend .env file
cat > backend/.env << EOF
GOOGLE_CLOUD_PROJECT=pulseai-team3-ba882-fall25
BIGQUERY_DATASET=pulseai_main_db
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3001
NODE_ENV=production
EOF
```

### Step 7: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Make scripts executable
chmod +x *.sh
```

### Step 8: Build Frontend (Production)

```bash
# Build frontend for production
npm run build
```

## 🚀 Running the Application

### Option 1: Using the Start Script (Development)

```bash
# Run in development mode
./start.sh
```

### Option 2: Using PM2 (Production - Recommended)

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'pulseai-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'pulseai-frontend',
      script: 'npx',
      args: 'serve -s dist -l 8080',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
EOF

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs

# Check status
pm2 status

# View logs
pm2 logs
```

### Option 3: Using systemd Services

```bash
# Create backend service
sudo cat > /etc/systemd/system/pulseai-backend.service << EOF
[Unit]
Description=PulseAI Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/pulseai-insights/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create frontend service
sudo cat > /etc/systemd/system/pulseai-frontend.service << EOF
[Unit]
Description=PulseAI Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/pulseai-insights
ExecStart=/usr/bin/npx serve -s dist -l 8080
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable pulseai-backend pulseai-frontend
sudo systemctl start pulseai-backend pulseai-frontend

# Check status
sudo systemctl status pulseai-backend
sudo systemctl status pulseai-frontend
```

## 🌐 Configure Nginx Reverse Proxy (Optional)

This allows you to access the app on port 80 instead of 8080/3001.

```bash
# Create nginx configuration
sudo cat > /etc/nginx/sites-available/pulseai << 'EOF'
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
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/pulseai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

## 🔍 Accessing Your Application

### Get VM External IP

```bash
gcloud compute instances describe pulseai-insights-vm \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### Access URLs

- **Frontend (direct)**: `http://EXTERNAL_IP:8080`
- **Backend (direct)**: `http://EXTERNAL_IP:3001`
- **Via Nginx**: `http://EXTERNAL_IP` (port 80)

## 📊 Managing the VM

### Start/Stop VM

```bash
# Stop VM
gcloud compute instances stop pulseai-insights-vm --zone=us-central1-a

# Start VM
gcloud compute instances start pulseai-insights-vm --zone=us-central1-a

# Restart VM
gcloud compute instances reset pulseai-insights-vm --zone=us-central1-a
```

### Delete VM

```bash
gcloud compute instances delete pulseai-insights-vm --zone=us-central1-a
```

### Monitor VM

```bash
# SSH into VM
gcloud compute ssh pulseai-insights-vm --zone=us-central1-a

# Check resource usage
top
htop  # if installed

# Check disk usage
df -h

# Check logs (if using PM2)
pm2 logs

# Check logs (if using systemd)
sudo journalctl -u pulseai-backend -f
sudo journalctl -u pulseai-frontend -f
```

## 🔧 Troubleshooting

### Application Not Starting

```bash
# Check if Node.js is installed
node -v
npm -v

# Check if dependencies are installed
ls -la node_modules
ls -la backend/node_modules

# Check environment variables
cat backend/.env

# Check if service account key exists
ls -la backend/service-account-key.json

# Try running manually
cd backend
node server.js
```

### Cannot Access Application

```bash
# Check if services are running
pm2 status
# or
sudo systemctl status pulseai-backend pulseai-frontend

# Check if ports are listening
sudo netstat -tlnp | grep -E '8080|3001'

# Check firewall rules
gcloud compute firewall-rules list

# Check nginx status
sudo systemctl status nginx
sudo nginx -t
```

### Port Already in Use

```bash
# Find and kill process on port 8080
sudo lsof -ti:8080 | xargs kill -9

# Find and kill process on port 3001
sudo lsof -ti:3001 | xargs kill -9
```

## 💰 Cost Estimation

**e2-medium (2 vCPU, 4GB RAM):**
- ~$24/month if running 24/7
- ~$0.033/hour

**Cost Optimization:**
- Use preemptible VMs (up to 80% cheaper)
- Stop VM when not in use
- Use smaller machine type if sufficient (e2-small: ~$12/month)

## 🔒 Security Best Practices

1. **Use SSH keys** instead of password authentication
2. **Limit SSH access** to specific IP ranges
3. **Keep system updated**: `sudo apt-get update && sudo apt-get upgrade`
4. **Use HTTPS** with Let's Encrypt SSL certificate
5. **Configure firewall** to only allow necessary ports
6. **Use Cloud IAM** for service account permissions
7. **Regular backups** of VM disk

## 📈 Scaling

### Vertical Scaling (Bigger VM)

```bash
# Stop VM
gcloud compute instances stop pulseai-insights-vm --zone=us-central1-a

# Change machine type
gcloud compute instances set-machine-type pulseai-insights-vm \
  --machine-type=e2-standard-2 \
  --zone=us-central1-a

# Start VM
gcloud compute instances start pulseai-insights-vm --zone=us-central1-a
```

### Horizontal Scaling (Multiple VMs)

For high traffic, consider:
- Create multiple VM instances
- Set up load balancer
- Use Cloud SQL for shared database
- Or migrate to Cloud Run/GKE

## 🎯 Production Checklist

- [ ] VM created with appropriate size
- [ ] Firewall rules configured
- [ ] Node.js and dependencies installed
- [ ] Application files uploaded
- [ ] Service account key uploaded
- [ ] Environment variables configured
- [ ] Frontend built for production
- [ ] Application running with PM2/systemd
- [ ] Nginx reverse proxy configured
- [ ] Application accessible via external IP
- [ ] Auto-restart on boot configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] SSL certificate installed (optional)

## 📚 Additional Resources

- [GCP VM Documentation](https://cloud.google.com/compute/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt SSL](https://letsencrypt.org/)

---

**Need help?** Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) or [QUICK_START.md](./QUICK_START.md)
