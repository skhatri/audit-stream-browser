import React from 'react';
import { CompanyBreakdown } from '../hooks/useMetrics';

interface CompanyBreakdownChartsProps {
  companyData: CompanyBreakdown[];
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

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

const HorizontalBarChart: React.FC<{ 
  data: CompanyBreakdown[], 
  valueKey: 'total_amount' | 'total_events',
  title: string,
  formatValue: (value: number) => string
}> = ({ data, valueKey, title, formatValue }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item[valueKey]));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((company, index) => {
          const value = company[valueKey];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={company.company_id} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 truncate max-w-xs">
                  {company.company_name}
                </span>
                <span className="text-gray-900 font-semibold">
                  {formatValue(value)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    index === 0 ? 'bg-blue-600' :
                    index === 1 ? 'bg-green-500' :
                    index === 2 ? 'bg-yellow-500' :
                    index === 3 ? 'bg-purple-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {company.total_events} events • {company.success_rate.toFixed(1)}% success rate
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CompanyTable: React.FC<{ data: CompanyBreakdown[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Success Rates</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
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
            {data.map((company) => (
              <tr key={company.company_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {company.company_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {company.company_id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatNumber(company.total_events)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatNumber(company.success_events)} success
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatAmount(company.total_amount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-16">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            company.success_rate >= 95 ? 'bg-green-500' :
                            company.success_rate >= 80 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${company.success_rate}%` }}
                        />
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {company.success_rate.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CompanyBreakdownCharts: React.FC<CompanyBreakdownChartsProps> = ({ 
  companyData, 
  isLoading 
}) => {
  if (isLoading && companyData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Analytics</h3>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  // Sort companies by total amount for charts
  const sortedByAmount = [...companyData]
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 10);

  const sortedByEvents = [...companyData]
    .sort((a, b) => b.total_events - a.total_events)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarChart
          data={sortedByAmount}
          valueKey="total_amount"
          title="Amount by Company"
          formatValue={formatAmount}
        />
        
        <HorizontalBarChart
          data={sortedByEvents}
          valueKey="total_events"
          title="Events by Company"
          formatValue={formatNumber}
        />
      </div>
      
      <CompanyTable data={companyData} />
    </div>
  );
};