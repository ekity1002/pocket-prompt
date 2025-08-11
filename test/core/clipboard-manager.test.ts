import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PromptManager } from '../../src/core/prompt-manager';
import { ClipboardManager } from '../../src/core/clipboard-manager';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    lastError: null,
  },
} as any;

global.chrome = mockChrome;

// Mock PromptManager
const mockPromptManager = {
  recordUsage: vi.fn(),
} as Partial<PromptManager>;

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: mockClipboard,
});

describe('ClipboardManager', () => {
  let clipboardManager: ClipboardManager;

  beforeEach(() => {
    vi.clearAllMocks();
    clipboardManager = new ClipboardManager(mockPromptManager as PromptManager);
    mockChrome.runtime.lastError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('REQ-CB-001: Basic Copy Functionality', () => {
    it('should copy plain text to clipboard successfully', async () => {
      // 🟢 Blue: Basic copy requirement
      const text = 'Hello, World!';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(text);
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string input', async () => {
      // 🟢 Blue: Boundary condition testing
      const text = '';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should reject null or undefined input', async () => {
      // 🟢 Blue: Defensive programming
      await expect(clipboardManager.copyToClipboard(null as any)).rejects.toThrow(
        'Text content is required'
      );

      await expect(clipboardManager.copyToClipboard(undefined as any)).rejects.toThrow(
        'Text content is required'
      );
    });

    it('should handle very large text content', async () => {
      // 🟡 Yellow: Large data boundary testing
      const largeText = 'A'.repeat(100000); // 100KB
      mockClipboard.writeText.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await clipboardManager.copyToClipboard(largeText);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // NFR-002: 1 second limit
      expect(mockClipboard.writeText).toHaveBeenCalledWith(largeText);
    });
  });

  describe('REQ-CB-002: Asynchronous Processing', () => {
    it('should complete copy operation within performance requirements', async () => {
      // 🟢 Blue: NFR-002 performance requirement
      const text = 'Performance test content';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await clipboardManager.copyToClipboard(text);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Normal text should be under 100ms
    });

    it('should handle async clipboard API properly', async () => {
      // 🟢 Blue: Promise-based API requirement
      const text = 'Async test';
      mockClipboard.writeText.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50))
      );

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should timeout after reasonable duration', async () => {
      // 🟡 Yellow: Timeout behavior inference
      const text = 'Timeout test';
      mockClipboard.writeText.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000)) // 2 seconds
      );

      const startTime = Date.now();
      const result = await clipboardManager.copyToClipboard(text, 1000);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(duration).toBeLessThan(1200); // Allow some overhead
    });
  });

  describe('REQ-CB-003: Multi-line Text Support', () => {
    it('should preserve line breaks in copied text', async () => {
      // 🟢 Blue: Multi-line content requirement from prompt requirements
      const multilineText = `Line 1
Line 2
Line 3`;
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(multilineText);

      expect(result.success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(multilineText);
    });

    it('should handle different line break formats', async () => {
      // 🟡 Yellow: Cross-platform compatibility
      const testCases = [
        'Unix\\nLine breaks',
        'Windows\\r\\nLine breaks',
        'Mac\\rLine breaks',
        'Mixed\\n\\r\\nLine\\rbreaks',
      ];

      for (const text of testCases) {
        mockClipboard.writeText.mockClear();
        mockClipboard.writeText.mockResolvedValue(undefined);

        const result = await clipboardManager.copyToClipboard(text);

        expect(result.success).toBe(true);
        expect(mockClipboard.writeText).toHaveBeenCalledWith(text);
      }
    });

    it('should preserve whitespace and tabs', async () => {
      // 🟢 Blue: Code content preservation requirement
      const textWithWhitespace = `function hello() {
	return "Hello, World!";    // Trailing spaces
}`;
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(textWithWhitespace);

      expect(result.success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(textWithWhitespace);
    });

    it('should handle Unicode characters correctly', async () => {
      // 🟡 Yellow: Internationalization consideration
      const unicodeText = `English text
日本語のテキスト
Emojis: 🚀 🎯 📝
Special chars: àáâãäå æç èéêë`;
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(unicodeText);

      expect(result.success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(unicodeText);
    });
  });

  describe('REQ-CB-004: Error Handling', () => {
    it('should handle clipboard API permission denied error', async () => {
      // 🟡 Yellow: Security error handling
      const text = 'Permission test';
      mockClipboard.writeText.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should handle clipboard API not available', async () => {
      // 🟡 Yellow: Browser compatibility
      const text = 'Compatibility test';
      const originalClipboard = navigator.clipboard;

      // Mock clipboard as undefined instead of deleting
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        value: undefined,
      });

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clipboard API not available');

      // Restore
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        value: originalClipboard,
      });
    });

    it('should implement retry mechanism for transient failures', async () => {
      // 🟡 Yellow: Reliability improvement
      const text = 'Retry test';
      let callCount = 0;

      mockClipboard.writeText.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve();
      });

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Should retry 2 times, succeed on 3rd
    });

    it('should fail after maximum retry attempts', async () => {
      // 🟡 Yellow: Failure boundary testing
      const text = 'Max retry test';
      mockClipboard.writeText.mockRejectedValue(new Error('Persistent error'));

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed after 3 attempts');
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
    });
  });

  describe('REQ-CB-005: Usage Statistics Integration', () => {
    it('should record usage when copy succeeds with valid prompt ID', async () => {
      // 🟢 Blue: Usage tracking requirement from TASK-0008
      const text = 'Track usage test';
      const promptId = 'prompt-123e4567-e89b-12d3-a456-test-usage-12345';

      mockClipboard.writeText.mockResolvedValue(undefined);
      mockPromptManager.recordUsage!.mockResolvedValue({} as any);

      const result = await clipboardManager.copyToClipboard(text, undefined, promptId);

      expect(result.success).toBe(true);
      expect(mockPromptManager.recordUsage).toHaveBeenCalledWith(promptId);
      expect(mockPromptManager.recordUsage).toHaveBeenCalledTimes(1);
    });

    it('should not record usage when copy fails', async () => {
      // 🟢 Blue: Conditional usage tracking
      const text = 'Failed copy test';
      const promptId = 'prompt-123e4567-e89b-12d3-a456-test-failed-12345';

      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));

      const result = await clipboardManager.copyToClipboard(text, undefined, promptId);

      expect(result.success).toBe(false);
      expect(mockPromptManager.recordUsage).not.toHaveBeenCalled();
    });

    it('should not record usage when no prompt ID provided', async () => {
      // 🟢 Blue: Optional usage tracking
      const text = 'No tracking test';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(mockPromptManager.recordUsage).not.toHaveBeenCalled();
    });

    it('should handle usage recording errors gracefully', async () => {
      // 🟡 Yellow: Error resilience
      const text = 'Usage error test';
      const promptId = 'prompt-123e4567-e89b-12d3-a456-usage-error-12345';

      mockClipboard.writeText.mockResolvedValue(undefined);
      mockPromptManager.recordUsage!.mockRejectedValue(new Error('Usage tracking failed'));

      const result = await clipboardManager.copyToClipboard(text, undefined, promptId);

      expect(result.success).toBe(true); // Copy should still succeed
      expect(result.error).toBeUndefined(); // Should not propagate usage tracking error
      expect(mockPromptManager.recordUsage).toHaveBeenCalledWith(promptId);
    });
  });

  describe('REQ-CB-006: Performance Requirements', () => {
    it('should handle small text content under 100ms', async () => {
      // 🟢 Blue: Performance requirement - normal text
      const text = 'Small text content';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await clipboardManager.copyToClipboard(text);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('should handle medium text content under 500ms', async () => {
      // 🟢 Blue: Performance requirement - medium text (10KB)
      const text = 'A'.repeat(10000); // 10KB
      mockClipboard.writeText.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await clipboardManager.copyToClipboard(text);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500);
    });

    it('should handle large text content under 1 second', async () => {
      // 🟢 Blue: NFR-002 requirement - large text (100KB)
      const text = 'A'.repeat(100000); // 100KB
      mockClipboard.writeText.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await clipboardManager.copyToClipboard(text);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // NFR-002
    });

    it('should measure and return performance metrics', async () => {
      // 🟡 Yellow: Performance monitoring
      const text = 'Performance metrics test';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics!.duration).toBeGreaterThan(0);
      expect(result.metrics!.textLength).toBe(text.length);
    });
  });

  describe('Edge Cases and Integration Testing', () => {
    it('should handle concurrent copy operations', async () => {
      // 🟡 Yellow: Concurrent operation handling
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      mockClipboard.writeText.mockResolvedValue(undefined);

      const promises = texts.map((text) => clipboardManager.copyToClipboard(text));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
    });

    it('should handle special control characters', async () => {
      // 🟡 Yellow: Edge case content handling
      const textWithControlChars = 'Text with\\x00null\\x01control\\x1fchars';
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardManager.copyToClipboard(textWithControlChars);

      expect(result.success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(textWithControlChars);
    });

    it('should provide detailed error information for debugging', async () => {
      // 🔴 Red: Debugging and troubleshooting support
      const text = 'Debug error test';
      const debugError = new Error('Test error for debugging');
      debugError.stack = 'Test stack trace';

      mockClipboard.writeText.mockRejectedValue(debugError);

      const result = await clipboardManager.copyToClipboard(text);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error for debugging');
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo!.originalError).toBe(debugError);
    });
  });
});
