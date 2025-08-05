
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRefreshQueue } from '../hooks/useQueue';

export const Header = () => {
  const refreshQueue = useRefreshQueue();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center py-6">
          <button
            onClick={refreshQueue}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};