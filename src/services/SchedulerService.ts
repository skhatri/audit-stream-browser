import { v4 as uuidv4 } from 'uuid';
import { Status, QueueObject, Outcome, isTerminalStatus } from '../models';
import { RedisService } from './RedisService';
import { logger } from '../utils';

export class SchedulerService {
  private redisService: RedisService;
  private insertTimeout: NodeJS.Timeout | null = null;
  private updateTimeout: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(redisService: RedisService) {
    this.redisService = redisService;
  }

  start(): void {
    this.isRunning = true;
    this.scheduleNextInsert();
    this.scheduleNextUpdate();
    logger.info(`Scheduler started - inserting records every 30-50 seconds, updating every 15-30 seconds`);
  }

  private scheduleNextInsert(): void {
    if (!this.isRunning) return;
    
    const minSeconds = 30;
    const maxSeconds = 50;
    const randomDelay = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;
    
    this.insertTimeout = setTimeout(async () => {
      try {
        await this.insertRandomRecord();
      } catch (error) {
        logger.error('Error in insert task:', error);
      }
      this.scheduleNextInsert();
    }, randomDelay);
  }

  private scheduleNextUpdate(): void {
    if (!this.isRunning) return;
    
    const minSeconds = 15;
    const maxSeconds = 30;
    const randomDelay = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;
    
    this.updateTimeout = setTimeout(async () => {
      try {
        await this.updateSingleRecord();
      } catch (error) {
        logger.error('Error in update task:', error);
      }
      this.scheduleNextUpdate();
    }, randomDelay);
  }

  stop(): void {
    this.isRunning = false;
    if (this.insertTimeout) {
      clearTimeout(this.insertTimeout);
      this.insertTimeout = null;
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
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

  private async updateSingleRecord(): Promise<void> {
    const objects = await this.redisService.getQueueObjects(50);
    const nonTerminalObjects = objects.filter(obj => !isTerminalStatus(obj.status));
    
    if (nonTerminalObjects.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * nonTerminalObjects.length);
    const obj = nonTerminalObjects[randomIndex];

    const nextStatus = this.getNextStatus(obj.status);
    const outcome = this.getOutcomeForStatus(nextStatus);

    await this.redisService.updateQueueObject(obj.objectId, {
      status: nextStatus,
      updated: new Date(),
      outcome
    });

    logger.debug(`Updated ${obj.objectId}: ${obj.status} -> ${nextStatus}${outcome ? ` (${outcome})` : ''}`);
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

  private getOutcomeForStatus(status: Status): Outcome | undefined {
    switch (status) {
      case Status.INVALID:
        return Outcome.FAILURE;
      case Status.COMPLETE:
        return Outcome.SUCCESS;
      case Status.RECEIVED:
      case Status.VALIDATING:
      case Status.ENRICHING:
      case Status.PROCESSING:
        return undefined;
      default:
        return undefined;
    }
  }
}