#!/bin/sh
# ============================================
# Start script: runs node backend + nginx
# ============================================

echo "🚀 Starting CS2 Ping Checker..."

# Start Node.js backend in background
echo "📡 Starting backend on port 3001..."
cd /app/backend
node server.js &
NODE_PID=$!

# Wait for backend to start
sleep 2

# Check if backend is running
if ! kill -0 $NODE_PID 2>/dev/null; then
    echo "❌ Backend failed to start"
    exit 1
fi

echo "✅ Backend started (PID: $NODE_PID)"

# Start nginx in foreground
echo "🌐 Starting nginx on port 8080..."
exec nginx -g "daemon off;"
