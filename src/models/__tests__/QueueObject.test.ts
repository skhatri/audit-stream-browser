import { Status, Outcome, isTerminalStatus, TERMINAL_STATUSES } from '../QueueObject';

describe('QueueObject models', () => {
  describe('Status enum', () => {
    it('should have all expected status values', () => {
      expect(Status.RECEIVED).toBe('RECEIVED');
      expect(Status.VALIDATING).toBe('VALIDATING');
      expect(Status.INVALID).toBe('INVALID');
      expect(Status.ENRICHING).toBe('ENRICHING');
      expect(Status.PROCESSING).toBe('PROCESSING');
      expect(Status.COMPLETE).toBe('COMPLETE');
    });
  });

  describe('Outcome enum', () => {
    it('should have all expected outcome values', () => {
      expect(Outcome.SUCCESS).toBe('SUCCESS');
      expect(Outcome.FAILURE).toBe('FAILURE');
    });
  });

  describe('TERMINAL_STATUSES', () => {
    it('should contain only terminal statuses', () => {
      expect(TERMINAL_STATUSES).toEqual([Status.INVALID, Status.COMPLETE]);
      expect(TERMINAL_STATUSES).toHaveLength(2);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalStatus(Status.INVALID)).toBe(true);
      expect(isTerminalStatus(Status.COMPLETE)).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalStatus(Status.RECEIVED)).toBe(false);
      expect(isTerminalStatus(Status.VALIDATING)).toBe(false);
      expect(isTerminalStatus(Status.ENRICHING)).toBe(false);
      expect(isTerminalStatus(Status.PROCESSING)).toBe(false);
    });
  });
});