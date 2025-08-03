
import { QueueTable } from './QueueTable';
import { StatsCards } from './StatsCards';
import { Header } from './Header';
import { useQueueObjects } from '../hooks/useQueue';

export const Dashboard = () => {
  const { data, isLoading, error } = useQueueObjects(100);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <StatsCards />
          
          <div className="mt-8">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Queue Processing Status
                </h3>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-red-600">
                      Failed to load queue data. Please try again.
                    </p>
                  </div>
                )}
                
                <QueueTable 
                  data={data?.data || []} 
                  isLoading={isLoading} 
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};