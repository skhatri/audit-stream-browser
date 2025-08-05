package com.paydash.eventprocessor;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

class SimpleEventProcessorJobTest {

    private SimpleEventProcessorJob eventProcessorJob;

    @BeforeEach
    void setUp() {
        eventProcessorJob = new SimpleEventProcessorJob();
    }

    @Test
    void shouldInitializeEventProcessorJob() {
        assertNotNull(eventProcessorJob);
    }

    @Test
    void shouldHaveMainMethod() throws Exception {
        String[] args = {};
        SimpleEventProcessorJob.main(args);
    }
}