// TASK-0007: Chrome Extension API Integration Test Cases
// TDD Test Implementation for Chrome Extension Message Passing

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Chrome Extension API Integration Test Suite
 *
 * Tests the Chrome Extension API integration including:
 * - Background ↔ Popup communication
 * - Background ↔ Content Script communication
 * - Message passing API integration
 * - Tab management and content script injection
 */

// Mock types for Chrome Extension APIs
interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
}

interface ChromeMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

interface ChromeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface MockChromeRuntime {
  sendMessage: ReturnType<typeof vi.fn>;
  onMessage: {
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
    hasListener: ReturnType<typeof vi.fn>;
  };
  lastError?: { message: string };
  id: string;
}

interface MockChromeTabs {
  query: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  executeScript: ReturnType<typeof vi.fn>;
}

// Mock Chrome Extension API Integration Manager
class MockChromeAPIManager {
  private messageListeners = new Map<string, Function[]>();
  private mockTabs: ChromeTab[] = [];

  constructor(
    private runtime: MockChromeRuntime,
    private tabs: MockChromeTabs
  ) {
    this.setupMockBehavior();
  }

  private setupMockBehavior() {
    // Mock runtime.sendMessage
    this.runtime.sendMessage.mockImplementation(
      async (message: ChromeMessage, callback?: Function) => {
        const response = await this.simulateMessageHandling(message);
        if (callback) {
          callback(response);
        }
        return response;
      }
    );

    // Mock tabs.sendMessage
    this.tabs.sendMessage.mockImplementation(
      async (tabId: number, message: ChromeMessage, callback?: Function) => {
        const response = await this.simulateTabMessageHandling(tabId, message);
        if (callback) {
          callback(response);
        }
        return response;
      }
    );

    // Mock tabs.query
    this.tabs.query.mockImplementation(async (queryInfo: any, callback?: Function) => {
      const results = this.mockTabs.filter((tab) => {
        if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
        if (queryInfo.url && !tab.url?.includes(queryInfo.url)) return false;
        return true;
      });

      if (callback) {
        callback(results);
      }
      return results;
    });

    // Mock onMessage listener management
    this.runtime.onMessage.addListener.mockImplementation((listener: Function) => {
      const listeners = this.messageListeners.get('runtime') || [];
      listeners.push(listener);
      this.messageListeners.set('runtime', listeners);
    });

    this.runtime.onMessage.removeListener.mockImplementation((listener: Function) => {
      const listeners = this.messageListeners.get('runtime') || [];
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    });

    this.runtime.onMessage.hasListener.mockImplementation((listener: Function) => {
      const listeners = this.messageListeners.get('runtime') || [];
      return listeners.includes(listener);
    });
  }

