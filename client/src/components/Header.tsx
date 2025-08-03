
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRefreshQueue } from '../hooks/useQueue';

export const Header = () => {
  const refreshQueue = useRefreshQueue();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">
                <span className="text-teal-600">Pay</span>dash
              </h1>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">
                Real-time payment processing dashboard
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshQueue}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};