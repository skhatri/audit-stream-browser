import { format } from 'date-fns';
import { AuditEntry, AuditAction, Status, Outcome } from '../types';

interface BatchStateTransitionsProps {
  auditEntries: AuditEntry[];
  isLoading: boolean;
}

const ActionBadge = ({ action }: { action: AuditAction }) => {
  const baseClasses = "inline-flex items-center px-2 py-1 rounded text-xs font-medium";
  
  switch (action) {
    case AuditAction.CREATED:
      return (
        <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
          {action}
        </span>
      );
    case AuditAction.UPDATED:
      return (
        <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          {action}
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
          {action}
        </span>
      );
  }
};

const StatusBadge = ({ status }: { status?: Status }) => {
  if (!status) return <span className="text-gray-400">-</span>;
  
  const baseClasses = "inline-flex items-center px-2 py-1 rounded text-xs font-medium";
  
  switch (status) {
    case Status.RECEIVED:
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>{status}</span>;
    case Status.VALIDATING:
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>{status}</span>;
    case Status.INVALID:
      return <span className={`${baseClasses} bg-red-100 text-red-800`}>{status}</span>;
    case Status.ENRICHING:
      return <span className={`${baseClasses} bg-purple-100 text-purple-800`}>{status}</span>;
    case Status.PROCESSING:
      return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>{status}</span>;
    case Status.COMPLETE:
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>{status}</span>;
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
  }
};

const OutcomeIcon = ({ outcome, status, isLatestNonTerminal }: { outcome?: Outcome; status?: Status; isLatestNonTerminal?: boolean }) => {
  // Define terminal states
  const terminalStates = [Status.COMPLETE, Status.INVALID];
  const isTerminalState = status && terminalStates.includes(status);

  // Only show outcome icons for terminal states
  if (isTerminalState) {
    if (outcome === Outcome.SUCCESS) {
      return (
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    if (outcome === Outcome.FAILURE) {
      return (
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
  }

  // Show processing indicator only for the latest non-terminal row
  if (isLatestNonTerminal) {
    return (
      <div className="flex items-center justify-center">
        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75 animate-spin" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // No icon for non-terminal states that are not the latest
  return <span className="text-gray-400 text-xs">-</span>;
};

const LoadingRow = () => (
  <tr className="animate-pulse">
    <td className="px-3 py-2">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-3 py-2">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-3 py-2">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-3 py-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
  </tr>
);

export const BatchStateTransitions = ({ auditEntries, isLoading }: BatchStateTransitionsProps) => {
  // Find the index of the latest non-terminal entry, but only if there's no final state after it
  const terminalStates = [Status.COMPLETE, Status.INVALID];
  let latestNonTerminalIndex = -1;
  
  // Check if there's any terminal state in the entries (first entry is most recent)
  const hasFinalState = auditEntries.some(entry => terminalStates.includes(entry.newStatus));
  
  if (!hasFinalState) {
    // Only find latest non-terminal if there's no final state
    for (let i = 0; i < auditEntries.length; i++) {
      if (!terminalStates.includes(auditEntries[i].newStatus)) {
        latestNonTerminalIndex = i;
        break;
      }
    }
  }

  return (
    <div className="bg-gray-50 px-4 py-3">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Batch State Transitions</h4>
      <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <LoadingRow key={index} />
              ))
            ) : auditEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                  No state transitions found
                </td>
              </tr>
            ) : (
              auditEntries.map((entry, index) => (
                <tr key={entry.auditId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <ActionBadge action={entry.action} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <StatusBadge status={entry.newStatus} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <OutcomeIcon 
                      outcome={entry.newOutcome} 
                      status={entry.newStatus}
                      isLatestNonTerminal={index === latestNonTerminalIndex}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(entry.timestamp), 'MMM dd, HH:mm:ss')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};