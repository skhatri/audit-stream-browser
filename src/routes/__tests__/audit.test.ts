import express from 'express';
import request from 'supertest';
import { createAuditRoutes } from '../audit';
import { CassandraService } from '../../services';
import { AuditEntry, AuditAction, Status } from '../../models';

// Mock CassandraService
const mockGetAuditEntriesByObjectId = jest.fn();
const mockGetAllAuditEntries = jest.fn();

const mockCassandraService = {
  getAuditEntriesByObjectId: mockGetAuditEntriesByObjectId,
  getAllAuditEntries: mockGetAllAuditEntries,
} as unknown as CassandraService;

const app = express();
app.use('/audit', createAuditRoutes(mockCassandraService));

describe('Audit Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /audit/object/:objectType/:objectId', () => {
    it('should return audit entries for a specific object', async () => {
      const objectType = 'payment';
      const objectId = '123';
      const auditEntries: AuditEntry[] = [
        {
          auditId: 'audit1',
          objectType,
          objectId,
          action: AuditAction.CREATED,
          newStatus: Status.RECEIVED,
          timestamp: new Date(),
        },
      ];

      mockGetAuditEntriesByObjectId.mockResolvedValue(auditEntries);

      const res = await request(app).get(`/audit/object/${objectType}/${objectId}?limit=10`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].auditId).toBe('audit1');
      expect(mockGetAuditEntriesByObjectId).toHaveBeenCalledWith(objectType, objectId);
    });

    it('should handle errors when fetching audit entries for an object', async () => {
        const objectType = 'payment';
        const objectId = '123';
  
        mockGetAuditEntriesByObjectId.mockRejectedValue(new Error('Cassandra error'));
  
        const res = await request(app).get(`/audit/object/${objectType}/${objectId}`);
  
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Failed to fetch audit entries for object');
      });
  });

  describe('GET /audit', () => {
    it('should return all audit entries', async () => {
      const auditEntries: AuditEntry[] = [
        {
          auditId: 'audit1',
          objectType: 'payment',
          objectId: '123',
          action: AuditAction.CREATED,
          newStatus: Status.RECEIVED,
          timestamp: new Date(),
        },
        {
          auditId: 'audit2',
          objectType: 'invoice',
          objectId: '456',
          action: AuditAction.CREATED,
          newStatus: Status.RECEIVED,
          timestamp: new Date(),
        },
      ];

      mockGetAllAuditEntries.mockResolvedValue(auditEntries);

      const res = await request(app).get('/audit?limit=20');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(mockGetAllAuditEntries).toHaveBeenCalledWith(20);
    });

    it('should handle errors when fetching all audit entries', async () => {
        mockGetAllAuditEntries.mockRejectedValue(new Error('Cassandra error'));
  
        const res = await request(app).get('/audit');
  
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Failed to fetch audit entries');
      });
  });

  describe('GET /audit/stream', () => {
    it('should return a server-sent event stream', async () => {
        const res = await request(app).get('/audit/stream');
    
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/event-stream');
      });
  });
});