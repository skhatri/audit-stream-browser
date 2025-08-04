import { createClient, RedisClientType } from 'redis';
import { AuditEntry, AuditAction } from '../models';
import { logger } from '../utils';

export class AuditService {
  private client: RedisClientType;
  private readonly AUDIT_OBJECT_KEY_PREFIX = 'paydash:audit:object:';
  private readonly AUDIT_ENTRY_KEY_PREFIX = 'paydash:audit:entry:';

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err) => {
      logger.error('Audit Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Audit service connected to Redis (READ-ONLY)');
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
      const auditIds = await this.client.lRange('paydash:audit:queue', 0, limit - 1);
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


}