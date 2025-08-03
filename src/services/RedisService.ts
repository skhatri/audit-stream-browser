import { createClient, RedisClientType } from 'redis';
import { QueueObject, Outcome } from '../models';
import { logger } from '../utils';

export class RedisService {
  private client: RedisClientType;
  private readonly QUEUE_KEY = 'paydash:queue';
  private readonly OBJECT_KEY_PREFIX = 'paydash:object:';

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
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

  async addToQueue(queueObject: QueueObject): Promise<void> {
    try {
      const objectKey = `${this.OBJECT_KEY_PREFIX}${queueObject.objectId}`;
      
      await this.client.hSet(objectKey, {
        objectId: queueObject.objectId,
        created: queueObject.created.toISOString(),
        updated: queueObject.updated.toISOString(),
        status: queueObject.status,
        metadata: queueObject.metadata,
        records: queueObject.records.toString(),
        outcome: queueObject.outcome || ''
      });

      await this.client.lPush(this.QUEUE_KEY, queueObject.objectId);
      
      logger.debug(`Added object ${queueObject.objectId} to queue`);
    } catch (error) {
      logger.error('Failed to add object to queue:', error);
      throw error;
    }
  }

  async getQueueObjects(limit: number = 100): Promise<QueueObject[]> {
    try {
      const objectIds = await this.client.lRange(this.QUEUE_KEY, 0, limit - 1);
      const objects: QueueObject[] = [];

      for (const objectId of objectIds) {
        const objectKey = `${this.OBJECT_KEY_PREFIX}${objectId}`;
        const objectData = await this.client.hGetAll(objectKey);
        
        if (objectData && objectData.objectId) {
          objects.push({
            objectId: objectData.objectId,
            created: new Date(objectData.created),
            updated: new Date(objectData.updated),
            status: objectData.status as any,
            metadata: objectData.metadata,
            records: parseInt(objectData.records),
            outcome: objectData.outcome ? objectData.outcome as Outcome : undefined
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

  async updateQueueObject(objectId: string, updates: Partial<QueueObject>): Promise<void> {
    try {
      const objectKey = `${this.OBJECT_KEY_PREFIX}${objectId}`;
      const updateData: Record<string, string> = {};

      if (updates.status) updateData.status = updates.status;
      if (updates.outcome) updateData.outcome = updates.outcome;
      if (updates.updated) updateData.updated = updates.updated.toISOString();

      await this.client.hSet(objectKey, updateData);
      
      logger.debug(`Updated object ${objectId}`);
    } catch (error) {
      logger.error('Failed to update queue object:', error);
      throw error;
    }
  }

  async getQueueLength(): Promise<number> {
    try {
      return await this.client.lLen(this.QUEUE_KEY);
    } catch (error) {
      logger.error('Failed to get queue length:', error);
      throw error;
    }
  }

  async clearQueue(): Promise<void> {
    try {
      const objectIds = await this.client.lRange(this.QUEUE_KEY, 0, -1);
      
      for (const objectId of objectIds) {
        const objectKey = `${this.OBJECT_KEY_PREFIX}${objectId}`;
        await this.client.del(objectKey);
      }
      
      await this.client.del(this.QUEUE_KEY);
      
      logger.info('Queue cleared');
    } catch (error) {
      logger.error('Failed to clear queue:', error);
      throw error;
    }
  }
}