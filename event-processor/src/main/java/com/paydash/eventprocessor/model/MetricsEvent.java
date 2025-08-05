package com.paydash.eventprocessor.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

public class MetricsEvent {
    
    private String eventId;
    private String auditId;
    private String batchId;
    private String companyId;
    private String companyName;
    private BigDecimal amount;
    private String status;
    private String outcome;
    private Instant completedAt;
    private long processingTimeMs;
    
    public MetricsEvent() {}
    
    private MetricsEvent(Builder builder) {
        this.eventId = builder.eventId;
        this.auditId = builder.auditId;
        this.batchId = builder.batchId;
        this.companyId = builder.companyId;
        this.companyName = builder.companyName;
        this.amount = builder.amount;
        this.status = builder.status;
        this.outcome = builder.outcome;
        this.completedAt = builder.completedAt;
        this.processingTimeMs = builder.processingTimeMs;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String eventId;
        private String auditId;
        private String batchId;
        private String companyId;
        private String companyName;
        private BigDecimal amount;
        private String status;
        private String outcome;
        private Instant completedAt;
        private long processingTimeMs;
        
        public Builder eventId(String eventId) {
            this.eventId = eventId;
            return this;
        }
        
        public Builder auditId(String auditId) {
            this.auditId = auditId;
            return this;
        }
        
        public Builder batchId(String batchId) {
            this.batchId = batchId;
            return this;
        }
        
        public Builder companyId(String companyId) {
            this.companyId = companyId;
            return this;
        }
        
        public Builder companyName(String companyName) {
            this.companyName = companyName;
            return this;
        }
        
        public Builder amount(BigDecimal amount) {
            this.amount = amount;
            return this;
        }
        
        public Builder status(String status) {
            this.status = status;
            return this;
        }
        
        public Builder outcome(String outcome) {
            this.outcome = outcome;
            return this;
        }
        
        public Builder completedAt(Instant completedAt) {
            this.completedAt = completedAt;
            return this;
        }
        
        public Builder processingTimeMs(long processingTimeMs) {
            this.processingTimeMs = processingTimeMs;
            return this;
        }
        
        public MetricsEvent build() {
            return new MetricsEvent(this);
        }
    }
    
    public String getEventId() { return eventId; }
    public String getAuditId() { return auditId; }
    public String getBatchId() { return batchId; }
    public String getCompanyId() { return companyId; }
    public String getCompanyName() { return companyName; }
    public BigDecimal getAmount() { return amount; }
    public String getStatus() { return status; }
    public String getOutcome() { return outcome; }
    public Instant getCompletedAt() { return completedAt; }
    public long getProcessingTimeMs() { return processingTimeMs; }
    
    public LocalDateTime getCompletedAtAsLocalDateTime() {
        return completedAt != null ? LocalDateTime.ofInstant(completedAt, ZoneOffset.UTC) : null;
    }
    
    @Override
    public String toString() {
        return "MetricsEvent{" +
                "eventId='" + eventId + '\'' +
                ", auditId='" + auditId + '\'' +
                ", companyName='" + companyName + '\'' +
                ", amount=" + amount +
                ", status='" + status + '\'' +
                ", outcome='" + outcome + '\'' +
                ", completedAt=" + completedAt +
                '}';
    }
}