import React, { useState, useEffect } from 'react';
import { MetricsSummaryCards } from './MetricsSummaryCards';
import { CompanyBreakdownCharts } from './CompanyBreakdownCharts';
import { RealTimeTrendsCharts } from './RealTimeTrendsCharts';
import { LiveEventFeed } from './LiveEventFeed';
import { useMetrics } from '../hooks/useMetrics';

export const MetricsDashboard: React.FC = () => {
  const {
    todaySummary,
    companyBreakdown,
    hourlyTrends,
    recentEvents,
    performance,
    isLoading,
    error,
    lastUpdated
  } = useMetrics();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Metrics Service Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with last updated time */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-time Business Metrics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Live analytics and performance insights from audit completions
          </p>
        </div>
        {lastUpdated && (
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && !todaySummary && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading metrics...</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8">
        <MetricsSummaryCards 
          summary={todaySummary} 
          performance={performance}
          isLoading={isLoading} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Company Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <CompanyBreakdownCharts 
            companyData={companyBreakdown} 
            isLoading={isLoading}
          />
          
          <RealTimeTrendsCharts 
            hourlyData={hourlyTrends} 
            isLoading={isLoading}
          />
        </div>

        {/* Right Column - Live Feed */}
        <div className="lg:col-span-1">
          <LiveEventFeed 
            events={recentEvents} 
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></div>
          <span>{isLoading ? 'Updating...' : 'Live'}</span>
        </div>
      </div>
    </div>
  );
};