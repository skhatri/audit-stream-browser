
import React from 'react';
import { format } from 'date-fns';
import { useState } from 'react';
import { QueueObject, Status, Outcome, AuditEntry } from '../types';
import { auditApi } from '../services/api';
import { BatchStateTransitions } from './BatchStateTransitions';
import CopyButton from './CopyButton';
import { AmountDisplay, CompanySummary, parseMetadata } from './MetadataDisplays';

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

const StatusBadge = ({ status, records }: { status: Status; records: number }) => {
  const statusClasses = {
    [Status.RECEIVED]: 'status-received',
    [Status.VALIDATING]: 'status-validating', 
    [Status.INVALID]: 'status-invalid',
    [Status.ENRICHING]: 'status-enriching',
    [Status.PROCESSING]: 'status-processing',
    [Status.COMPLETE]: 'status-complete'
  };

  return (
    <div className="flex flex-col items-start">
      <span className={`status-badge ${statusClasses[status]}`}>
        {status}
      </span>
      <span className="text-xs text-gray-500 mt-1">
        {records} records
      </span>
    </div>
  );
};

const OutcomeIcon = ({ outcome, status }: { outcome?: Outcome; status: Status }) => {
  // Show grey tick for processing states to indicate they've been processed
  const processingStates = [Status.VALIDATING, Status.ENRICHING, Status.PROCESSING];
  const isProcessingState = processingStates.includes(status);

  if (!outcome || outcome === '-') {
    if (isProcessingState) {
      // Show grey tick for processing states
      return (
        <div className="flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    // Show spinner for RECEIVED state
    return (
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (outcome === Outcome.SUCCESS) {
    return (
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  if (outcome === Outcome.FAILURE) {
    return (
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return <span className="text-gray-400 text-sm">-</span>;
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
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-8"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap w-16">
      <div className="h-6 bg-gray-200 rounded w-6"></div>
    </td>
  </tr>
);

const AuditLink = ({ objectId }: { objectId: string }) => {
  const handleAuditClick = () => {
    const auditUrl = `${window.location.origin}/audit?object_type=batch&object_id=${objectId}`;
    window.open(auditUrl, '_audit');
  };

  return (
    <button
      onClick={handleAuditClick}
      className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors duration-200"
      title="View Audit Items"
    >
      <svg className="w-4 h-4 text-gray-500 hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  );
};

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
        // Get batch state transitions for this batch object from audit_entries where object_type='batch'
        const auditResponse = await auditApi.getAuditEntriesForObject('batch', objectId);
        setExpandedRows(prev => ({
          ...prev,
          [objectId]: {
            isExpanded: true,
            auditEntries: auditResponse.data,
            isLoadingAudit: false
          }
        }));
      } catch (error) {
        console.error('Failed to fetch batch state transitions:', error);
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
              Batch ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Outcome
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
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
              const metadata = parseMetadata(object.metadata);
              
              let animationClass = 'hover:bg-gray-50';
              if (isNew) {
                animationClass = 'new-record';
              } else if (isUpdated) {
                animationClass = 'updated-record';
              }
              
              return (
                <React.Fragment key={object.objectId}>
                <tr 
                  className={`transition-colors duration-200 ${animationClass}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    <div className="flex items-center">
                      <span>{object.objectId.slice(0, 8)}...</span>
                      <CopyButton text={object.objectId} />
                      <AuditLink objectId={object.objectId} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {metadata.summary ? (
                      <CompanySummary 
                        summary={metadata.summary} 
                        region={metadata.region}
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {metadata.amount ? (
                      <AmountDisplay 
                        amount={metadata.amount} 
                        currency={metadata.currency || 'USD'}
                        formatted={metadata.formatted_amount}
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col">
                      <span className="font-medium">{format(new Date(object.updated), 'MMM dd, HH:mm:ss')}</span>
                      <span className="text-xs text-gray-400 mt-1">{format(new Date(object.created), 'MMM dd, HH:mm:ss')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={object.status} records={object.records} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <OutcomeIcon outcome={object.outcome} status={object.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-16">
                    <button
                      onClick={() => toggleRow(object.objectId, object.objectType)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200 text-sm font-medium w-full flex justify-center"
                      title={expandedRows[object.objectId]?.isExpanded ? 'Hide State Transitions' : 'View State Transitions'}
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
                      <BatchStateTransitions
                        auditEntries={expandedRows[object.objectId]?.auditEntries || []}
                        isLoading={expandedRows[object.objectId]?.isLoadingAudit || false}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};