package com.paydash.eventprocessor.model;

import java.time.LocalDateTime;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BatchEvent {
    
    private String eventType;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime timestamp;
    
    private BatchPayload payload;
    
    public BatchEvent() {}
    
    public BatchEvent(String eventType, LocalDateTime timestamp, BatchPayload payload) {
        this.eventType = eventType;
        this.timestamp = timestamp;
        this.payload = payload;
    }
    
    public String getEventType() {
        return eventType;
    }
    
    public void setEventType(String eventType) {
        this.eventType = eventType;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public BatchPayload getPayload() {
        return payload;
    }
    
    public void setPayload(BatchPayload payload) {
        this.payload = payload;
    }
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BatchPayload {
        private String objectId;
        private String objectType;
        private String status;
        private String outcome;
        private Map<String, String> metadata;
        
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
        private LocalDateTime created;
        
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
        private LocalDateTime updated;
        
        public BatchPayload() {}
        
        public BatchPayload(String objectId, String objectType, String status, String outcome,
                           Map<String, String> metadata, LocalDateTime created, LocalDateTime updated) {
            this.objectId = objectId;
            this.objectType = objectType;
            this.status = status;
            this.outcome = outcome;
            this.metadata = metadata;
            this.created = created;
            this.updated = updated;
        }
        
        // Getters and setters
        public String getObjectId() { return objectId; }
        public void setObjectId(String objectId) { this.objectId = objectId; }
        
        public String getObjectType() { return objectType; }
        public void setObjectType(String objectType) { this.objectType = objectType; }
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        
        public String getOutcome() { return outcome; }
        public void setOutcome(String outcome) { this.outcome = outcome; }
        
        public Map<String, String> getMetadata() { return metadata; }
        public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
        
        public LocalDateTime getCreated() { return created; }
        public void setCreated(LocalDateTime created) { this.created = created; }
        
        public LocalDateTime getUpdated() { return updated; }
        public void setUpdated(LocalDateTime updated) { this.updated = updated; }
    }
}