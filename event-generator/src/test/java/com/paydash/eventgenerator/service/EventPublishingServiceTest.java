package com.paydash.eventgenerator.service;

import com.paydash.eventgenerator.model.BatchEvent;
import com.paydash.eventgenerator.model.BatchEvent.BatchPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
class EventPublishingServiceTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private EventPublishingService eventPublishingService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        eventPublishingService = new EventPublishingService(kafkaTemplate);
    }

    @Test
    void shouldPublishBatchEventToKafka() {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("records", "5");
        metadata.put("source", "test");
        
        BatchPayload payload = new BatchPayload();
        payload.setObjectId(UUID.randomUUID().toString());
        payload.setObjectType("batch");
        payload.setStatus("RECEIVED");
        payload.setOutcome("");
        payload.setMetadata(metadata);
        payload.setCreated(LocalDateTime.now());
        payload.setUpdated(LocalDateTime.now());
        
        BatchEvent event = new BatchEvent("OBJECT_CREATED", LocalDateTime.now(), payload);

        eventPublishingService.publishBatchEvent(event);

        verify(kafkaTemplate, times(1)).send(eq("batch-events"), any(BatchEvent.class));
    }
}