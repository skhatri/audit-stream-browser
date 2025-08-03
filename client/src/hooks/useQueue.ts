import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queueApi } from '../services/api';

export const useQueueObjects = (limit?: number) => {
  return useQuery({
    queryKey: ['queue', 'objects', limit],
    queryFn: () => queueApi.getQueueObjects(limit),
    refetchInterval: 5000,
    staleTime: 1000,
  });
};

export const useQueueStats = () => {
  return useQuery({
    queryKey: ['queue', 'stats'],
    queryFn: () => queueApi.getQueueStats(),
    refetchInterval: 10000,
    staleTime: 5000,
  });
};

export const useRefreshQueue = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['queue'] });
  };
};