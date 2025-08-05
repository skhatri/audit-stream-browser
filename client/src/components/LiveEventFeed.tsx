import React from 'react';
import { RecentEvent } from '../hooks/useMetrics';

interface LiveEventFeedProps {
  events: RecentEvent[];
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

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const formatProcessingTime = (ms: number): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${Math.round(ms)}ms`;
  }
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="animate-pulse border-b border-gray-200 pb-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

const EventItem: React.FC<{ event: RecentEvent; isNew?: boolean }> = ({ event, isNew }) => {
  const statusColor = event.outcome === 'SUCCESS' ? 'green' : 'red';
  const statusIcon = event.outcome === 'SUCCESS' ? (
    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className={`border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 ${
      isNew ? 'bg-blue-50 -mx-4 px-4 py-2 rounded-lg animate-pulse' : ''
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 p-1 rounded-full ${
          statusColor === 'green' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {statusIcon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {event.company_name}
            </p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColor === 'green' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {event.outcome}
            </span>
          </div>
          
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="font-semibold text-gray-700">
                {formatAmount(event.amount)}
              </span>
              <span>•</span>
              <span>{formatProcessingTime(event.processing_time_ms)}</span>
            </div>
            <span className="text-xs text-gray-400">
              {formatTime(event.completed_at)}
            </span>
          </div>
          
          <div className="mt-1 text-xs text-gray-400 truncate">
            Audit ID: {event.audit_id}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="text-center py-8">
    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l7 7 7-7M5 20h38a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent events</h3>
    <p className="mt-1 text-sm text-gray-500">
      Audit completion events will appear here in real-time
    </p>
  </div>
);

export const LiveEventFeed: React.FC<LiveEventFeedProps> = ({ events, isLoading }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Live Event Feed</h3>
          <p className="text-sm text-gray-600">Recent audit completions</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${
            isLoading ? 'bg-yellow-400' : 'bg-green-400'
          } animate-pulse`}></div>
          <span className="text-xs text-gray-500">
            {isLoading ? 'Updating' : 'Live'}
          </span>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {isLoading && events.length === 0 ? (
          <LoadingSkeleton />
        ) : events.length === 0 ? (
          <EmptyState />
        ) : (
          events.map((event, index) => (
            <EventItem 
              key={event.event_id} 
              event={event} 
              isNew={index < 2} // Highlight first 2 events as new
            />
          ))
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <span className="text-xs text-gray-500">
              Showing {events.length} recent events
            </span>
          </div>
        </div>
      )}
    </div>
  );
};