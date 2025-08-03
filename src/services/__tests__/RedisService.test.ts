import { RedisService } from '../RedisService';
import { Status, Outcome, QueueObject } from '../../models';
import { createClient } from 'redis';

jest.mock('redis');

const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  hSet: jest.fn().mockResolvedValue(undefined),
  lPush: jest.fn().mockResolvedValue(1),
  lRange: jest.fn().mockResolvedValue([]),
  hGetAll: jest.fn().mockResolvedValue({}),
  lLen: jest.fn().mockResolvedValue(0),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn()
};

(createClient as jest.Mock).mockReturnValue(mockClient);

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    redisService = new RedisService();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      await redisService.connect();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockClient.connect.mockRejectedValueOnce(error);

      await expect(redisService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis successfully', async () => {
      await redisService.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      mockClient.disconnect.mockRejectedValueOnce(error);

      await expect(redisService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('addToQueue', () => {
    it('should add queue object successfully', async () => {
      const queueObject: QueueObject = {
        objectId: 'test-id',
        created: new Date('2023-01-01'),
        updated: new Date('2023-01-01'),
        status: Status.RECEIVED,
        metadata: 'test metadata',
        records: 5,
        outcome: Outcome.SUCCESS
      };

      await redisService.addToQueue(queueObject);

      expect(mockClient.hSet).toHaveBeenCalledWith(
        'paydash:object:test-id',
        {
          objectId: 'test-id',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          status: Status.RECEIVED,
          metadata: 'test metadata',
          records: '5',
          outcome: Outcome.SUCCESS
        }
      );
      expect(mockClient.lPush).toHaveBeenCalledWith('paydash:queue', 'test-id');
    });

    it('should handle missing outcome', async () => {
      const queueObject: QueueObject = {
        objectId: 'test-id',
        created: new Date('2023-01-01'),
        updated: new Date('2023-01-01'),
        status: Status.RECEIVED,
        metadata: 'test metadata',
        records: 5
      };

      await redisService.addToQueue(queueObject);

      expect(mockClient.hSet).toHaveBeenCalledWith(
        'paydash:object:test-id',
        expect.objectContaining({
          outcome: ''
        })
      );
    });
  });

  describe('getQueueObjects', () => {
    it('should return queue objects successfully', async () => {
      mockClient.lRange.mockResolvedValueOnce(['test-id-1', 'test-id-2']);
      mockClient.hGetAll
        .mockResolvedValueOnce({
          objectId: 'test-id-1',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          status: Status.RECEIVED,
          metadata: 'test metadata',
          records: '5',
          outcome: Outcome.SUCCESS
        })
        .mockResolvedValueOnce({
          objectId: 'test-id-2',
          created: '2023-01-02T00:00:00.000Z',
          updated: '2023-01-02T00:00:00.000Z',
          status: Status.PROCESSING,
          metadata: 'test metadata 2',
          records: '3',
          outcome: ''
        });

      const result = await redisService.getQueueObjects(10);

      expect(result).toEqual([
        {
          objectId: 'test-id-2',
          created: new Date('2023-01-02T00:00:00.000Z'),
          updated: new Date('2023-01-02T00:00:00.000Z'),
          status: Status.PROCESSING,
          metadata: 'test metadata 2',
          records: 3,
          outcome: undefined
        },
        {
          objectId: 'test-id-1',
          created: new Date('2023-01-01T00:00:00.000Z'),
          updated: new Date('2023-01-01T00:00:00.000Z'),
          status: Status.RECEIVED,
          metadata: 'test metadata',
          records: 5,
          outcome: Outcome.SUCCESS
        }
      ]);
    });

    it('should handle empty queue', async () => {
      mockClient.lRange.mockResolvedValueOnce([]);

      const result = await redisService.getQueueObjects();

      expect(result).toEqual([]);
    });

    it('should skip objects with missing data', async () => {
      mockClient.lRange.mockResolvedValueOnce(['test-id-1', 'missing-id']);
      mockClient.hGetAll
        .mockResolvedValueOnce({
          objectId: 'test-id-1',
          created: '2023-01-01T00:00:00.000Z',
          updated: '2023-01-01T00:00:00.000Z',
          status: Status.RECEIVED,
          metadata: 'test metadata',
          records: '5',
          outcome: ''
        })
        .mockResolvedValueOnce({});

      const result = await redisService.getQueueObjects();

      expect(result).toHaveLength(1);
      expect(result[0].objectId).toBe('test-id-1');
    });
  });

  describe('updateQueueObject', () => {
    it('should update queue object successfully', async () => {
      const updates = {
        status: Status.COMPLETE,
        outcome: Outcome.SUCCESS,
        updated: new Date('2023-01-02')
      };

      await redisService.updateQueueObject('test-id', updates);

      expect(mockClient.hSet).toHaveBeenCalledWith(
        'paydash:object:test-id',
        {
          status: Status.COMPLETE,
          outcome: Outcome.SUCCESS,
          updated: '2023-01-02T00:00:00.000Z'
        }
      );
    });

    it('should handle partial updates', async () => {
      const updates = {
        status: Status.PROCESSING
      };

      await redisService.updateQueueObject('test-id', updates);

      expect(mockClient.hSet).toHaveBeenCalledWith(
        'paydash:object:test-id',
        {
          status: Status.PROCESSING
        }
      );
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      mockClient.lLen.mockResolvedValueOnce(5);

      const result = await redisService.getQueueLength();

      expect(result).toBe(5);
      expect(mockClient.lLen).toHaveBeenCalledWith('paydash:queue');
    });
  });

  describe('clearQueue', () => {
    it('should clear queue successfully', async () => {
      mockClient.lRange.mockResolvedValueOnce(['test-id-1', 'test-id-2']);
      mockClient.del.mockResolvedValue(1);

      await redisService.clearQueue();

      expect(mockClient.del).toHaveBeenCalledWith('paydash:object:test-id-1');
      expect(mockClient.del).toHaveBeenCalledWith('paydash:object:test-id-2');
      expect(mockClient.del).toHaveBeenCalledWith('paydash:queue');
    });

    it('should handle empty queue during clear', async () => {
      mockClient.lRange.mockResolvedValueOnce([]);

      await redisService.clearQueue();

      expect(mockClient.del).toHaveBeenCalledWith('paydash:queue');
    });
  });
});