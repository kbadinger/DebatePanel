#!/bin/bash

# Script to test all 3 services locally
# Runs: Vercel (3000) → Railway (3001) → Neon (cloud)

echo "🚀 Starting Local Test Environment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if both directories exist
if [ ! -d "debate-panel" ] || [ ! -d "debate-processor" ]; then
    echo -e "${RED}Error: Make sure you're in /Users/kevinbadinger/Projects/DebatePanel${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $PROCESSOR_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start Railway service (debate processor)
echo -e "${GREEN}Starting Railway service on port 3001...${NC}"
cd debate-processor

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: No .env file found in debate-processor${NC}"
    echo "Creating from example..."
    cp env.example .env
    echo -e "${RED}Please edit debate-processor/.env and add your DATABASE_URL and API keys${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Railway service dependencies..."
    npm install
    npx prisma generate
fi

# Start the processor in background
npm run dev > railway.log 2>&1 &
PROCESSOR_PID=$!
echo "Railway service PID: $PROCESSOR_PID"

# Wait for Railway service to start
echo "Waiting for Railway service to start..."
sleep 5

# Check if Railway service is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}Railway service failed to start. Check debate-processor/railway.log${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Railway service is running${NC}"

# Start Vercel frontend
echo -e "\n${GREEN}Starting Vercel frontend on port 3000...${NC}"
cd ../debate-panel

# Set environment variable to use local Railway service
export NEXT_PUBLIC_RAILWAY_URL=http://localhost:3001

# Start frontend in background
npm run dev > vercel.log 2>&1 &
FRONTEND_PID=$!
echo "Vercel frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}Frontend failed to start. Check debate-panel/vercel.log${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend is running${NC}"

# Success message
echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}✅ All services are running!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo "📍 Frontend:        http://localhost:3000"
echo "📍 Railway API:     http://localhost:3001"
echo "📍 Health Check:    http://localhost:3001/health"
echo ""
echo "📝 Logs:"
echo "   Frontend:  debate-panel/vercel.log"
echo "   Railway:   debate-processor/railway.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
while true; do
    sleep 1
done











