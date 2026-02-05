#!/bin/bash

echo "🚀 Starting DebatePanel Local Test Environment"
echo "================================================"

# Kill any existing processes
echo "🔄 Cleaning up old processes..."
pkill -f "debate-processor" 2>/dev/null
pkill -f "debate-panel" 2>/dev/null
pkill -f "port 3000" 2>/dev/null
pkill -f "port 3001" 2>/dev/null
sleep 2

# Start Railway service
echo ""
echo "📡 Starting Railway Service (Port 3001)..."
cd /Users/kevinbadinger/Projects/DebatePanel/debate-processor
npm run dev &
RAILWAY_PID=$!

# Wait for Railway to start
echo "⏳ Waiting for Railway service to start..."
sleep 5

# Check if Railway is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Railway service is running on port 3001"
else
    echo "❌ Railway service failed to start"
    exit 1
fi

# Start Vercel frontend
echo ""
echo "🎨 Starting Vercel Frontend (Port 3000)..."
cd /Users/kevinbadinger/Projects/DebatePanel/debate-panel
export NEXT_PUBLIC_RAILWAY_URL=http://localhost:3001
npm run dev &
VERCEL_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 8

echo ""
echo "================================================"
echo "✅ Local environment is ready!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "📡 Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"
echo "================================================"

# Keep script running and handle cleanup
trap "echo '🛑 Stopping services...'; kill $RAILWAY_PID $VERCEL_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait








