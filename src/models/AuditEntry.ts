import { Status, Outcome } from './QueueObject';

export interface AuditEntry {
  auditId: string;
  objectId: string;
  objectType: string;
  action: AuditAction;
  previousStatus?: Status;
  newStatus: Status;
  previousOutcome?: Outcome;
  newOutcome?: Outcome;
  timestamp: Date;
  metadata?: string;
  parentId?: string;
  parentType?: string;
}

export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED'
}

export interface AuditEntryCreate {
  objectId: string;
  objectType: string;
  action: AuditAction;
  previousStatus?: Status;
  newStatus: Status;
  previousOutcome?: Outcome;
  newOutcome?: Outcome;
  metadata?: string;
  parentId?: string;
  parentType?: string;
}

export interface ItemAuditEntry extends AuditEntry {
  parentId: string;
  parentType: 'batch';
}

export interface ItemAuditStats {
  totalItems: number;
  byStatus: Record<string, number>;
  parentId: string;
  lastUpdated: Date;
}

export interface ItemAuditResponse {
  success: boolean;
  data: ItemAuditEntry[];
  stats: ItemAuditStats;
  count: number;
  parentId: string;
}