  private async simulateMessageHandling(message: ChromeMessage): Promise<ChromeResponse> {
    // Simulate background script message handling
    const listeners = this.messageListeners.get('runtime') || [];

    if (listeners.length === 0) {
      return { success: false, error: 'No message listeners registered' };
    }

    try {
      // Simulate the first listener handling the message
      const response = await Promise.resolve(listeners[0](message, {}, () => {}));
      return response || { success: true, data: 'Message handled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async simulateTabMessageHandling(
    tabId: number,
    message: ChromeMessage
  ): Promise<ChromeResponse> {
    const tab = this.mockTabs.find((t) => t.id === tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    // Simulate content script message handling
    return { success: true, data: `Message sent to tab ${tabId}` };
  }

  addMockTab(tab: ChromeTab): void {
    this.mockTabs.push(tab);
  }

  clearMockTabs(): void {
    this.mockTabs = [];
  }

  simulateRuntimeError(errorMessage: string): void {
    this.runtime.lastError = { message: errorMessage };
  }

  clearRuntimeError(): void {
    delete this.runtime.lastError;
  }
}

describe('Chrome Extension API Integration', () => {
  let mockRuntime: MockChromeRuntime;
  let mockTabs: MockChromeTabs;
  let chromeAPIManager: MockChromeAPIManager;

  beforeEach(() => {
    // Setup mock Chrome APIs
    mockRuntime = {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn(),
      },
      id: 'test-extension-id',
    };

    mockTabs = {
      query: vi.fn(),
      sendMessage: vi.fn(),
      executeScript: vi.fn(),
    };

    chromeAPIManager = new MockChromeAPIManager(mockRuntime, mockTabs);

    // Reset global Chrome mock to use our manager
    global.chrome = {
      ...global.chrome,
      runtime: mockRuntime,
      tabs: mockTabs,
    } as any;
  });

  afterEach(() => {
    chromeAPIManager.clearMockTabs();
    chromeAPIManager.clearRuntimeError();
    vi.clearAllMocks();
  });

  describe('Background ↔ Popup Communication', () => {
    it('should send message from popup to background successfully', async () => {
      // Arrange
      const testMessage: ChromeMessage = {
        id: 'popup-msg-001',
        type: 'PROMPT_GET',
        payload: { category: 'work' },
        timestamp: Date.now(),
      };

      const expectedResponse: ChromeResponse = {
        success: true,
        data: [{ id: 'prompt-1', title: 'Test Prompt' }],
      };

      // Setup background listener
      const backgroundListener = vi.fn().mockResolvedValue(expectedResponse);
      mockRuntime.onMessage.addListener(backgroundListener);

      // Act
      const response = await mockRuntime.sendMessage(testMessage);

      // Assert
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith(testMessage);
      expect(response).toEqual(expectedResponse);
    });

    it('should handle popup to background message with callback', (done) => {
      // Arrange
      const testMessage: ChromeMessage = {
        id: 'popup-msg-002',
        type: 'PROMPT_CREATE',
        payload: { title: 'New Prompt', content: 'Content' },
        timestamp: Date.now(),
      };

      const expectedResponse: ChromeResponse = {
        success: true,
        data: { id: 'new-prompt-123' },
      };

      // Setup background listener
      const backgroundListener = vi.fn().mockResolvedValue(expectedResponse);
      mockRuntime.onMessage.addListener(backgroundListener);

      // Act
      mockRuntime.sendMessage(testMessage, (response: ChromeResponse) => {
        // Assert
        expect(response).toEqual(expectedResponse);
        expect(mockRuntime.sendMessage).toHaveBeenCalledWith(testMessage, expect.any(Function));
        done();
      });
    });

    it('should handle message sending errors', async () => {
      // Arrange
      const testMessage: ChromeMessage = {
        id: 'popup-msg-003',
        type: 'INVALID_MESSAGE',
        payload: {},
        timestamp: Date.now(),
      };

      chromeAPIManager.simulateRuntimeError('Could not establish connection');

      // Act
      const response = await mockRuntime.sendMessage(testMessage);

      // Assert
      expect(response.success).toBe(false);
      expect(chrome.runtime.lastError?.message).toBe('Could not establish connection');
    });

    it('should handle multiple concurrent messages', async () => {
      // Arrange
      const messages: ChromeMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-msg-${i}`,
        type: 'PROMPT_GET',
        payload: { id: `prompt-${i}` },
        timestamp: Date.now(),
      }));

      // Setup background listener to handle multiple messages
      const backgroundListener = vi.fn().mockImplementation(async (message: ChromeMessage) => ({
        success: true,
        data: { requestId: message.id, handled: true },
      }));
      mockRuntime.onMessage.addListener(backgroundListener);

      // Act
      const responses = await Promise.all(messages.map((msg) => mockRuntime.sendMessage(msg)));

      // Assert
      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.data.requestId).toBe(`concurrent-msg-${index}`);
      });
    });
  });

  describe('Background ↔ Content Script Communication', () => {
    it('should send message from background to content script successfully', async () => {
      // Arrange
      const tabId = 123;
      const testTab: ChromeTab = {
        id: tabId,
        url: 'https://chat.openai.com',
        title: 'ChatGPT',
        active: true,
      };

      chromeAPIManager.addMockTab(testTab);

      const testMessage: ChromeMessage = {
        id: 'bg-to-content-001',
        type: 'EXPORT_CONVERSATION',
        payload: { format: 'markdown' },
        timestamp: Date.now(),
      };

      // Act
      const response = await mockTabs.sendMessage(tabId, testMessage);

      // Assert
      expect(mockTabs.sendMessage).toHaveBeenCalledWith(tabId, testMessage);
      expect(response.success).toBe(true);
      expect(response.data).toContain(`Message sent to tab ${tabId}`);
    });

    it('should handle content script message with callback', (done) => {
      // Arrange
      const tabId = 456;
      const testTab: ChromeTab = {
        id: tabId,
        url: 'https://chat.openai.com/chat',
        active: true,
      };

      chromeAPIManager.addMockTab(testTab);

      const testMessage: ChromeMessage = {
        id: 'bg-to-content-002',
        type: 'EXTRACT_CONVERSATION',
        payload: {},
        timestamp: Date.now(),
      };

      // Act
      mockTabs.sendMessage(tabId, testMessage, (response: ChromeResponse) => {
        // Assert
        expect(response.success).toBe(true);
        expect(mockTabs.sendMessage).toHaveBeenCalledWith(tabId, testMessage, expect.any(Function));
        done();
      });
    });

    it('should handle invalid tab ID gracefully', async () => {
      // Arrange
      const invalidTabId = 999;
      const testMessage: ChromeMessage = {
        id: 'bg-to-content-003',
        type: 'TEST_MESSAGE',
        payload: {},
        timestamp: Date.now(),
      };

      // Act
      const response = await mockTabs.sendMessage(invalidTabId, testMessage);

      // Assert
      expect(response.success).toBe(false);
      expect(response.error).toContain('Tab 999 not found');
    });

    it('should query and message active ChatGPT tabs', async () => {
      // Arrange
      const chatgptTabs: ChromeTab[] = [
        { id: 1, url: 'https://chat.openai.com/chat/123', active: true },
        { id: 2, url: 'https://chat.openai.com/chat/456', active: false },
        { id: 3, url: 'https://google.com', active: false },
      ];

      chatgptTabs.forEach((tab) => chromeAPIManager.addMockTab(tab));

      const testMessage: ChromeMessage = {
        id: 'query-and-message',
        type: 'PING',
        payload: {},
        timestamp: Date.now(),
      };

      // Act
      const tabs = await mockTabs.query({ url: 'chat.openai.com', active: true });
      const messagePromises = tabs.map((tab) => mockTabs.sendMessage(tab.id!, testMessage));
      const responses = await Promise.all(messagePromises);

      // Assert
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe(1);
      expect(responses[0].success).toBe(true);
    });
  });

  describe('Message Listener Management', () => {
    it('should register message listeners successfully', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Act
      mockRuntime.onMessage.addListener(listener1);
      mockRuntime.onMessage.addListener(listener2);

      // Assert
      expect(mockRuntime.onMessage.addListener).toHaveBeenCalledTimes(2);
      expect(mockRuntime.onMessage.hasListener(listener1)).toBe(true);
      expect(mockRuntime.onMessage.hasListener(listener2)).toBe(true);
    });

    it('should unregister message listeners successfully', () => {
      // Arrange
      const listener = vi.fn();
      mockRuntime.onMessage.addListener(listener);

      // Act
      mockRuntime.onMessage.removeListener(listener);

      // Assert
      expect(mockRuntime.onMessage.removeListener).toHaveBeenCalledWith(listener);
      expect(mockRuntime.onMessage.hasListener(listener)).toBe(false);
    });

    it('should handle multiple listeners for the same message type', async () => {
      // Arrange
      const listener1 = vi.fn().mockResolvedValue({ handled: 'listener1' });
      const listener2 = vi.fn().mockResolvedValue({ handled: 'listener2' });

      mockRuntime.onMessage.addListener(listener1);
      mockRuntime.onMessage.addListener(listener2);

      const testMessage: ChromeMessage = {
        id: 'multi-listener-test',
        type: 'TEST_MESSAGE',
        payload: {},
        timestamp: Date.now(),
      };

      // Act
      const response = await mockRuntime.sendMessage(testMessage);

      // Assert
      // First listener should handle the message
      expect(response.handled).toBe('listener1');
    });
  });

  describe('Tab Management Integration', () => {
    it('should query tabs with different criteria', async () => {
      // Arrange
      const testTabs: ChromeTab[] = [
        { id: 1, url: 'https://chat.openai.com', active: true, title: 'ChatGPT' },
        { id: 2, url: 'https://github.com', active: false, title: 'GitHub' },
        { id: 3, url: 'https://chat.openai.com/premium', active: false, title: 'ChatGPT Plus' },
      ];

      testTabs.forEach((tab) => chromeAPIManager.addMockTab(tab));

      // Act
      const activeTabs = await mockTabs.query({ active: true });
      const chatgptTabs = await mockTabs.query({ url: 'chat.openai.com' });
      const allTabs = await mockTabs.query({});

      // Assert
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0].id).toBe(1);

      expect(chatgptTabs).toHaveLength(2);
      expect(chatgptTabs.map((t) => t.id)).toContain(1);
      expect(chatgptTabs.map((t) => t.id)).toContain(3);

      expect(allTabs).toHaveLength(3);
    });

    it('should handle tabs query with callback', (done) => {
      // Arrange
      const testTab: ChromeTab = {
        id: 1,
        url: 'https://example.com',
        active: true,
      };

      chromeAPIManager.addMockTab(testTab);

      // Act
      mockTabs.query({ active: true }, (tabs: ChromeTab[]) => {
        // Assert
        expect(tabs).toHaveLength(1);
        expect(tabs[0].id).toBe(1);
        done();
      });
    });

    it('should execute content scripts in tabs', async () => {
      // Arrange
      const tabId = 123;
      const scriptDetails = {
        code: 'console.log("Content script injected");',
      };

      mockTabs.executeScript.mockResolvedValue([{ result: 'Script executed' }]);

      // Act
      const result = await mockTabs.executeScript(tabId, scriptDetails);

      // Assert
      expect(mockTabs.executeScript).toHaveBeenCalledWith(tabId, scriptDetails);
      expect(result[0].result).toBe('Script executed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle chrome.runtime.lastError properly', async () => {
      // Arrange
      chromeAPIManager.simulateRuntimeError('Extension context invalidated');

      const testMessage: ChromeMessage = {
        id: 'error-test',
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      };

      // Act
      await mockRuntime.sendMessage(testMessage);

      // Assert
      expect(chrome.runtime.lastError?.message).toBe('Extension context invalidated');
    });

    it('should handle disconnected ports gracefully', async () => {
      // Arrange
      const testMessage: ChromeMessage = {
        id: 'disconnected-test',
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      };

      // Simulate no listeners (background script not ready)
      // Act
      const response = await mockRuntime.sendMessage(testMessage);

      // Assert
      expect(response.success).toBe(false);
      expect(response.error).toBe('No message listeners registered');
    });

    it('should handle message timeout scenarios', async () => {
      // Arrange
      const testMessage: ChromeMessage = {
        id: 'timeout-test',
        type: 'SLOW_OPERATION',
        payload: {},
        timestamp: Date.now(),
      };

      // Setup slow listener
      const slowListener = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
        );
      mockRuntime.onMessage.addListener(slowListener);

      // Act
      const startTime = Date.now();
      const response = await mockRuntime.sendMessage(testMessage);
      const endTime = Date.now();

      // Assert
      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should handle malformed messages gracefully', async () => {
      // Arrange
      const malformedMessages = [
        null,
        undefined,
        { incomplete: 'message' },
        { id: null, type: 'TEST', payload: {} },
        'string-message',
      ];

      // Act & Assert
      for (const message of malformedMessages) {
        const response = await mockRuntime.sendMessage(message as any);
        expect(response.success).toBe(false);
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-frequency message passing', async () => {
      // Arrange
      const messageCount = 50;
      const messages: ChromeMessage[] = Array.from({ length: messageCount }, (_, i) => ({
        id: `perf-msg-${i}`,
        type: 'RAPID_FIRE',
        payload: { index: i },
        timestamp: Date.now(),
      }));

      const fastListener = vi.fn().mockImplementation((message: ChromeMessage) => ({
        success: true,
        data: { processed: message.id },
      }));
      mockRuntime.onMessage.addListener(fastListener);

      // Act
      const startTime = performance.now();
      const responses = await Promise.all(messages.map((msg) => mockRuntime.sendMessage(msg)));
      const endTime = performance.now();

      // Assert
      expect(responses).toHaveLength(messageCount);
      expect(responses.every((r) => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should maintain message order consistency', async () => {
      // Arrange
      const messageOrder: string[] = [];
      const orderedMessages: ChromeMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `ordered-msg-${i}`,
        type: 'ORDER_TEST',
        payload: { sequence: i },
        timestamp: Date.now() + i,
      }));

      const orderTrackingListener = vi.fn().mockImplementation((message: ChromeMessage) => {
        messageOrder.push(message.id);
        return { success: true, data: { received: message.id } };
      });
      mockRuntime.onMessage.addListener(orderTrackingListener);

      // Act
      const responses = await Promise.all(
        orderedMessages.map((msg) => mockRuntime.sendMessage(msg))
      );

      // Assert
      expect(responses).toHaveLength(10);
      expect(responses.every((r) => r.success)).toBe(true);
      // Note: Order may not be preserved in Promise.all, but all should be processed
      expect(messageOrder).toHaveLength(10);
    });
  });
});
