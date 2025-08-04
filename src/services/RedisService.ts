import { createClient, RedisClientType } from 'redis';
import { QueueObject, Outcome } from '../models';
import { logger } from '../utils';

export class RedisService {
  private client: RedisClientType;
  private readonly QUEUE_OBJECTS_KEY = 'queue:objects';
  private readonly OBJECT_KEY_PREFIX = 'queue:object:';

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis (READ-ONLY)');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
    }
  }



  async getQueueObjects(limit: number = 100): Promise<QueueObject[]> {
    try {
      const objectIds = await this.client.zRange(this.QUEUE_OBJECTS_KEY, 0, limit - 1, { REV: true });
      const objects: QueueObject[] = [];

      for (const objectId of objectIds) {
        const objectKey = `${this.OBJECT_KEY_PREFIX}${objectId}`;
        const objectData = await this.client.hGetAll(objectKey);
        
        if (objectData && objectData.objectId) {
          objects.push({
            objectId: objectData.objectId,
            objectType: objectData.objectType || 'batch',
            created: new Date(objectData.created),
            updated: new Date(objectData.updated),
            status: objectData.status as any,
            metadata: objectData.metadata,
            records: parseInt(objectData.records || '0'),
            outcome: objectData.outcome && objectData.outcome !== '' ? objectData.outcome as Outcome : undefined
          });
        }
      }

      return objects.sort((a, b) => {
        const updatedDiff = new Date(b.updated).getTime() - new Date(a.updated).getTime();
        if (updatedDiff !== 0) {
          return updatedDiff;
        }
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
    } catch (error) {
      logger.error('Failed to get queue objects:', error);
      throw error;
    }
  }



  async getQueueLength(): Promise<number> {
    try {
      return await this.client.zCard(this.QUEUE_OBJECTS_KEY);
    } catch (error) {
      logger.error('Failed to get queue length:', error);
      throw error;
    }
  }


}