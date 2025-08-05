package com.paydash.eventprocessor.sink;

import java.net.InetSocketAddress;
import java.util.UUID;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.BoundStatement;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.paydash.eventprocessor.config.FlinkConfig;
import com.paydash.eventprocessor.model.BatchEvent;

public class CassandraSinkFunction extends RichSinkFunction<BatchEvent> {
    
    private static final Logger logger = LoggerFactory.getLogger(CassandraSinkFunction.class);
    
    private transient CqlSession session;
    private transient PreparedStatement batchObjectInsert;
    private transient PreparedStatement auditEntryInsert;
    
    @Override
    public void open(Configuration parameters) throws Exception {
        super.open(parameters);
        
        session = CqlSession.builder()
            .addContactPoint(new InetSocketAddress(FlinkConfig.CASSANDRA_HOST, FlinkConfig.CASSANDRA_PORT))
            .withLocalDatacenter("datacenter1")
            .build();
        
        createKeyspaceAndTables();
        prepareBatchObjectStatement();
        prepareAuditEntryStatement();
        
        logger.info("CassandraSinkFunction initialized successfully");
    }
    
    @Override
    public void invoke(BatchEvent event, Context context) throws Exception {
        try {
            if (isItemAuditEvent(event)) {
                handleItemAuditEvent(event);
            } else {
                insertBatchObject(event);
                insertAuditEntry(event);
            }
            logger.debug("Successfully processed event: {} for object: {}", 
                event.getEventType(), event.getPayload().getObjectId());
        } catch (Exception e) {
            logger.error("Error processing event: {} for object: {}", 
                event.getEventType(), event.getPayload().getObjectId(), e);
            throw e;
        }
    }
    
    private void createKeyspaceAndTables() {
        session.execute("""
            CREATE KEYSPACE IF NOT EXISTS paydash 
            WITH REPLICATION = {
                'class': 'SimpleStrategy',
                'replication_factor': 1
            }
            """);
        
        session.execute("""
            CREATE TABLE IF NOT EXISTS paydash.batch_objects (
                object_id text PRIMARY KEY,
                object_type text,
                status text,
                outcome text,
                metadata map<text, text>,
                created timestamp,
                updated timestamp
            )
            """);
        
        session.execute("""
            CREATE TABLE IF NOT EXISTS paydash.audit_entries (
                audit_id uuid,
                object_id text,
                object_type text,
                parent_id text,
                parent_type text,
                action text,
                previous_status text,
                new_status text,
                previous_outcome text,
                new_outcome text,
                timestamp timestamp,
                metadata text,
                PRIMARY KEY ((object_type, object_id), timestamp, audit_id)
            ) WITH CLUSTERING ORDER BY (timestamp DESC)
            """);
        
        session.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_parent_id 
            ON paydash.audit_entries (parent_id)
            """);
        
        session.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_parent_type 
            ON paydash.audit_entries (parent_type)
            """);
        
        logger.info("Cassandra keyspace and tables created/verified");
    }
    
    private void prepareBatchObjectStatement() {
        batchObjectInsert = session.prepare("""
            INSERT INTO paydash.batch_objects 
            (object_id, object_type, status, outcome, metadata, created, updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """);
    }
    
    private void prepareAuditEntryStatement() {
        auditEntryInsert = session.prepare("""
            INSERT INTO paydash.audit_entries 
            (audit_id, object_id, object_type, parent_id, parent_type, action, 
             previous_status, new_status, previous_outcome, new_outcome, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """);
    }
    
    private void insertBatchObject(BatchEvent event) {
        BatchEvent.BatchPayload payload = event.getPayload();
        
        BoundStatement statement = batchObjectInsert.bind(
            payload.getObjectId(),
            payload.getObjectType(),
            payload.getStatus(),
            payload.getOutcome(),
            payload.getMetadata(),
            java.time.Instant.from(payload.getCreated().atZone(java.time.ZoneOffset.UTC)),
            java.time.Instant.from(payload.getUpdated().atZone(java.time.ZoneOffset.UTC))
        );
        
        session.execute(statement);
    }
    
    private void insertAuditEntry(BatchEvent event) {
        BatchEvent.BatchPayload payload = event.getPayload();
        
        String action = "OBJECT_CREATED".equals(event.getEventType()) ? "CREATED" : "UPDATED";
        String previousStatus = "OBJECT_CREATED".equals(event.getEventType()) ? null : null;
        String previousOutcome = "OBJECT_CREATED".equals(event.getEventType()) ? null : null;
        
        String parentId = payload.getObjectId();
        String parentType = payload.getObjectType();
        
        if ("item".equals(payload.getObjectType()) && payload.getMetadata() != null) {
            String metadataParentId = payload.getMetadata().get("parent_id");
            String metadataParentType = payload.getMetadata().get("parent_type");
            if (metadataParentId != null) {
                parentId = metadataParentId;
            }
            if (metadataParentType != null) {
                parentType = metadataParentType;
            }
        }
        
        BoundStatement statement = auditEntryInsert.bind(
            UUID.randomUUID(),
            payload.getObjectId(),
            payload.getObjectType(),
            parentId,
            parentType,
            action,
            previousStatus,
            payload.getStatus(),
            previousOutcome,
            payload.getOutcome(),
            java.time.Instant.from(event.getTimestamp().atZone(java.time.ZoneOffset.UTC)),
            payload.getMetadata() != null ? payload.getMetadata().toString() : null
        );
        
        session.execute(statement);
    }
    
    private boolean isItemAuditEvent(BatchEvent event) {
        return event.getEventType().startsWith("ITEM_") && 
               "item".equals(event.getPayload().getObjectType());
    }
    
    private void handleItemAuditEvent(BatchEvent event) {
        BatchEvent.BatchPayload payload = event.getPayload();
        
        if (!batchExists(payload.getMetadata().get("parent_id"))) {
            logger.warn("Parent batch {} not found for item {}", 
                payload.getMetadata().get("parent_id"), payload.getObjectId());
            return;
        }
        
        insertItemAuditEntry(event);
        logger.info("Created item audit entry: {}", payload.getObjectId());
    }
    
    private boolean batchExists(String parentId) {
        if (parentId == null) return false;
        
        try {
            PreparedStatement checkBatch = session.prepare(
                "SELECT object_id FROM paydash.batch_objects WHERE object_id = ? LIMIT 1"
            );
            BoundStatement statement = checkBatch.bind(parentId);
            var result = session.execute(statement);
            return result.one() != null;
        } catch (Exception e) {
            logger.error("Error checking if batch {} exists", parentId, e);
            return false;
        }
    }
    
    private void insertItemAuditEntry(BatchEvent event) {
        BatchEvent.BatchPayload payload = event.getPayload();
        
        String action = event.getEventType().replace("ITEM_", "");
        String parentId = payload.getMetadata().get("parent_id");
        String parentType = payload.getMetadata().get("parent_type");
        
        BoundStatement statement = auditEntryInsert.bind(
            UUID.randomUUID(),
            payload.getObjectId(),
            payload.getObjectType(),
            parentId,
            parentType,
            action,
            null,
            payload.getStatus(),
            null,
            payload.getOutcome(),
            java.time.Instant.from(event.getTimestamp().atZone(java.time.ZoneOffset.UTC)),
            payload.getMetadata() != null ? payload.getMetadata().toString() : null
        );
        
        session.execute(statement);
    }
    
    @Override
    public void close() throws Exception {
        if (session != null) {
            session.close();
            logger.info("CassandraSinkFunction closed");
        }
        super.close();
    }
}