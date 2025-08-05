
import { format } from 'date-fns';
import { useState } from 'react';
import { QueueObject, Status, Outcome, AuditEntry } from '../types';
import { auditApi } from '../services/api';
import { AuditTable } from './AuditTable';

interface QueueTableProps {
  data: QueueObject[];
  isLoading: boolean;
  newRecordIds?: Set<string>;
  updatedRecordIds?: Set<string>;
}

interface ExpandedRowState {
  isExpanded: boolean;
  auditEntries: AuditEntry[];
  isLoadingAudit: boolean;
}

const StatusBadge = ({ status }: { status: Status }) => {
  const statusClasses = {
    [Status.RECEIVED]: 'status-received',
    [Status.VALIDATING]: 'status-validating', 
    [Status.INVALID]: 'status-invalid',
    [Status.ENRICHING]: 'status-enriching',
    [Status.PROCESSING]: 'status-processing',
    [Status.COMPLETE]: 'status-complete'
  };

  return (
    <span className={`status-badge ${statusClasses[status]}`}>
      {status}
    </span>
  );
};

const OutcomeBadge = ({ outcome }: { outcome?: Outcome }) => {
  if (!outcome) return <span className="text-gray-400 text-sm">-</span>;

  const outcomeClasses = {
    [Outcome.SUCCESS]: 'outcome-success',
    [Outcome.FAILURE]: 'outcome-failure'
  };

  return (
    <span className={`status-badge ${outcomeClasses[outcome]}`}>
      {outcome}
    </span>
  );
};

const LoadingRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-8"></div>
    </td>
  </tr>
);

export const QueueTable = ({ data, isLoading, newRecordIds = new Set(), updatedRecordIds = new Set() }: QueueTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, ExpandedRowState>>({});

  const toggleRow = async (objectId: string, objectType: string) => {
    const currentState = expandedRows[objectId];
    
    if (currentState?.isExpanded) {
      setExpandedRows(prev => ({
        ...prev,
        [objectId]: { ...prev[objectId], isExpanded: false }
      }));
    } else {
      setExpandedRows(prev => ({
        ...prev,
        [objectId]: { isExpanded: true, auditEntries: [], isLoadingAudit: true }
      }));

      try {
        const auditResponse = await auditApi.getAuditEntriesForObject(objectType, objectId);
        setExpandedRows(prev => ({
          ...prev,
          [objectId]: {
            isExpanded: true,
            auditEntries: auditResponse.data,
            isLoadingAudit: false
          }
        }));
      } catch (error) {
        console.error('Failed to fetch audit entries:', error);
        setExpandedRows(prev => ({
          ...prev,
          [objectId]: {
            isExpanded: true,
            auditEntries: [],
            isLoadingAudit: false
          }
        }));
      }
    }
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Object ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Updated
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Records
            </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <LoadingRow key={index} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                No queue objects found
              </td>
            </tr>
          ) : (
            data.map((object) => {
              const isNew = newRecordIds.has(object.objectId);
              const isUpdated = updatedRecordIds.has(object.objectId);
              
              let animationClass = 'hover:bg-gray-50';
              if (isNew) {
                animationClass = 'new-record';
              } else if (isUpdated) {
                animationClass = 'updated-record';
              }
              
              return (
                <>
                <tr 
                  key={object.objectId} 
                  className={`transition-colors duration-200 ${animationClass}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {object.objectId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(object.created), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(object.updated), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={object.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {object.records}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OutcomeBadge outcome={object.outcome} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleRow(object.objectId, object.objectType)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200 text-sm font-medium"
                      title={expandedRows[object.objectId]?.isExpanded ? 'Hide Audit Trail' : 'View Audit Trail'}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-6 w-6 transition-transform duration-200 ${expandedRows[object.objectId]?.isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {expandedRows[object.objectId]?.isExpanded && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <AuditTable
                        auditEntries={expandedRows[object.objectId]?.auditEntries || []}
                        isLoading={expandedRows[object.objectId]?.isLoadingAudit || false}
                      />
                    </td>
                  </tr>
                )}
              </>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};