import express from 'express';
import request from 'supertest';
import { createQueueRoutes } from '../queue';
import { RedisService, CassandraService } from '../../services';
import { QueueObject, QueueObjectType, QueueObjectStatus, QueueObjectOutcome } from '../../models';

// Mock RedisService
const mockGetQueueObjects = jest.fn();
const mockRedisService = {
  getQueueObjects: mockGetQueueObjects,
} as unknown as RedisService;

// Mock CassandraService
const mockGetBatchObjects = jest.fn();
const mockGetBatchObjectsStats = jest.fn();
const mockCassandraService = {
  getBatchObjects: mockGetBatchObjects,
  getBatchObjectsStats: mockGetBatchObjectsStats,
} as unknown as CassandraService;

const app = express();
app.use('/queue', createQueueRoutes(mockRedisService, mockCassandraService));

describe('Queue Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /queue', () => {
    it('should return a merged list of queue objects from Redis and Cassandra', async () => {
      const cassandraObjects: QueueObject[] = [
        {
          objectId: '1',
          objectType: QueueObjectType.PAYMENT,
          status: QueueObjectStatus.PENDING,
          created: new Date(),
          updated: new Date(),
          records: 1,
        },
      ];
      const redisObjects: QueueObject[] = [
        {
          objectId: '2',
          objectType: QueueObjectType.PAYMENT,
          status: QueueObjectStatus.PROCESSING,
          created: new Date(),
          updated: new Date(),
          records: 1,
        },
      ];

      mockGetBatchObjects.mockResolvedValue(cassandraObjects);
      mockGetQueueObjects.mockResolvedValue(redisObjects);

      const res = await request(app).get('/queue');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(mockGetBatchObjects).toHaveBeenCalled();
      expect(mockGetQueueObjects).toHaveBeenCalled();
    });
  });

  describe('GET /queue/stats', () => {
    it('should return queue stats from Cassandra', async () => {
      const stats = { total: 10, byStatus: { pending: 10 } };
      mockGetBatchObjectsStats.mockResolvedValue(stats);

      const res = await request(app).get('/queue/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(stats);
      expect(mockGetBatchObjectsStats).toHaveBeenCalled();
    });
  });

  describe('DELETE /queue/clear', () => {
    it('should return a 405 status, as the clear operation is disabled', async () => {
      const res = await request(app).delete('/queue/clear');
      expect(res.status).toBe(405);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /queue/stream', () => {
    it('should return a server-sent event stream', async () => {
      const res = await request(app).get('/queue/stream');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/event-stream');
    });
  });

  describe('GET /queue/stats/stream', () => {
    it('should return a server-sent event stream for stats', async () => {
      const res = await request(app).get('/queue/stats/stream');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/event-stream');
    });
  });
});
