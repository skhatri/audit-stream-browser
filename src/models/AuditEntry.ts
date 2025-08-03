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
}