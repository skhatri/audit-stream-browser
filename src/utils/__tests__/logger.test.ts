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
    it('should log info messages', () => {
      logger.info('Test info message', { extra: 'data' });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('Test error message', new Error('test'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Test warning message'));
    });
  });

  describe('debug', () => {
    it('should log debug messages in development environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        logger.debug('Test debug message');
        expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Test debug message'));
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
