import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ItemAuditPage } from './pages/ItemAuditPage';
import { BusinessMetricsPage } from './pages/BusinessMetricsPage';

type PageType = 'dashboard' | 'items' | 'metrics';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // Check URL parameters on mount and handle audit navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const objectType = urlParams.get('object_type');
    const objectId = urlParams.get('object_id');
    
    // If we have audit URL parameters, switch to items page
    if (objectType === 'batch' && objectId) {
      setCurrentPage('items');
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'items':
        return <ItemAuditPage />;
      case 'metrics':
        return <BusinessMetricsPage />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900 mr-8">
                  <span className="text-orange-600">Stream</span><span className="text-green-600">Audit</span>
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'dashboard'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('items')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'items'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Item Audits
                </button>
                <button
                  onClick={() => setCurrentPage('metrics')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'metrics'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Business Metrics
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {renderPage()}
    </div>
  );
}

export default App;