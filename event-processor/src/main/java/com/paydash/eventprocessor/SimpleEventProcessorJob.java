package com.paydash.eventprocessor;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.paydash.eventprocessor.config.FlinkConfig;
import com.paydash.eventprocessor.model.BatchEvent;
import com.paydash.eventprocessor.sink.CassandraSinkFunction;
import com.paydash.eventprocessor.sink.ClickHouseSinkFunction;
import com.paydash.eventprocessor.sink.RedisSinkFunction;

public class SimpleEventProcessorJob {
    
    private static final Logger logger = LoggerFactory.getLogger(SimpleEventProcessorJob.class);
    
    public static void main(String[] args) throws Exception {
        
        logger.info("Starting Simple Event Processor Job");
        
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, FlinkConfig.KAFKA_BOOTSTRAP_SERVERS);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, FlinkConfig.KAFKA_GROUP_ID);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");
        
        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(FlinkConfig.KAFKA_TOPIC_BATCH_EVENTS));
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        
        RedisSinkFunction redisSink = new RedisSinkFunction();
        CassandraSinkFunction cassandraSink = new CassandraSinkFunction();
        ClickHouseSinkFunction clickHouseSink = new ClickHouseSinkFunction();
        
        try {
            redisSink.open(null);
            cassandraSink.open(null);
            clickHouseSink.open(null);
            
            logger.info("Event Processor initialized, starting consumption...");
            
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                
                for (ConsumerRecord<String, String> record : records) {
                    try {
                        String jsonValue = record.value();
                        BatchEvent event = objectMapper.readValue(jsonValue, BatchEvent.class);
                        
                        logger.info("Processing event: {} for object: {}", 
                            event.getEventType(), event.getPayload().getObjectId());
                        
                        redisSink.invoke(event, null);
                        cassandraSink.invoke(event, null);
                        clickHouseSink.invoke(event, null);
                        
                        logger.debug("Successfully processed event: {} for object: {}", 
                            event.getEventType(), event.getPayload().getObjectId());
                            
                    } catch (Exception e) {
                        logger.error("Error processing record: {}", record.value(), e);
                    }
                }
            }
            
        } catch (Exception e) {
            logger.error("Error in event processor", e);
        } finally {
            try {
                redisSink.close();
                cassandraSink.close();
                clickHouseSink.close();
                consumer.close();
            } catch (Exception e) {
                logger.error("Error closing resources", e);
            }
        }
    }
}