// ErrorManager Integration Test Suite
// TASK-0010: Integration tests for ErrorManager with other modules

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorManager } from '../../src/core/error-manager';
import { ClipboardManager } from '../../src/core/clipboard-manager';
import { PromptManager } from '../../src/core/prompt-manager';
import type { ErrorContext } from '../../src/types';

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

describe('ErrorManager Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TASK-0010 Integration: Error Handling in Core Modules', () => {
    it('should integrate with ClipboardManager error handling', async () => {
      // 🟢 Blue: Integration with existing module
      const mockPromptManager = {
        recordUsage: vi.fn(),
      } as any;

      const clipboardManager = new ClipboardManager(mockPromptManager);

      // Mock clipboard API to fail
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        value: undefined,
      });

      const testError = await clipboardManager.copyToClipboard('test text').catch((e) => e);

      // Test that ClipboardManager error can be handled by ErrorManager
      const context: ErrorContext = {
        module: 'ClipboardManager',
        function: 'copyToClipboard',
      };

      await ErrorManager.logError(testError, context);

      // Should log the error appropriately
      expect(console.error).toHaveBeenCalled();
    });

    it('should provide user-friendly error messages for Chrome extension errors', () => {
      // 🟢 Blue: User experience integration
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError');
      const userError = ErrorManager.handleUserError(quotaError);

      expect(userError.title).toBe('ストレージ容量不足');
      expect(userError.actionable).toBe(true);
      expect(userError.actions).toHaveLength(2);
    });

    it('should handle concurrent error logging from multiple modules', async () => {
      // 🟡 Yellow: Stress testing with concurrent operations
      const errors = [
        { error: new Error('Prompt Manager Error'), context: { module: 'PromptManager' } },
        { error: new Error('Clipboard Error'), context: { module: 'ClipboardManager' } },
        { error: new Error('Storage Error'), context: { module: 'StorageManager' } },
        { error: new Error('Network Error'), context: { module: 'NetworkManager' } },
      ];

      const promises = errors.map(({ error, context }) => ErrorManager.logError(error, context));

      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledTimes(4);
    });

    it('should maintain consistent error format across all modules', async () => {
      // 🟢 Blue: Consistency requirement
      const modules = ['PromptManager', 'ClipboardManager', 'StorageManager', 'ExportManager'];

      for (const moduleName of modules) {
        const testError = new Error(`Error in ${moduleName}`);
        const context: ErrorContext = {
          module: moduleName,
          function: 'testFunction',
        };

        await ErrorManager.logError(testError, context);

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(`ERROR [${moduleName}]`),
          expect.objectContaining({
            timestamp: expect.any(Date),
            level: 'ERROR',
            module: moduleName,
            message: `Error in ${moduleName}`,
          })
        );
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle error logging without affecting application performance', async () => {
      // 🟡 Yellow: Performance requirement
      const startTime = performance.now();

      await ErrorManager.logError(new Error('Performance test'), {
        module: 'PerformanceTest',
      });

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });

    it('should gracefully handle errors in error handling (meta-errors)', async () => {
      // 🔴 Red: Edge case - error in error handler
      const originalConsoleError = console.error;
      console.error = vi.fn(() => {
        throw new Error('Console error failed');
      });

      // Should not throw, should handle gracefully
      await expect(
        ErrorManager.logError(new Error('Original error'), {
          module: 'TestModule',
        })
      ).resolves.not.toThrow();

      console.error = originalConsoleError;
    });

    it('should work correctly in different environments', async () => {
      // 🟡 Yellow: Environment compatibility
      const environments = ['development', 'test', 'production'];

      for (const env of environments) {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = env;

        await ErrorManager.logError(new Error(`Error in ${env}`), {
          module: 'EnvironmentTest',
        });

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('ERROR'),
          expect.objectContaining({
            environment: env,
            debugMode: env === 'development',
          })
        );

        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should handle storage quota exceeded scenario end-to-end', async () => {
      // 🟢 Blue: Real Chrome extension error scenario
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError');

      // Log the technical error
      await ErrorManager.handleStorageError(quotaError);

      // Get user-friendly message
      const userError = ErrorManager.handleUserError(quotaError);

      // Verify both technical logging and user experience
      expect(console.error).toHaveBeenCalledWith(
        'CHROME_STORAGE_ERROR',
        expect.objectContaining({
          errorType: 'QuotaExceededError',
          chromeSpecific: true,
        })
      );

      expect(userError.title).toBe('ストレージ容量不足');
      expect(userError.actions).toContainEqual({ label: 'データを整理', action: 'cleanup' });
    });

    it('should handle permission denied scenario with user guidance', async () => {
      // 🟢 Blue: Permission error scenario
      const permissionError = new Error('Permission denied');
      Object.assign(permissionError, { name: 'NotAllowedError' });

      await ErrorManager.handlePermissionError(permissionError);
      const userError = ErrorManager.handleUserError(permissionError);

      expect(console.error).toHaveBeenCalledWith(
        'CHROME_PERMISSION_ERROR',
        expect.objectContaining({
          errorType: 'NotAllowedError',
          chromeSpecific: true,
        })
      );

      expect(userError.title).toBe('権限が必要です');
      expect(userError.actions).toContainEqual({ label: '権限設定', action: 'permissions' });
    });

    it('should provide appropriate error recovery suggestions', () => {
      // 🟡 Yellow: Error recovery guidance
      const errors = [
        { error: new Error('Failed to fetch'), expectedAction: 'retry' },
        { error: new DOMException('QuotaExceededError'), expectedAction: 'cleanup' },
        { error: new Error('Permission denied'), expectedAction: 'permissions' },
      ];

      for (const { error, expectedAction } of errors) {
        const userError = ErrorManager.handleUserError(error);

        expect(userError.actionable).toBe(true);
        expect(userError.actions.some((action) => action.action === expectedAction)).toBe(true);
      }
    });
  });
});
