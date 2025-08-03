export enum Status {
  RECEIVED = 'RECEIVED',
  VALIDATING = 'VALIDATING',
  INVALID = 'INVALID',
  ENRICHING = 'ENRICHING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE'
}

export enum Outcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

export interface QueueObject {
  objectId: string;
  objectType: string;
  created: string;
  updated: string;
  status: Status;
  metadata: string;
  records: number;
  outcome?: Outcome;
}

export interface QueueResponse {
  success: boolean;
  data: QueueObject[];
  count: number;
}

export interface QueueStats {
  total: number;
  byStatus: Record<string, number>;
  byOutcome: Record<string, number>;
  totalRecords: number;
}

export interface QueueStatsResponse {
  success: boolean;
  data: QueueStats;
}

export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED'
}

export interface AuditEntry {
  auditId: string;
  objectId: string;
  objectType: string;
  action: AuditAction;
  previousStatus?: Status;
  newStatus: Status;
  previousOutcome?: Outcome;
  newOutcome?: Outcome;
  timestamp: string;
  metadata?: string;
}

export interface AuditResponse {
  success: boolean;
  data: AuditEntry[];
  count: number;
  objectType?: string;
  objectId?: string;
}