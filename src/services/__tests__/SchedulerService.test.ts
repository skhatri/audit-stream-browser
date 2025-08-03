import { SchedulerService } from '../SchedulerService';
import { RedisService } from '../RedisService';
import { Status, Outcome } from '../../models';
import * as cron from 'node-cron';

jest.mock('node-cron');
jest.mock('../RedisService');

const mockRedisService = {
  addToQueue: jest.fn().mockResolvedValue(undefined),
  getQueueObjects: jest.fn().mockResolvedValue([]),
  updateQueueObject: jest.fn().mockResolvedValue(undefined)
} as jest.Mocked<RedisService>;

const mockTask = {
  start: jest.fn(),
  stop: jest.fn()
};

(cron.schedule as jest.Mock).mockReturnValue(mockTask);

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerService = new SchedulerService(mockRedisService);
  });

  describe('start', () => {
    it('should start scheduler tasks', () => {
      schedulerService.start();

      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
      expect(cron.schedule).toHaveBeenCalledWith('*/10 * * * * *', expect.any(Function));
    });
  });

  describe('stop', () => {
    it('should stop scheduler tasks', () => {
      schedulerService.start();
      schedulerService.stop();

      expect(mockTask.stop).toHaveBeenCalledTimes(2);
    });

    it('should handle stop when not started', () => {
      expect(() => schedulerService.stop()).not.toThrow();
    });
  });

  describe('insertRandomRecord', () => {
    it('should insert a random record with correct structure', async () => {
      schedulerService.start();
      
      const insertTask = (cron.schedule as jest.Mock).mock.calls[0][1];
      await insertTask();

      expect(mockRedisService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          objectId: expect.any(String),
          created: expect.any(Date),
          updated: expect.any(Date),
          status: Status.RECEIVED,
          metadata: expect.any(String),
          records: expect.any(Number)
        })
      );

      const queueObject = mockRedisService.addToQueue.mock.calls[0][0];
      expect(queueObject.records).toBeGreaterThanOrEqual(1);
      expect(queueObject.records).toBeLessThanOrEqual(10);
      
      const metadata = JSON.parse(queueObject.metadata);
      expect(metadata).toHaveProperty('source', 'automated');
      expect(metadata).toHaveProperty('batch');
      expect(metadata).toHaveProperty('priority');
    });
  });

  describe('updateRandomRecords', () => {
    it('should update non-terminal objects', async () => {
      const mockObjects = [
        {
          objectId: 'obj-1',
          status: Status.RECEIVED,
          created: new Date(),
          updated: new Date(),
          metadata: '',
          records: 5
        },
        {
          objectId: 'obj-2', 
          status: Status.VALIDATING,
          created: new Date(),
          updated: new Date(),
          metadata: '',
          records: 3
        },
        {
          objectId: 'obj-3',
          status: Status.COMPLETE,
          created: new Date(),
          updated: new Date(),
          metadata: '',
          records: 2,
          outcome: Outcome.SUCCESS
        }
      ];

      mockRedisService.getQueueObjects.mockResolvedValueOnce(mockObjects);

      schedulerService.start();
      const updateTask = (cron.schedule as jest.Mock).mock.calls[1][1];
      await updateTask();

      expect(mockRedisService.updateQueueObject).toHaveBeenCalled();
      
      const updateCalls = mockRedisService.updateQueueObject.mock.calls;
      updateCalls.forEach(call => {
        const [objectId] = call;
        expect(['obj-1', 'obj-2']).toContain(objectId);
      });
    });

    it('should handle empty queue during update', async () => {
      mockRedisService.getQueueObjects.mockResolvedValueOnce([]);

      schedulerService.start();
      const updateTask = (cron.schedule as jest.Mock).mock.calls[1][1];
      await updateTask();

      expect(mockRedisService.updateQueueObject).not.toHaveBeenCalled();
    });

    it('should handle only terminal objects', async () => {
      const mockObjects = [
        {
          objectId: 'obj-1',
          status: Status.COMPLETE,
          created: new Date(),
          updated: new Date(),
          metadata: '',
          records: 5,
          outcome: Outcome.SUCCESS
        },
        {
          objectId: 'obj-2',
          status: Status.INVALID,
          created: new Date(),
          updated: new Date(),
          metadata: '',
          records: 3,
          outcome: Outcome.FAILURE
        }
      ];

      mockRedisService.getQueueObjects.mockResolvedValueOnce(mockObjects);

      schedulerService.start();
      const updateTask = (cron.schedule as jest.Mock).mock.calls[1][1];
      await updateTask();

      expect(mockRedisService.updateQueueObject).not.toHaveBeenCalled();
    });

    it('should set outcome for terminal statuses', async () => {
      const mockObjects = [
        {
          objectId: 'obj-1',
          status: Status.PROCESSING,
          created: new Date(),
          updated: new Date(),
          metadata: '',
          records: 5
        }
      ];

      mockRedisService.getQueueObjects.mockResolvedValueOnce(mockObjects);
      
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.5) 
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.1);

      schedulerService.start();
      const updateTask = (cron.schedule as jest.Mock).mock.calls[1][1];
      await updateTask();

      expect(mockRedisService.updateQueueObject).toHaveBeenCalledWith(
        'obj-1',
        expect.objectContaining({
          status: Status.COMPLETE,
          outcome: expect.any(String),
          updated: expect.any(Date)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle insert task errors gracefully', async () => {
      mockRedisService.addToQueue.mockRejectedValueOnce(new Error('Redis error'));

      schedulerService.start();
      const insertTask = (cron.schedule as jest.Mock).mock.calls[0][1];
      
      await expect(insertTask()).resolves.not.toThrow();
    });

    it('should handle update task errors gracefully', async () => {
      mockRedisService.getQueueObjects.mockRejectedValueOnce(new Error('Redis error'));

      schedulerService.start();
      const updateTask = (cron.schedule as jest.Mock).mock.calls[1][1];
      
      await expect(updateTask()).resolves.not.toThrow();
    });
  });
});