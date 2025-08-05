import React from 'react';
import { TodaySummary, PerformanceMetrics } from '../hooks/useMetrics';

interface MetricsSummaryCardsProps {
  summary: TodaySummary | null;
  performance: PerformanceMetrics | null;
  isLoading: boolean;
}

const formatAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return `$${amount.toFixed(2)}`;
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return num.toString();
  }
};

const formatTime = (ms: number): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${Math.round(ms)}ms`;
  }
};

const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-16"></div>
  </div>
);

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  isLoading: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color, isLoading }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]} mr-4`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const MetricsSummaryCards: React.FC<MetricsSummaryCardsProps> = ({ 
  summary, 
  performance, 
  isLoading 
}) => {
  const successRate = summary ? summary.success_rate.toFixed(1) : '0';
  const totalAmount = summary ? formatAmount(summary.total_amount) : '$0';
  const totalEvents = summary ? formatNumber(summary.total_events) : '0';
  const avgProcessingTime = performance ? formatTime(performance.avg_processing_time) : '0ms';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Amount */}
      <MetricCard
        title="Total Amount Today"
        value={totalAmount}
        subtitle={summary ? `${formatNumber(summary.total_events)} transactions` : undefined}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        }
        color="green"
        isLoading={isLoading}
      />

      {/* Total Events */}
      <MetricCard
        title="Events Completed Today"
        value={totalEvents}
        subtitle={summary ? `${formatNumber(summary.success_events)} successful` : undefined}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        color="blue"
        isLoading={isLoading}
      />

      {/* Success Rate */}
      <MetricCard
        title="Success Rate"
        value={`${successRate}%`}
        subtitle={summary && summary.failure_events > 0 ? `${formatNumber(summary.failure_events)} failed` : 'All successful'}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color={summary && summary.success_rate >= 95 ? 'green' : summary && summary.success_rate >= 80 ? 'yellow' : 'red'}
        isLoading={isLoading}
      />

      {/* Average Processing Time */}
      <MetricCard
        title="Avg Processing Time"
        value={avgProcessingTime}
        subtitle={performance ? `${formatTime(performance.percentile_95)} at 95th percentile` : undefined}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="purple"
        isLoading={isLoading}
      />
    </div>
  );
};