package com.paydash.eventprocessor.config;

public class FlinkConfig {
    
    public static final String KAFKA_BOOTSTRAP_SERVERS = "localhost:9092";
    public static final String KAFKA_TOPIC_BATCH_EVENTS = "batch-events";
    public static final String KAFKA_GROUP_ID = "event-processor-group";
    
    public static final String REDIS_HOST = "localhost";
    public static final int REDIS_PORT = 6379;
    
    public static final String CASSANDRA_HOST = "localhost";
    public static final int CASSANDRA_PORT = 9042;
    public static final String CASSANDRA_KEYSPACE = "paydash";
    public static final String CASSANDRA_TABLE_BATCH_OBJECTS = "batch_objects";
    public static final String CASSANDRA_TABLE_AUDIT_ENTRIES = "audit_entries";
    
    public static final String CLICKHOUSE_HOST = "localhost";
    public static final int CLICKHOUSE_PORT = 8123;
    
    public static final String CHECKPOINT_URI = "file:///tmp/flink-checkpoints";
    public static final long CHECKPOINT_INTERVAL = 10000; // 10 seconds
    
    private FlinkConfig() {}
}