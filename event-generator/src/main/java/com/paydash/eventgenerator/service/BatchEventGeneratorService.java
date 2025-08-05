package com.paydash.eventgenerator.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.paydash.eventgenerator.model.BatchEvent;

@Service
public class BatchEventGeneratorService {
    
    private static final Logger logger = LoggerFactory.getLogger(BatchEventGeneratorService.class);
    
    private final EventPublishingService eventPublishingService;
    private final Random random = new Random();
    
    private final Map<String, BatchEvent.BatchPayload> activeObjects = new ConcurrentHashMap<>();
    
    private final String[] statuses = {"RECEIVED", "VALIDATING", "ENRICHING", "PROCESSING", "COMPLETE", "INVALID"};
    
    @Value("${app.batch.creation.enabled:true}")
    private boolean batchCreationEnabled;
    
    @Value("${app.batch.update.enabled:true}")
    private boolean batchUpdateEnabled;
    
    public BatchEventGeneratorService(EventPublishingService eventPublishingService) {
        this.eventPublishingService = eventPublishingService;
    }
    
    @Scheduled(fixedDelayString = "${app.batch.creation.interval:45000}") // 45 seconds default
    public void generateNewBatchObject() {
        if (!batchCreationEnabled) {
            return;
        }
        
        try {
            String objectId = UUID.randomUUID().toString();
            LocalDateTime now = LocalDateTime.now();
            
            Map<String, String> metadata = new HashMap<>();
            metadata.put("records", String.valueOf(random.nextInt(10) + 1));
            metadata.put("source", "automated");
            metadata.put("batch", String.valueOf(random.nextInt(1000)));
            metadata.put("priority", random.nextBoolean() ? "high" : "normal");
            
            BatchEvent.BatchPayload payload = new BatchEvent.BatchPayload(
                objectId,
                "batch",
                "RECEIVED",
                "-",
                metadata,
                now,
                now
            );
            
            BatchEvent event = new BatchEvent("OBJECT_CREATED", now, payload);
            
            activeObjects.put(objectId, payload);
            eventPublishingService.publishBatchEvent(event);
            
            // Generate item audit events for the initial batch creation
            generateItemAuditEvents(payload, "CREATED", "RECEIVED");
            
            logger.info("Generated new batch object: {} with {} records", 
                objectId, metadata.get("records"));
            
        } catch (Exception e) {
            logger.error("Error generating new batch object", e);
        }
    }
    
    @Scheduled(fixedDelayString = "${app.batch.update.interval:25000}") // 25 seconds default
    public void updateExistingBatchObject() {
        if (!batchUpdateEnabled || activeObjects.isEmpty()) {
            return;
        }
        
        try {
            String[] objectIds = activeObjects.keySet().toArray(new String[0]);
            String selectedObjectId = objectIds[random.nextInt(objectIds.length)];
            
            BatchEvent.BatchPayload existingPayload = activeObjects.get(selectedObjectId);
            if (existingPayload == null || isTerminalStatus(existingPayload.getStatus())) {
                return;
            }
            
            String newStatus = getNextStatus(existingPayload.getStatus());
            String newOutcome = getOutcomeForStatus(newStatus);
            LocalDateTime now = LocalDateTime.now();
            
            BatchEvent.BatchPayload updatedPayload = new BatchEvent.BatchPayload(
                existingPayload.getObjectId(),
                existingPayload.getObjectType(),
                newStatus,
                newOutcome,
                existingPayload.getMetadata(),
                existingPayload.getCreated(),
                now
            );
            
            BatchEvent event = new BatchEvent("OBJECT_UPDATED", now, updatedPayload);
            
            activeObjects.put(selectedObjectId, updatedPayload);
            eventPublishingService.publishBatchEvent(event);
            
            // Generate item audit events for this batch status change
            generateItemAuditEvents(updatedPayload, "UPDATED", newStatus);
            
            logger.info("Updated batch object: {} from {} to {}", 
                selectedObjectId, existingPayload.getStatus(), newStatus);
            
            if (isTerminalStatus(newStatus)) {
                activeObjects.remove(selectedObjectId);
                logger.info("Batch object {} reached terminal status: {}", selectedObjectId, newStatus);
            }
            
        } catch (Exception e) {
            logger.error("Error updating batch object", e);
        }
    }
    
    private String getNextStatus(String currentStatus) {
        return switch (currentStatus) {
            case "RECEIVED" -> "VALIDATING";
            case "VALIDATING" -> random.nextBoolean() ? "INVALID" : "ENRICHING";
            case "ENRICHING" -> "PROCESSING";
            case "PROCESSING" -> "COMPLETE";
            default -> currentStatus;
        };
    }
    
    private String getOutcomeForStatus(String status) {
        return switch (status) {
            case "INVALID" -> "FAILURE";
            case "COMPLETE" -> "SUCCESS";
            default -> "-";
        };
    }
    
    private boolean isTerminalStatus(String status) {
        return "INVALID".equals(status) || "COMPLETE".equals(status);
    }
    
    private void generateItemAuditEvents(BatchEvent.BatchPayload batchPayload, String action, String newStatus) {
        try {
            int recordCount = Integer.parseInt(batchPayload.getMetadata().getOrDefault("records", "1"));
            List<BatchEvent> itemEvents = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            
            for (int i = 1; i <= recordCount; i++) {
                String itemId = String.format("%s-%04d", batchPayload.getObjectId(), i);
                
                Map<String, String> itemMetadata = new HashMap<>(batchPayload.getMetadata());
                itemMetadata.put("parent_id", batchPayload.getObjectId());
                itemMetadata.put("parent_type", "batch");
                itemMetadata.put("item_sequence", String.valueOf(i));
                
                BatchEvent.BatchPayload itemPayload = new BatchEvent.BatchPayload(
                    itemId,
                    "item",
                    newStatus,
                    batchPayload.getOutcome(),
                    itemMetadata,
                    batchPayload.getCreated(), // Keep original creation time for items
                    now // Update time is current
                );
                
                BatchEvent itemEvent = new BatchEvent("ITEM_" + action, now, itemPayload);
                itemEvents.add(itemEvent);
            }
            
            // Publish all item events
            eventPublishingService.publishItemAuditEvents(itemEvents);
            
            logger.info("Generated {} item audit events for batch {} with status {}", 
                recordCount, batchPayload.getObjectId(), newStatus);
                
        } catch (Exception e) {
            logger.error("Error generating item audit events for batch {}: {}", 
                batchPayload.getObjectId(), e.getMessage(), e);
        }
    }
}