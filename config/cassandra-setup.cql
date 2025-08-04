-- Paydash Cassandra Configuration
-- Phase 5: Production-ready setup with replication and optimization

-- Create keyspace with proper replication strategy
CREATE KEYSPACE IF NOT EXISTS paydash
WITH REPLICATION = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
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

-- Create materialized view for recent audit entries (last 7 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS recent_audit_entries AS
    SELECT object_type, object_id, parent_id, parent_type, status, action,
           previous_status, new_status, previous_outcome, new_outcome,
           timestamp, audit_id, metadata
    FROM audit_entries
    WHERE timestamp IS NOT NULL 
      AND object_type IS NOT NULL 
      AND object_id IS NOT NULL
      AND audit_id IS NOT NULL
      AND timestamp > '2024-01-01'
    PRIMARY KEY (timestamp, object_type, object_id, audit_id)
    WITH CLUSTERING ORDER BY (object_type ASC, object_id ASC, audit_id ASC)
    AND caching = {'keys': 'ALL', 'rows_per_partition': '50'}
    AND comment = 'Recent audit entries for efficient querying';

-- Performance tuning commands
-- ALTER TABLE batch_objects WITH caching = {'keys': 'ALL', 'rows_per_partition': 'ALL'};
-- ALTER TABLE audit_entries WITH caching = {'keys': 'ALL', 'rows_per_partition': '100'};