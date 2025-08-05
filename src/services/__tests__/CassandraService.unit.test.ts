import { CassandraService } from '../CassandraService';

describe('CassandraService', () => {
  let cassandraService: CassandraService;

  beforeEach(() => {
    cassandraService = new CassandraService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create CassandraService instance', () => {
    expect(cassandraService).toBeDefined();
  });

  it('should have getBatchObjects method', () => {
    expect(typeof cassandraService.getBatchObjects).toBe('function');
  });

  it('should have getBatchObjectsStats method', () => {
    expect(typeof cassandraService.getBatchObjectsStats).toBe('function');
  });

  it('should have getAuditEntriesByObjectId method', () => {
    expect(typeof cassandraService.getAuditEntriesByObjectId).toBe('function');
  });

  it('should have getAllAuditEntries method', () => {
    expect(typeof cassandraService.getAllAuditEntries).toBe('function');
  });

  it('should have connect method', () => {
    expect(typeof cassandraService.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    expect(typeof cassandraService.disconnect).toBe('function');
  });
});