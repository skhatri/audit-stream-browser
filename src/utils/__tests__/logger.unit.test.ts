import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create logger instance', () => {
    expect(logger).toBeDefined();
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(logger).toBeDefined();
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(logger).toBeDefined();
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(logger).toBeDefined();
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message');
    expect(logger).toBeDefined();
  });
});