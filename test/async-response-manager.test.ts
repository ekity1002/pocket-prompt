// TASK-0007: AsyncResponseManager Test Cases
// TDD Test Implementation for Asynchronous Response Management

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * AsyncResponseManager Test Suite
 * 
 * Tests the asynchronous response management functionality including:
 * - Request/response correlation with unique IDs
 * - Timeout handling for pending requests
 * - Concurrent request management
 * - Response cleanup and memory management
 */

// Mock types for async response management
interface PendingRequest {
  id: string;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeoutId?: NodeJS.Timeout;
}

interface AsyncResponseManager {
  createPendingRequest(id: string, timeoutMs?: number): Promise<any>;
  resolveRequest(id: string, response: any): boolean;
  rejectRequest(id: string, error: Error): boolean;
  cleanupRequest(id: string): void;
  getPendingRequestCount(): number;
  getAllPendingRequestIds(): string[];
  cleanup(): void;
}

// Mock AsyncResponseManager implementation for testing
class MockAsyncResponseManager implements AsyncResponseManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private defaultTimeoutMs = 5000;

  async createPendingRequest(id: string, timeoutMs = this.defaultTimeoutMs): Promise<any> {
    if (this.pendingRequests.has(id)) {
      throw new Error(`Request with id ${id} already exists`);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const request: PendingRequest = {
        id,
        timestamp: Date.now(),
        resolve,
        reject,
        timeoutId
      };

      this.pendingRequests.set(id, request);
    });
  }

  resolveRequest(id: string, response: any): boolean {
    const request = this.pendingRequests.get(id);
    if (!request) {
      return false;
    }

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }

    this.pendingRequests.delete(id);
    request.resolve(response);
    return true;
  }

  rejectRequest(id: string, error: Error): boolean {
    const request = this.pendingRequests.get(id);
    if (!request) {
      return false;
    }

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }

    this.pendingRequests.delete(id);
    request.reject(error);
    return true;
  }

  cleanupRequest(id: string): void {
    const request = this.pendingRequests.get(id);
    if (request) {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      this.pendingRequests.delete(id);
    }
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  getAllPendingRequestIds(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  cleanup(): void {
    for (const [id, request] of this.pendingRequests) {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    }
    this.pendingRequests.clear();
  }
}

describe('AsyncResponseManager', () => {
  let responseManager: AsyncResponseManager;

  beforeEach(() => {
    responseManager = new MockAsyncResponseManager();
  });

  afterEach(() => {
    responseManager.cleanup();
    vi.clearAllTimers();
  });

  describe('Request Creation and Management', () => {
    it('should create a pending request successfully', async () => {
      // Arrange
      const requestId = 'req-001';

      // Act
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(1);
      expect(responseManager.getAllPendingRequestIds()).toContain(requestId);

      // Cleanup
      responseManager.resolveRequest(requestId, { success: true });
      await requestPromise;
    });

    it('should reject creating duplicate request IDs', async () => {
      // Arrange
      const requestId = 'req-002';
      const firstRequest = responseManager.createPendingRequest(requestId, 1000);

      // Act & Assert
      await expect(responseManager.createPendingRequest(requestId, 1000))
        .rejects
        .toThrow(`Request with id ${requestId} already exists`);

      // Cleanup
      responseManager.resolveRequest(requestId, { success: true });
      await firstRequest;
    });

    it('should track multiple concurrent requests', async () => {
      // Arrange
      const requestIds = ['req-003', 'req-004', 'req-005'];

      // Act
      const requests = requestIds.map(id => 
        responseManager.createPendingRequest(id, 1000)
      );

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(3);
      const pendingIds = responseManager.getAllPendingRequestIds();
      requestIds.forEach(id => {
        expect(pendingIds).toContain(id);
      });

      // Cleanup
      requestIds.forEach(id => {
        responseManager.resolveRequest(id, { success: true });
      });
      await Promise.all(requests);
    });
  });

  describe('Request Resolution', () => {
    it('should resolve request with correct response', async () => {
      // Arrange
      const requestId = 'req-006';
      const expectedResponse = { data: 'test', success: true };
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Act
      const resolved = responseManager.resolveRequest(requestId, expectedResponse);
      const actualResponse = await requestPromise;

      // Assert
      expect(resolved).toBe(true);
      expect(actualResponse).toEqual(expectedResponse);
      expect(responseManager.getPendingRequestCount()).toBe(0);
    });

    it('should return false when resolving non-existent request', () => {
      // Act
      const resolved = responseManager.resolveRequest('non-existent', { data: 'test' });

      // Assert
      expect(resolved).toBe(false);
    });

    it('should handle multiple resolution attempts on same request', async () => {
      // Arrange
      const requestId = 'req-007';
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Act
      const firstResolution = responseManager.resolveRequest(requestId, { first: true });
      const secondResolution = responseManager.resolveRequest(requestId, { second: true });

      // Assert
      expect(firstResolution).toBe(true);
      expect(secondResolution).toBe(false);
      
      const response = await requestPromise;
      expect(response).toEqual({ first: true });
    });
  });

  describe('Request Rejection', () => {
    it('should reject request with correct error', async () => {
      // Arrange
      const requestId = 'req-008';
      const expectedError = new Error('Test error');
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Act
      const rejected = responseManager.rejectRequest(requestId, expectedError);

      // Assert
      expect(rejected).toBe(true);
      await expect(requestPromise).rejects.toThrow('Test error');
      expect(responseManager.getPendingRequestCount()).toBe(0);
    });

    it('should return false when rejecting non-existent request', () => {
      // Act
      const rejected = responseManager.rejectRequest('non-existent', new Error('Test'));

      // Assert
      expect(rejected).toBe(false);
    });

    it('should handle multiple rejection attempts on same request', async () => {
      // Arrange
      const requestId = 'req-009';
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Act
      const firstRejection = responseManager.rejectRequest(requestId, new Error('First error'));
      const secondRejection = responseManager.rejectRequest(requestId, new Error('Second error'));

      // Assert
      expect(firstRejection).toBe(true);
      expect(secondRejection).toBe(false);
      
      await expect(requestPromise).rejects.toThrow('First error');
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout request after specified duration', async () => {
      // Arrange
      const requestId = 'req-010';
      const timeoutMs = 100;

      // Act
      const requestPromise = responseManager.createPendingRequest(requestId, timeoutMs);

      // Assert
      await expect(requestPromise)
        .rejects
        .toThrow(`Request ${requestId} timed out after ${timeoutMs}ms`);
      
      expect(responseManager.getPendingRequestCount()).toBe(0);
    });

    it('should not timeout if resolved before timeout', async () => {
      // Arrange
      const requestId = 'req-011';
      const requestPromise = responseManager.createPendingRequest(requestId, 200);

      // Act
      setTimeout(() => {
        responseManager.resolveRequest(requestId, { success: true });
      }, 50);

      // Assert
      const response = await requestPromise;
      expect(response).toEqual({ success: true });
    });

    it('should handle different timeout durations for concurrent requests', async () => {
      // Arrange
      const shortRequestId = 'short-req';
      const longRequestId = 'long-req';
      
      const shortRequest = responseManager.createPendingRequest(shortRequestId, 50);
      const longRequest = responseManager.createPendingRequest(longRequestId, 200);

      // Act & Assert
      await expect(shortRequest)
        .rejects
        .toThrow('timed out after 50ms');

      // Long request should still be pending
      expect(responseManager.getPendingRequestCount()).toBe(1);
      expect(responseManager.getAllPendingRequestIds()).toContain(longRequestId);

      // Resolve long request to prevent timeout
      responseManager.resolveRequest(longRequestId, { success: true });
      await longRequest;
    });
  });

  describe('Request Cleanup', () => {
    it('should cleanup individual request', () => {
      // Arrange
      const requestId = 'req-012';
      responseManager.createPendingRequest(requestId, 1000);

      // Act
      responseManager.cleanupRequest(requestId);

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(0);
      expect(responseManager.getAllPendingRequestIds()).not.toContain(requestId);
    });

    it('should cleanup all requests', async () => {
      // Arrange
      const requestIds = ['req-013', 'req-014', 'req-015'];
      requestIds.forEach(id => {
        responseManager.createPendingRequest(id, 1000);
      });

      // Act
      responseManager.cleanup();

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(0);
      expect(responseManager.getAllPendingRequestIds()).toHaveLength(0);
    });

    it('should handle cleanup of non-existent request gracefully', () => {
      // Act & Assert
      expect(() => responseManager.cleanupRequest('non-existent'))
        .not
        .toThrow();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle high volume of concurrent requests', async () => {
      // Arrange
      const requestCount = 100;
      const requestIds = Array.from({ length: requestCount }, (_, i) => `bulk-req-${i}`);

      // Act
      const startTime = performance.now();
      const requests = requestIds.map(id => 
        responseManager.createPendingRequest(id, 1000)
      );

      // Assert creation performance
      const creationTime = performance.now() - startTime;
      expect(creationTime).toBeLessThan(100); // Should create 100 requests in < 100ms

      expect(responseManager.getPendingRequestCount()).toBe(requestCount);

      // Resolve all requests
      requestIds.forEach((id, index) => {
        responseManager.resolveRequest(id, { index, success: true });
      });

      const responses = await Promise.all(requests);
      expect(responses).toHaveLength(requestCount);
      responses.forEach((response, index) => {
        expect(response).toEqual({ index, success: true });
      });
    });

    it('should handle mixed resolution and rejection of concurrent requests', async () => {
      // Arrange
      const requestIds = ['mixed-1', 'mixed-2', 'mixed-3', 'mixed-4'];
      const requests = requestIds.map(id => 
        responseManager.createPendingRequest(id, 1000)
      );

      // Act
      responseManager.resolveRequest('mixed-1', { success: true });
      responseManager.rejectRequest('mixed-2', new Error('Rejected'));
      responseManager.resolveRequest('mixed-3', { data: 'resolved' });
      // mixed-4 will remain pending for cleanup test

      // Assert
      await expect(requests[0]).resolves.toEqual({ success: true });
      await expect(requests[1]).rejects.toThrow('Rejected');
      await expect(requests[2]).resolves.toEqual({ data: 'resolved' });

      expect(responseManager.getPendingRequestCount()).toBe(1);
      expect(responseManager.getAllPendingRequestIds()).toContain('mixed-4');

      // Cleanup remaining request
      responseManager.cleanupRequest('mixed-4');
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up resolved requests from memory', async () => {
      // Arrange
      const requestId = 'memory-test-1';
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Act
      responseManager.resolveRequest(requestId, { success: true });
      await requestPromise;

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(0);
      expect(responseManager.getAllPendingRequestIds()).toHaveLength(0);
    });

    it('should properly clean up rejected requests from memory', async () => {
      // Arrange
      const requestId = 'memory-test-2';
      const requestPromise = responseManager.createPendingRequest(requestId, 1000);

      // Act
      responseManager.rejectRequest(requestId, new Error('Test error'));
      
      try {
        await requestPromise;
      } catch (error) {
        // Expected error
      }

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(0);
      expect(responseManager.getAllPendingRequestIds()).toHaveLength(0);
    });

    it('should properly clean up timed out requests from memory', async () => {
      // Arrange
      const requestId = 'memory-test-3';
      const requestPromise = responseManager.createPendingRequest(requestId, 50);

      // Act
      try {
        await requestPromise;
      } catch (error) {
        // Expected timeout error
      }

      // Assert
      expect(responseManager.getPendingRequestCount()).toBe(0);
      expect(responseManager.getAllPendingRequestIds()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request ID', async () => {
      // Act & Assert
      await expect(responseManager.createPendingRequest('', 1000))
        .rejects
        .toThrow();
    });

    it('should handle null/undefined request ID', async () => {
      // Act & Assert
      await expect(responseManager.createPendingRequest(null as any, 1000))
        .rejects
        .toThrow();

      await expect(responseManager.createPendingRequest(undefined as any, 1000))
        .rejects
        .toThrow();
    });

    it('should handle zero timeout', async () => {
      // Arrange
      const requestId = 'zero-timeout';
      
      // Act
      const requestPromise = responseManager.createPendingRequest(requestId, 0);

      // Assert
      await expect(requestPromise)
        .rejects
        .toThrow('timed out after 0ms');
    });

    it('should handle negative timeout', async () => {
      // Arrange
      const requestId = 'negative-timeout';
      
      // Act & Assert
      // Should either handle gracefully or use default timeout
      const requestPromise = responseManager.createPendingRequest(requestId, -100);
      
      // Immediately resolve to prevent hanging
      responseManager.resolveRequest(requestId, { success: true });
      
      await expect(requestPromise).resolves.toEqual({ success: true });
    });
  });
});