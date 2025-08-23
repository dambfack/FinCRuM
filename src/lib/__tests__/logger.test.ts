import { Logger } from '../logger';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console methods
const consoleMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
Object.defineProperty(window, 'console', {
  value: consoleMock,
});

// Mock fetch for remote logging
global.fetch = jest.fn();

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Basic logging functionality', () => {
    it('should log debug messages', async () => {
      const debugLogger = new Logger({ level: 'debug' });
      await debugLogger.debug('Debug message', { key: 'value' });
      
      expect(consoleMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        { key: 'value' }
      );
    });

    it('should log info messages', () => {
      logger.info('Info message', { key: 'value' });
      
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        { key: 'value' }
      );
    });

    it('should log warn messages', () => {
      logger.warn('Warning message', { key: 'value' });
      
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        { key: 'value' }
      );
    });

    it('should log error messages', async () => {
      await logger.error('Error message', { key: 'value' });
      
      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        { key: 'value' }
      );
    });
  });

  describe('Context management', () => {
    it('should set and use context', async () => {
      logger.setContext('test-context');
      await logger.info('Test message');
      
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[test-context]')
      );
    });

    it('should clear context', async () => {
      logger.setContext('test-context');
      logger.clearContext();
      await logger.info('Test message');
      
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleMock.info).not.toHaveBeenCalledWith(
        expect.stringContaining('[test-context]')
      );
    });
  });

  describe('Session management', () => {
    it('should generate session ID', () => {
      const sessionId = logger.getSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should maintain same session ID across calls', () => {
      const sessionId1 = logger.getSessionId();
      const sessionId2 = logger.getSessionId();
      expect(sessionId1).toBe(sessionId2);
    });
  });

  describe('Local storage logging', () => {
    it('should store logs in localStorage when enabled', () => {
      const loggerWithStorage = new Logger({ enableLocalStorage: true });
      loggerWithStorage.info('Test message');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fincrm_logs',
        expect.stringContaining('Test message')
      );
    });

    it('should not store logs in localStorage when disabled', () => {
      const loggerWithoutStorage = new Logger({ enableLocalStorage: false });
      loggerWithoutStorage.info('Test message');
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve logs from localStorage', () => {
      const testLogs = JSON.stringify([{ message: 'Test log', timestamp: new Date().toISOString() }]);
      localStorageMock.getItem.mockReturnValue(testLogs);
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test log');
    });

    it('should clear logs from localStorage', () => {
      logger.clearLogs();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fincrm_logs');
    });
  });

  describe('Remote logging', () => {
    it('should send logs to remote endpoint when configured', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const loggerWithRemote = new Logger({
        enableRemote: true,
        remoteEndpoint: 'https://api.example.com/logs',
      });
      
      await loggerWithRemote.error('Test error');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test error'),
        })
      );
    });

    it('should handle remote logging failures gracefully', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));

      const loggerWithRemote = new Logger({
        enableRemote: true,
        remoteEndpoint: 'https://api.example.com/logs',
      });
      
      // Should not throw
      expect(() => loggerWithRemote.error('Test error')).not.toThrow();
    });
  });

  describe('Log level filtering', () => {
    it('should respect minimum log level', async () => {
      const loggerWithLevel = new Logger({ level: 'warn' });
      
      await loggerWithLevel.debug('Debug message');
      await loggerWithLevel.info('Info message');
      await loggerWithLevel.warn('Warning message');
      await loggerWithLevel.error('Error message');
      
      expect(consoleMock.debug).not.toHaveBeenCalled();
      expect(consoleMock.info).not.toHaveBeenCalled();
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
    });
  });

  describe('withLogging utility', () => {
    it('should wrap function with logging', async () => {
      const testFunction = jest.fn().mockResolvedValue('result');
      const wrappedFunction = logger.withLogging(testFunction, 'test-function');
      
      const result = await wrappedFunction('arg1', 'arg2');
      
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Function test-function started'),
        expect.any(Object)
      );
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Function test-function completed'),
        expect.any(Object)
      );
    });

    it('should log function errors', async () => {
       const testFunction = jest.fn().mockRejectedValue(new Error('Test error'));
       const wrappedFunction = logger.withLogging(testFunction, 'test-function');
       
       await expect(wrappedFunction()).rejects.toThrow('Test error');
       
       expect(consoleMock.error).toHaveBeenCalledWith(
         expect.stringContaining('Function test-function failed'),
         expect.any(Object)
       );
     });
  });

  describe('Electron integration', () => {
    it('should detect Electron environment', () => {
      // Mock Electron environment
      (global as any).window = {
        require: jest.fn().mockReturnValue({
          ipcRenderer: {
            send: jest.fn(),
          },
        }),
      };
      
      const electronLogger = new Logger();
      electronLogger.info('Test message');
      
      // Should not throw and should handle Electron context
      expect(consoleMock.info).toHaveBeenCalled();
      
      // Cleanup
      delete (global as any).window;
    });
  });

  describe('Error serialization', () => {
    it('should properly serialize Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logger.error('Error occurred', { error });
      
      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error',
            stack: expect.any(String)
          })
        })
      );
    });
  });
});