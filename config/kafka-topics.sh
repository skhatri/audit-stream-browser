#!/bin/bash

set -e

echo "🔧 Configuring Kafka Topics for Production..."

KAFKA_CONTAINER="paydash-kafka-1"
BOOTSTRAP_SERVER="localhost:9092"

configure_topic() {
    local topic_name=$1
    local partitions=$2
    local replication_factor=$3
    local retention_ms=$4
    local cleanup_policy=$5
    
    echo "📋 Configuring topic: $topic_name"
    
    docker exec $KAFKA_CONTAINER kafka-configs \
        --bootstrap-server $BOOTSTRAP_SERVER \
        --entity-type topics \
        --entity-name $topic_name \
        --alter \
        --add-config "retention.ms=$retention_ms,cleanup.policy=$cleanup_policy,min.insync.replicas=1"
    
    echo "✅ Topic $topic_name configured successfully"
}

echo "🎯 Configuring batch-events topic..."
configure_topic "batch-events" 6 1 86400000 "delete"

echo "🎯 Configuring audit-events topic..."
configure_topic "audit-events" 3 1 259200000 "delete"

echo "🚀 Kafka topics configuration completed!"

echo ""
echo "📊 Topic Summary:"
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $BOOTSTRAP_SERVER --list
echo ""
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $BOOTSTRAP_SERVER --describe