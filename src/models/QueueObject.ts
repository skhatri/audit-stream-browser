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
  created: Date;
  updated: Date;
  status: Status;
  metadata: string;
  records: number;
  outcome?: Outcome;
}

export interface QueueObjectCreate {
  metadata: string;
  records: number;
}

export interface QueueObjectUpdate {
  status: Status;
  updated: Date;
  outcome?: Outcome;
}

export const TERMINAL_STATUSES = [Status.INVALID, Status.COMPLETE];

export const isTerminalStatus = (status: Status): boolean => {
  return TERMINAL_STATUSES.includes(status);
};