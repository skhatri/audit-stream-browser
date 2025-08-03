import axios from 'axios';
import { QueueResponse, QueueStatsResponse, AuditResponse } from '../types';

const API_BASE_URL = import.meta.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

export const queueApi = {
  getQueueObjects: async (limit?: number): Promise<QueueResponse> => {
    const response = await api.get('/queue', {
      params: limit ? { limit } : undefined
    });
    return response.data;
  },

  getQueueStats: async (): Promise<QueueStatsResponse> => {
    const response = await api.get('/queue/stats');
    return response.data;
  },

  clearQueue: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/queue/clear');
    return response.data;
  }
};

export const auditApi = {
  getAuditEntriesForObject: async (objectType: string, objectId: string, limit?: number): Promise<AuditResponse> => {
    const response = await api.get(`/audit/object/${objectType}/${objectId}`, {
      params: limit ? { limit } : undefined
    });
    return response.data;
  },

  getAllAuditEntries: async (limit?: number): Promise<AuditResponse> => {
    const response = await api.get('/audit', {
      params: limit ? { limit } : undefined
    });
    return response.data;
  }
};