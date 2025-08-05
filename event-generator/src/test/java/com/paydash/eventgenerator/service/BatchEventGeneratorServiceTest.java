package com.paydash.eventgenerator.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;

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