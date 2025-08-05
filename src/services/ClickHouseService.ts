import { createClient, ClickHouseClient } from '@clickhouse/client';
import { logger } from '../utils/logger';

export interface MetricsEvent {
    event_id: string;
    audit_id: string;
    batch_id: string;
    company_id: string;
    company_name: string;
    amount: number;
    status: 'COMPLETE' | 'INVALID';
    outcome: 'SUCCESS' | 'FAILURE';
    completed_at: Date;
    processing_time_ms: number;
}

export interface TodaySummary {
    total_events: number;
    total_amount: number;
    success_events: number;
    failure_events: number;
    success_rate: number;
    avg_amount_per_event: number;
}

export interface CompanyBreakdown {
    company_id: string;
    company_name: string;
    total_events: number;
    total_amount: number;
    success_events: number;
    failure_events: number;
    success_rate: number;
}

export interface HourlyTrend {
    hour: Date;
    event_count: number;
    total_amount: number;
    success_count: number;
    failure_count: number;
}

export interface RecentEvent {
    event_id: string;
    audit_id: string;
    company_name: string;
    amount: number;
    status: string;
    outcome: string;
    completed_at: Date;
    processing_time_ms: number;
}

export interface PerformanceMetrics {
    avg_processing_time: number;
    min_processing_time: number;
    max_processing_time: number;
    percentile_95: number;
    total_processed: number;
}

class ClickHouseService {
    private client: ClickHouseClient;
    private isConnected: boolean = false;

    constructor() {
        const url = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
        
        this.client = createClient({
            host: url,
            database: 'default',
            compression: {
                response: true,
                request: false,
            },
            clickhouse_settings: {
                async_insert: 1,
                wait_for_async_insert: 0,
            },
            request_timeout: 30000,
        });
    }

