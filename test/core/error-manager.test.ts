// ErrorManager Test Suite
// TASK-0010: Comprehensive error handling and logging infrastructure tests

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorManager } from '../../src/core/error-manager';
import type { ErrorContext, UserErrorInfo, ErrorStatistics, ErrorLevel } from '../../src/types';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    lastError: null,
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
} as any;

global.chrome = mockChrome;

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  vi.clearAllMocks();
  global.console = {
    ...originalConsole,
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
  vi.restoreAllMocks();
});

describe('ErrorManager', () => {
  describe('REQ-ERR-001: 構造化エラーログ', () => {
    it('should log errors with structured format', async () => {
      // 🟢 Blue: Core structured logging requirement
      const testError = new Error('Test error message');
      const context: ErrorContext = {
        module: 'TestModule',
        function: 'testFunction',
        userId: 'test-user-123',
        requestId: 'req-456',
      };

      await ErrorManager.logError(testError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.objectContaining({
          timestamp: expect.any(Date),
          level: 'ERROR',
          module: 'TestModule',
          function: 'testFunction',
          message: 'Test error message',
          stack: expect.any(String),
          userAgent: expect.any(String),
          requestId: 'req-456',
        })
      );
    });

    it('should log warnings with proper structure', async () => {
      // 🟢 Blue: Warning level logging
      const context: ErrorContext = {
        module: 'WarningModule',
        function: 'warningFunction',
      };

      await ErrorManager.logWarning('This is a warning', context);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
        expect.objectContaining({
          level: 'WARN',
          message: 'This is a warning',
          module: 'WarningModule',
        })
      );
    });

    it('should log info messages with structured format', async () => {
      // 🟢 Blue: Info level logging
      const context: ErrorContext = {
        module: 'InfoModule',
        function: 'infoFunction',
      };

      await ErrorManager.logInfo('Information message', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        expect.objectContaining({
          level: 'INFO',
          message: 'Information message',
        })
      );
    });

    it('should handle missing context gracefully', async () => {
      // 🟡 Yellow: Defensive programming for missing context
      const testError = new Error('Error without context');

      await ErrorManager.logError(testError, {});

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.objectContaining({
          message: 'Error without context',
          module: 'Unknown',
          function: 'Unknown',
        })
      );
    });
  });

  describe('REQ-ERR-002: Chrome拡張特有エラー対応', () => {
    it('should handle Chrome storage quota exceeded error', async () => {
      // 🟢 Blue: Chrome-specific error handling requirement
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError');
      const context: ErrorContext = {
        module: 'StorageManager',
        function: 'saveData',
      };

      await ErrorManager.handleStorageError(quotaError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CHROME_STORAGE_ERROR'),
        expect.objectContaining({
          errorType: 'QuotaExceededError',
          chromeSpecific: true,
        })
      );
    });

    it('should handle Chrome permission denied error', async () => {
      // 🟢 Blue: Permission error handling
      const permissionError = new Error('Permission denied');
      Object.assign(permissionError, { name: 'NotAllowedError' });

      await ErrorManager.handlePermissionError(permissionError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CHROME_PERMISSION_ERROR'),
        expect.objectContaining({
          errorType: 'NotAllowedError',
          chromeSpecific: true,
        })
      );
    });

    it('should handle service worker lifecycle errors', async () => {
      // 🟡 Yellow: Service worker specific error handling
      const swError = new Error('Service worker inactive');
      Object.assign(swError, { name: 'InvalidStateError' });

      const context: ErrorContext = {
        module: 'BackgroundScript',
        function: 'handleMessage',
      };

      await ErrorManager.handleChromeExtensionError(swError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CHROME_EXTENSION_ERROR'),
        expect.objectContaining({
          errorType: 'InvalidStateError',
          context: 'service_worker',
        })
      );
    });

    it('should handle content script injection errors', async () => {
      // 🟡 Yellow: Content script error handling
      const injectionError = new Error('Could not establish connection');
      const context: ErrorContext = {
        module: 'ContentScript',
        function: 'injectScript',
      };

      await ErrorManager.handleChromeExtensionError(injectionError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CHROME_EXTENSION_ERROR'),
        expect.objectContaining({
          message: 'Could not establish connection',
          context: 'content_script',
        })
      );
    });
  });

  describe('REQ-ERR-003: ユーザーフレンドリーエラーメッセージ', () => {
    it('should convert technical errors to user-friendly messages in Japanese', () => {
      // 🟢 Blue: User-friendly error message requirement
      const quotaError = new DOMException('QuotaExceededError');

      const userError = ErrorManager.handleUserError(quotaError);

      expect(userError).toEqual({
        title: 'ストレージ容量不足',
        message: 'データの保存容量が不足しています。不要なプロンプトを削除してください。',
        actionable: true,
        actions: [
          { label: 'データを整理', action: 'cleanup' },
          { label: '設定を確認', action: 'settings' },
        ],
        severity: 'error',
      });
    });

    it('should convert technical errors to user-friendly messages in English', () => {
      // 🟢 Blue: Multi-language support requirement
      const networkError = new Error('Failed to fetch');

      const message = ErrorManager.getErrorMessage(networkError, 'en');

      expect(message).toBe(
        'Network connection failed. Please check your internet connection and try again.'
      );
    });

    it('should handle permission errors with user guidance', () => {
      // 🟡 Yellow: Permission error user guidance
      const permissionError = new Error('Permission denied');
      Object.assign(permissionError, { name: 'NotAllowedError' });

      const userError = ErrorManager.handleUserError(permissionError);

      expect(userError).toEqual({
        title: '権限が必要です',
        message: 'この機能を使用するには権限の許可が必要です。設定を確認してください。',
        actionable: true,
        actions: [
          { label: '権限設定', action: 'permissions' },
          { label: 'ヘルプ', action: 'help' },
        ],
        severity: 'warning',
      });
    });

    it('should provide generic message for unknown errors', () => {
      // 🟡 Yellow: Fallback error handling
      const unknownError = new Error('Some unknown error');

      const userError = ErrorManager.handleUserError(unknownError);

      expect(userError.title).toBe('エラーが発生しました');
      expect(userError.message).toContain('予期しないエラー');
      expect(userError.actionable).toBe(true);
      expect(userError.actions).toContainEqual({ label: '再試行', action: 'retry' });
    });
  });

  describe('REQ-ERR-004: エラー統計・集計', () => {
    beforeEach(() => {
      const testStats = {
        totalErrors: 10,
        errorsByType: { QuotaExceededError: 3, NetworkError: 7 },
        errorsByModule: { StorageManager: 5, ClipboardManager: 5 },
        lastUpdated: new Date().toISOString(),
      };

      // Reset and setup chrome storage mocks for each test
      mockChrome.storage.local.get.mockClear();
      mockChrome.storage.local.set.mockClear();

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (Array.isArray(keys) && keys.includes('errorStats')) {
          return Promise.resolve({ errorStats: testStats });
        }
        if (keys === 'errorStats' || (Array.isArray(keys) && keys[0] === 'errorStats')) {
          return Promise.resolve({ errorStats: testStats });
        }
        return Promise.resolve({ errorStats: testStats });
      });

      mockChrome.storage.local.set.mockResolvedValue(undefined);
    });

    it('should track error occurrence statistics', async () => {
      // 🟢 Blue: Error statistics requirement
      const stats = await ErrorManager.getErrorStats();

      expect(stats).toEqual({
        totalErrors: 10,
        errorsByType: expect.objectContaining({
          QuotaExceededError: 3,
          NetworkError: 7,
        }),
        errorsByModule: expect.objectContaining({
          StorageManager: 5,
          ClipboardManager: 5,
        }),
        errorRate: expect.any(Number),
        lastUpdated: expect.any(String),
      });
    });

    it('should update error statistics when logging errors', async () => {
      // 🟡 Yellow: Auto-update statistics on error logging
      const testError = new Error('Test error for stats');
      const context: ErrorContext = {
        module: 'TestModule',
        function: 'testFunction',
      };

      await ErrorManager.logError(testError, context);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          errorStats: expect.objectContaining({
            totalErrors: expect.any(Number),
            errorsByType: expect.any(Object),
            errorsByModule: expect.any(Object),
          }),
        })
      );
    });

    it('should identify frequently occurring error patterns', async () => {
      // 🟡 Yellow: Pattern identification functionality
      mockChrome.storage.local.get.mockResolvedValue({
        errorStats: {
          totalErrors: 100,
          errorsByType: {
            QuotaExceededError: 50,
            NetworkError: 30,
            ValidationError: 20,
          },
        },
      });

      const stats = await ErrorManager.getErrorStats();
      const frequentErrors = Object.entries(stats.errorsByType || {})
        .filter(([, count]) => count > 40)
        .map(([type]) => type);

      expect(frequentErrors).toContain('QuotaExceededError');
      expect(frequentErrors).not.toContain('ValidationError');
    });

    it('should measure performance impact of errors', async () => {
      // 🟡 Yellow: Performance impact measurement
      const performanceError = new Error('Performance degradation detected');
      const context: ErrorContext = {
        module: 'PerformanceModule',
        function: 'measurePerformance',
        metadata: { duration: 5000, threshold: 1000 },
      };

      await ErrorManager.logError(performanceError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.objectContaining({
          performanceImpact: true,
          metadata: expect.objectContaining({
            duration: 5000,
            threshold: 1000,
          }),
        })
      );
    });
  });

  describe('REQ-ERR-005: デバッグ情報収集', () => {
    it('should collect detailed debug information in development mode', async () => {
      // 🟡 Yellow: Development mode debug information
      process.env.NODE_ENV = 'development';

      const debugError = new Error('Debug test error');
      debugError.stack = 'Error: Debug test error\n    at test.js:10:5';

      const context: ErrorContext = {
        module: 'DebugModule',
        function: 'debugFunction',
        metadata: { debugInfo: 'additional debug data' },
      };

      await ErrorManager.logError(debugError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.objectContaining({
          stack: expect.stringContaining('test.js:10:5'),
          debugMode: true,
          metadata: expect.objectContaining({
            debugInfo: 'additional debug data',
          }),
          environment: 'development',
        })
      );

      process.env.NODE_ENV = 'test'; // Reset
    });

    it('should limit logging in production mode', async () => {
      // 🟡 Yellow: Production mode minimal logging
      process.env.NODE_ENV = 'production';

      const prodError = new Error('Production error');
      const context: ErrorContext = {
        module: 'ProductionModule',
        function: 'prodFunction',
        metadata: { sensitiveData: 'should not be logged' },
      };

      await ErrorManager.logError(prodError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.objectContaining({
          message: 'Production error',
          debugMode: false,
        })
      );

      // Should not log sensitive metadata in production
      expect(console.error).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({
            sensitiveData: expect.anything(),
          }),
        })
      );

      process.env.NODE_ENV = 'test'; // Reset
    });

    it('should collect error reproduction context', async () => {
      // 🔴 Red: Error reproduction information
      const reproError = new Error('Error with reproduction context');
      const context: ErrorContext = {
        module: 'ReproModule',
        function: 'reproFunction',
        reproductionContext: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          currentUrl: window.location?.href || 'chrome-extension://test',
          userActions: ['click-button', 'submit-form'],
          systemState: { memoryUsage: 'high', networkStatus: 'online' },
        },
      };

      await ErrorManager.logError(reproError, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.objectContaining({
          reproductionContext: expect.objectContaining({
            userAgent: expect.any(String),
            timestamp: expect.any(String),
            userActions: expect.arrayContaining(['click-button', 'submit-form']),
            systemState: expect.objectContaining({
              memoryUsage: 'high',
              networkStatus: 'online',
            }),
          }),
        })
      );
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle circular reference errors gracefully', async () => {
      // 🟡 Yellow: Edge case handling
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      const context: ErrorContext = {
        module: 'CircularModule',
        metadata: circularObj,
      };

      const circularError = new Error('Circular reference error');

      await expect(ErrorManager.logError(circularError, context)).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle very large error objects efficiently', async () => {
      // 🟡 Yellow: Performance with large error objects
      const largeError = new Error('Large error');
      const largeContext: ErrorContext = {
        module: 'LargeModule',
        metadata: {
          largeData: 'x'.repeat(10000), // 10KB string
          arrayData: new Array(1000).fill('data'),
        },
      };

      const startTime = performance.now();
      await ErrorManager.logError(largeError, largeContext);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle concurrent error logging correctly', async () => {
      // 🟡 Yellow: Concurrent error handling
      const errors = Array.from({ length: 10 }, (_, i) => new Error(`Concurrent error ${i}`));
      const contexts = errors.map((_, i) => ({
        module: `ConcurrentModule${i}`,
        function: `concurrentFunction${i}`,
      }));

      const promises = errors.map((error, i) => ErrorManager.logError(error, contexts[i]));

      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledTimes(10);
    });

    it('should report critical errors with appropriate severity', async () => {
      // 🔴 Red: Critical error reporting
      const criticalError = new Error('System failure - critical error');

      await ErrorManager.reportCriticalError(criticalError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL'),
        expect.objectContaining({
          severity: 'critical',
          requiresImmedateAttention: true,
          message: 'System failure - critical error',
        })
      );
    });
  });
});
