import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChromeResponse, ChromeMessageType } from '../../src/types';
import { AsyncResponseManager } from '../../src/core/async-response-manager';

// Test utilities
const generateRequestId = () => `req-${Date.now()}-${Math.random()}`;

const createTestResponse = (
  messageType: ChromeMessageType,
  requestId: string,
  success: boolean = true,
  data?: any
): ChromeResponse => ({
  success,
  data: data || {},
  requestId,
  messageType,
  ...(success ? {} : { error: { code: 'TEST_ERROR', message: 'Test error' } }),
});

describe('AsyncResponseManager', () => {
  let asyncResponseManager: AsyncResponseManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize real AsyncResponseManager
    asyncResponseManager = new AsyncResponseManager(1000); // 1 second cleanup
  });

  describe('Asynchronous Response Management', () => {
    it('should correlate responses with requests using requestId', async () => {
      // 🟢 Blue: Core async pattern from API design
      const requestId = generateRequestId();
      const expectedResponse = createTestResponse('GET_PROMPTS', requestId, true, { prompts: [] });

      // Setup promise that will be resolved later
      let resolvePromise: (value: ChromeResponse) => void;
      const responsePromise = new Promise<ChromeResponse>((resolve) => {
        resolvePromise = resolve;
      });

      asyncResponseManager.waitForResponse.mockReturnValue(responsePromise);

      // Start waiting for response
      const waitPromise = asyncResponseManager.waitForResponse(requestId);

      // Simulate background processing and response after delay
      setTimeout(() => {
        asyncResponseManager.handleResponse(expectedResponse);
        resolvePromise!(expectedResponse);
      }, 100);

      const response = await waitPromise;

      expect(response.requestId).toBe(requestId);
      expect(response.success).toBe(true);
      expect(response.messageType).toBe('GET_PROMPTS');
    });

    it('should handle multiple concurrent requests correctly', async () => {
      // 🟡 Yellow: Concurrent handling inference from requirements
      const requests = [
        { id: 'req-1', type: 'GET_PROMPTS' as ChromeMessageType },
        { id: 'req-2', type: 'GET_SETTINGS' as ChromeMessageType },
        { id: 'req-3', type: 'COPY_PROMPT' as ChromeMessageType },
      ];

      const mockResponses = requests.map((req) => createTestResponse(req.type, req.id));

      // Mock concurrent request processing
      asyncResponseManager.waitForResponse.mockImplementation((requestId: string) => {
        const response = mockResponses.find((r) => r.requestId === requestId);
        return Promise.resolve(response);
      });

      const responsePromises = requests.map((req) => asyncResponseManager.waitForResponse(req.id));

      const responses = await Promise.all(responsePromises);

      expect(responses).toHaveLength(3);
      expect(responses[0].requestId).toBe('req-1');
      expect(responses[0].messageType).toBe('GET_PROMPTS');
      expect(responses[1].requestId).toBe('req-2');
      expect(responses[1].messageType).toBe('GET_SETTINGS');
      expect(responses[2].requestId).toBe('req-3');
      expect(responses[2].messageType).toBe('COPY_PROMPT');
    });

    it('should timeout requests that exceed configured duration', async () => {
      // 🔴 Red: Timeout handling based on best practices
      const requestId = generateRequestId();
      const timeoutMs = 1000; // 1 second for faster test

      const startTime = Date.now();
      const response = await asyncResponseManager.waitForResponse(requestId, timeoutMs);
      const endTime = Date.now();

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('REQUEST_TIMEOUT');
      expect(endTime - startTime).toBeGreaterThanOrEqual(timeoutMs - 100); // Allow some tolerance
    }, 2000); // 2 second test timeout

    it('should clean up expired request handlers', async () => {
      // 🔴 Red: Memory management best practice
      const requestId = generateRequestId();
      const cleanupThreshold = 1000; // 1 second

      // Mock cleanup functionality
      asyncResponseManager.cleanupExpiredHandlers = vi.fn();
      asyncResponseManager._pendingRequests.set(requestId, {
        timestamp: Date.now() - cleanupThreshold - 100,
        handler: vi.fn(),
      });

      asyncResponseManager.cleanupExpiredHandlers.mockImplementation(() => {
        const now = Date.now();
        for (const [id, request] of asyncResponseManager._pendingRequests) {
          if (now - request.timestamp > cleanupThreshold) {
            asyncResponseManager._pendingRequests.delete(id);
          }
        }
      });

      asyncResponseManager.cleanupExpiredHandlers();

      expect(asyncResponseManager.cleanupExpiredHandlers).toHaveBeenCalled();
      expect(asyncResponseManager._pendingRequests.has(requestId)).toBe(false);
    });
  });

  describe('Response Handler Management', () => {
    it('should register and unregister response handlers correctly', () => {
      // 🟡 Yellow: Handler management pattern inference
      const requestId = generateRequestId();
      const mockHandler = vi.fn();

      // Mock handler registration
      asyncResponseManager.registerHandler = vi.fn((id: string, handler: Function) => {
        asyncResponseManager._responseHandlers.set(id, handler);
      });

      asyncResponseManager.unregisterHandler = vi.fn((id: string) => {
        asyncResponseManager._responseHandlers.delete(id);
      });

      asyncResponseManager.registerHandler(requestId, mockHandler);
      expect(asyncResponseManager._responseHandlers.has(requestId)).toBe(true);

      asyncResponseManager.unregisterHandler(requestId);
      expect(asyncResponseManager._responseHandlers.has(requestId)).toBe(false);
    });

    it('should handle response for registered handlers', async () => {
      // 🟢 Blue: Response handling core functionality
      const requestId = generateRequestId();
      const response = createTestResponse('SAVE_PROMPT', requestId);

      let capturedResponse: ChromeResponse | null = null;
      const mockHandler = vi.fn((res: ChromeResponse) => {
        capturedResponse = res;
      });

      asyncResponseManager.handleResponse.mockImplementation((res: ChromeResponse) => {
        if (asyncResponseManager._responseHandlers.has(res.requestId)) {
          const handler = asyncResponseManager._responseHandlers.get(res.requestId);
          handler(res);
        }
      });

      asyncResponseManager._responseHandlers.set(requestId, mockHandler);
      asyncResponseManager.handleResponse(response);

      expect(mockHandler).toHaveBeenCalledWith(response);
      expect(capturedResponse?.requestId).toBe(requestId);
    });
  });

  describe('Error Response Handling', () => {
    it('should properly handle error responses', async () => {
      // 🟡 Yellow: Error response pattern from API design
      const requestId = generateRequestId();
      const errorResponse: ChromeResponse = {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to save prompt to storage',
        },
        requestId,
        messageType: 'SAVE_PROMPT',
      };

      asyncResponseManager.waitForResponse.mockResolvedValue(errorResponse);

      const response = await asyncResponseManager.waitForResponse(requestId);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('STORAGE_ERROR');
      expect(response.error?.message).toBe('Failed to save prompt to storage');
      expect(response.requestId).toBe(requestId);
    });

    it('should handle malformed response gracefully', async () => {
      // 🔴 Red: Defensive programming best practice
      const requestId = generateRequestId();
      const malformedResponse = {
        // Missing required fields
        someData: 'invalid',
      };

      asyncResponseManager.waitForResponse.mockImplementation(() => {
        return Promise.resolve({
          success: false,
          error: {
            code: 'MALFORMED_RESPONSE',
            message: 'Received malformed response',
          },
          requestId,
          messageType: 'UNKNOWN',
        });
      });

      const response = await asyncResponseManager.waitForResponse(requestId);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('MALFORMED_RESPONSE');
    });
  });
});
