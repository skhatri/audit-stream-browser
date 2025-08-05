-- PayDash Business Metrics Schema
-- Initialize ClickHouse tables and materialized views for real-time metrics

-- Main table for audit completion events
CREATE TABLE IF NOT EXISTS audit_completions (
    event_id String,
    audit_id String,
    batch_id String,
    company_id String,
    company_name String,
    amount Decimal(18,2),
    status Enum8('COMPLETE' = 1, 'INVALID' = 2),
    outcome Enum8('SUCCESS' = 1, 'FAILURE' = 2),
    completed_at DateTime64(3),
    processing_time_ms UInt32,
    event_date Date MATERIALIZED toDate(completed_at),
    event_hour DateTime MATERIALIZED toStartOfHour(completed_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (company_id, completed_at);

-- Materialized view for hourly metrics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_metrics
ENGINE = SummingMergeTree()
ORDER BY (hour, company_id)
AS SELECT
    toStartOfHour(completed_at) as hour,
    company_id,
    company_name,
    count() as event_count,
    sum(amount) as total_amount,
    countIf(outcome = 'SUCCESS') as success_count,
    countIf(outcome = 'FAILURE') as failure_count,
    avg(processing_time_ms) as avg_processing_time_ms
FROM audit_completions
GROUP BY hour, company_id, company_name;

-- Materialized view for daily metrics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics
ENGINE = SummingMergeTree()
ORDER BY (date, company_id)
AS SELECT
    toDate(completed_at) as date,
    company_id,
    company_name,
    count() as event_count,
    sum(amount) as total_amount,
    countIf(outcome = 'SUCCESS') as success_count,
    countIf(outcome = 'FAILURE') as failure_count,
    avg(processing_time_ms) as avg_processing_time_ms
FROM audit_completions
GROUP BY date, company_id, company_name;

-- Table for storing aggregated company metrics (for fast queries)
CREATE TABLE IF NOT EXISTS company_metrics_summary (
    company_id String,
    company_name String,
    total_events UInt64,
    total_amount Decimal(18,2),
    success_events UInt64,
    failure_events UInt64,
    success_rate Float64,
    avg_processing_time_ms Float64,
    last_updated DateTime64(3) DEFAULT now()
) ENGINE = ReplacingMergeTree(last_updated)
ORDER BY company_id;

-- View for today's summary metrics (removed aggregation since it's handled in materialized view)
CREATE VIEW IF NOT EXISTS v_today_summary AS
SELECT
    event_count as total_events,
    total_amount,
    success_count as success_events,
    failure_count as failure_events,
    if(event_count > 0, success_count * 100.0 / event_count, 0) as success_rate,
    if(event_count > 0, total_amount / event_count, 0) as avg_amount_per_event
FROM mv_daily_metrics
WHERE date = today();

-- View for recent events (last 100)
CREATE VIEW IF NOT EXISTS v_recent_events AS
SELECT
    event_id,
    audit_id,
    company_name,
    amount,
    status,
    outcome,
    completed_at,
    processing_time_ms
FROM audit_completions
ORDER BY completed_at DESC
LIMIT 100;