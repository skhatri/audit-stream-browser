import { createClient, RedisClientType } from 'redis';
import { AuditEntry, AuditEntryCreate, AuditAction } from '../models';
import { logger } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  private client: RedisClientType;
  private readonly AUDIT_QUEUE_KEY = 'paydash:audit:queue';
  private readonly AUDIT_OBJECT_KEY_PREFIX = 'paydash:audit:object:';
  private readonly AUDIT_ENTRY_KEY_PREFIX = 'paydash:audit:entry:';

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err) => {
      logger.error('Audit Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Audit service connected to Redis');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect audit service to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      logger.error('Failed to disconnect audit service from Redis:', error);
    }
  }

  async addAuditEntry(auditData: AuditEntryCreate): Promise<void> {
    const auditId = uuidv4();
    const timestamp = new Date();
    
    const auditEntry: AuditEntry = {
      auditId,
      timestamp,
      ...auditData
    };

    try {
      const auditEntryKey = `${this.AUDIT_ENTRY_KEY_PREFIX}${auditId}`;
      
      await this.client.hSet(auditEntryKey, {
        auditId: auditEntry.auditId,
        objectId: auditEntry.objectId,
        objectType: auditEntry.objectType,
        action: auditEntry.action,
        previousStatus: auditEntry.previousStatus || '',
        newStatus: auditEntry.newStatus,
        previousOutcome: auditEntry.previousOutcome || '',
        newOutcome: auditEntry.newOutcome || '',
        timestamp: auditEntry.timestamp.toISOString(),
        metadata: auditEntry.metadata || ''
      });

      await this.client.lPush(this.AUDIT_QUEUE_KEY, auditId);
      
      const objectAuditKey = `${this.AUDIT_OBJECT_KEY_PREFIX}${auditEntry.objectType}:${auditEntry.objectId}`;
      await this.client.lPush(objectAuditKey, auditId);
      
      logger.debug(`Added audit entry ${auditId} for object ${auditEntry.objectId}`);
    } catch (error) {
      logger.error('Failed to add audit entry:', error);
      throw error;
    }
  }

  async getAuditEntriesForObject(objectType: string, objectId: string, limit: number = 50): Promise<AuditEntry[]> {
    try {
      const objectAuditKey = `${this.AUDIT_OBJECT_KEY_PREFIX}${objectType}:${objectId}`;
      const auditIds = await this.client.lRange(objectAuditKey, 0, limit - 1);
      
      const entries: AuditEntry[] = [];
      
      for (const auditId of auditIds) {
        const auditEntryKey = `${this.AUDIT_ENTRY_KEY_PREFIX}${auditId}`;
        const auditData = await this.client.hGetAll(auditEntryKey);
        
        if (auditData && auditData.auditId) {
          entries.push({
            auditId: auditData.auditId,
            objectId: auditData.objectId,
            objectType: auditData.objectType,
            action: auditData.action as AuditAction,
            previousStatus: auditData.previousStatus && auditData.previousStatus !== '' ? auditData.previousStatus as any : undefined,
            newStatus: auditData.newStatus as any,
            previousOutcome: auditData.previousOutcome && auditData.previousOutcome !== '' ? auditData.previousOutcome as any : undefined,
            newOutcome: auditData.newOutcome && auditData.newOutcome !== '' ? auditData.newOutcome as any : undefined,
            timestamp: new Date(auditData.timestamp),
            metadata: auditData.metadata || undefined
          });
        }
      }
      
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logger.error('Failed to get audit entries for object:', error);
      throw error;
    }
  }

  async getAllAuditEntries(limit: number = 100): Promise<AuditEntry[]> {
    try {
      const auditIds = await this.client.lRange(this.AUDIT_QUEUE_KEY, 0, limit - 1);
      const entries: AuditEntry[] = [];
      
      for (const auditId of auditIds) {
        const auditEntryKey = `${this.AUDIT_ENTRY_KEY_PREFIX}${auditId}`;
        const auditData = await this.client.hGetAll(auditEntryKey);
        
        if (auditData && auditData.auditId) {
          entries.push({
            auditId: auditData.auditId,
            objectId: auditData.objectId,
            objectType: auditData.objectType,
            action: auditData.action as AuditAction,
            previousStatus: auditData.previousStatus && auditData.previousStatus !== '' ? auditData.previousStatus as any : undefined,
            newStatus: auditData.newStatus as any,
            previousOutcome: auditData.previousOutcome && auditData.previousOutcome !== '' ? auditData.previousOutcome as any : undefined,
            newOutcome: auditData.newOutcome && auditData.newOutcome !== '' ? auditData.newOutcome as any : undefined,
            timestamp: new Date(auditData.timestamp),
            metadata: auditData.metadata || undefined
          });
        }
      }
      
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logger.error('Failed to get all audit entries:', error);
      throw error;
    }
  }

  async clearAuditQueue(): Promise<void> {
    try {
      await this.client.del(this.AUDIT_QUEUE_KEY);
      logger.info('Audit queue cleared');
    } catch (error) {
      logger.error('Failed to clear audit queue:', error);
      throw error;
    }
  }
}