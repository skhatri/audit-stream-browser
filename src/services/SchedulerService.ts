import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { Status, QueueObject, Outcome, isTerminalStatus } from '../models';
import { RedisService } from './RedisService';
import { logger } from '../utils';

export class SchedulerService {
  private redisService: RedisService;
  private insertTask: cron.ScheduledTask | null = null;
  private updateTask: cron.ScheduledTask | null = null;

  constructor(redisService: RedisService) {
    this.redisService = redisService;
  }

  start(): void {
    this.insertTask = cron.schedule('* * * * *', async () => {
      try {
        await this.insertRandomRecord();
      } catch (error) {
        logger.error('Error in insert task:', error);
      }
    });

    this.updateTask = cron.schedule('*/10 * * * * *', async () => {
      try {
        await this.updateRandomRecords();
      } catch (error) {
        logger.error('Error in update task:', error);
      }
    });

    logger.info('Scheduler started - inserting records every minute, updating every 10 seconds');
  }

  stop(): void {
    if (this.insertTask) {
      this.insertTask.stop();
      this.insertTask = null;
    }
    if (this.updateTask) {
      this.updateTask.stop();
      this.updateTask = null;
    }
    logger.info('Scheduler stopped');
  }

  private async insertRandomRecord(): Promise<void> {
    const now = new Date();
    const records = Math.floor(Math.random() * 10) + 1;
    
    const queueObject: QueueObject = {
      objectId: uuidv4(),
      created: now,
      updated: now,
      status: Status.RECEIVED,
      metadata: JSON.stringify({
        source: 'automated',
        batch: Math.floor(Math.random() * 1000),
        priority: Math.random() > 0.5 ? 'high' : 'normal'
      }),
      records
    };

    await this.redisService.addToQueue(queueObject);
    logger.info(`Inserted new record: ${queueObject.objectId} with ${records} records`);
  }

  private async updateRandomRecords(): Promise<void> {
    const objects = await this.redisService.getQueueObjects(50);
    const nonTerminalObjects = objects.filter(obj => !isTerminalStatus(obj.status));
    
    if (nonTerminalObjects.length === 0) {
      return;
    }

    const numToUpdate = Math.min(3, nonTerminalObjects.length);
    const shuffled = nonTerminalObjects.sort(() => 0.5 - Math.random());
    const toUpdate = shuffled.slice(0, numToUpdate);

    for (const obj of toUpdate) {
      const nextStatus = this.getNextStatus(obj.status);
      const outcome = isTerminalStatus(nextStatus) ? this.getRandomOutcome() : undefined;

      await this.redisService.updateQueueObject(obj.objectId, {
        status: nextStatus,
        updated: new Date(),
        outcome
      });

      logger.debug(`Updated ${obj.objectId}: ${obj.status} -> ${nextStatus}${outcome ? ` (${outcome})` : ''}`);
    }
  }

  private getNextStatus(currentStatus: Status): Status {
    const statusProgression: Record<Status, Status[]> = {
      [Status.RECEIVED]: [Status.VALIDATING],
      [Status.VALIDATING]: [Status.INVALID, Status.ENRICHING],
      [Status.INVALID]: [Status.INVALID],
      [Status.ENRICHING]: [Status.PROCESSING],
      [Status.PROCESSING]: [Status.COMPLETE],
      [Status.COMPLETE]: [Status.COMPLETE]
    };

    const possibleNext = statusProgression[currentStatus];
    return possibleNext[Math.floor(Math.random() * possibleNext.length)];
  }

  private getRandomOutcome(): Outcome {
    return Math.random() > 0.2 ? Outcome.SUCCESS : Outcome.FAILURE;
  }
}