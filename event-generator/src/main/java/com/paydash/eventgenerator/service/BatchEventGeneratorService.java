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
    
    private final Map<String, Map<String, String>> originalMetadataCache = new ConcurrentHashMap<>();
    
    private final String[] statuses = {"RECEIVED", "VALIDATING", "ENRICHING", "PROCESSING", "COMPLETE", "INVALID"};
    
    private static final Map<String, List<String>> COMPANIES_BY_REGION = Map.of(
        "US", List.of(
            "Verizon Communications", "AT&T Inc", "T-Mobile US", "Comcast Corporation",
            "Charter Communications", "Sprint Corporation", "CenturyLink",
            
            "Kinder Morgan", "Enterprise Products Partners", "Enbridge Inc", 
            "TC Energy", "Williams Companies", "Oneok Inc", "Sempra Energy",
            
            "Berkshire Hathaway", "Progressive Corporation", "Allstate Corporation",
            "Travelers Companies", "Liberty Mutual", "Farmers Insurance", "USAA"
        ),
        
        "AU", List.of(
            "Telstra Corporation", "Optus", "Vodafone Australia", "TPG Telecom",
            "iiNet", "Aussie Broadband", "Southern Phone",
            
            "AGL Energy", "Origin Energy", "EnergyAustralia", "Alinta Energy",
            "Red Energy", "Simply Energy", "Powershop Australia",
            
            "Suncorp Group", "IAG Group",
            "QBE Insurance", "Allianz Australia", "NRMA Insurance", "RACV"
        ),
        
        "UK", List.of(
            "BT Group", "Vodafone UK", "EE Limited", "Three UK", "O2 UK",
            "Sky UK", "Virgin Media", "TalkTalk", "Plusnet",
            
            "British Gas", "E.ON UK", "EDF Energy", "Scottish Power", 
            "npower", "SSE", "Bulb Energy", "Octopus Energy",
            
            "Aviva", "Legal & General", "Admiral Group", "Direct Line Group",
            "RSA Insurance", "Hastings Group", "LV= General Insurance"
        )
    );
    
    private String lastSelectedRegion = "US";
    
    @Value("${app.batch.creation.enabled:true}")
    private boolean batchCreationEnabled;
    
    @Value("${app.batch.update.enabled:true}")
    private boolean batchUpdateEnabled;
    
    @Value("${BATCH_SIZE_MIN:2}")
    private int batchSizeMin;
    
    @Value("${BATCH_SIZE_MAX:5}")
    private int batchSizeMax;
    
    public BatchEventGeneratorService(EventPublishingService eventPublishingService) {
        this.eventPublishingService = eventPublishingService;
    }
    
    private double generateAmount() {
        double randomValue = this.random.nextDouble();
        
        if (randomValue < 0.70) {
            double mean = 65.0;
            double stdDev = 8.0;
            double amount = this.random.nextGaussian() * stdDev + mean;
            return Math.max(50.0, Math.min(80.0, amount));
        } else if (randomValue < 0.90) {
            return 20.0 + (this.random.nextDouble() * 29.0);
        } else {
            return 81.0 + (this.random.nextDouble() * 119.0);
        }
    }
    
    private String generateCompanySummary() {
        String[] regions = {"US", "AU", "UK"};
        String selectedRegion = regions[random.nextInt(regions.length)];
        
        List<String> companies = COMPANIES_BY_REGION.get(selectedRegion);
        String company = companies.get(random.nextInt(companies.size()));
        
        lastSelectedRegion = selectedRegion;
        
        return company;
    }
    
    private Map<String, String> addCurrencyInfo(String region, double amount) {
        Map<String, String> currencyInfo = new HashMap<>();
        
        switch (region) {
            case "US" -> {
                currencyInfo.put("currency", "USD");
                currencyInfo.put("amount", String.format("%.2f", amount));
                currencyInfo.put("formatted_amount", String.format("$%.2f", amount));
            }
            case "AU" -> {
                currencyInfo.put("currency", "AUD");
                currencyInfo.put("amount", String.format("%.2f", amount));
                currencyInfo.put("formatted_amount", String.format("A$%.2f", amount));
            }
            case "UK" -> {
                currencyInfo.put("currency", "GBP");
                currencyInfo.put("amount", String.format("%.2f", amount));
                currencyInfo.put("formatted_amount", String.format("£%.2f", amount));
            }
            default -> {
                currencyInfo.put("currency", "USD");
                currencyInfo.put("amount", String.format("%.2f", amount));
                currencyInfo.put("formatted_amount", String.format("$%.2f", amount));
            }
        }
        
        return currencyInfo;
    }
    
    private Map<String, String> generateEnhancedMetadata() {
        Map<String, String> metadata = new HashMap<>();
        int recordCount = batchSizeMin + random.nextInt(batchSizeMax - batchSizeMin + 1);
        metadata.put("records", String.valueOf(recordCount));
        metadata.put("source", "automated");
        metadata.put("batch", String.valueOf(random.nextInt(1000)));
        metadata.put("priority", random.nextBoolean() ? "high" : "normal");
        
        double amount = generateAmount();
        String summary = generateCompanySummary();
        String region = lastSelectedRegion;
        
        metadata.put("summary", summary);
        metadata.put("region", region);
        
        Map<String, String> currencyInfo = addCurrencyInfo(region, amount);
        metadata.putAll(currencyInfo);
        
        return metadata;
    }
    
    @Scheduled(fixedDelayString = "${app.batch.creation.interval:65000}")
    public void generateNewBatchObject() {
        if (!batchCreationEnabled) {
            return;
        }
        
        try {
            String objectId = UUID.randomUUID().toString();
            LocalDateTime now = LocalDateTime.now();
            
            Map<String, String> metadata = generateEnhancedMetadata();
            
            validateBatchMetadata(objectId, metadata);
            
            originalMetadataCache.put(objectId, new HashMap<>(metadata));
            
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
            
            generateItemAuditEvents(payload, "CREATED", "RECEIVED");
            
            logger.info("Generated new batch object: {} with {} records, amount: {}, company: {}", 
                objectId, metadata.get("records"), metadata.get("formatted_amount"), metadata.get("summary"));
            
        } catch (Exception e) {
            logger.error("Error generating new batch object", e);
        }
    }
    
    @Scheduled(fixedDelayString = "${app.batch.update.interval:45000}")
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
            
            Map<String, String> preservedMetadata = originalMetadataCache.get(selectedObjectId);
            if (preservedMetadata == null) {
                logger.warn("Original metadata not found for batch {}, using existing metadata", selectedObjectId);
                preservedMetadata = existingPayload.getMetadata();
            }
            
            BatchEvent.BatchPayload updatedPayload = new BatchEvent.BatchPayload(
                existingPayload.getObjectId(),
                existingPayload.getObjectType(),
                newStatus,
                newOutcome,
                preservedMetadata,
                existingPayload.getCreated(),
                now
            );
            
            BatchEvent event = new BatchEvent("OBJECT_UPDATED", now, updatedPayload);
            
            activeObjects.put(selectedObjectId, updatedPayload);
            eventPublishingService.publishBatchEvent(event);
            
            generateItemAuditEvents(updatedPayload, "UPDATED", newStatus);
            
            logger.info("Updated batch object: {} from {} to {} (preserving amount: {}, company: {})", 
                selectedObjectId, existingPayload.getStatus(), newStatus,
                preservedMetadata.get("formatted_amount"), preservedMetadata.get("summary"));
            
            if (isTerminalStatus(newStatus)) {
                originalMetadataCache.remove(selectedObjectId);
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
    
    private List<Double> distributeAmount(double batchAmount, int itemCount) {
        List<Double> amounts = new ArrayList<>();
        
        long totalCents = Math.round(batchAmount * 100);
        
        long baseCentsPerItem = totalCents / itemCount;
        long remainderCents = totalCents % itemCount;
        
        for (int i = 0; i < itemCount; i++) {
            amounts.add(baseCentsPerItem / 100.0);
        }
        
        for (int i = 0; i < remainderCents; i++) {
            amounts.set(i, amounts.get(i) + 0.01);
        }
        
        return amounts;
    }
    
    private void generateItemAuditEvents(BatchEvent.BatchPayload batchPayload, String action, String newStatus) {
        try {
            int recordCount = Integer.parseInt(batchPayload.getMetadata().getOrDefault("records", "1"));
            double batchAmount = Double.parseDouble(batchPayload.getMetadata().getOrDefault("amount", "0.0"));
            String currency = batchPayload.getMetadata().getOrDefault("currency", "USD");
            String region = batchPayload.getMetadata().getOrDefault("region", "US");
            
            List<Double> itemAmounts = distributeAmount(batchAmount, recordCount);
            
            List<BatchEvent> itemEvents = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            
            for (int i = 1; i <= recordCount; i++) {
                String itemId = String.format("%s-%04d", batchPayload.getObjectId(), i);
                double itemAmount = itemAmounts.get(i - 1);
                
                Map<String, String> itemMetadata = new HashMap<>(batchPayload.getMetadata());
                
                itemMetadata.put("amount", String.format("%.2f", itemAmount));
                itemMetadata.put("records", "1");
                itemMetadata.put("parent_id", batchPayload.getObjectId());
                itemMetadata.put("parent_type", "batch");
                itemMetadata.put("item_sequence", String.valueOf(i));
                itemMetadata.put("item_count", String.valueOf(recordCount));
                itemMetadata.put("batch_total", String.format("%.2f", batchAmount));
                
                Map<String, String> itemCurrencyInfo = addCurrencyInfo(region, itemAmount);
                itemMetadata.putAll(itemCurrencyInfo);
                
                Map<String, String> batchCurrencyInfo = addCurrencyInfo(region, batchAmount);
                itemMetadata.put("batch_formatted_total", batchCurrencyInfo.get("formatted_amount"));
                
                itemMetadata.put("description", itemMetadata.get("summary"));
                itemMetadata.put("company", itemMetadata.get("summary"));
                
                String industry = getIndustryFromCompany(itemMetadata.get("summary"));
                itemMetadata.put("industry", industry);
                
                BatchEvent.BatchPayload itemPayload = new BatchEvent.BatchPayload(
                    itemId,
                    "item",
                    newStatus,
                    batchPayload.getOutcome(),
                    itemMetadata,
                    batchPayload.getCreated(),
                    now
                );
                
                BatchEvent itemEvent = new BatchEvent("ITEM_" + action, now, itemPayload);
                itemEvents.add(itemEvent);
            }
            
            List<Map<String, String>> itemMetadataList = itemEvents.stream()
                .map(event -> event.getPayload().getMetadata())
                .toList();
            validateItemAmountDistribution(batchPayload.getObjectId(), itemMetadataList, batchAmount);
            
            eventPublishingService.publishItemAuditEvents(itemEvents);
            
            logger.info("Generated {} item audit events for batch {} with status {} (amounts: {} → total: {})", 
                recordCount, batchPayload.getObjectId(), newStatus, 
                itemAmounts.stream().map(a -> String.format("%.2f", a)).toList(), 
                String.format("%.2f", batchAmount));
                
        } catch (Exception e) {
            logger.error("Error generating item audit events for batch {}: {}", 
                batchPayload.getObjectId(), e.getMessage(), e);
        }
    }
    
    private void validateBatchMetadata(String objectId, Map<String, String> metadata) {
        assert metadata.containsKey("amount") : "Batch metadata must contain amount field for " + objectId;
        assert metadata.containsKey("summary") : "Batch metadata must contain summary field for " + objectId;
        assert metadata.containsKey("currency") : "Batch metadata must contain currency field for " + objectId;
        assert metadata.containsKey("region") : "Batch metadata must contain region field for " + objectId;
        
        try {
            double amount = Double.parseDouble(metadata.get("amount"));
            assert amount > 0 : "Batch amount must be positive for " + objectId;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid amount format in batch metadata for " + objectId);
        }
    }
    
    private void validateItemAmountDistribution(String batchId, List<Map<String, String>> itemMetadata, double batchTotal) {
        double itemSum = itemMetadata.stream()
            .mapToDouble(meta -> Double.parseDouble(meta.get("amount")))
            .sum();
        
        assert Math.abs(itemSum - batchTotal) < 0.01 : 
            String.format("Item amount sum (%.2f) does not match batch total (%.2f) for batch %s", 
                itemSum, batchTotal, batchId);
        
        logger.debug("Amount distribution validation passed for batch {}: items sum {} = batch total {}", 
            batchId, String.format("%.2f", itemSum), String.format("%.2f", batchTotal));
    }

    private String getIndustryFromCompany(String company) {
        if (company == null) return "unknown";
        
        String companyLower = company.toLowerCase();
        
        if (companyLower.contains("telecom") || companyLower.contains("mobile") || 
            companyLower.contains("verizon") || companyLower.contains("at&t") || 
            companyLower.contains("t-mobile") || companyLower.contains("comcast") ||
            companyLower.contains("telstra") || companyLower.contains("optus") ||
            companyLower.contains("vodafone") || companyLower.contains("bt group") ||
            companyLower.contains("ee limited") || companyLower.contains("o2 uk") ||
            companyLower.contains("sky uk") || companyLower.contains("virgin media") ||
            companyLower.contains("sprint") || companyLower.contains("charter")) {
            return "telecom";
        }
        
        if (companyLower.contains("gas") || companyLower.contains("energy") || 
            companyLower.contains("kinder morgan") || companyLower.contains("enterprise products") ||
            companyLower.contains("enbridge") || companyLower.contains("williams") ||
            companyLower.contains("agl energy") || companyLower.contains("origin energy") ||
            companyLower.contains("british gas") || companyLower.contains("e.on") ||
            companyLower.contains("edf energy") || companyLower.contains("scottish power") ||
            companyLower.contains("sse") || companyLower.contains("bulb") ||
            companyLower.contains("octopus") || companyLower.contains("sempra")) {
            return "energy";
        }
        
        if (companyLower.contains("insurance") || companyLower.contains("berkshire hathaway") ||
            companyLower.contains("progressive") || companyLower.contains("allstate") ||
            companyLower.contains("travelers") || companyLower.contains("liberty mutual") ||
            companyLower.contains("farmers") || companyLower.contains("usaa") ||
            companyLower.contains("suncorp") || companyLower.contains("iag group") ||
            companyLower.contains("qbe") || companyLower.contains("allianz") ||
            companyLower.contains("nrma") || companyLower.contains("racv") ||
            companyLower.contains("aviva") || companyLower.contains("legal & general") ||
            companyLower.contains("admiral") || companyLower.contains("direct line") ||
            companyLower.contains("rsa insurance") || companyLower.contains("hastings") ||
            companyLower.contains("lv=")) {
            return "insurance";
        }
        
        return "business";
    }
}