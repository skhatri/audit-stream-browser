
import { 
  QueueListIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { useQueueStats } from '../hooks/useQueue';
import { Status } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: typeof QueueListIcon;
  color: string;
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, color, loading }: StatCardProps) => (
  <div className="bg-white overflow-hidden shadow-sm rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-lg font-medium text-gray-900">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
              ) : (
                value
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

export const StatsCards = () => {
  const { data, isLoading } = useQueueStats();
  
  const stats = data?.data;
  const processing = stats ? (
    stats.byStatus[Status.RECEIVED] || 0) + 
    (stats.byStatus[Status.VALIDATING] || 0) + 
    (stats.byStatus[Status.ENRICHING] || 0) + 
    (stats.byStatus[Status.PROCESSING] || 0) : 0;
  
  const completed = stats?.byStatus[Status.COMPLETE] || 0;
  const failed = stats?.byStatus[Status.INVALID] || 0;
  const total = stats?.total || 0;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Records"
        value={total}
        icon={QueueListIcon}
        color="text-teal-500"
        loading={isLoading}
      />
      <StatCard
        title="Processing"
        value={processing}
        icon={ClockIcon}
        color="text-yellow-500"
        loading={isLoading}
      />
      <StatCard
        title="Completed"
        value={completed}
        icon={CheckCircleIcon}
        color="text-green-500"
        loading={isLoading}
      />
      <StatCard
        title="Failed"
        value={failed}
        icon={ExclamationTriangleIcon}
        color="text-red-500"
        loading={isLoading}
      />
    </div>
  );
};