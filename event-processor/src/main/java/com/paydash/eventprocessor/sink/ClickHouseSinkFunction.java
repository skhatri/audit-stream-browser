package com.paydash.eventprocessor.sink;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.clickhouse.jdbc.ClickHouseDataSource;
import com.paydash.eventprocessor.config.FlinkConfig;
import com.paydash.eventprocessor.model.BatchEvent;
import com.paydash.eventprocessor.model.MetricsEvent;

public class ClickHouseSinkFunction extends RichSinkFunction<BatchEvent> {
    
    private static final Logger logger = LoggerFactory.getLogger(ClickHouseSinkFunction.class);
    
    private static final int BATCH_SIZE = 100;
    private static final long FLUSH_INTERVAL_MS = 5000;
    
    private transient ClickHouseDataSource dataSource;
    private transient List<MetricsEvent> metricsBuffer;
    private transient ScheduledExecutorService executorService;
    private transient AtomicLong lastFlushTime;
    private transient AtomicLong eventsReceived;
    private transient AtomicLong eventsWritten;
    private transient AtomicLong writeErrors;
    
    @Override
    public void open(Configuration parameters) throws Exception {
        super.open(parameters);
        
        String url = String.format("jdbc:clickhouse://%s:%d/default", 
                                   FlinkConfig.CLICKHOUSE_HOST, 
                                   FlinkConfig.CLICKHOUSE_PORT);
        
        dataSource = new ClickHouseDataSource(url);
        metricsBuffer = new ArrayList<>();
        executorService = Executors.newScheduledThreadPool(2);
        lastFlushTime = new AtomicLong(System.currentTimeMillis());
        eventsReceived = new AtomicLong(0);
        eventsWritten = new AtomicLong(0);
        writeErrors = new AtomicLong(0);
        
        executorService.scheduleAtFixedRate(
            this::flushIfNeeded, 
            FLUSH_INTERVAL_MS, 
            FLUSH_INTERVAL_MS, 
            TimeUnit.MILLISECONDS
        );
        
        executorService.scheduleAtFixedRate(
            this::logStats,
            30, 30, TimeUnit.SECONDS
        );
        
        logger.info("ClickHouseSinkFunction initialized successfully with batch size {} and flush interval {}ms", 
                   BATCH_SIZE, FLUSH_INTERVAL_MS);
    }
    
