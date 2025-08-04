#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Paydash Development Environment...${NC}"

# Kill any processes running on our ports (application ports only)
echo -e "${YELLOW}🔪 Killing application processes...${NC}"
psrm.sh "APP=paydash" 2>/dev/null || true
psrm.sh "vite" 2>/dev/null || true
psrm.sh "nodemon" 2>/dev/null || true

lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true  # Event-Generator
lsof -ti:8081 | xargs kill -9 2>/dev/null || true  # Event-Processor

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Start infrastructure services with Docker Compose
echo -e "${YELLOW}🏗️ Starting infrastructure services (Redis, Kafka, Cassandra)...${NC}"
docker-compose up -d redis kafka cassandra kafka-init

# Wait for infrastructure to be healthy
echo -e "${YELLOW}⏳ Waiting for infrastructure services to be ready...${NC}"
timeout=120
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "unhealthy\|starting"; then
        echo -e "${YELLOW}⏳ Services still starting... ($counter/$timeout)${NC}"
        sleep 5
        counter=$((counter + 5))
    else
        echo -e "${GREEN}✅ Infrastructure services are ready!${NC}"
        break
    fi
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ Infrastructure services failed to start within $timeout seconds${NC}"
    docker-compose ps
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all

# Start application modules
echo -e "${YELLOW}🎯 Starting application modules...${NC}"

# Function to check if a directory exists and contains required files
check_module() {
    local module_name=$1
    local module_path=$2
    local check_file=$3
    
    if [ -d "$module_path" ] && [ -f "$module_path/$check_file" ]; then
        return 0
    else
        return 1
    fi
}

# Start Paydash (current UI + backend)
echo -e "${BLUE}🌐 Starting Paydash (UI + Backend)...${NC}"
APP=paydash RECORD_INSERT_INTERVAL_SECONDS=10 npm run dev &
PAYDASH_PID=$!

# Start Event-Generator (Spring Boot) if it exists
if check_module "Event-Generator" "event-generator" "build.gradle"; then
    echo -e "${BLUE}📡 Starting Event-Generator (Spring Boot)...${NC}"
    cd event-generator
    ./gradlew bootRun &
    EVENT_GENERATOR_PID=$!
    cd ..
else
    echo -e "${YELLOW}⚠️ Event-Generator module not found, skipping...${NC}"
fi

# Start Event-Processor (Flink) if it exists
if check_module "Event-Processor" "event-processor" "build.gradle"; then
    echo -e "${BLUE}⚡ Starting Event-Processor (Flink)...${NC}"
    cd event-processor
    ./gradlew run &
    EVENT_PROCESSOR_PID=$!
    cd ..
else
    echo -e "${YELLOW}⚠️ Event-Processor module not found, skipping...${NC}"
fi

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
    # Kill application processes
    [ ! -z "$PAYDASH_PID" ] && kill $PAYDASH_PID 2>/dev/null || true
    [ ! -z "$EVENT_GENERATOR_PID" ] && kill $EVENT_GENERATOR_PID 2>/dev/null || true
    [ ! -z "$EVENT_PROCESSOR_PID" ] && kill $EVENT_PROCESSOR_PID 2>/dev/null || true
    
    # Kill any remaining processes on our ports
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true  # Event-Generator
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true  # Event-Processor
    
    echo -e "${GREEN}✅ Application modules stopped${NC}"
    echo -e "${YELLOW}💡 Note: Infrastructure services (Docker) are still running${NC}"
    echo -e "${YELLOW}💡 Run 'docker-compose down' to stop infrastructure${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Show URLs and status
echo -e "\n${GREEN}✅ Paydash Development Environment is ready!${NC}"
echo -e "${BLUE}🌐 Paydash UI: http://localhost:5173${NC}"
echo -e "${BLUE}🔧 Paydash API: http://localhost:3001/api${NC}"
echo -e "${BLUE}📊 Redis: localhost:6379${NC}"
echo -e "${BLUE}📡 Kafka: localhost:9092${NC}"
echo -e "${BLUE}🗄️ Cassandra: localhost:9042${NC}"

# Show module status
echo -e "\n${YELLOW}📋 Module Status:${NC}"
echo -e "  ${GREEN}✅ Paydash (UI + Backend)${NC}"
if [ ! -z "$EVENT_GENERATOR_PID" ]; then
    echo -e "  ${GREEN}✅ Event-Generator (Spring Boot)${NC}"
else
    echo -e "  ${YELLOW}⚠️ Event-Generator (Not found)${NC}"
fi
if [ ! -z "$EVENT_PROCESSOR_PID" ]; then
    echo -e "  ${GREEN}✅ Event-Processor (Flink)${NC}"
else
    echo -e "  ${YELLOW}⚠️ Event-Processor (Not found)${NC}"
fi

echo -e "\n${YELLOW}📝 View logs in the terminal above${NC}"
echo -e "${RED}🛑 Stop with: Ctrl+C${NC}"

# Wait for user input or processes to finish
wait

