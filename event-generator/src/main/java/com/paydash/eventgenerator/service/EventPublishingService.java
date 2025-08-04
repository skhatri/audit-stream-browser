package com.paydash.eventgenerator.service;

import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import com.paydash.eventgenerator.model.BatchEvent;

@Service
public class EventPublishingService {
    
    private static final Logger logger = LoggerFactory.getLogger(EventPublishingService.class);
    
    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    @Value("${app.kafka.topic.batch-events:batch-events}")
    private String batchEventsTopic;
    
    public EventPublishingService(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    
    public void publishBatchEvent(BatchEvent event) {
        try {
            String key = event.getPayload().getObjectId();
            
            CompletableFuture<SendResult<String, Object>> future = 
                kafkaTemplate.send(batchEventsTopic, key, event);
            
            future.whenComplete((result, exception) -> {
                if (exception == null) {
                    logger.info("Published batch event: {} for object: {} to topic: {} at offset: {}",
                        event.getEventType(), key, batchEventsTopic, result.getRecordMetadata().offset());
                } else {
                    logger.error("Failed to publish batch event: {} for object: {} to topic: {}",
                        event.getEventType(), key, batchEventsTopic, exception);
                }
            });
        } catch (Exception e) {
            logger.error("Error publishing batch event: {}", event.getEventType(), e);
            throw new RuntimeException("Failed to publish event", e);
        }
    }
}