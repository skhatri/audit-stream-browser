import React from 'react';
import { MetricsDashboard } from '../components/MetricsDashboard';
import { Header } from '../components/Header';

export const BusinessMetricsPage: React.FC = () => {
  return (
    <>
      <Header 
        title="Business Metrics" 
        subtitle="Real-time business analytics and performance metrics"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MetricsDashboard />
      </div>
    </>
  );
};