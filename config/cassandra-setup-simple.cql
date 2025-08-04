-- Paydash Cassandra Configuration - Simplified
-- Phase 5: Production-ready setup without materialized views

-- Create keyspace with simple replication for development
CREATE KEYSPACE IF NOT EXISTS paydash
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
} AND DURABLE_WRITES = true;

USE paydash;

-- Create batch_objects table with optimized configuration
CREATE TABLE IF NOT EXISTS batch_objects (
    object_id UUID PRIMARY KEY,
    object_type text,
    status text,
    outcome text,
    metadata frozen<map<text,text>>,
    created timestamp,
    updated timestamp
) WITH 
    comment = 'Batch objects for event processing'
    AND caching = {'keys': 'ALL', 'rows_per_partition': 'ALL'}
    AND compaction = {'class': 'SizeTieredCompactionStrategy'}
    AND compression = {'sstable_compression': 'LZ4Compressor'}
    AND gc_grace_seconds = 86400;

-- Create audit_entries table with composite partition key for scalability
CREATE TABLE IF NOT EXISTS audit_entries (
    object_type text,    
    object_id UUID,
    parent_id UUID,
    parent_type text,
    status text,
    action text,
    previous_status text,
    new_status text,
    previous_outcome text,
    new_outcome text,
    timestamp timestamp,
    audit_id UUID,
    metadata frozen<map<text,text>>,
    PRIMARY KEY ((object_type, object_id), timestamp, audit_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, audit_id ASC)
    AND comment = 'Audit trail for all object state changes'
    AND caching = {'keys': 'ALL', 'rows_per_partition': '100'}
    AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_unit': 'DAYS', 'compaction_window_size': 1}
    AND compression = {'sstable_compression': 'LZ4Compressor'}
    AND gc_grace_seconds = 86400
    AND default_time_to_live = 2592000; -- 30 days TTL

-- Create secondary index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_audit_parent_id ON audit_entries (parent_id);