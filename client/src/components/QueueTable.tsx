
import { format } from 'date-fns';
import { QueueObject, Status, Outcome } from '../types';

interface QueueTableProps {
  data: QueueObject[];
  isLoading: boolean;
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
  </tr>
);

export const QueueTable = ({ data, isLoading }: QueueTableProps) => {
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
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <LoadingRow key={index} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                No queue objects found
              </td>
            </tr>
          ) : (
            data.map((object) => (
              <tr key={object.objectId} className="hover:bg-gray-50">
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};