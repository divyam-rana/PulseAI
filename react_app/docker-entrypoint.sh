#!/bin/sh

# Start backend server on port 8080 (serves both API and frontend)
cd /app/backend
export NODE_ENV=production
export PORT=8080
node server.js
