package com.paydash.eventgenerator.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
class BatchEventGeneratorServiceTest {

    @Mock
    private EventPublishingService eventPublishingService;

    private BatchEventGeneratorService batchEventGeneratorService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        batchEventGeneratorService = new BatchEventGeneratorService(eventPublishingService);
    }

    @Test
    void shouldCreateBatchEventGeneratorService() {
        assertNotNull(batchEventGeneratorService);
    }

    @Test
    void shouldHaveEventPublishingService() {
        assertNotNull(eventPublishingService);
    }
}