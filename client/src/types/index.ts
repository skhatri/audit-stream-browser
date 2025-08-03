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