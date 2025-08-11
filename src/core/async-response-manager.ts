import type { ChromeResponse } from '@/types';

export interface ResponseHandler {
  (response: ChromeResponse): void;
}

export interface PendingRequest {
  timestamp: number;
  handler: ResponseHandler;
  timeoutId?: NodeJS.Timeout;
}

// Constants for better maintainability
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_CLEANUP_INTERVAL_MS = 60000; // 1 minute
const EXPIRED_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class AsyncResponseManager {
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly defaultTimeout: number;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    cleanupIntervalMs = DEFAULT_CLEANUP_INTERVAL_MS,
    defaultTimeoutMs = DEFAULT_TIMEOUT_MS
  ) {
    this.defaultTimeout = defaultTimeoutMs;
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredHandlers();
    }, cleanupIntervalMs);
  }

  async waitForResponse(requestId: string, timeoutMs?: number): Promise<ChromeResponse> {
    const timeout = timeoutMs || this.defaultTimeout;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: `Request timed out after ${timeout}ms`,
          },
          requestId,
          messageType: 'UNKNOWN',
        });
      }, timeout);

      const handler: ResponseHandler = (response: ChromeResponse) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.pendingRequests.delete(requestId);
        resolve(response);
      };

      this.pendingRequests.set(requestId, {
        timestamp: Date.now(),
        handler,
        timeoutId,
      });
    });
  }

  handleResponse(response: ChromeResponse): void {
    const pending = this.pendingRequests.get(response.requestId);
    if (pending) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.handler(response);
      this.pendingRequests.delete(response.requestId);
    }
  }

  registerHandler(requestId: string, handler: ResponseHandler): void {
    const existing = this.pendingRequests.get(requestId);
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    this.pendingRequests.set(requestId, {
      timestamp: Date.now(),
      handler,
    });
  }

  unregisterHandler(requestId: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending?.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingRequests.delete(requestId);
  }

  cleanupExpiredHandlers(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    // Collect expired request IDs
    for (const [requestId, request] of this.pendingRequests) {
      if (now - request.timestamp > EXPIRED_THRESHOLD_MS) {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        expiredIds.push(requestId);
      }
    }

    // Remove expired requests
    expiredIds.forEach((id) => this.pendingRequests.delete(id));
  }

  // Get metrics for monitoring
  getMetrics(): {
    pendingRequestCount: number;
    oldestRequestAge: number | null;
  } {
    const now = Date.now();
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;

    for (const request of this.pendingRequests.values()) {
      if (request.timestamp < oldestTimestamp) {
        oldestTimestamp = request.timestamp;
      }
    }

    return {
      pendingRequestCount: this.pendingRequests.size,
      oldestRequestAge: this.pendingRequests.size > 0 ? now - oldestTimestamp : null,
    };
  }

  destroy(): void {
    // Clear all pending requests
    for (const [, request] of this.pendingRequests) {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    }
    this.pendingRequests.clear();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
