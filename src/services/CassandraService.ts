import { Client } from 'cassandra-driver';
import { AuditEntry, AuditAction, ItemAuditEntry, ItemAuditStats } from '../models';
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
      
      // Based on Java CassandraSinkFunction, object_id is actually text, not UUID
      const result = await this.client.execute(query, [objectType, objectId], { prepare: true });
      
      return result.rows.map(row => ({
        auditId: row.audit_id?.toString() || '',
        objectId: row.object_id?.toString() || '',
        objectType: row.object_type?.toString() || '',
        parentId: row.parent_id?.toString(),
        parentType: row.parent_type?.toString(),
        action: row.action as AuditAction,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        previousOutcome: row.previous_outcome,
        newOutcome: row.new_outcome,
        timestamp: new Date(row.timestamp),
        metadata: row.metadata?.toString() || '{}'
      }));
    } catch (error) {
      logger.error(`Error fetching audit entries for ${objectType}:${objectId}:`, error);
      throw error;
    }
  }

  async getAllAuditEntries(limit: number = 100): Promise<AuditEntry[]> {
    try {
      // For now, return empty array since we can't query audit_entries without partition key
      // In a real implementation, you'd need to either:
      // 1. Use a different table design with better partition strategy
      // 2. Use an external search index like Elasticsearch
      // 3. Query by known object_type/object_id combinations
      logger.info('getAllAuditEntries called - returning empty array due to Cassandra partition key constraints');
      return [];
    } catch (error) {
      logger.error('Error fetching all audit entries:', error);
      throw error;
    }
  }

  async getBatchObjects(limit: number = 100): Promise<any[]> {
    try {
      const query = `SELECT * FROM batch_objects`;
      const result = await this.client.execute(query);
      
      // Apply limit in application code instead
      const limitedRows = result.rows.slice(0, limit);
      
      return limitedRows.map(row => {
        // Safely handle metadata
        const metadata = row.metadata || {};
        const records = metadata && metadata.records ? parseInt(metadata.records.toString()) || 0 : 0;
        
        return {
          objectId: row.object_id?.toString(),
          objectType: row.object_type,
          status: row.status,
          outcome: row.outcome,
          metadata: metadata,
          records: records,
          created: row.created ? new Date(row.created) : new Date(),
          updated: row.updated ? new Date(row.updated) : new Date()
        };
      }).sort((a, b) => {
        const updatedDiff = new Date(b.updated).getTime() - new Date(a.updated).getTime();
        if (updatedDiff !== 0) {
          return updatedDiff;
        }
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
    } catch (error) {
      logger.error('Error fetching batch objects:', error);
      // If table is empty or doesn't exist, return empty array
      return [];
    }
  }

  async getBatchObjectsCount(): Promise<number> {
    try {
      const query = `SELECT COUNT(*) FROM batch_objects ALLOW FILTERING`;
      const result = await this.client.execute(query);
      return result.rows[0].count;
    } catch (error) {
      logger.error('Error getting batch objects count:', error);
      throw error;
    }
  }

  async getBatchObjectsStats(): Promise<any> {
    try {
      // Get all objects and calculate stats in application layer since Cassandra doesn't support GROUP BY on non-PK columns
      const query = `SELECT object_id, object_type, status, outcome, metadata FROM batch_objects ALLOW FILTERING`;
      const result = await this.client.execute(query);
      
      const total = result.rows.length;
      const byStatus: Record<string, number> = {};
      const byOutcome: Record<string, number> = {};
      let totalRecords = 0;

      result.rows.forEach(row => {
        // Count by status
        const status = row.status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Count by outcome
        const outcome = row.outcome || '-';
        byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;

        // Sum records from metadata
        if (row.metadata && row.metadata.records) {
          const records = parseInt(row.metadata.records) || 0;
          totalRecords += records;
        }
      });

      return {
        total,
        byStatus,
        byOutcome,
        totalRecords,
        source: 'cassandra'
      };
    } catch (error) {
      logger.error('Error getting batch objects stats:', error);
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
      const metadata = row.metadata || {};
      const records = metadata && metadata.records ? parseInt(metadata.records.toString()) || 0 : 0;
      
      return {
        objectId: row.object_id?.toString(),
        objectType: row.object_type,
        status: row.status,
        outcome: row.outcome,
        metadata: metadata,
        records: records,
        created: row.created ? new Date(row.created) : new Date(),
        updated: row.updated ? new Date(row.updated) : new Date()
      };
    } catch (error) {
      logger.error(`Error fetching batch object ${objectId}:`, error);
      throw error;
    }
  }

  async getAuditEntriesByParentId(parentId: string, limit: number = 100): Promise<ItemAuditEntry[]> {
    try {
      logger.info(`Querying item audit entries for parent: ${parentId}`);
      
      // Since parent_id is not part of the partition key, we need ALLOW FILTERING
      // Note: Cannot use ORDER BY with ALLOW FILTERING, so we'll sort in application code
      const query = `
        SELECT audit_id, object_id, object_type, parent_id, parent_type, 
               action, previous_status, new_status, previous_outcome, new_outcome, 
               timestamp, metadata
        FROM audit_entries 
        WHERE object_type = 'item' AND parent_id = ?
        LIMIT ?
        ALLOW FILTERING
      `;
      
      logger.info(`Executing query: ${query.replace(/\s+/g, ' ').trim()}`);
      const result = await this.client.execute(query, [parentId, limit], { prepare: true });
      logger.info(`Query returned ${result.rows.length} rows`);
      
      const auditEntries = result.rows.map(row => ({
        auditId: row.audit_id?.toString() || '',
        objectId: row.object_id?.toString() || '',
        objectType: row.object_type?.toString() || '',
        parentId: row.parent_id?.toString() || '',
        parentType: row.parent_type?.toString() as 'batch' || 'batch',
        action: row.action as AuditAction,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        previousOutcome: row.previous_outcome,
        newOutcome: row.new_outcome,
        timestamp: new Date(row.timestamp),
        metadata: row.metadata?.toString() || '{}'
      })) as ItemAuditEntry[];
      
      // Sort by timestamp in descending order (most recent first)
      auditEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return auditEntries;
    } catch (error) {
      logger.error(`Error fetching item audit entries for parent ${parentId}:`, error);
      throw error;
    }
  }

  async getItemAuditStatsByParentId(parentId: string): Promise<ItemAuditStats> {
    try {
      // Get all item audit entries for this parent and calculate stats in application code
      // since Cassandra doesn't support GROUP BY on non-PK columns with ALLOW FILTERING
      const query = `
        SELECT new_status
        FROM audit_entries 
        WHERE object_type = 'item' AND parent_id = ?
        ALLOW FILTERING
      `;
      
      const result = await this.client.execute(query, [parentId], { prepare: true });
      
      const byStatus: Record<string, number> = {};
      let totalItems = 0;

      result.rows.forEach(row => {
        const status = row.new_status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;
        totalItems++;
      });

      return {
        totalItems,
        byStatus,
        parentId,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Error fetching item audit stats for parent ${parentId}:`, error);
      throw error;
    }
  }

  async batchExists(objectId: string): Promise<boolean> {
    try {
      const query = `
        SELECT object_id 
        FROM batch_objects 
        WHERE object_id = ?
        LIMIT 1
      `;
      
      const result = await this.client.execute(query, [objectId], { prepare: true });
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error checking if batch ${objectId} exists:`, error);
      return false;
    }
  }
}