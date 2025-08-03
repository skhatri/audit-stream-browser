#!/bin/bash

echo "🚀 Starting Paydash Development Environment..."

# Kill any processes running on our ports
echo "🔪 Killing processes on ports 3000, 3001, 5173, 6379..."
psrm.sh "APP=paydash"
psrm.sh "vite"
psrm.sh "nodemon"

lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true


# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Start the development servers
echo "🎯 Starting development servers..."
APP=paydash RECORD_INSERT_INTERVAL_SECONDS=10 npm run dev &

echo "✅ Paydash is ready!"
echo "🌐 Application: http://localhost:3001"
echo "🔧 API: http://localhost:3001/api"
echo "⚡ Client Dev Server: http://localhost:5173"
echo ""
echo "📝 View app logs in the terminal"
echo "🛑 Stop with: Ctrl+C"

