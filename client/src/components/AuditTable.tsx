import { format } from 'date-fns';
import { AuditEntry, AuditAction, Status, Outcome } from '../types';

interface AuditTableProps {
  auditEntries: AuditEntry[];
  isLoading: boolean;
}

const ActionBadge = ({ action }: { action: AuditAction }) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
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
  
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
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

const OutcomeBadge = ({ outcome }: { outcome?: Outcome }) => {
  if (!outcome) return <span className="text-gray-400">-</span>;
  
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  switch (outcome) {
    case Outcome.SUCCESS:
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>{outcome}</span>;
    case Outcome.FAILURE:
      return <span className={`${baseClasses} bg-red-100 text-red-800`}>{outcome}</span>;
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{outcome}</span>;
  }
};

const LoadingRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-4 py-2 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
  </tr>
);

export const AuditTable = ({ auditEntries, isLoading }: AuditTableProps) => {
  return (
    <div className="bg-gray-50 px-4 py-3">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Audit History</h4>
      <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Object ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Object Type
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metadata
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <LoadingRow key={index} />
              ))
            ) : auditEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No audit entries found
                </td>
              </tr>
            ) : (
              auditEntries.map((entry) => (
                <tr key={entry.auditId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                    {entry.objectId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {entry.objectType}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(entry.timestamp), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <StatusBadge status={entry.newStatus} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <OutcomeBadge outcome={entry.newOutcome} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <ActionBadge action={entry.action} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {entry.metadata || '-'}
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