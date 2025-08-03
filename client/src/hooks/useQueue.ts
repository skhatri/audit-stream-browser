import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { queueApi } from '../services/api';
import { QueueResponse, QueueStatsResponse, QueueObject } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useQueueObjects = (limit?: number) => {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryKey = useRef(['queue', 'objects', limit]);
  const [newRecordIds, setNewRecordIds] = useState<Set<string>>(new Set());
  const [updatedRecordIds, setUpdatedRecordIds] = useState<Set<string>>(new Set());
  const previousDataRef = useRef<QueueObject[]>([]);
  const isConnectedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const markRecordAsViewed = useCallback((objectId: string) => {
    setNewRecordIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(objectId);
      return newSet;
    });
    setUpdatedRecordIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(objectId);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (isConnectedRef.current) return;

    const connectSSE = () => {
      if (isConnectedRef.current || eventSourceRef.current) return;

      try {
        const url = new URL(`${API_BASE_URL}/api/queue/stream`);
        if (limit) {
          url.searchParams.set('limit', limit.toString());
        }
        
        eventSourceRef.current = new EventSource(url.toString());
        isConnectedRef.current = true;
        
        eventSourceRef.current.onmessage = (event) => {
          try {
            const data: QueueResponse = JSON.parse(event.data);
            if (data.success) {
              const newObjects = data.data || [];
              const previousObjects = previousDataRef.current;
              
              const newIds: string[] = [];
              const updatedIds: string[] = [];
              
              newObjects.forEach(obj => {
                const previousObj = previousObjects.find(prev => prev.objectId === obj.objectId);
                
                if (!previousObj) {
                  newIds.push(obj.objectId);
                } else if (new Date(obj.updated).getTime() !== new Date(previousObj.updated).getTime()) {
                  updatedIds.push(obj.objectId);
                }
              });
              
              if (newIds.length > 0 || updatedIds.length > 0) {
                if (newIds.length > 0) {
                  setNewRecordIds(prev => new Set([...prev, ...newIds]));
                }
                if (updatedIds.length > 0) {
                  setUpdatedRecordIds(prev => new Set([...prev, ...updatedIds]));
                }
                
                setTimeout(() => {
                  setNewRecordIds(prev => {
                    const updated = new Set(prev);
                    newIds.forEach(id => updated.delete(id));
                    return updated;
                  });
                  setUpdatedRecordIds(prev => {
                    const updated = new Set(prev);
                    updatedIds.forEach(id => updated.delete(id));
                    return updated;
                  });
                }, 3000);
              }
              
              previousDataRef.current = newObjects;
              queryClient.setQueryData(queryKey.current, data);
            }
          } catch (error) {
            console.error('Failed to parse SSE data:', error);
          }
        };

        eventSourceRef.current.onerror = () => {
          isConnectedRef.current = false;
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connectSSE, 10000);
        };
      } catch (error) {
        console.error('Failed to establish SSE connection:', error);
        isConnectedRef.current = false;
      }
    };

    connectSSE();

    return () => {
      isConnectedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [limit, queryClient]);

  const query = useQuery({
    queryKey: queryKey.current,
    queryFn: () => queueApi.getQueueObjects(limit),
    refetchInterval: false,
    staleTime: 300000,
    enabled: !isConnectedRef.current,
    onSuccess: (data) => {
      if (data?.data) {
        previousDataRef.current = data.data;
      }
    }
  });

  return {
    ...query,
    newRecordIds,
    updatedRecordIds,
    markRecordAsViewed
  };
};

export const useQueueStats = () => {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryKey = useRef(['queue', 'stats']);
  const isStatsConnectedRef = useRef(false);
  const statsReconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isStatsConnectedRef.current) return;

    const connectStatsSSE = () => {
      if (isStatsConnectedRef.current || eventSourceRef.current) return;

      try {
        const url = `${API_BASE_URL}/api/queue/stats/stream`;
        eventSourceRef.current = new EventSource(url);
        isStatsConnectedRef.current = true;
        
        eventSourceRef.current.onmessage = (event) => {
          try {
            const data: QueueStatsResponse = JSON.parse(event.data);
            if (data.success) {
              queryClient.setQueryData(queryKey.current, data);
            }
          } catch (error) {
            console.error('Failed to parse stats SSE data:', error);
          }
        };

        eventSourceRef.current.onerror = () => {
          isStatsConnectedRef.current = false;
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
          
          if (statsReconnectTimeoutRef.current) {
            clearTimeout(statsReconnectTimeoutRef.current);
          }
          statsReconnectTimeoutRef.current = setTimeout(connectStatsSSE, 15000);
        };
      } catch (error) {
        console.error('Failed to establish stats SSE connection:', error);
        isStatsConnectedRef.current = false;
      }
    };

    connectStatsSSE();

    return () => {
      isStatsConnectedRef.current = false;
      if (statsReconnectTimeoutRef.current) {
        clearTimeout(statsReconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);

  return useQuery({
    queryKey: queryKey.current,
    queryFn: () => queueApi.getQueueStats(),
    refetchInterval: false,
    staleTime: 300000,
    enabled: !isStatsConnectedRef.current,
  });
};

export const useRefreshQueue = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['queue'] });
  };
};