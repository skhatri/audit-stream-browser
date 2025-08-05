import React, { useState, useEffect } from 'react';

interface ItemAuditEntry {
  auditId: string;
  objectId: string;
  objectType: string;
  parentId: string;
  parentType: 'batch';
  action: string;
  previousStatus?: string;
  newStatus: string;
  previousOutcome?: string;
  newOutcome: string;
  timestamp: Date;
  metadata?: string;
}

interface ItemAuditStats {
  totalItems: number;
  byStatus: Record<string, number>;
  parentId: string;
  lastUpdated: Date;
}

interface ItemAuditResponse {
  success: boolean;
  data: ItemAuditEntry[];
  stats: ItemAuditStats;
  count: number;
  parentId: string;
}

export const ItemAuditPage: React.FC = () => {
  const [parentId, setParentId] = useState('');
  const [itemAudits, setItemAudits] = useState<ItemAuditEntry[]>([]);
  const [stats, setStats] = useState<ItemAuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItemAudits = async () => {
    if (!parentId.trim()) {
      setError('Please enter a valid parent batch ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/audit/items/parent/${encodeURIComponent(parentId.trim())}`);
      const data: ItemAuditResponse = await response.json();

      if (data.success) {
        setItemAudits(data.data.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
        setStats({
          ...data.stats,
          lastUpdated: new Date(data.stats.lastUpdated)
        });
      } else {
        setError('Failed to fetch item audit data');
      }
    } catch (error) {
      console.error('Error fetching item audits:', error);
      setError('Error fetching item audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItemAudits();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800';
      case 'INVALID':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'RECEIVED':
        return 'bg-gray-100 text-gray-800';
      case 'VALIDATING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ENRICHING':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeBadgeClass = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILURE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-5">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              Item Audit Tracker
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Track individual audit items by entering a parent batch ID
            </p>
          </div>

          {/* Search Form */}
          <div className="mt-6">
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Batch ID
                </label>
                <input
                  type="text"
                  id="parentId"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  placeholder="Enter batch object ID (e.g., 130af0d1-c393-4867-9b8c-827396ed1473)"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {loading ? 'Searching...' : 'Search Items'}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalItems}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Count</dt>
                          <dd className="text-lg font-medium text-gray-900">{count}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Items Table */}
          {itemAudits.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Item Audit Trail ({itemAudits.length} items)
                </h2>
                <div className="text-sm text-gray-500">
                  Parent ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{stats?.parentId}</span>
                </div>
              </div>

              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outcome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Metadata
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {itemAudits.map((item) => (
                        <tr key={item.auditId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {item.objectId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.newStatus)}`}>
                              {item.newStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOutcomeBadgeClass(item.newOutcome)}`}>
                              {item.newOutcome}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(item.timestamp)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {item.metadata && (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:text-blue-800">View</summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-w-xs">
                                  {JSON.stringify(JSON.parse(item.metadata), null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && itemAudits.length === 0 && parentId && !error && (
            <div className="mt-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No item audits found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No audit items were found for the specified parent batch ID.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};