    @Override
    public void invoke(BatchEvent event, Context context) throws Exception {
        eventsReceived.incrementAndGet();
        
        if (!isAuditCompletionEvent(event)) {
            return;
        }
        
        try {
            MetricsEvent metricsEvent = createMetricsEvent(event);
            if (metricsEvent != null) {
                synchronized (metricsBuffer) {
                    metricsBuffer.add(metricsEvent);
                    
                    if (metricsBuffer.size() >= BATCH_SIZE) {
                        flushBufferAsync();
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error creating metrics event from batch event: {}", event.getPayload().getObjectId(), e);
            writeErrors.incrementAndGet();
        }
    }
    
    private boolean isAuditCompletionEvent(BatchEvent event) {
        BatchEvent.BatchPayload payload = event.getPayload();
        if (payload == null) {
            return false;
        }
        
        if (!"item".equals(payload.getObjectType())) {
            return false;
        }
        
        String status = payload.getStatus();
        return "COMPLETE".equals(status) || "INVALID".equals(status);
    }
    
    private MetricsEvent createMetricsEvent(BatchEvent batchEvent) {
        BatchEvent.BatchPayload payload = batchEvent.getPayload();
        Map<String, String> metadata = payload.getMetadata();
        
        if (metadata == null) {
            logger.warn("No metadata found for audit event: {}", payload.getObjectId());
            return null;
        }
        
        try {
            String companyName = extractCompanyName(metadata);
            String companyId = metadata.get("company_id");
            
            if (companyId == null && companyName != null) {
                companyId = companyName.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            }
            
            BigDecimal amount = parseAmount(metadata.get("amount"));
            
            long processingTime = calculateProcessingTime(payload);
            
            return MetricsEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .auditId(payload.getObjectId())
                    .batchId(extractBatchId(metadata))
                    .companyId(companyId != null ? companyId : "UNKNOWN")
                    .companyName(companyName != null ? companyName : "Unknown Company")
                    .amount(amount != null ? amount : BigDecimal.ZERO)
                    .status(payload.getStatus())
                    .outcome(payload.getOutcome())
                    .completedAt(Instant.now())
                    .processingTimeMs(processingTime)
                    .build();
                    
        } catch (Exception e) {
            logger.error("Error creating metrics event for audit: {}", payload.getObjectId(), e);
            return null;
        }
    }
    
    private String extractCompanyName(Map<String, String> metadata) {
        String summary = metadata.get("summary");
        if (summary != null && !summary.trim().isEmpty()) {
            return summary.trim();
        }
        
        String company = metadata.get("company");
        if (company != null && !company.trim().isEmpty()) {
            return company.trim();
        }
        
        String companyName = metadata.get("company_name");
        if (companyName != null && !companyName.trim().isEmpty()) {
            return companyName.trim();
        }
        
        String companyId = metadata.get("company_id");
        return companyId != null ? "Company " + companyId : null;
    }
    
    private String extractBatchId(Map<String, String> metadata) {
        String batchId = metadata.get("batch_id");
        return batchId != null ? batchId : metadata.get("parent_id");
    }
    
    private BigDecimal parseAmount(String amountStr) {
        if (amountStr == null || amountStr.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }
        
        try {
            String cleanAmount = amountStr.replaceAll("[^\\d.]", "");
            return new BigDecimal(cleanAmount);
        } catch (NumberFormatException e) {
            logger.warn("Failed to parse amount: {}", amountStr);
            return BigDecimal.ZERO;
        }
    }
    
    private long calculateProcessingTime(BatchEvent.BatchPayload payload) {
        if (payload.getCreated() != null && payload.getUpdated() != null) {
            return Duration.between(payload.getCreated(), payload.getUpdated()).toMillis();
        }
        return 0;
    }
    
    private void flushIfNeeded() {
        synchronized (metricsBuffer) {
            long timeSinceLastFlush = System.currentTimeMillis() - lastFlushTime.get();
            if (!metricsBuffer.isEmpty() && timeSinceLastFlush >= FLUSH_INTERVAL_MS) {
                flushBufferAsync();
            }
        }
    }
    
    private void flushBufferAsync() {
        List<MetricsEvent> eventsToFlush;
        synchronized (metricsBuffer) {
            if (metricsBuffer.isEmpty()) {
                return;
            }
            eventsToFlush = new ArrayList<>(metricsBuffer);
            metricsBuffer.clear();
            lastFlushTime.set(System.currentTimeMillis());
        }
        
        CompletableFuture.runAsync(() -> {
            try {
                writeEventsToClickHouse(eventsToFlush);
                eventsWritten.addAndGet(eventsToFlush.size());
                logger.debug("Successfully wrote {} events to ClickHouse", eventsToFlush.size());
            } catch (Exception e) {
                logger.error("Failed to write {} events to ClickHouse", eventsToFlush.size(), e);
                writeErrors.addAndGet(eventsToFlush.size());
            }
        }, executorService).exceptionally(throwable -> {
            logger.error("Async write to ClickHouse failed", throwable);
            writeErrors.addAndGet(eventsToFlush.size());
            return null;
        });
    }
    
    private void writeEventsToClickHouse(List<MetricsEvent> events) throws Exception {
        String insertSql = """
            INSERT INTO audit_completions (
                event_id, audit_id, batch_id, company_id, company_name, 
                amount, status, outcome, completed_at, processing_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;
        
        try (Connection connection = dataSource.getConnection();
             PreparedStatement stmt = connection.prepareStatement(insertSql)) {
             
            for (MetricsEvent event : events) {
                stmt.setString(1, event.getEventId());
                stmt.setString(2, event.getAuditId());
                stmt.setString(3, event.getBatchId());
                stmt.setString(4, event.getCompanyId());
                stmt.setString(5, event.getCompanyName());
                stmt.setBigDecimal(6, event.getAmount());
                stmt.setString(7, event.getStatus());
                stmt.setString(8, event.getOutcome());
                
                Timestamp completedAt = event.getCompletedAt() != null ? 
                    Timestamp.from(event.getCompletedAt()) : 
                    Timestamp.from(Instant.now());
                stmt.setTimestamp(9, completedAt);
                
                stmt.setLong(10, event.getProcessingTimeMs());
                
                stmt.addBatch();
            }
            
            stmt.executeBatch();
        }
    }
    
    private void logStats() {
        long received = eventsReceived.get();
        long written = eventsWritten.get();
        long errors = writeErrors.get();
        
        logger.info("ClickHouse Sink Stats - Received: {}, Written: {}, Errors: {}, Buffer: {}", 
                   received, written, errors, metricsBuffer.size());
    }
    
    @Override
    public void close() throws Exception {
        logger.info("Closing ClickHouse sink function...");
        
        synchronized (metricsBuffer) {
            if (!metricsBuffer.isEmpty()) {
                try {
                    writeEventsToClickHouse(metricsBuffer);
                    eventsWritten.addAndGet(metricsBuffer.size());
                    logger.info("Flushed {} remaining events during close", metricsBuffer.size());
                } catch (Exception e) {
                    logger.error("Failed to flush remaining events during close", e);
                }
            }
        }
        
        if (executorService != null) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(10, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        
        logStats();
        logger.info("ClickHouseSinkFunction closed");
        super.close();
    }
}