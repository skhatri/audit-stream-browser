#!/bin/bash

echo "🚀 Starting Paydash Development Environment..."

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose down

# Kill any processes running on our ports
echo "🔪 Killing processes on ports 3000, 3001, 5173, 6379..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:6379 | xargs kill -9 2>/dev/null || true

# Remove any orphaned containers
echo "🧹 Cleaning up orphaned containers..."
docker-compose rm -f

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# For development, we run locally rather than in containers for better performance
echo "🏗️  Starting Redis in container..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Start the development servers
echo "🎯 Starting development servers..."
npm run dev

echo "✅ Paydash is ready!"
echo "🌐 Application: http://localhost:3001"
echo "🔧 API: http://localhost:3001/api"
echo "⚡ Client Dev Server: http://localhost:5173"
echo "📊 Redis: localhost:6379"
echo ""
echo "📝 View app logs in the terminal"
echo "🛑 Stop with: Ctrl+C, then docker-compose down"