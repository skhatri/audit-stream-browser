import { logger } from '../logger';

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages with timestamp', () => {
      logger.info('Test info message', { extra: 'data' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[INFO\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - Test info message$/),
        { extra: 'data' }
      );
    });
  });

  describe('error', () => {
    it('should log error messages with timestamp', () => {
      logger.error('Test error message', new Error('test'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[ERROR\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - Test error message$/),
        new Error('test')
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages with timestamp', () => {
      logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[WARN\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - Test warning message$/)
      );
    });
  });

  describe('debug', () => {
    it('should log debug messages in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.debug('Test debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[DEBUG\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - Test debug message$/)
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.debug('Test debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});