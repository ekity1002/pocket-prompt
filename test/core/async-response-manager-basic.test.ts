import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ChromeResponse } from '../../src/types';
import { AsyncResponseManager } from '../../src/core/async-response-manager';

// Test utilities
const generateRequestId = () => `req-${Date.now()}-${Math.random()}`;

describe('AsyncResponseManager - Basic Tests', () => {
  let asyncResponseManager: AsyncResponseManager;

  beforeEach(() => {
    asyncResponseManager = new AsyncResponseManager(1000); // 1 second cleanup
  });

  afterEach(() => {
    asyncResponseManager.destroy();
  });

  describe('Basic Response Management', () => {
    it('should handle response correlation', async () => {
      const requestId = generateRequestId();
      const expectedResponse: ChromeResponse = {
        success: true,
        data: { prompts: [] },
        requestId,
        messageType: 'GET_PROMPTS',
      };

      // Start waiting for response
      const responsePromise = asyncResponseManager.waitForResponse(requestId, 100);

      // Simulate response after short delay
      setTimeout(() => {
        asyncResponseManager.handleResponse(expectedResponse);
      }, 50);

      const response = await responsePromise;

      expect(response.requestId).toBe(requestId);
      expect(response.success).toBe(true);
      expect(response.messageType).toBe('GET_PROMPTS');
    });

    it('should timeout requests when no response received', async () => {
      const requestId = generateRequestId();
      const timeoutMs = 100;

      const startTime = Date.now();
      const response = await asyncResponseManager.waitForResponse(requestId, timeoutMs);
      const endTime = Date.now();

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('REQUEST_TIMEOUT');
      expect(endTime - startTime).toBeGreaterThanOrEqual(timeoutMs - 50);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = [
        { id: 'req-1', type: 'GET_PROMPTS' as const },
        { id: 'req-2', type: 'GET_SETTINGS' as const },
        { id: 'req-3', type: 'COPY_PROMPT' as const },
      ];

      // Start all requests
      const responsePromises = requests.map((req) =>
        asyncResponseManager.waitForResponse(req.id, 200)
      );

      // Send responses
      setTimeout(() => {
        requests.forEach((req) => {
          asyncResponseManager.handleResponse({
            success: true,
            data: {},
            requestId: req.id,
            messageType: req.type,
          });
        });
      }, 50);

      const responses = await Promise.all(responsePromises);

      expect(responses).toHaveLength(3);
      expect(responses[0].requestId).toBe('req-1');
      expect(responses[1].requestId).toBe('req-2');
      expect(responses[2].requestId).toBe('req-3');
    });
  });

  describe('Handler Management', () => {
    it('should register and handle responses', () => {
      const requestId = generateRequestId();
      let receivedResponse: ChromeResponse | null = null;

      asyncResponseManager.registerHandler(requestId, (response) => {
        receivedResponse = response;
      });

      const testResponse: ChromeResponse = {
        success: true,
        data: { test: 'data' },
        requestId,
        messageType: 'GET_PROMPTS',
      };

      asyncResponseManager.handleResponse(testResponse);

      expect(receivedResponse).toEqual(testResponse);
    });

    it('should unregister handlers', () => {
      const requestId = generateRequestId();
      let callCount = 0;

      asyncResponseManager.registerHandler(requestId, () => {
        callCount++;
      });

      asyncResponseManager.unregisterHandler(requestId);

      const testResponse: ChromeResponse = {
        success: true,
        data: {},
        requestId,
        messageType: 'GET_PROMPTS',
      };

      asyncResponseManager.handleResponse(testResponse);

      expect(callCount).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired handlers', async () => {
      const requestId = generateRequestId();

      // Trigger cleanup manually (private method simulation)
      asyncResponseManager.cleanupExpiredHandlers();

      // Test should not throw and manager should still work
      const response = await asyncResponseManager.waitForResponse(requestId, 100);
      expect(response.error?.code).toBe('REQUEST_TIMEOUT');
    });
  });
});
