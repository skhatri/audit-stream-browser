package com.paydash.eventprocessor.sink;

import java.util.HashMap;
import java.util.Map;

import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.paydash.eventprocessor.config.FlinkConfig;
import com.paydash.eventprocessor.model.BatchEvent;

import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

public class RedisSinkFunction extends RichSinkFunction<BatchEvent> {
    
    private static final Logger logger = LoggerFactory.getLogger(RedisSinkFunction.class);
    
    private transient JedisPool jedisPool;
    private transient ObjectMapper objectMapper;
    
    @Override
    public void open(Configuration parameters) throws Exception {
        super.open(parameters);
        
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(10);
        poolConfig.setMaxIdle(5);
        poolConfig.setMinIdle(1);
        poolConfig.setTestOnBorrow(true);
        
        jedisPool = new JedisPool(poolConfig, FlinkConfig.REDIS_HOST, FlinkConfig.REDIS_PORT);
        
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        
        logger.info("RedisSinkFunction initialized successfully");
    }
    
    @Override
    public void invoke(BatchEvent event, Context context) throws Exception {
        try (Jedis jedis = jedisPool.getResource()) {
            BatchEvent.BatchPayload payload = event.getPayload();
            
            if (!"batch".equals(payload.getObjectType())) {
                logger.debug("Skipping non-batch object: {} (type: {})", payload.getObjectId(), payload.getObjectType());
                return;
            }
            
            String objectKey = "queue:object:" + payload.getObjectId();
            
            Map<String, String> queueObject = new HashMap<>();
            queueObject.put("objectId", payload.getObjectId());
            queueObject.put("objectType", payload.getObjectType());
            queueObject.put("status", payload.getStatus());
            queueObject.put("outcome", payload.getOutcome() != null ? payload.getOutcome() : "");
            queueObject.put("created", payload.getCreated().toString());
            queueObject.put("updated", payload.getUpdated().toString());
            queueObject.put("records", payload.getMetadata() != null ? 
                payload.getMetadata().getOrDefault("records", "0") : "0");
            queueObject.put("metadata", payload.getMetadata() != null ? 
                objectMapper.writeValueAsString(payload.getMetadata()) : "{}");
            
            jedis.hset(objectKey, queueObject);
            
            double score = System.currentTimeMillis() / 1000.0;
            jedis.zadd("queue:objects", score, payload.getObjectId());
            
            logger.debug("Successfully stored batch object in Redis: {}", payload.getObjectId());
            
        } catch (Exception e) {
            logger.error("Error storing object in Redis: {}", event.getPayload().getObjectId(), e);
            throw e;
        }
    }
    
    @Override
    public void close() throws Exception {
        if (jedisPool != null) {
            jedisPool.close();
            logger.info("RedisSinkFunction closed");
        }
        super.close();
    }
}