#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting audit-stream Development Environment...${NC}"

# Kill any processes running on our ports
echo -e "${YELLOW}🔪 Cleaning up existing processes...${NC}"
psrm.sh "APP=audit-stream" 2>/dev/null || true
psrm.sh "vite" 2>/dev/null || true
psrm.sh "nodemon" 2>/dev/null || true

lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true  # Event-Generator
lsof -ti:8081 | xargs kill -9 2>/dev/null || true  # Event-Processor

cmd=$1
if [[ "$cmd" == "stop" ]]; then
  exit 0;
fi;
# Function to check service startup and monitor for failures
check_service_startup() {
    local service_name=$1
    local log_file=$2
    local success_pattern=$3
    local max_wait=${4:-45}
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to start...${NC}"
    
    local counter=0
    while [ $counter -lt $max_wait ]; do
        if [ -f "$log_file" ] && grep -q "$success_pattern" "$log_file"; then
            echo -e "${GREEN}✅ $service_name started successfully${NC}"
            return 0
        fi
        
        # Only fail on actual startup errors, not debug messages
        if [ -f "$log_file" ] && grep -qi "Exception.*[Aa]pplication\|Failed to start\|startup failed" "$log_file"; then
            echo -e "${RED}❌ $service_name failed to start - check logs${NC}"
            tail -10 "$log_file"
            return 1
        fi
        
        sleep 3
        counter=$((counter + 3))
    done
    
    echo -e "${RED}❌ $service_name startup timeout after ${max_wait}s${NC}"
    return 1
}

# Start Event-Processor first
if [ -d "event-processor" ] && [ -f "event-processor/build.gradle" ]; then
    echo -e "${BLUE}⚡ Starting Event-Processor...${NC}"
    cd event-processor
    ./gradlew run > ../logs/event-processor.log 2>&1 &
    EVENT_PROCESSOR_PID=$!
    cd ..
    
    if ! check_service_startup "Event-Processor" "logs/event-processor.log" "Event Processor initialized, starting consumption"; then
        echo -e "${RED}❌ Event-Processor failed to start${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ Event-Processor module not found, skipping...${NC}"
fi

# Start Event-Generator second
if [ -d "event-generator" ] && [ -f "event-generator/build.gradle" ]; then
    echo -e "${BLUE}📡 Starting Event-Generator...${NC}"
    cd event-generator
    ./gradlew bootRun > ../logs/event-generator.log 2>&1 &
    EVENT_GENERATOR_PID=$!
    cd ..
    
    if ! check_service_startup "Event-Generator" "logs/event-generator.log" "Started EventGeneratorApplication"; then
        echo -e "${RED}❌ Event-Generator failed to start${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ Event-Generator module not found, skipping...${NC}"
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all

# Start Client and Server
echo -e "${BLUE}🌐 Starting Client and Server...${NC}"
APP=audit-stream RECORD_INSERT_INTERVAL_SECONDS=10 npm run dev &

echo -e "\n${GREEN}✅ All services started successfully!${NC}"
echo -e "${BLUE}🌐 AuditStream UI: http://localhost:5173${NC}"
echo -e "${BLUE}🔧 AuditStream API: http://localhost:3001/api${NC}"
echo -e "${YELLOW}📝 Logs are saved in ./logs/ directory${NC}"

