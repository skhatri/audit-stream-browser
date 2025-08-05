import React from 'react';
import { HourlyTrend } from '../hooks/useMetrics';

interface RealTimeTrendsChartsProps {
  hourlyData: HourlyTrend[];
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

const formatHour = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    hour12: true 
  });
};

const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 rounded w-48"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

const SimpleLineChart: React.FC<{
  data: HourlyTrend[];
  valueKey: 'event_count' | 'total_amount';
  title: string;
  formatValue: (value: number) => string;
  color: string;
}> = ({ data, valueKey, title, formatValue, color }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item[valueKey]));
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = 40;

  // Create SVG path for the line
  const points = data.map((item, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (data.length - 1);
    const y = chartHeight - padding - ((item[valueKey] / maxValue) * (chartHeight - padding * 2));
    return `${x},${y}`;
  });

  const path = `M ${points.join(' L ')}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="relative">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <g key={ratio}>
              <line
                x1={padding}
                y1={chartHeight - padding - (ratio * (chartHeight - padding * 2))}
                x2={chartWidth - padding}
                y2={chartHeight - padding - (ratio * (chartHeight - padding * 2))}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={chartHeight - padding - (ratio * (chartHeight - padding * 2)) + 5}
                fill="#6b7280"
                fontSize="12"
                textAnchor="end"
              >
                {formatValue(maxValue * ratio)}
              </text>
            </g>
          ))}
          
          {/* Data line */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = padding + (index * (chartWidth - padding * 2)) / (data.length - 1);
            const y = chartHeight - padding - ((item[valueKey] / maxValue) * (chartHeight - padding * 2));
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                className="hover:r-6 cursor-pointer"
              >
                <title>
                  {formatHour(item.hour)}: {formatValue(item[valueKey])}
                </title>
              </circle>
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-8">
          {data.filter((_, index) => index % Math.ceil(data.length / 6) === 0).map((item, index) => (
            <span key={index} className="text-xs text-gray-500">
              {formatHour(item.hour)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const HourlyDataTable: React.FC<{ data: HourlyTrend[] }> = ({ data }) => {
  const recentHours = data.slice(-12); // Show last 12 hours

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Breakdown (Last 12 Hours)</h3>
      
      {recentHours.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentHours.reverse().map((hour, index) => {
                const successRate = hour.event_count > 0 
                  ? (hour.success_count / hour.event_count) * 100 
                  : 0;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(hour.hour).toLocaleString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatNumber(hour.event_count)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatNumber(hour.success_count)} success, {formatNumber(hour.failure_count)} failed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatAmount(hour.total_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-16">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                successRate >= 95 ? 'bg-green-500' :
                                successRate >= 80 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {successRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const RealTimeTrendsCharts: React.FC<RealTimeTrendsChartsProps> = ({ 
  hourlyData, 
  isLoading 
}) => {
  if (isLoading && hourlyData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Trends</h3>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleLineChart
          data={hourlyData}
          valueKey="event_count"
          title="Hourly Event Volume"
          formatValue={formatNumber}
          color="#3b82f6"
        />
        
        <SimpleLineChart
          data={hourlyData}
          valueKey="total_amount"
          title="Hourly Amount Processed"
          formatValue={formatAmount}
          color="#10b981"
        />
      </div>
      
      <HourlyDataTable data={hourlyData} />
    </div>
  );
};