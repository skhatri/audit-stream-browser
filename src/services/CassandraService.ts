import { Client } from 'cassandra-driver';
import { AuditEntry, AuditAction } from '../models';
import { logger } from '../utils';

export class CassandraService {
  private client: Client;
  private readonly KEYSPACE = 'paydash';
  
  constructor() {
    this.client = new Client({
      contactPoints: [process.env.CASSANDRA_HOST || 'localhost:9042'],
      localDataCenter: 'datacenter1',
      keyspace: this.KEYSPACE
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Connected to Cassandra');
    } catch (error) {
      logger.error('Failed to connect to Cassandra:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.shutdown();
      logger.info('Disconnected from Cassandra');
    } catch (error) {
      logger.error('Error disconnecting from Cassandra:', error);
      throw error;
    }
  }

  async getAuditEntriesByObjectId(objectType: string, objectId: string): Promise<AuditEntry[]> {
    try {
      const query = `
        SELECT audit_id, object_id, object_type, parent_id, parent_type, 
               action, previous_status, new_status, previous_outcome, new_outcome, 
               timestamp, metadata
        FROM audit_entries 
        WHERE object_type = ? AND object_id = ?
        ORDER BY timestamp DESC
      `;
      
      const result = await this.client.execute(query, [objectType, objectId]);
      
      return result.rows.map(row => ({
        auditId: row.audit_id,
        objectId: row.object_id,
        objectType: row.object_type,
        parentId: row.parent_id,
        parentType: row.parent_type,
        action: row.action as AuditAction,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        previousOutcome: row.previous_outcome,
        newOutcome: row.new_outcome,
        timestamp: new Date(row.timestamp),
        metadata: row.metadata || '{}'
      }));
    } catch (error) {
      logger.error(`Error fetching audit entries for ${objectType}:${objectId}:`, error);
      throw error;
    }
  }

  async getAllAuditEntries(limit: number = 100): Promise<AuditEntry[]> {
    try {
      const query = `
        SELECT audit_id, object_id, object_type, parent_id, parent_type, 
               action, previous_status, new_status, previous_outcome, new_outcome, 
               timestamp, metadata
        FROM audit_entries 
        LIMIT ?
      `;
      
      const result = await this.client.execute(query, [limit]);
      
      return result.rows.map(row => ({
        auditId: row.audit_id,
        objectId: row.object_id,
        objectType: row.object_type,
        parentId: row.parent_id,
        parentType: row.parent_type,
        action: row.action as AuditAction,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        previousOutcome: row.previous_outcome,
        newOutcome: row.new_outcome,
        timestamp: new Date(row.timestamp),
        metadata: row.metadata || '{}'
      }));
    } catch (error) {
      logger.error('Error fetching all audit entries:', error);
      throw error;
    }
  }

  async getBatchObjectById(objectId: string): Promise<any | null> {
    try {
      const query = `
        SELECT object_id, object_type, status, outcome, metadata, created, updated
        FROM batch_objects 
        WHERE object_id = ?
      `;
      
      const result = await this.client.execute(query, [objectId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        objectId: row.object_id,
        objectType: row.object_type,
        status: row.status,
        outcome: row.outcome,
        metadata: row.metadata || {},
        created: new Date(row.created),
        updated: new Date(row.updated)
      };
    } catch (error) {
      logger.error(`Error fetching batch object ${objectId}:`, error);
      throw error;
    }
  }
}