    async connect(): Promise<void> {
        try {
            // Test connection by running a simple query
            await this.client.query({
                query: 'SELECT 1',
                format: 'JSON',
            });
            this.isConnected = true;
            logger.info('ClickHouse connection established successfully');
        } catch (error) {
            this.isConnected = false;
            logger.error('Failed to connect to ClickHouse:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.close();
            this.isConnected = false;
            logger.info('ClickHouse connection closed');
        } catch (error) {
            logger.error('Error closing ClickHouse connection:', error);
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            if (!this.isConnected) {
                return false;
            }
            
            const result = await this.client.query({
                query: 'SELECT 1',
                format: 'JSON',
            });
            
            const data = await result.json() as any[];
            return data.length > 0;
        } catch (error) {
            logger.error('ClickHouse health check failed:', error);
            return false;
        }
    }

    async getTodaySummary(): Promise<TodaySummary> {
        try {
            const result = await this.client.query({
                query: `
                    SELECT
                        count() as total_events,
                        sum(amount) as total_amount,
                        countIf(outcome = 'SUCCESS') as success_events,
                        countIf(outcome = 'FAILURE') as failure_events,
                        if(count() > 0, countIf(outcome = 'SUCCESS') * 100.0 / count(), 0) as success_rate,
                        if(count() > 0, sum(amount) / count(), 0) as avg_amount_per_event
                    FROM audit_completions
                    WHERE toDate(completed_at) = today()
                `,
                format: 'JSON',
            });

            const data = await result.json() as any;
            const rows = Array.isArray(data) ? data : (data.data || []);
            if (rows.length > 0) {
                return {
                    total_events: Number(rows[0].total_events) || 0,
                    total_amount: Number(rows[0].total_amount) || 0,
                    success_events: Number(rows[0].success_events) || 0,
                    failure_events: Number(rows[0].failure_events) || 0,
                    success_rate: Number(rows[0].success_rate) || 0,
                    avg_amount_per_event: Number(rows[0].avg_amount_per_event) || 0,
                };
            }

            return {
                total_events: 0,
                total_amount: 0,
                success_events: 0,
                failure_events: 0,
                success_rate: 0,
                avg_amount_per_event: 0,
            };
        } catch (error) {
            logger.error('Error fetching today summary:', error);
            throw error;
        }
    }

    async getCompanyBreakdown(): Promise<CompanyBreakdown[]> {
        try {
            const result = await this.client.query({
                query: `
                    SELECT
                        company_id,
                        company_name,
                        count() as total_events,
                        sum(amount) as total_amount,
                        countIf(outcome = 'SUCCESS') as success_events,
                        countIf(outcome = 'FAILURE') as failure_events,
                        if(count() > 0, countIf(outcome = 'SUCCESS') * 100.0 / count(), 0) as success_rate
                    FROM audit_completions
                    WHERE toDate(completed_at) = today()
                    GROUP BY company_id, company_name
                    ORDER BY total_amount DESC
                `,
                format: 'JSON',
            });

            const data = await result.json() as any;
            const rows = Array.isArray(data) ? data : (data.data || []);
            return rows.map((row: any) => ({
                company_id: row.company_id,
                company_name: row.company_name,
                total_events: Number(row.total_events) || 0,
                total_amount: Number(row.total_amount) || 0,
                success_events: Number(row.success_events) || 0,
                failure_events: Number(row.failure_events) || 0,
                success_rate: Number(row.success_rate) || 0,
            }));
        } catch (error) {
            logger.error('Error fetching company breakdown:', error);
            throw error;
        }
    }

    async getHourlyTrends(): Promise<HourlyTrend[]> {
        try {
            const result = await this.client.query({
                query: `
                    SELECT
                        toStartOfHour(completed_at) as hour,
                        count() as event_count,
                        sum(amount) as total_amount,
                        countIf(outcome = 'SUCCESS') as success_count,
                        countIf(outcome = 'FAILURE') as failure_count
                    FROM audit_completions
                    WHERE completed_at >= (now() - INTERVAL 24 HOUR)
                    GROUP BY hour
                    ORDER BY hour ASC
                `,
                format: 'JSON',
            });

            const data = await result.json() as any;
            const rows = Array.isArray(data) ? data : (data.data || []);
            return rows.map((row: any) => ({
                hour: row.hour || new Date().toISOString(),
                event_count: Number(row.event_count) || 0,
                total_amount: Number(row.total_amount) || 0,
                success_count: Number(row.success_count) || 0,
                failure_count: Number(row.failure_count) || 0,
            }));
        } catch (error) {
            logger.error('Error fetching hourly trends:', error);
            throw error;
        }
    }

    async getRecentEvents(limit: number = 50): Promise<RecentEvent[]> {
        try {
            const result = await this.client.query({
                query: `
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
                    LIMIT ${limit}
                `,
                format: 'JSON',
            });

            const data = await result.json() as any;
            const rows = Array.isArray(data) ? data : (data.data || []);
            return rows.map((row: any) => ({
                event_id: row.event_id,
                audit_id: row.audit_id,
                company_name: row.company_name,
                amount: Number(row.amount) || 0,
                status: row.status,
                outcome: row.outcome,
                completed_at: new Date(row.completed_at).toISOString(),
                processing_time_ms: Number(row.processing_time_ms) || 0,
            }));
        } catch (error) {
            logger.error('Error fetching recent events:', error);
            throw error;
        }
    }

    async getPerformanceMetrics(): Promise<PerformanceMetrics> {
        try {
            const result = await this.client.query({
                query: `
                    SELECT
                        avg(processing_time_ms) as avg_processing_time,
                        min(processing_time_ms) as min_processing_time,
                        max(processing_time_ms) as max_processing_time,
                        quantile(0.95)(processing_time_ms) as percentile_95,
                        count() as total_processed
                    FROM audit_completions
                    WHERE completed_at >= (now() - INTERVAL 24 HOUR)
                `,
                format: 'JSON',
            });

            const data = await result.json() as any;
            const rows = Array.isArray(data) ? data : (data.data || []);
            if (rows.length > 0) {
                return {
                    avg_processing_time: Number(rows[0].avg_processing_time) || 0,
                    min_processing_time: Number(rows[0].min_processing_time) || 0,
                    max_processing_time: Number(rows[0].max_processing_time) || 0,
                    percentile_95: Number(rows[0].percentile_95) || 0,
                    total_processed: Number(rows[0].total_processed) || 0,
                };
            }

            return {
                avg_processing_time: 0,
                min_processing_time: 0,
                max_processing_time: 0,
                percentile_95: 0,
                total_processed: 0,
            };
        } catch (error) {
            logger.error('Error fetching performance metrics:', error);
            throw error;
        }
    }

    async getEventCount(): Promise<number> {
        try {
            const result = await this.client.query({
                query: 'SELECT count() as total FROM audit_completions',
                format: 'JSON',
            });

            const data = await result.json() as any;
            const rows = Array.isArray(data) ? data : (data.data || []);
            return rows.length > 0 ? Number(rows[0].total) : 0;
        } catch (error) {
            logger.error('Error fetching event count:', error);
            return 0;
        }
    }
}

export const clickHouseService = new ClickHouseService();