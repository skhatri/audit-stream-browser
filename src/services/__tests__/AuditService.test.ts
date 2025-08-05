import { AuditService } from '../AuditService';
import { AuditAction, Status } from '../../models';
import { logger } from '../../utils';

// Mock the Redis client
const mockLRange = jest.fn();
const mockHGetAll = jest.fn();
const mockOn = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('redis', () => ({
  createClient: () => ({
    lRange: mockLRange,
    hGetAll: mockHGetAll,
    on: mockOn,
    connect: mockConnect,
    disconnect: mockDisconnect,
  }),
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis', async () => {
      await auditService.connect();
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should log an error if connection fails', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(error);
      await expect(auditService.connect()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith('Failed to connect audit service to Redis:', error);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await auditService.disconnect();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should log an error if disconnection fails', async () => {
      const error = new Error('Disconnection failed');
      mockDisconnect.mockRejectedValueOnce(error);
      await auditService.disconnect();
      expect(logger.error).toHaveBeenCalledWith('Failed to disconnect audit service from Redis:', error);
    });
  });

  describe('getAuditEntriesForObject', () => {
    it('should return audit entries for a given object', async () => {
      const objectType = 'payment';
      const objectId = '123';
      const auditIds = ['audit1', 'audit2'];
      const auditData1 = {
        auditId: 'audit1',
        objectId: '123',
        objectType: 'payment',
        action: AuditAction.CREATED,
        newStatus: Status.RECEIVED,
        timestamp: new Date().toISOString(),
      };
      const auditData2 = {
        auditId: 'audit2',
        objectId: '123',
        objectType: 'payment',
        action: AuditAction.UPDATED,
        previousStatus: Status.RECEIVED,
        newStatus: Status.COMPLETE,
        timestamp: new Date().toISOString(),
      };

      mockLRange.mockResolvedValue(auditIds);
      mockHGetAll.mockResolvedValueOnce(auditData1).mockResolvedValueOnce(auditData2);

      const entries = await auditService.getAuditEntriesForObject(objectType, objectId);

      expect(mockLRange).toHaveBeenCalledWith('paydash:audit:object:payment:123', 0, 49);
      expect(mockHGetAll).toHaveBeenCalledWith('paydash:audit:entry:audit1');
      expect(mockHGetAll).toHaveBeenCalledWith('paydash:audit:entry:audit2');
      expect(entries).toHaveLength(2);
      expect(entries[0].auditId).toBe('audit2');
      expect(entries[1].auditId).toBe('audit1');
    });

    it('should return an empty array if no audit entries are found', async () => {
        const objectType = 'payment';
        const objectId = '123';
  
        mockLRange.mockResolvedValue([]);
  
        const entries = await auditService.getAuditEntriesForObject(objectType, objectId);
  
        expect(entries).toHaveLength(0);
      });
  });

  describe('getAllAuditEntries', () => {
    it('should return all audit entries', async () => {
      const auditIds = ['audit1', 'audit2'];
      const auditData1 = {
        auditId: 'audit1',
        objectId: '123',
        objectType: 'payment',
        action: AuditAction.CREATED,
        newStatus: Status.RECEIVED,
        timestamp: new Date().toISOString(),
      };
      const auditData2 = {
        auditId: 'audit2',
        objectId: '456',
        objectType: 'invoice',
        action: AuditAction.CREATED,
        newStatus: Status.RECEIVED,
        timestamp: new Date().toISOString(),
      };

      mockLRange.mockResolvedValue(auditIds);
      mockHGetAll.mockResolvedValueOnce(auditData1).mockResolvedValueOnce(auditData2);

      const entries = await auditService.getAllAuditEntries();

      expect(mockLRange).toHaveBeenCalledWith('paydash:audit:queue', 0, 99);
      expect(mockHGetAll).toHaveBeenCalledWith('paydash:audit:entry:audit1');
      expect(mockHGetAll).toHaveBeenCalledWith('paydash:audit:entry:audit2');
      expect(entries).toHaveLength(2);
    });

    it('should return an empty array if no audit entries are found', async () => {
        mockLRange.mockResolvedValue([]);
  
        const entries = await auditService.getAllAuditEntries();
  
        expect(entries).toHaveLength(0);
      });
  });
});