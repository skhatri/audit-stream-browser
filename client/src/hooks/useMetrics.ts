import { useState, useEffect, useCallback } from 'react';

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
  hour: string;
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
  completed_at: string;
  processing_time_ms: number;
}

export interface PerformanceMetrics {
  avg_processing_time: number;
  min_processing_time: number;
  max_processing_time: number;
  percentile_95: number;
  total_processed: number;
}

interface MetricsResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  count?: number;
  error?: string;
  message?: string;
}

export const useMetrics = () => {
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [companyBreakdown, setCompanyBreakdown] = useState<CompanyBreakdown[]>([]);
  const [hourlyTrends, setHourlyTrends] = useState<HourlyTrend[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetricsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all metrics endpoints in parallel
      const [summaryRes, companyRes, trendsRes, eventsRes, performanceRes] = await Promise.all([
        fetch('/api/metrics/today-summary'),
        fetch('/api/metrics/company-breakdown'),
        fetch('/api/metrics/hourly-trends'),
        fetch('/api/metrics/live-events?limit=20'),
        fetch('/api/metrics/performance')
      ]);

      // Check for any failed requests
      const responses = [summaryRes, companyRes, trendsRes, eventsRes, performanceRes];
      const failedResponse = responses.find(res => !res.ok);
      
      if (failedResponse) {
        throw new Error(`Failed to fetch metrics: ${failedResponse.status} ${failedResponse.statusText}`);
      }

      // Parse responses
      const [summaryData, companyData, trendsData, eventsData, performanceData] = await Promise.all([
        summaryRes.json() as Promise<MetricsResponse<TodaySummary>>,
        companyRes.json() as Promise<MetricsResponse<CompanyBreakdown[]>>,
        trendsRes.json() as Promise<MetricsResponse<HourlyTrend[]>>,
        eventsRes.json() as Promise<MetricsResponse<RecentEvent[]>>,
        performanceRes.json() as Promise<MetricsResponse<PerformanceMetrics>>
      ]);

      // Check for API errors
      const apiError = [summaryData, companyData, trendsData, eventsData, performanceData]
        .find(data => !data.success);
      
      if (apiError) {
        throw new Error(apiError.message || apiError.error || 'API request failed');
      }

      // Update state
      setTodaySummary(summaryData.data);
      setCompanyBreakdown(companyData.data);
      setHourlyTrends(trendsData.data);
      setRecentEvents(eventsData.data);
      setPerformance(performanceData.data);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Server-Sent Events for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/metrics/stream');
        
        eventSource.onopen = () => {
          console.log('SSE connection opened');
          setError(null);
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'metrics-update' && data.data) {
              setTodaySummary(data.data.summary);
              setCompanyBreakdown(data.data.breakdown || []);
              setRecentEvents(data.data.recent || []);
              setLastUpdated(new Date(data.timestamp));
              setIsLoading(false);
            } else if (data.type === 'error') {
              console.error('SSE error:', data.message);
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        };
        
        eventSource.onerror = (event) => {
          console.error('SSE connection error:', event);
          eventSource?.close();
          
          // Retry connection after 5 seconds
          retryTimeout = setTimeout(() => {
            console.log('Retrying SSE connection...');
            setupSSE();
          }, 5000);
        };
        
      } catch (err) {
        console.error('Error setting up SSE:', err);
        // Fallback to polling if SSE fails
        retryTimeout = setTimeout(fetchMetricsData, 10000);
      }
    };

    // Initial data fetch
    fetchMetricsData();

    // Setup SSE after initial fetch
    const sseTimeout = setTimeout(setupSSE, 1000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (sseTimeout) {
        clearTimeout(sseTimeout);
      }
    };
  }, [fetchMetricsData]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchMetricsData();
  }, [fetchMetricsData]);

  return {
    todaySummary,
    companyBreakdown,
    hourlyTrends,
    recentEvents,
    performance,
    isLoading,
    error,
    lastUpdated,
    refresh
  };
};