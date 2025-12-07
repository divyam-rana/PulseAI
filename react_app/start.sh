#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting PulseAI Insights Application${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${RED}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}⚠️  Warning: backend/.env not found. Creating from .env.example${NC}"
    cp backend/.env.example backend/.env
    echo -e "${RED}⚠️  Please configure backend/.env with your credentials before continuing${NC}"
    exit 1
fi

# Start backend server
echo -e "${GREEN}🔧 Starting backend server on port 3001...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend server
echo -e "${GREEN}🎨 Starting frontend server on port 8080...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

echo ""
echo -e "${GREEN}✅ Application is running!${NC}"
echo -e "${BLUE}Frontend:${NC} http://localhost:8080"
echo -e "${BLUE}Backend:${NC}  http://localhost:3001"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
